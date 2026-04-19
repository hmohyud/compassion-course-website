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

  // Hide the outer Google Translate widget while the weekly viewer is mounted.
  // The iframe has its own Select Language control, and the outer portal has
  // no .nav-logo to anchor against on this page, so it appears floating at
  // top-left and misbehaves on click.
  useEffect(() => {
    document.body.classList.add('weekly-viewer-active');
    return () => {
      document.body.classList.remove('weekly-viewer-active');
    };
  }, []);

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
          parentOrigin: window.location.origin,
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

  // Handle in-iframe navigation requests forwarded via postMessage. The
  // iframe can't reliably navigate the parent directly (srcdoc has no real
  // URL, target="_parent" is flaky across browsers), so we listen here.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data && e.data.__weeklyNav === 'all-weeks') {
        window.location.href = '/weekly';
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (loading || adminLoading) {
    return <div className="weekly-viewer-loading">Loading…</div>;
  }
  if (!user) return <Navigate to="/admin/login-4f73b2c" replace />;
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;

  if (status.kind === 'loading') {
    return <div className="weekly-viewer-loading">Loading week {weekNum}…</div>;
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
  /** Parent window's origin, used for postMessage-based "back to weekly" nav. */
  parentOrigin: string;
}

export function rewriteWeeklyHtml(html: string, opts: RewriteOptions): string {
  const { cssUrl, scriptUrl, audioMap, parentOrigin } = opts;

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

  // 3b. Flag in-iframe nav links that point to index.html with a data attr
  //     so the early script can postMessage the parent to navigate. We avoid
  //     target="_parent" + /weekly since srcdoc has no base URL and Chrome
  //     sometimes resolves those to about:blank#blocked.
  out = out.replace(
    /<a(\s[^>]*?)href=["']index\.html["']([^>]*)>/gi,
    '<a$1href="#" data-weekly-nav="all-weeks"$2>',
  );

  // 3c. Inject the Google Translate mount point into the iframe's .nav-controls
  //     (before the dark-mode toggle), so the language picker sits cleanly next
  //     to the night-mode + narrate buttons. The bundle already defines
  //     window.googleTranslateElementInit; we just need the <div> + the Google
  //     loader script (both missing from the bundle HTML).
  out = out.replace(
    /(<div\s+class=["']nav-controls["'][^>]*>)/i,
    `$1<div id="google_translate_element" class="nav-translate notranslate" translate="no"></div>`,
  );
  // Append the Google Translate loader before </body>.
  out = out.replace(
    /<\/body>/i,
    `<script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async></script></body>`,
  );

  // 4. Inject an early script in <head> that:
  //    (a) overrides `fetch` to satisfy the bundle's HEAD-request existence
  //        probes for `audio/xxx.mp3` — the bundle probes with HEAD before
  //        creating an Audio element; we answer with a synthetic audio/mpeg
  //        200 when the path is in our map, 404 otherwise.
  //    (b) overrides the `Audio` constructor so any `new Audio('audio/x.mp3')`
  //        call is transparently redirected to the signed Firebase Storage URL.
  //    (c) pre-reveals page visibility since the client-side auth gate is inert.
  //    (d) intercepts all anchor clicks: "#hash" does smooth scroll (srcdoc
  //        reloads on hash nav, which was the "in this week button refreshes
  //        the page" bug); links flagged with data-weekly-nav postMessage to
  //        the parent so React Router can navigate cleanly.
  const audioMapJson = JSON.stringify(audioMap);
  const parentOriginJson = JSON.stringify(parentOrigin);
  const earlyScript = `
<script>
(function(){
  var AUDIO_MAP = ${audioMapJson};
  var PARENT_ORIGIN = ${parentOriginJson};

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

  // (d) Click interceptor for in-iframe anchors.
  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;

    // "Back to all weeks" — postMessage the parent.
    if (a.getAttribute('data-weekly-nav') === 'all-weeks') {
      e.preventDefault();
      try {
        window.parent.postMessage({ __weeklyNav: 'all-weeks' }, PARENT_ORIGIN);
      } catch (err) { /* ignore */ }
      return;
    }

    // In-page hash links — smooth scroll instead of hash navigation (srcdoc
    // reloads the whole frame when the hash changes).
    var href = a.getAttribute('href');
    if (href && href.charAt(0) === '#' && href.length > 1) {
      var id = href.slice(1);
      var target = document.getElementById(id) || document.querySelector('[name="' + id + '"]');
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, true);
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

  /* Language picker (Google Translate) — sits in .nav-controls, styled to
     match the other nav buttons. Hide the "Powered by Google" branding and
     shrink the default Google widget to a compact pill. */
  #google_translate_element {
    display: inline-flex;
    align-items: center;
  }
  #google_translate_element .goog-te-gadget {
    font-size: 0 !important;
    line-height: 0 !important;
    color: transparent !important;
    margin: 0 !important;
  }
  #google_translate_element .goog-te-gadget > span,
  #google_translate_element .goog-logo-link,
  #google_translate_element .goog-te-gadget-icon {
    display: none !important;
  }
  #google_translate_element .goog-te-gadget-simple {
    background: var(--clr-bg-card, #fff) !important;
    border: 2px solid var(--clr-primary, #2a7a6e) !important;
    border-radius: 999px !important;
    padding: 4px 10px !important;
    font-size: 13px !important;
    line-height: 1 !important;
    color: var(--clr-primary, #2a7a6e) !important;
    cursor: pointer;
    display: inline-flex !important;
    align-items: center !important;
    box-shadow: 0 1px 3px rgba(42,122,110,0.20);
  }
  #google_translate_element .goog-te-gadget-simple:hover {
    background: var(--clr-primary, #2a7a6e) !important;
    color: #fff !important;
  }
  #google_translate_element .goog-te-gadget-simple:hover .goog-te-menu-value span {
    color: #fff !important;
  }
  #google_translate_element .goog-te-menu-value {
    color: inherit !important;
    margin: 0 !important;
  }
  #google_translate_element .goog-te-menu-value span {
    color: inherit !important;
    border: 0 !important;
    font-weight: 500 !important;
  }
  /* Hide the tiny dropdown-arrow span Google inserts so only the label shows. */
  #google_translate_element .goog-te-menu-value span:nth-child(2),
  #google_translate_element .goog-te-menu-value span:nth-child(3),
  #google_translate_element .goog-te-menu-value span:nth-child(4) {
    display: none !important;
  }
  /* Hide Google's top banner/frame so it never pushes the iframe content. */
  .goog-te-banner-frame.skiptranslate,
  body > .skiptranslate {
    display: none !important;
  }
  body { top: 0 !important; }
</style>`;

  // Insert right after <head>
  out = out.replace(/<head(\s[^>]*)?>/i, (m) => m + earlyScript + buttonStyleOverrides);

  return out;
}
