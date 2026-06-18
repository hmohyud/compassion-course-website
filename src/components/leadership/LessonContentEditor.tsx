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

type Mode = 'visual' | 'html' | 'preview';
type Msg = { type: 'success' | 'error' | 'info'; text: string } | null;

const HOLD_MS = 900;

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

  const docRef = useRef<Document | null>(null);
  const htmlRef = useRef('');
  const lastSafeRef = useRef('');
  const editIframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const sanityTimer = useRef<number | null>(null);
  const inputTimer = useRef<number | null>(null);
  const holdTimer = useRef<number | null>(null);

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

  // Cleanup timers on unmount.
  useEffect(
    () => () => {
      if (sanityTimer.current) window.clearTimeout(sanityTimer.current);
      if (inputTimer.current) window.clearTimeout(inputTimer.current);
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, renderToken, cssUrl]);

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
        setMsg({
          type: checkpoints.length === 0 ? 'info' : 'success',
          text:
            checkpoints.length === 0
              ? 'Saved & live on next page load. Tip: use "Save checkpoint" to keep restore points.'
              : 'Saved. Live on next page load — open lessons need a refresh.',
        });
        onSaved?.();
      } catch (e: any) {
        setMsg({ type: 'error', text: `Save failed: ${e?.message || e}` });
      } finally {
        setSaving(false);
      }
    },
    [user, mode, flushVisual, week.weekNumber, week.title, htmlPath, checkpoints.length, persistSafe, onSaved],
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
          </div>
          <div className="lce-bar-right">
            <button type="button" className="lce-btn lce-btn-primary" onClick={() => doSave()} disabled={saving || loading} title="Upload your changes to the live site">
              <i className="fas fa-cloud-arrow-up" aria-hidden="true" /> {saving ? 'Saving…' : 'Save & publish'}
            </button>
            <button type="button" className="lce-btn lce-btn-ghost" onClick={attemptClose} aria-label="Close editor" title="Close">
              <i className="fas fa-xmark" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="lce-subbar">
          <div className="lce-hint">
            {mode === 'visual' && (<><i className="fas fa-hand-pointer" aria-hidden="true" /> Click any text in the page below to edit it directly.</>)}
            {mode === 'html' && (<><i className="fas fa-code" aria-hidden="true" /> Advanced: edit the raw HTML. The safety check still runs as you type.</>)}
            {mode === 'preview' && (<><i className="fas fa-eye" aria-hidden="true" /> This is exactly what members will see — switch to “Edit text” to make changes.</>)}
          </div>
          <div className="lce-subbar-right">
            <span className={`lce-savestate ${dirty ? 'is-dirty' : ''}`}>
              <i className={`fas ${dirty ? 'fa-circle' : 'fa-circle-check'}`} aria-hidden="true" /> {dirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
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
