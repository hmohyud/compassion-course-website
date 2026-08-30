import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchWeeklyFileText,
  getWeeklyFileUrl,
  uploadWeeklyFile,
  updateWeeklyContent,
  STORAGE_HTML_PREFIX,
  STORAGE_ASSETS_PREFIX,
  type WeeklyContent,
} from '../../services/weeklyContentService';
import {
  listCheckpoints,
  createCheckpoint,
  deleteCheckpoint,
  type Checkpoint,
} from '../../services/weeklyCheckpointService';
import {
  parseLesson,
  markEditableRegions,
  serializeClean,
  serializeForDisplay,
  deriveTitle,
  sanityCheck,
  readRegionEdits,
  applyRegionEdits,
  type SanityResult,
} from '../../utils/lessonHtml';
import { extractNarratedSections, type AudioSection, type AudioChunk } from '../../utils/lessonAudio';
import {
  createAudioJob,
  watchAudioJob,
  checkWeeklyAudioExists,
  type AudioJob,
} from '../../services/weeklyAudioService';
import { rewriteWeeklyHtml } from '../../pages/weekly/WeeklyViewerPage';

// Full-screen, admin-only editor for one week's lesson HTML.
// - Visual mode: the lesson rendered in an isolated iframe with the real CSS,
//   scripts stripped + accordions forced open, prose regions contentEditable.
//   Edits are written back into a kept Document node-by-node (no whole-doc
//   reserialize), so structure survives.
// - HTML mode: raw full-document editing.
// - Preview mode: read-only render exactly as members see it.
// - Live ✓/✕ safety checker (debounced) + "Revert to safety" backed by a
//   localStorage autosave of the last known-good state.
// - Checkpoints panel: manual save / restore / click-and-hold delete.

type Mode = 'visual' | 'html' | 'preview' | 'audio';
type Msg = { type: 'success' | 'error' | 'info'; text: string } | null;

const HOLD_MS = 900;
// If a running audio job makes no progress for this long, treat it as stuck
// (e.g. the function lacks permissions and can't even write the job doc) so the
// editor surfaces an error instead of spinning forever. Resets on every clip.
const AUDIO_STUCK_MS = 120000;

/** Make a user-typed link target usable: pass through absolute URLs, mailto/
 *  tel, in-page anchors and root paths; otherwise assume https. */
function normalizeLinkUrl(input: string): string {
  const t = input.trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(t)) return t;
  return 'https://' + t;
}

interface Props {
  week: WeeklyContent;
  onClose: () => void;
  onSaved?: () => void;
}

