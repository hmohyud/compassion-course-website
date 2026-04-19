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

// Weekly viewer: a normal React page (like LearnMorePage or AboutPage),
// Layout-wrapped, with the bundle rendered inside a srcdoc iframe for CSS
// and JS isolation. The site's React Navigation + Footer surround it; the
// bundle's own .top-nav is hidden because we don't need two navs.
//
// The bundled HTML references styles.css, script.js, auth-config.js, and
// audio/*.mp3 relatively. We rewrite the static refs to signed Firebase
// Storage URLs before feeding it to srcdoc. Audio HEAD probes and
// new Audio('audio/x.mp3') calls are intercepted inside the iframe via
// an injected early script.

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

        const rawHtml = await fetchWeeklyFileText(content.htmlStoragePath);

        const [cssUrl, scriptUrl, ...audioUrls] = await Promise.all([
          getWeeklyFileUrl(`${STORAGE_ASSETS_PREFIX}/styles.css`),
          getWeeklyFileUrl(`${STORAGE_ASSETS_PREFIX}/script.js`),
          ...content.audioStoragePaths.map((p) => getWeeklyFileUrl(p)),
        ]);

        const audioMap: Record<string, string> = {};
        content.audioStoragePaths.forEach((p, i) => {
          const baseName = p.replace(/^.*\//, '');
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

  // Receive the "back to all weeks" signal from the bundle and route via
  // React Router — keeps the SPA state intact instead of a full page load.
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
    return (
      <Layout>
        <div style={{ padding: '6rem 1rem', textAlign: 'center' }}>Loading…</div>
      </Layout>
    );
  }
  if (!user) return <Navigate to="/admin/login-4f73b2c" replace />;
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;

  if (status.kind === 'loading') {
    return (
      <Layout>
        <div style={{ padding: '6rem 1rem', textAlign: 'center' }}>
          Loading week {weekNum}…
        </div>
      </Layout>
    );
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
    <Layout>
      <iframe
        ref={iframeRef}
        srcDoc={status.html}
        title={`Week ${status.content.weekNumber}`}
        className="weekly-viewer-iframe"
        allow="autoplay"
      />
    </Layout>
  );
};

export default WeeklyViewerPage;

// ──────────────────────────────────────────────────────────────────────────────
// HTML rewrite helper.
// ──────────────────────────────────────────────────────────────────────────────

interface RewriteOptions {
  cssUrl: string;
  scriptUrl: string;
  /** Map of relative audio paths ("audio/xxx.mp3") → signed Storage URL. */
  audioMap: Record<string, string>;
}

export function rewriteWeeklyHtml(html: string, opts: RewriteOptions): string {
  const { cssUrl, scriptUrl, audioMap } = opts;

  // 1. Stylesheet → signed Storage URL.
  let out = html.replace(
    /<link\s+rel=["']stylesheet["']\s+href=["']styles\.css["']\s*\/?>/gi,
    `<link rel="stylesheet" href="${cssUrl}">`,
  );

  // 2. script.js → signed Storage URL.
  out = out.replace(
    /<script\s+src=["']script\.js["']\s*>\s*<\/script>/gi,
    `<script src="${scriptUrl}"></script>`,
  );

  // 3. auth-config.js → inert stub (the client-side password gate is gone).
  out = out.replace(
    /<script\s+src=["']auth-config\.js["']\s*>\s*<\/script>/gi,
    `<script>window.__AUTH_CONFIG__={adminHash:"",courseHash:"",weeks:{}};<\/script>`,
  );

  // 4. Flag the bundle's "← All Weeks" / brand links so the early script can
  //    postMessage the parent to navigate via React Router.
  out = out.replace(
    /<a(\s[^>]*?)href=["']index\.html["']([^>]*)>/gi,
    '<a$1href="#" data-weekly-nav="all-weeks"$2>',
  );

  // 5. Hide the bundle's own top-nav since the outer React Nav is already
  //    visible above the iframe. One nav is enough.
  const hideBundleNavCss = `
<style>
  .top-nav, #progress-bar { display: none !important; }
  body { padding-top: 0 !important; }
</style>`;

  // 6. Early script: intercept audio HEAD probes, redirect new Audio() calls,
  //    intercept "#hash" TOC clicks (scrollIntoView instead of srcdoc reload),
  //    intercept "all-weeks" link clicks (postMessage parent).
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
              status: 200, headers: { 'Content-Type': 'audio/mpeg' }
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

  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;

    if (a.getAttribute('data-weekly-nav') === 'all-weeks') {
      e.preventDefault();
      try { window.parent.postMessage({ __weeklyNav: 'all-weeks' }, '*'); } catch (err) {}
      return;
    }

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

  out = out.replace(/<head(\s[^>]*)?>/i, (m) => m + earlyScript + hideBundleNavCss);

  return out;
}
