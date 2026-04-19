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

// This page is special. After the admin check passes we replace the *whole*
// document with the bundle HTML via document.write — no iframe, no srcdoc,
// no blob URL. That gives the bundle a real document at /weekly/:n, which
// means Google Translate, hash anchors (#concept TOC links), back/forward,
// and relative links all behave natively. Earlier iframe-based approaches
// tripped on srcdoc's lack of a base URL (mixed-content warnings from
// Google Translate's empty form action, forced reloads on hash nav, etc.).
//
// The bundled weekly HTML references styles.css, script.js, auth-config.js,
// and audio/*.mp3 relatively. We rewrite those to signed Firebase Storage
// URLs before writing the HTML to the document. audio/*.mp3 URLs are
// intercepted at runtime by an override of `window.Audio` + `window.fetch`
// because the bundle probes them with a HEAD request first.

type Status =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'forbidden'; reason: string }
  | { kind: 'ready'; html: string; content: WeeklyContent };

const WeeklyViewerPage: React.FC = () => {
  const { weekNum } = useParams<{ weekNum: string }>();
  const { user, isAdmin, loading, adminLoading } = useAuth();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const didReplaceDocRef = useRef(false);

  // Hide the outer Google Translate widget while the viewer is mounted, so it
  // doesn't flash before document.write takes over.
  useEffect(() => {
    document.body.classList.add('weekly-viewer-active');
    return () => {
      document.body.classList.remove('weekly-viewer-active');
    };
  }, []);

  useEffect(() => {
    if (loading || adminLoading) return;
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

        // Fetch HTML + script.js as text (script inlined so document.write
        // doesn't treat it as a parser-blocking cross-site script, which
        // Chrome silently blocks). styles.css stays as a <link>.
        const [rawHtml, scriptJsText, cssUrl, ...audioUrls] = await Promise.all([
          fetchWeeklyFileText(content.htmlStoragePath),
          fetchWeeklyFileText(`${STORAGE_ASSETS_PREFIX}/script.js`),
          getWeeklyFileUrl(`${STORAGE_ASSETS_PREFIX}/styles.css`),
          ...content.audioStoragePaths.map((p) => getWeeklyFileUrl(p)),
        ]);

        const audioMap: Record<string, string> = {};
        content.audioStoragePaths.forEach((p, i) => {
          const baseName = p.replace(/^.*\//, '');
          audioMap[`audio/${baseName}`] = audioUrls[i];
        });

        const rewritten = rewriteWeeklyHtml(rawHtml, {
          cssUrl,
          scriptJsText,
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

  // Once the HTML is ready, replace the current document entirely. After this
  // runs the React app is effectively unmounted and the bundle owns the page.
  useEffect(() => {
    if (status.kind !== 'ready') return;
    if (didReplaceDocRef.current) return;
    didReplaceDocRef.current = true;
    // document.open/write/close blanks the current document and installs the
    // new HTML. The URL bar keeps /weekly/:n.
    document.open();
    document.write(status.html);
    document.close();
  }, [status]);

  if (loading || adminLoading) {
    return <div className="weekly-viewer-loading">Loading…</div>;
  }
  if (!user) return <Navigate to="/admin/login-4f73b2c" replace />;
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;

  if (status.kind === 'loading' || status.kind === 'ready') {
    // For 'ready', the useEffect above will replace the document on the next
    // tick. Render a neutral loader in the meantime so there's no flash.
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
  return (
    <Layout>
      <div style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <h2>Access blocked</h2>
        <p>{status.reason}</p>
        <p><Link to="/weekly">Back to weekly list</Link></p>
      </div>
    </Layout>
  );
};

export default WeeklyViewerPage;

// ──────────────────────────────────────────────────────────────────────────────
// HTML rewrite helper (pure, exported for testing).
// ──────────────────────────────────────────────────────────────────────────────

interface RewriteOptions {
  cssUrl: string;
  /** Full text of the bundle's script.js — inlined into the HTML. */
  scriptJsText: string;
  /** Map of relative audio paths ("audio/xxx.mp3") → signed Storage URL. */
  audioMap: Record<string, string>;
}

export function rewriteWeeklyHtml(html: string, opts: RewriteOptions): string {
  const { cssUrl, scriptJsText, audioMap } = opts;

  // 1. Swap the stylesheet reference (a <link> is fine; only scripts are
  //    affected by Chrome's document.write cross-site blocking).
  let out = html.replace(
    /<link\s+rel=["']stylesheet["']\s+href=["']styles\.css["']\s*\/?>/gi,
    `<link rel="stylesheet" href="${cssUrl}">`,
  );

  // 2. Inline the bundle's script.js. Using <script src=...> to Firebase
  //    Storage gets silently blocked by Chrome when it's reached via
  //    document.write (parser-blocking cross-site script heuristic).
  //    Escape any "</script>" inside the JS so it doesn't close our tag.
  const safeScriptJs = scriptJsText.replace(/<\/script>/gi, '<\\/script>');
  out = out.replace(
    /<script\s+src=["']script\.js["']\s*>\s*<\/script>/gi,
    `<script>${safeScriptJs}</script>`,
  );

  // 3. Neuter auth-config.js — the client-side password system is gone.
  out = out.replace(
    /<script\s+src=["']auth-config\.js["']\s*>\s*<\/script>/gi,
    `<script>window.__AUTH_CONFIG__={adminHash:"",courseHash:"",weeks:{}};<\/script>`,
  );

  // 3b. The bundle's "← All Weeks" and brand links point at index.html. At
  //     /weekly/:n those would resolve to /weekly/index.html (404). Rewrite
  //     them to /weekly — a normal browser navigation that loads the React
  //     list page.
  out = out.replace(
    /<a(\s[^>]*?)href=["']index\.html["']([^>]*)>/gi,
    '<a$1href="/weekly"$2>',
  );

  // 3c. Inject the Google Translate mount point into .nav-controls (before
  //     the dark-mode toggle) so the language picker sits between the moon
  //     toggle and the narrate button — the spot the user liked. The bundle
  //     already defines window.googleTranslateElementInit; we just need the
  //     <div> and the loader script.
  out = out.replace(
    /(<div\s+class=["']nav-controls["'][^>]*>)/i,
    `$1<div id="google_translate_element" class="nav-translate notranslate" translate="no"></div>`,
  );
  // Load the Google Translate element.js dynamically via appendChild — this
  // is NOT subject to Chrome's document.write cross-site blocking, so the
  // widget actually initializes.
  out = out.replace(
    /<\/body>/i,
    `<script>(function(){
  function load(){
    var s=document.createElement('script');
    s.src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async=true;
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();<\/script></body>`,
  );

  // 4. Early-head script that:
  //    (a) overrides `fetch` to satisfy the bundle's HEAD probes for
  //        audio/*.mp3 — those files only exist in Storage via signed URLs.
  //    (b) overrides `window.Audio` to redirect new Audio('audio/x.mp3')
  //        calls to their signed URL.
  //    (c) reveals the page immediately since the old client-side gate is
  //        inert.
  const audioMapJson = JSON.stringify(audioMap);
  const earlyScript = `
<script>
(function(){
  var AUDIO_MAP = ${audioMapJson};

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
      } catch (e) { /* fall through */ }
      return origFetch(input, init);
    };
  }

  var OrigAudio = window.Audio;
  window.Audio = function(src){
    if (typeof src === 'string' && AUDIO_MAP[src]) src = AUDIO_MAP[src];
    return new OrigAudio(src);
  };
  window.Audio.prototype = OrigAudio.prototype;

  document.documentElement.style.visibility = 'visible';
})();
<\/script>`;

  // Prominence overrides for the narrate buttons + the language picker.
  const styleOverrides = `
<style>
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
  #narrate-btn.narrating {
    border-color: var(--clr-accent, #e8a838) !important;
    color: var(--clr-accent, #e8a838) !important;
    background: rgba(232,168,56,0.12) !important;
  }

  /* Language picker — compact pill matching the narrate buttons. */
  #google_translate_element { display: inline-flex; align-items: center; }
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
  #google_translate_element .goog-te-menu-value span:nth-child(2),
  #google_translate_element .goog-te-menu-value span:nth-child(3),
  #google_translate_element .goog-te-menu-value span:nth-child(4) {
    display: none !important;
  }
  .goog-te-banner-frame.skiptranslate,
  body > .skiptranslate { display: none !important; }
  body { top: 0 !important; }
</style>`;

  // Insert after <head>.
  out = out.replace(/<head(\s[^>]*)?>/i, (m) => m + earlyScript + styleOverrides);

  return out;
}