const fmtSize = (n: number) => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);
const fmtWhen = (d?: Date) => (d ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

const LessonContentEditor: React.FC<Props> = ({ week, onClose, onSaved }) => {
  const { user, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('visual');
  const [currentHtml, setCurrentHtml] = useState('');
  const [sanity, setSanity] = useState<SanityResult>({ ok: true });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [cssUrl, setCssUrl] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [audioMap, setAudioMap] = useState<Record<string, string>>({});
  const [renderToken, setRenderToken] = useState(0);
  const [holdingId, setHoldingId] = useState<string | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState<string | null>(null);
  const [audioSections, setAudioSections] = useState<AudioSection[]>([]);
  const [existingAudio, setExistingAudio] = useState<Set<string>>(new Set());
  const [activeJob, setActiveJob] = useState<AudioJob | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  const docRef = useRef<Document | null>(null);
  const htmlRef = useRef('');
  const lastSafeRef = useRef('');
  const editIframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const sanityTimer = useRef<number | null>(null);
  const inputTimer = useRef<number | null>(null);
  const holdTimer = useRef<number | null>(null);
  const jobUnsub = useRef<null | (() => void)>(null);
  const jobTimer = useRef<number | null>(null);
  const jobSig = useRef<string>('');

  const SAFE_KEY = `lessonEditor:safe:week-${week.weekNumber}`;
  const htmlPath = week.htmlStoragePath || `${STORAGE_HTML_PREFIX}/week-${week.weekNumber}.html`;

  const persistSafe = useCallback((html: string) => {
    try {
      localStorage.setItem(SAFE_KEY, html);
    } catch {
      /* localStorage may be full/blocked — non-fatal */
    }
  }, [SAFE_KEY]);

  const scheduleSanity = useCallback(
    (html: string) => {
      if (sanityTimer.current) window.clearTimeout(sanityTimer.current);
      sanityTimer.current = window.setTimeout(() => {
        const s = sanityCheck(html, week.weekNumber);
        setSanity(s);
        if (s.ok) {
          lastSafeRef.current = html;
          persistSafe(html);
        }
      }, 1000);
    },
    [week.weekNumber, persistSafe],
  );

  const applyHtml = useCallback(
    (html: string, opts?: { dirty?: boolean }) => {
      htmlRef.current = html;
      setCurrentHtml(html);
      if (opts?.dirty !== undefined) setDirty(opts.dirty);
      scheduleSanity(html);
    },
    [scheduleSanity],
  );

  const rebuildDocFrom = useCallback((html: string) => {
    const d = parseLesson(html);
    markEditableRegions(d);
    docRef.current = d;
    setRenderToken((t) => t + 1);
  }, []);

  const refreshCheckpoints = useCallback(async () => {
    try {
      setCheckpoints(await listCheckpoints(week.weekNumber));
    } catch (e: any) {
      setMsg({ type: 'error', text: `Could not load checkpoints: ${e?.message || e}` });
    }
  }, [week.weekNumber]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [html, css, script] = await Promise.all([
          fetchWeeklyFileText(htmlPath),
          getWeeklyFileUrl(`${STORAGE_ASSETS_PREFIX}/styles.css`),
          getWeeklyFileUrl(`${STORAGE_ASSETS_PREFIX}/script.js`),
        ]);
        const amap: Record<string, string> = {};
        await Promise.all(
          (week.audioStoragePaths || []).map(async (p) => {
            try {
              amap[`audio/${p.replace(/^.*\//, '')}`] = await getWeeklyFileUrl(p);
            } catch {
              /* a missing audio file shouldn't block editing */
            }
          }),
        );
        if (cancelled) return;
        setCssUrl(css);
        setScriptUrl(script);
        setAudioMap(amap);
        htmlRef.current = html;
        setCurrentHtml(html);
        rebuildDocFrom(html);
        setAudioSections(extractNarratedSections(html));
        lastSafeRef.current = html;
        setSanity(sanityCheck(html, week.weekNumber));
        try {
          const draft = localStorage.getItem(SAFE_KEY);
          if (draft && draft !== html && sanityCheck(draft, week.weekNumber).ok) setRecoveryDraft(draft);
        } catch {
          /* ignore */
        }
        await refreshCheckpoints();
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setMsg({ type: 'error', text: `Failed to load week: ${e?.message || e}` });
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week.weekNumber]);

  // Cleanup timers + job listener on unmount.
  useEffect(
    () => () => {
      if (sanityTimer.current) window.clearTimeout(sanityTimer.current);
      if (inputTimer.current) window.clearTimeout(inputTimer.current);
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
      if (jobTimer.current) window.clearTimeout(jobTimer.current);
      if (jobUnsub.current) jobUnsub.current();
    },
    [],
  );

  // ── Visual edit iframe: (re)render on enter / rebuild ───────────────────────
  const attachIframeListeners = useCallback(
    (idoc: Document) => {
      const onInput = () => {
        if (inputTimer.current) window.clearTimeout(inputTimer.current);
        inputTimer.current = window.setTimeout(() => {
          if (!docRef.current) return;
          applyRegionEdits(docRef.current, readRegionEdits(idoc));
          applyHtml(serializeClean(docRef.current), { dirty: true });
        }, 400);
      };
      idoc.addEventListener('input', onInput);
      idoc.addEventListener('paste', (e: Event) => {
        const ce = e as ClipboardEvent;
        e.preventDefault();
        const text = ce.clipboardData?.getData('text/plain') ?? '';
        // execCommand is deprecated but remains the simplest reliable way to
        // insert plain text at the caret inside a contentEditable region.
        (idoc as any).execCommand?.('insertText', false, text);
      });
    },
    [applyHtml],
  );

  useEffect(() => {
    if (mode !== 'visual' || !cssUrl || !docRef.current) return;
    const iframe = editIframeRef.current;
    if (!iframe) return;
    iframe.onload = () => {
      const idoc = iframe.contentDocument;
      if (idoc) attachIframeListeners(idoc);
    };
    iframe.srcdoc = serializeForDisplay(docRef.current, cssUrl);
    // `loading` is in the deps so this re-runs once the iframe actually mounts:
    // during load, cssUrl/renderToken settle while loading is still true (iframe
    // not yet rendered), and loading flips to false in a later batch — without it
    // here, the effect would never fire after the iframe exists, leaving it blank.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, renderToken, cssUrl, loading]);

  // ── Preview iframe ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'preview' || !cssUrl || !scriptUrl) return;
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    try {
      iframe.srcdoc = rewriteWeeklyHtml(htmlRef.current, { cssUrl, scriptUrl, audioMap });
    } catch {
      iframe.srcdoc = '<p style="padding:2rem;font-family:sans-serif">Preview failed to render.</p>';
    }
  }, [mode, currentHtml, cssUrl, scriptUrl, audioMap]);

  // ── The narrated sections + their content hashes, recomputed (debounced) as
  //    the lesson text changes. Drives both the Audio tab and the publish-time
  //    notifier. Cheap — audioHash() is a synchronous string hash. ─────────────
  useEffect(() => {
    if (loading) return;
    const t = window.setTimeout(() => {
      try {
        setAudioSections(extractNarratedSections(currentHtml));
      } catch {
        /* a transient parse error shouldn't blow up the editor */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [currentHtml, loading]);

  // ── Which of those clips exist in Storage. Each path is probed directly
  //    (a public per-file read — the same check the member page makes), NOT
  //    via folder listing: storage.rules grant no `list` on weekly-audio, so
  //    listAll silently failed and the tab fell back to the week doc's
  //    audioStoragePaths — a field nothing updated after generation. That's
  //    what made the admin view disagree with what members experience.
  //    Probe results are cached per path; entering the Audio tab re-verifies.
  const probedRef = useRef<Map<string, boolean>>(new Map());
  const [probeNonce, setProbeNonce] = useState(0);
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  const syncedPathsRef = useRef<string>(
    JSON.stringify((week.audioStoragePaths || []).slice().sort()),
  );

  // Persist the week's real clip list to Firestore when it has drifted —
  // the member page builds its audio URL map from audioStoragePaths, so a
  // stale list means members silently lose regenerated clips. Only called
  // with path sets derived from the PUBLISHED lesson text.
  const syncAudioPathsToDoc = useCallback((paths: string[]) => {
    const email = user?.email;
    if (!email) return;
    const sig = JSON.stringify(paths.slice().sort());
    if (sig === syncedPathsRef.current) return;
    syncedPathsRef.current = sig;
    updateWeeklyContent(week.weekNumber, { audioStoragePaths: paths }, email)
      .catch(() => { /* non-fatal: display stays correct; retried next open */ });
  }, [user, week.weekNumber]);

  useEffect(() => {
    if (mode === 'audio') {
      probedRef.current.clear();
      setProbeNonce((n) => n + 1);
    }
  }, [mode]);

  useEffect(() => {
    if (loading || audioSections.length === 0) return;
    const allPaths = audioSections.flatMap((s) => s.chunks.map((c) => c.storagePath));
    const unknown = allPaths.filter((p) => !probedRef.current.has(p));
    let cancelled = false;
    (async () => {
      if (unknown.length) {
        setAudioLoading(true);
        try {
          const found = await checkWeeklyAudioExists(unknown);
          if (cancelled) return;
          unknown.forEach((p) => probedRef.current.set(p, found.has(p)));
        } catch {
          /* transient network failure — paths stay unknown and re-probe later */
        }
        if (cancelled) return;
        setAudioLoading(false);
      }
      setExistingAudio((prev) => {
        const next = new Set(prev);
        allPaths.forEach((p) => { if (probedRef.current.get(p)) next.add(p); });
        return next;
      });
      // Editor content matches the published lesson (no unsaved edits) →
      // safe to heal the week doc's clip list to what actually exists.
      if (!dirtyRef.current) {
        syncAudioPathsToDoc(allPaths.filter((p) => probedRef.current.get(p)));
      }
    })();
    return () => { cancelled = true; };
  }, [audioSections, loading, probeNonce, syncAudioPathsToDoc]);

  // Create an audio job for the given chunks and watch it to completion,
  // updating the known-audio set + status message. Shared by the Audio tab and
  // the publish flow. `opts.startMsg` (when provided) is shown while the job is
  // queued; `opts.completeMsg` overrides the success message.
  const runAudioJob = useCallback(
    async (chunks: AudioChunk[], opts?: { startMsg?: Msg; completeMsg?: string }) => {
      const email = user?.email;
      if (!email) {
        setMsg({ type: 'error', text: 'You must be signed in.' });
        return;
      }
      if (!chunks.length) return;
      setAudioBusy(true);
      if (opts && opts.startMsg !== undefined) setMsg(opts.startMsg);

      const stopWatching = () => {
        if (jobUnsub.current) {
          jobUnsub.current();
          jobUnsub.current = null;
        }
        if (jobTimer.current) {
          window.clearTimeout(jobTimer.current);
          jobTimer.current = null;
        }
      };
      // (Re)arm the stuck-job watchdog — called on each bit of progress.
      const armStuckTimer = () => {
        if (jobTimer.current) window.clearTimeout(jobTimer.current);
        jobTimer.current = window.setTimeout(() => {
          setAudioBusy(false);
          setActiveJob(null);
          stopWatching();
          setMsg({
            type: 'error',
            text:
              'Generation didn’t progress. The audio service may be missing permissions or unavailable — ' +
              'no clips were produced. Check the onAudioJobCreated function logs, then try again.',
          });
        }, AUDIO_STUCK_MS);
      };

      try {
        const jobId = await createAudioJob(week.weekNumber, chunks, email);
        stopWatching();
        jobSig.current = '';
        armStuckTimer();
        jobUnsub.current = watchAudioJob(jobId, (job) => {
          setActiveJob(job);
          if (!job) return;
          if (job.status === 'complete' || job.status === 'completed_with_errors' || job.status === 'error') {
            setAudioBusy(false);
            stopWatching();
            const donePaths = (job.items || [])
              .filter((it) => it.status === 'done' || it.status === 'skipped')
              .map((it) => it.storagePath);
            donePaths.forEach((p) => probedRef.current.set(p, true));
            setExistingAudio((prev) => {
              const next = new Set(prev);
              donePaths.forEach((p) => next.add(p));
              return next;
            });
            // With no unsaved edits, the freshly generated clips belong to the
            // published text — record them on the week doc so the member page
            // (whose audio map is built from audioStoragePaths) can play them.
            if (!dirtyRef.current) {
              const secs = extractNarratedSections(htmlRef.current);
              const all = secs.flatMap((s) => s.chunks.map((c) => c.storagePath));
              const done = new Set(donePaths);
              syncAudioPathsToDoc(all.filter((p) => done.has(p) || probedRef.current.get(p)));
            }
            if (job.status === 'complete') setMsg({ type: 'success', text: opts?.completeMsg || 'Audio generated. Save the lesson if you haven’t, so it matches the published text.' });
            else if (job.status === 'completed_with_errors') setMsg({ type: 'error', text: 'Some clips failed — see the statuses below.' });
            else setMsg({ type: 'error', text: 'Audio job failed: ' + (job.error || 'unknown error') });
            return;
          }
          // Still running: reset the watchdog whenever status or progress moves.
          const sig = `${job.status}:${job.done}`;
          if (sig !== jobSig.current) {
            jobSig.current = sig;
            armStuckTimer();
          }
        });
      } catch (e: any) {
        setAudioBusy(false);
        stopWatching();
        setMsg({ type: 'error', text: 'Could not start generation: ' + (e?.message || e) });
      }
    },
    [user, week.weekNumber, syncAudioPathsToDoc],
  );

  // Audio tab: generate the clips a set of sections is missing.
  const generateChunks = useCallback(
    async (chunks: AudioChunk[]) => {
      const toGen = chunks.filter((c) => !existingAudio.has(c.storagePath));
      if (!toGen.length) {
        setMsg({ type: 'info', text: 'Those sections already have audio.' });
        return;
      }
      setMsg(null);
      await runAudioJob(toGen);
    },
    [existingAudio, runAudioJob],
  );

  const generateAll = useCallback(() => {
    generateChunks(audioSections.flatMap((s) => s.chunks));
  }, [generateChunks, audioSections]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const flushVisual = useCallback((): string => {
    const idoc = editIframeRef.current?.contentDocument;
    if (idoc && docRef.current) {
      applyRegionEdits(docRef.current, readRegionEdits(idoc));
      const html = serializeClean(docRef.current);
      htmlRef.current = html;
      setCurrentHtml(html);
      return html;
    }
    return htmlRef.current;
  }, []);

  // Add / edit / remove a hyperlink on the current selection in the Visual
  // editor: select words and click to link them; click inside an existing link
  // to change its URL (or clear the URL to unlink). Flushes like a normal edit
  // so the change round-trips into the kept document.
  const insertOrEditLink = useCallback(() => {
    const iframe = editIframeRef.current;
    const idoc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    if (!idoc || !win || !docRef.current) return;
    const sel = win.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setMsg({ type: 'info', text: 'Click into the text first — select words to link, or click inside a link to edit it.' });
      return;
    }
    const range = sel.getRangeAt(0).cloneRange();
    let node: Node | null = sel.anchorNode;
    let anchor: HTMLAnchorElement | null = null;
    while (node && node !== idoc.body) {
      if (node.nodeType === 1 && (node as Element).tagName === 'A') { anchor = node as HTMLAnchorElement; break; }
      node = node.parentNode;
    }
    if (anchor) {
      const next = window.prompt('Edit link URL (leave empty to remove the link):', anchor.getAttribute('href') || '');
      if (next === null) return;
      if (!next.trim()) {
        const parent = anchor.parentNode;
        if (parent) {
          while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
          parent.removeChild(anchor);
        }
      } else {
        anchor.setAttribute('href', normalizeLinkUrl(next));
      }
    } else {
      if (range.collapsed) {
        setMsg({ type: 'info', text: 'Select the words you want to turn into a link first.' });
        return;
      }
      const url = window.prompt('Link URL:', 'https://');
      if (url === null || !url.trim()) return;
      win.focus();
      sel.removeAllRanges();
      sel.addRange(range);
      (idoc as any).execCommand?.('createLink', false, normalizeLinkUrl(url));
    }
    applyRegionEdits(docRef.current, readRegionEdits(idoc));
    applyHtml(serializeClean(docRef.current), { dirty: true });
  }, [applyHtml]);

  const switchMode = useCallback(
    (next: Mode) => {
      if (next === mode) return;
      if (mode === 'visual') flushVisual();
      if (next === 'visual') rebuildDocFrom(htmlRef.current);
      setMode(next);
    },
    [mode, flushVisual, rebuildDocFrom],
  );

  const doSave = useCallback(
    async (htmlIn?: string) => {
      const email = user?.email;
      if (!email) {
        setMsg({ type: 'error', text: 'You must be signed in to save.' });
        return;
      }
      const html = htmlIn ?? (mode === 'visual' ? flushVisual() : htmlRef.current);
      const s = sanityCheck(html, week.weekNumber);
      if (!s.ok && !window.confirm(`A problem was found:\n\n${s.reason}\n\nSave anyway?`)) return;
      setSaving(true);
      setMsg(null);
      try {
        const title = deriveTitle(parseLesson(html)) || week.title;
        await uploadWeeklyFile(htmlPath, new Blob([html], { type: 'text/html' }), 'text/html');
        await updateWeeklyContent(week.weekNumber, { title }, email);
        htmlRef.current = html;
        setCurrentHtml(html);
        setDirty(false);
        lastSafeRef.current = html;
        persistSafe(html);
        setSanity(sanityCheck(html, week.weekNumber));
        onSaved?.();

        // Publishing also (re)generates the narration for any section whose text
        // changed: its content hash no longer matches an existing clip. Sections
        // that didn't change — and non-narrated sections (Info/Resources/
        // Practices) — produce no new hash, so nothing is generated for them.
        const sections = extractNarratedSections(html);
        const pending = sections.flatMap((s) => s.chunks).filter((c) => !existingAudio.has(c.storagePath));
        const pendingSections = sections.filter((s) => s.chunks.some((c) => !existingAudio.has(c.storagePath))).length;

        if (pending.length > 0) {
          await runAudioJob(pending, {
            startMsg: {
              type: 'info',
              text: `Published. Generating narration audio for ${pendingSections} section${pendingSections === 1 ? '' : 's'}${pending.length !== pendingSections ? ` (${pending.length} clips)` : ''}…`,
            },
            completeMsg: 'Published — narration audio is up to date.',
          });
        } else {
          setMsg({
            type: checkpoints.length === 0 ? 'info' : 'success',
            text:
              checkpoints.length === 0
                ? 'Saved & live on next page load. Tip: use "Save checkpoint" to keep restore points.'
                : 'Saved. Live on next page load — open lessons need a refresh.',
          });
        }
      } catch (e: any) {
        setMsg({ type: 'error', text: `Save failed: ${e?.message || e}` });
      } finally {
        setSaving(false);
      }
    },
    [user, mode, flushVisual, week.weekNumber, week.title, htmlPath, checkpoints.length, persistSafe, onSaved, existingAudio, runAudioJob],
  );

  const handleSaveCheckpoint = useCallback(async () => {
    const email = user?.email;
    if (!email) return;
    const html = mode === 'visual' ? flushVisual() : htmlRef.current;
    setBusy(true);
    try {
      await createCheckpoint(week.weekNumber, { html, createdBy: email });
      await refreshCheckpoints();
      setMsg({ type: 'success', text: 'Checkpoint saved.' });
    } catch (e: any) {
      setMsg({ type: 'error', text: `Checkpoint failed: ${e?.message || e}` });
    } finally {
      setBusy(false);
    }
  }, [user, mode, flushVisual, week.weekNumber, refreshCheckpoints]);

  const handleRestore = useCallback(
    (cp: Checkpoint) => {
      applyHtml(cp.html, { dirty: true });
      rebuildDocFrom(cp.html);
      setMode('visual');
      setMsg({ type: 'info', text: `Loaded "${cp.title}" into the editor. Review, then Save to publish.` });
    },
    [applyHtml, rebuildDocFrom],
  );

  const handleRestorePublish = useCallback(
    async (cp: Checkpoint) => {
      if (!window.confirm(`Restore "${cp.title}" and publish it as the live Week ${week.weekNumber}?`)) return;
      applyHtml(cp.html, { dirty: false });
      rebuildDocFrom(cp.html);
      await doSave(cp.html);
    },
    [applyHtml, rebuildDocFrom, doSave, week.weekNumber],
  );

  const handleRevertSafety = useCallback(() => {
    const safe = lastSafeRef.current;
    if (!safe) return;
    applyHtml(safe, { dirty: true });
    rebuildDocFrom(safe);
    setMode('visual');
    setMsg({ type: 'info', text: 'Reverted to the last known-good version.' });
  }, [applyHtml, rebuildDocFrom]);

  const startHold = useCallback(
    (cp: Checkpoint) => {
      setHoldingId(cp.id);
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
      holdTimer.current = window.setTimeout(async () => {
        setHoldingId(null);
        try {
          await deleteCheckpoint(week.weekNumber, cp.id);
          await refreshCheckpoints();
          setMsg({ type: 'success', text: 'Checkpoint deleted.' });
        } catch (e: any) {
          setMsg({ type: 'error', text: `Delete failed: ${e?.message || e}` });
        }
      }, HOLD_MS);
    },
    [week.weekNumber, refreshCheckpoints],
  );

  const cancelHold = useCallback(() => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHoldingId(null);
  }, []);

  const attemptClose = useCallback(() => {
    if (dirty && !window.confirm('You have unsaved changes that have not been published. Discard them and close?')) return;
    onClose();
  }, [dirty, onClose]);

  // Keyboard: Esc closes (guarded), Ctrl/Cmd+S saves & publishes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        attemptClose();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        doSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attemptClose, doSave]);

  if (!isAdmin) {
    return (
      <div className="lce-overlay">
        <div className="lce-panel" style={{ padding: '2rem' }}>
          <p>Admins only.</p>
          <button className="lce-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const pendingChunks = audioSections.flatMap((s) => s.chunks).filter((c) => !existingAudio.has(c.storagePath));
  const audioMissingCount = pendingChunks.length;
  const pendingAudioSections = audioSections.filter((s) => s.chunks.some((c) => !existingAudio.has(c.storagePath))).length;
  const narratedChunkTotal = audioSections.reduce((n, s) => n + s.chunks.length, 0);
  const jobRunning = !!activeJob && (activeJob.status === 'queued' || activeJob.status === 'running');

  return (
    <div className="lce-overlay" role="dialog" aria-modal="true" aria-label={`Edit Week ${week.weekNumber}`}>
      <div className="lce-panel">
        <header className="lce-bar">
          <div className="lce-bar-left">
            <span className="lce-week-badge">Week {week.weekNumber}</span>
            <span className="lce-title" title={week.title}>{week.title || 'Untitled'}</span>
          </div>
          <div className="lce-modes" role="tablist" aria-label="Editor mode">
            <button type="button" role="tab" aria-selected={mode === 'visual'} className={mode === 'visual' ? 'active' : ''} onClick={() => switchMode('visual')}>
              <i className="fas fa-pen" aria-hidden="true" /> Edit text
            </button>
            <button type="button" role="tab" aria-selected={mode === 'html'} className={mode === 'html' ? 'active' : ''} onClick={() => switchMode('html')}>
              <i className="fas fa-code" aria-hidden="true" /> HTML
            </button>
            <button type="button" role="tab" aria-selected={mode === 'preview'} className={mode === 'preview' ? 'active' : ''} onClick={() => switchMode('preview')}>
              <i className="fas fa-eye" aria-hidden="true" /> Preview
            </button>
            <button type="button" role="tab" aria-selected={mode === 'audio'} className={mode === 'audio' ? 'active' : ''} onClick={() => switchMode('audio')}>
              <i className="fas fa-headphones" aria-hidden="true" /> Audio
            </button>
          </div>
          <div className="lce-bar-right">
            <button
              type="button"
              className="lce-btn lce-btn-primary"
              onClick={() => doSave()}
              disabled={saving || loading}
              title={
                pendingAudioSections > 0
                  ? `Publish your changes and generate narration audio for ${pendingAudioSections} changed section${pendingAudioSections === 1 ? '' : 's'}`
                  : 'Upload your changes to the live site'
              }
            >
              <i className="fas fa-cloud-arrow-up" aria-hidden="true" /> {saving ? 'Saving…' : 'Save & publish'}
            </button>
            <button type="button" className="lce-btn lce-btn-ghost" onClick={attemptClose} aria-label="Close editor" title="Close">
              <i className="fas fa-xmark" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="lce-subbar">
          <div className="lce-hint">
            {mode === 'visual' && (<><i className="fas fa-hand-pointer" aria-hidden="true" /> Click any text to edit it. To add a link, select words and click <strong>Link</strong>; to change one, click inside it and press <strong>Link</strong>.</>)}
            {mode === 'html' && (<><i className="fas fa-code" aria-hidden="true" /> Advanced: edit the raw HTML. The safety check still runs as you type.</>)}
            {mode === 'preview' && (<><i className="fas fa-eye" aria-hidden="true" /> This is exactly what members will see — switch to “Edit text” to make changes.</>)}
            {mode === 'audio' && (<><i className="fas fa-headphones" aria-hidden="true" /> Generate the spoken-audio clips for each section. Regenerate a section after you change its words.</>)}
          </div>
          <div className="lce-subbar-right">
            {mode === 'visual' && (
              <button
                type="button"
                className="lce-btn lce-btn-sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={insertOrEditLink}
                title="Select text to add a link, or click inside a link to edit/remove it"
              >
                <i className="fas fa-link" aria-hidden="true" /> Link
              </button>
            )}
            <span className={`lce-savestate ${dirty ? 'is-dirty' : ''}`}>
              <i className={`fas ${dirty ? 'fa-circle' : 'fa-circle-check'}`} aria-hidden="true" /> {dirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
            {narratedChunkTotal > 0 && (
              jobRunning ? (
                <span className="lce-audiostate is-generating" title="Narration audio is being generated in the background.">
                  <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Generating audio{activeJob ? ` ${activeJob.done}/${activeJob.total}` : ''}…
                </span>
              ) : audioLoading ? (
                <span className="lce-audiostate" title="Checking which narration clips exist in Storage.">
                  <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Checking narration…
                </span>
              ) : pendingAudioSections > 0 ? (
                <span
                  className="lce-audiostate is-pending"
                  title="These narrated sections were edited (or have no audio yet). Publishing regenerates their spoken audio automatically."
                >
                  <i className="fas fa-headphones" aria-hidden="true" /> Publish generates audio: {pendingAudioSections} section{pendingAudioSections === 1 ? '' : 's'}
                  {audioMissingCount !== pendingAudioSections ? ` (${audioMissingCount} clips)` : ''}
                </span>
              ) : (
                <span className="lce-audiostate is-ok" title="Every narrated section already has matching audio — nothing will be generated on publish.">
                  <i className="fas fa-circle-check" aria-hidden="true" /> Narration up to date
                </span>
              )
            )}
            <span className={`lce-status lce-status--${sanity.ok ? 'ok' : 'bad'}`} title={sanity.reason || 'Structure looks intact'}>
              <i className={`fas ${sanity.ok ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} aria-hidden="true" /> {sanity.ok ? 'Looks good' : sanity.reason}
            </span>
            {!sanity.ok && (
              <button type="button" className="lce-btn lce-btn-warn lce-btn-sm" onClick={handleRevertSafety} title="Undo back to the last version that passed the check">
                <i className="fas fa-rotate-left" aria-hidden="true" /> Revert to safety
              </button>
            )}
          </div>
        </div>

        {msg && <div className={`lce-msg lce-msg--${msg.type}`}>{msg.text}</div>}

        {recoveryDraft && (
          <div className="lce-msg lce-msg--info">
            Unsaved local changes from a previous session were found.
            <button
              type="button"
              className="lce-btn lce-btn-sm"
              style={{ marginLeft: 10 }}
              onClick={() => {
                applyHtml(recoveryDraft, { dirty: true });
                rebuildDocFrom(recoveryDraft);
                setRecoveryDraft(null);
              }}
            >
              Restore them
            </button>
            <button
              type="button"
              className="lce-btn lce-btn-sm"
              style={{ marginLeft: 6 }}
              onClick={() => {
                try { localStorage.removeItem(SAFE_KEY); } catch { /* ignore */ }
                setRecoveryDraft(null);
              }}
            >
              Discard
            </button>
          </div>
        )}

        <div className="lce-body">
          <div className="lce-main">
            {loading ? (
              <div className="lce-loading"><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Loading week {week.weekNumber}…</div>
            ) : mode === 'visual' ? (
              <iframe ref={editIframeRef} className="lce-edit-frame" title={`Edit Week ${week.weekNumber}`} />
            ) : mode === 'html' ? (
              <textarea
                className="lce-html"
                spellCheck={false}
                value={currentHtml}
                onChange={(e) => applyHtml(e.target.value, { dirty: true })}
              />
            ) : mode === 'audio' ? (
              <div className="lce-aud">
                <div className="lce-aud-head">
                  <div>
                    <h3><i className="fas fa-headphones" aria-hidden="true" /> Narration audio</h3>
                    <p className="lce-aud-hint">
                      These are the spoken clips members hear from the “Listen” buttons, in the course voice. A clip is
                      matched to its section by the section’s exact words. You don’t have to generate here —
                      <strong> “Save &amp; publish” already generates any changed or missing clips automatically.</strong>{' '}
                      Use this tab to generate them ahead of time or retry a failed one.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="lce-btn lce-btn-primary"
                    onClick={generateAll}
                    disabled={audioBusy || audioLoading || audioMissingCount === 0}
                    title="Generate every clip that doesn't exist yet"
                  >
                    <i className="fas fa-wand-magic-sparkles" aria-hidden="true" />{' '}
                    {audioMissingCount > 0 ? `Generate all missing (${audioMissingCount})` : 'All sections have audio'}
                  </button>
                </div>

                {jobRunning && activeJob && (
                  <div className="lce-aud-progress">
                    <div className="lce-aud-progress-bar">
                      <span style={{ width: `${activeJob.total ? Math.round((activeJob.done / activeJob.total) * 100) : 0}%` }} />
                    </div>
                    <span className="lce-aud-progress-label">
                      <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Generating {activeJob.done}/{activeJob.total}…
                    </span>
                  </div>
                )}

                {audioLoading ? (
                  <div className="lce-loading"><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Checking which sections have audio…</div>
                ) : audioSections.length === 0 ? (
                  <p className="lce-aud-empty">No narratable sections found in this lesson.</p>
                ) : (
                  <ul className="lce-aud-list">
                    {audioSections.map((s) => {
                      const total = s.chunks.length;
                      const have = s.chunks.filter((c) => existingAudio.has(c.storagePath)).length;
                      const state = have === 0 ? 'none' : have === total ? 'full' : 'partial';
                      const jobItems = activeJob?.items || [];
                      const inJob = jobItems.some((it) => s.chunks.some((c) => c.storagePath === it.storagePath));
                      return (
                        <li key={s.sectionName} className="lce-aud-row">
                          <div className="lce-aud-row-main">
                            <span className={`lce-aud-dot lce-aud-dot--${state}`} aria-hidden="true" />
                            <span className="lce-aud-name">{s.sectionName}</span>
                            <span className="lce-aud-count">
                              {total > 1 ? `${have}/${total} clips` : state === 'full' ? 'has audio' : 'no audio yet'}
                            </span>
                          </div>
                          <div className="lce-aud-row-side">
                            {jobRunning && inJob ? (
                              <span className="lce-aud-chunkstat" aria-hidden="true">
                                {s.chunks.map((c) => {
                                  const it = jobItems.find((x) => x.storagePath === c.storagePath);
                                  const st = it?.status;
                                  const icon =
                                    st === 'done' || st === 'skipped'
                                      ? 'fa-circle-check'
                                      : st === 'error'
                                      ? 'fa-circle-xmark'
                                      : st === 'pending'
                                      ? 'fa-spinner fa-spin'
                                      : 'fa-circle';
                                  return (
                                    <i
                                      key={c.storagePath}
                                      className={`fas ${icon} lce-aud-cs lce-aud-cs--${st || 'idle'}`}
                                      title={`${c.label}${it?.error ? ': ' + it.error : ''}`}
                                    />
                                  );
                                })}
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="lce-btn lce-btn-sm"
                                onClick={() => generateChunks(s.chunks)}
                                disabled={audioBusy || state === 'full'}
                                title={state === 'full' ? 'This section already has audio' : 'Generate the audio for this section'}
                              >
                                <i className="fas fa-microphone" aria-hidden="true" />{' '}
                                {state === 'none' ? 'Generate' : state === 'partial' ? 'Finish' : 'Done'}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : (
              <iframe ref={previewIframeRef} className="lce-preview-frame" title={`Preview Week ${week.weekNumber}`} />
            )}
          </div>

          <aside className="lce-cp-panel">
            <div className="lce-cp-head">
              <h3><i className="fas fa-clock-rotate-left" aria-hidden="true" /> Checkpoints</h3>
              <button type="button" className="lce-btn lce-btn-sm lce-btn-primary" onClick={handleSaveCheckpoint} disabled={busy || loading} title="Save the lesson exactly as it is now">
                <i className="fas fa-plus" aria-hidden="true" /> Save checkpoint
              </button>
            </div>
            <p className="lce-cp-hint">
              A checkpoint saves the lesson exactly as it is now, so you can return to it later. <strong>Open</strong> loads one into the editor to review; <strong>Make live</strong> publishes it right away. Restoring never deletes a checkpoint.
            </p>
            <ul className="lce-cp-list">
              {checkpoints.map((cp) => (
                <li key={cp.id} className="lce-cp">
                  <div className="lce-cp-meta">
                    <span className="lce-cp-title">
                      {cp.kind === 'baseline' && <span className="lce-cp-badge">baseline</span>}
                      {cp.title}
                    </span>
                    <span className="lce-cp-sub">{fmtWhen(cp.createdAt)} · {fmtSize(cp.byteSize)} · {cp.createdBy}</span>
                  </div>
                  <div className="lce-cp-actions">
                    <button type="button" className="lce-btn lce-btn-sm" onClick={() => handleRestore(cp)} title="Load this version into the editor to review (does not publish)">
                      <i className="fas fa-pen" aria-hidden="true" /> Open
                    </button>
                    <button type="button" className="lce-btn lce-btn-sm" onClick={() => handleRestorePublish(cp)} title="Publish this version to the live site now">
                      <i className="fas fa-cloud-arrow-up" aria-hidden="true" /> Make live
                    </button>
                    <button
                      type="button"
                      className={`lce-cp-del ${holdingId === cp.id ? 'holding' : ''}`}
                      onPointerDown={() => startHold(cp)}
                      onPointerUp={cancelHold}
                      onPointerLeave={cancelHold}
                      onPointerCancel={cancelHold}
                      title="Press and hold to delete"
                    >
                      <span className="lce-cp-del-fill" aria-hidden="true" />
                      <span className="lce-cp-del-label"><i className="fas fa-trash" aria-hidden="true" /> Hold to delete</span>
                    </button>
                  </div>
                </li>
              ))}
              {!loading && checkpoints.length === 0 && (
                <li className="lce-cp-empty">No checkpoints yet. Click “Save checkpoint” to create your first restore point.</li>
              )}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LessonContentEditor;
