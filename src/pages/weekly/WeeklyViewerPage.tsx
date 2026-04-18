import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import {
  getWeeklyContent,
  fetchWeeklyFileText,
  getWeeklyFileUrl,
  canViewWeek,
  type WeeklyContent,
  STORAGE_ASSETS_PREFIX,
} from '../../services/weeklyContentService';

// The bundled weekly HTML references styles.css, script.js, auth-config.js,
// and audio/*.mp3. After upload, those live in Storage. We rewrite the HTML
// before handing it to the iframe's srcdoc so every asset resolves to an
// authenticated Firebase download URL.
//
// The audio filename → URL map is computed up-front from the week's
// audioStoragePaths metadata, and an inline script patches the bundle's
// audio constructor to rewrite requests on the fly. No live network calls
// leave the auth boundary.

type Status =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'forbidden'; reason: string }
  | { kind: 'ready'; html: string; content: WeeklyContent };

const WeeklyViewerPage: React.FC = () => {
  const { weekNum } = useParams<{ weekNum: string }>();
  const { user, isAdmin, loading, adminLoading } = useAuth();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (loading || adminLoading) return;
    // Only admins ever trigger content fetches. For non-admins the render
    // below returns <Navigate> before this iframe can appear, AND the Storage
    // rules would reject the fetch anyway, but skipping the call here avoids
    // a pointless 403 round-trip.
    if (!user || !isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const n = parseInt(weekNum || '', 10);
        if (!Number.isFinite(n) || n < 1 || n > 52) {
          if (!cancelled) setStatus({ kind: 'not-found' });
          return;
        }
        const content = await getWeeklyContent(n);
        if (!content) {
          if (!cancelled) setStatus({ kind: 'not-found' });
          return;
        }
        const access = canViewWeek({ content, isAdmin });
        if (!access.allowed) {
          if (!cancelled)
            setStatus({
              kind: 'forbidden',
              reason:
                access.reason === 'unpublished'
                  ? 'This week is not yet published.'
                  : access.reason === 'not-released'
                    ? `This week releases on ${content.releaseDate}.`
                    : 'You do not have permission to view this week.',
            });
          return;
        }

        // Fetch HTML text
        const rawHtml = await fetchWeeklyFileText(content.htmlStoragePath);

        // Signed URLs for shared assets + every audio file this week uses
        const [cssUrl, scriptUrl, ...audioUrls] = await Promise.all([
          getWeeklyFileUrl(`${STORAGE_ASSETS_PREFIX}/styles.css`),
          getWeeklyFileUrl(`${STORAGE_ASSETS_PREFIX}/script.js`),
          ...content.audioStoragePaths.map((p) => getWeeklyFileUrl(p)),
        ]);

        // filename → URL lookup the iframe's Audio() override will use
        const audioMap: Record<string, string> = {};
        content.audioStoragePaths.forEach((p, i) => {
          // Strip prefix so key matches what script.js passes: `audio/xxx.mp3`
          const baseName = p.replace(/^.*\//, ''); // "lcuwkj_part1.mp3"
          audioMap[`audio/${baseName}`] = audioUrls[i];
        });

        const rewritten = rewriteWeeklyHtml(rawHtml, {
          cssUrl,
          scriptUrl,
          audioMap,
        });

        if (!cancelled) setStatus({ kind: 'ready', html: rewritten, content });
      } catch (err: any) {
        console.error('Failed to load week', err);
        if (!cancelled)
          setStatus({
            kind: 'forbidden',
            reason: err?.code === 'storage/unauthorized'
              ? 'You do not have permission to access this content.'
              : 'Failed to load this week. Please try again.',
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weekNum, user, isAdmin, loading, adminLoading]);

  if (loading || adminLoading) {
    return <Layout><div style={{ padding: '6rem 1rem', textAlign: 'center' }}>Loading…</div></Layout>;
  }
  if (!user) return <Navigate to="/admin/login-4f73b2c" replace />;
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;

  if (status.kind === 'loading') {
    return <Layout><div style={{ padding: '6rem 1rem', textAlign: 'center' }}>Loading week {weekNum}…</div></Layout>;
  }
  if (status.kind === 'not-found') {
    return (
      <Layout>
        <div style={{ padding: '6rem 1rem', textAlign: 'center' }}>
          <h2>Week {weekNum} not found</h2>
          <p><Link to="/weekly">Back to weekly list</Link></p>
        </div>
      </Layout>
    );
  }
  if (status.kind === 'forbidden') {
    return (
      <Layout>
        <div style={{ padding: '6rem 1rem', textAlign: 'center' }}>
          <h2>Access blocked</h2>
          <p>{status.reason}</p>
          <p><Link to="/weekly">Back to weekly list</Link></p>
        </div>
      </Layout>
    );
  }

  return (
    <div className="weekly-viewer-page">
      <div className="weekly-viewer-topbar">
        <Link to="/weekly" className="weekly-viewer-back">
          ← All weeks
        </Link>
        <span className="weekly-viewer-title">
          Week {status.content.weekNumber}: {status.content.title}
        </span>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={status.html}
        title={`Week ${status.content.weekNumber}`}
        className="weekly-viewer-iframe"
        allow="autoplay"
      />
    </div>
  );
};

export default WeeklyViewerPage;

// ──────────────────────────────────────────────────────────────────────────────
// HTML rewrite helper (pure, exported for testing).
// ──────────────────────────────────────────────────────────────────────────────

interface RewriteOptions {
  cssUrl: string;
  scriptUrl: string;
  /** Map of iframe-relative audio paths ("audio/xxx.mp3") → signed Storage URL. */
  audioMap: Record<string, string>;
}

export function rewriteWeeklyHtml(html: string, opts: RewriteOptions): string {
  const { cssUrl, scriptUrl, audioMap } = opts;

  // 1. Swap the stylesheet reference.
  let out = html.replace(
    /<link\s+rel=["']stylesheet["']\s+href=["']styles\.css["']\s*\/?>/gi,
    `<link rel="stylesheet" href="${cssUrl}">`,
  );

  // 2. Swap the shared script reference.
  out = out.replace(
    /<script\s+src=["']script\.js["']\s*>\s*<\/script>/gi,
    `<script src="${scriptUrl}"></script>`,
  );

  // 3. Neuter auth-config.js — the client-side password system is gone.
  //    Also strip the sample-bundle visibility override so the page renders.
  out = out.replace(
    /<script\s+src=["']auth-config\.js["']\s*>\s*<\/script>/gi,
    `<script>window.__AUTH_CONFIG__={adminHash:"",courseHash:"",weeks:{}};<\/script>`,
  );

  // 3b. Neutralize in-iframe nav links that point to index.html (or week_N.html).
  //     These are relative to the iframe's srcdoc base, which resolves to
  //     whatever the outer page URL is — causing clicks to navigate the
  //     OUTER React app to /weekly/index.html (which our router treats as a
  //     broken weekNum). We strip the href on .nav-back and .nav-brand so
  //     they stay visible but no longer navigate; the outer topbar provides
  //     "← All weeks" already.
  out = out.replace(
    /<a(\s[^>]*?)class=(["'])([^"']*\bnav-back\b[^"']*)\2([^>]*)>/gi,
    '<a$1class=$2$3$2$4 style="pointer-events:none;visibility:hidden">',
  );
  out = out.replace(
    /<a(\s[^>]*?)class=(["'])([^"']*\bnav-brand\b[^"']*)\2([^>]*)>/gi,
    '<span$1class=$2$3$2$4>',
  ).replace(/<\/a>(\s*<\/div>\s*<div class="nav-controls")/g, '</span>$1');

  // 4. Inject an early script in <head> that:
  //    (a) overrides `fetch` to satisfy the bundle's HEAD-request existence
  //        probes for `audio/xxx.mp3` — the bundle probes with HEAD before
  //        creating an Audio element; we answer with a synthetic audio/mpeg
  //        200 when the path is in our map, 404 otherwise.
  //    (b) overrides the `Audio` constructor so any `new Audio('audio/x.mp3')`
  //        call is transparently redirected to the signed Firebase Storage URL.
  //    (c) pre-reveals page visibility since the client-side auth gate is inert.
  const audioMapJson = JSON.stringify(audioMap);
  const earlyScript = `
<script>
(function(){
  var AUDIO_MAP = ${audioMapJson};

  // (a) fetch override — intercept HEAD probes that the bundle uses to check
  //     whether an audio file exists. Relative paths in srcdoc iframes don't
  //     resolve to anything useful, so we answer them ourselves.
  var origFetch = window.fetch ? window.fetch.bind(window) : null;
  if (origFetch) {
    window.fetch = function(input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var method = (init && init.method) || (typeof input === 'object' && input.method) || 'GET';
        if (method.toUpperCase() === 'HEAD' && typeof url === 'string' && url.indexOf('audio/') === 0) {
          if (AUDIO_MAP[url]) {
            return Promise.resolve(new Response(null, {
              status: 200,
              headers: { 'Content-Type': 'audio/mpeg' }
            }));
          }
          return Promise.resolve(new Response(null, { status: 404 }));
        }
      } catch (e) { /* fall through to real fetch */ }
      return origFetch(input, init);
    };
  }

  // (b) Audio override — bundle calls new Audio('audio/x.mp3'); we redirect
  //     to the signed Storage URL.
  var OrigAudio = window.Audio;
  window.Audio = function(src){
    if (typeof src === 'string' && AUDIO_MAP[src]) src = AUDIO_MAP[src];
    return new OrigAudio(src);
  };
  window.Audio.prototype = OrigAudio.prototype;

  // (c) Make the page visible immediately; no client-side gate delaying us.
  document.documentElement.style.visibility = 'visible';
})();
<\/script>`;
  // Prominence overrides for the per-section narrate buttons and the
  // top-nav #narrate-btn — the bundle defaults to a faint grey border
  // which visitors don't notice. Upgrade to a primary-teal border and
  // a fuller appearance. No idle pulse — intentional, per design feedback.
  const buttonStyleOverrides = `
<style>
  /* Per-section narrate buttons (next to each .accordion-header) */
  .section-narrate-btn {
    opacity: 1 !important;
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    border-width: 2px !important;
    border-color: var(--clr-primary, #2a7a6e) !important;
    background: var(--clr-bg-card, #fff) !important;
    color: var(--clr-primary, #2a7a6e) !important;
    box-shadow: 0 1px 3px rgba(42,122,110,0.20);
    transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
  }
  .section-narrate-btn:hover {
    background: var(--clr-primary, #2a7a6e) !important;
    color: #fff !important;
    transform: scale(1.12);
  }
  .section-narrate-btn[data-state="playing"],
  .section-narrate-btn[data-state="paused"] {
    background: var(--clr-primary, #2a7a6e) !important;
    color: #fff !important;
    border-color: var(--clr-primary-dark, #1e5c53) !important;
  }

  /* Top-nav #narrate-btn — full-lesson narration button next to the
     dark-mode toggle. Same prominence as the per-section buttons. */
  #narrate-btn {
    border-width: 2px !important;
    border-color: var(--clr-primary, #2a7a6e) !important;
    color: var(--clr-primary, #2a7a6e) !important;
    background: var(--clr-bg-card, #fff) !important;
    box-shadow: 0 1px 3px rgba(42,122,110,0.20) !important;
    transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease !important;
  }
  #narrate-btn:hover {
    background: var(--clr-primary, #2a7a6e) !important;
    color: #fff !important;
    transform: scale(1.08);
  }
  /* When actively narrating, the bundle's own .narrating class adds a gold
     pulse — we keep the gold state but override the pulse border/bg to match. */
  #narrate-btn.narrating {
    border-color: var(--clr-accent, #e8a838) !important;
    color: var(--clr-accent, #e8a838) !important;
    background: rgba(232,168,56,0.12) !important;
  }
</style>`;

  // Insert right after <head>
  out = out.replace(/<head(\s[^>]*)?>/i, (m) => m + earlyScript + buttonStyleOverrides);

  return out;
}
