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
import { getMember } from '../../services/memberService';
import { getMemberSessionEmail, clearMemberSession } from '../../services/memberSession';

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

  // Pull member-session email synchronously on mount; the async useEffect
  // below verifies it against the roster before unlocking content.
  const memberEmail = isAdmin ? null : getMemberSessionEmail();
  const hasAccessClaim = isAdmin || !!memberEmail;

  useEffect(() => {
    if (loading || adminLoading) return;
    if (!hasAccessClaim) return;
    let cancelled = false;
    (async () => {
      try {
        // For non-admin members: re-verify the email is still on the
        // roster (admin may have removed them) before fetching content.
        if (!isAdmin && memberEmail) {
          const m = await getMember(memberEmail);
          if (!m) {
            clearMemberSession();
            if (!cancelled) {
              setStatus({
                kind: 'forbidden',
                reason: "Your email is no longer on the 2026 cohort roster. Please sign in again.",
              });
            }
            return;
          }
        }

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
        // canViewWeek lets admins through unconditionally; for non-admins
        // it gates on `published && releaseAt <= now`. So a verified
        // member can view a lesson once it's released, but not before.
        const access = canViewWeek({ content, isAdmin });
        if (!access.allowed) {
          if (!cancelled)
            setStatus({
              kind: 'forbidden',
              reason:
                access.reason === 'unpublished'
                  ? 'This week is not yet published.'
                  : access.reason === 'not-released'
                    ? `This week unlocks on ${content.releaseDate} at 12:00 PM New York time.`
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
  }, [weekNum, user, isAdmin, loading, adminLoading, hasAccessClaim, memberEmail]);

  // Receive messages from the bundle: "back to all weeks" navigation + the
  // iframe's live content-height so we can auto-size the frame (no internal
  // scrollbar; the outer window scrolls the whole page including the bundle).
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data) return;
      if (e.data.__weeklyNav === 'all-weeks') {
        window.location.href = '/weekly';
        return;
      }
      if (typeof e.data.__weeklyIframeHeight === 'number') {
        const el = iframeRef.current;
        if (el) el.style.height = `${e.data.__weeklyIframeHeight}px`;
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
  // Access claim: admin OR a verified-email member session. If neither,
  // send the visitor to /weekly to enter their email rather than to a
  // dead-end "Unauthorized" page.
  if (!hasAccessClaim) return <Navigate to="/weekly" replace />;

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
        // scrolling="no" suppresses the iframe's own scrollbar. The parent
        // resizes the iframe to fit content, so the iframe should never
        // need to scroll. Without this, accordion expand animations briefly
        // race with the postMessage-driven height update and Chrome flashes
        // the iframe scrollbar (visible just left of the page scrollbar).
        scrolling="no"
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
  //    visible above the iframe. Also disable the iframe's internal
  //    scrollbar — the parent resizes the frame to content height so the
  //    outer window does all scrolling.
  //    The bundle's script.js injects the "play full lesson" narrate button
  //    into .top-nav .nav-controls, which would be invisible under
  //    display:none. The early script below relocates it into .toc-actions
  //    so it remains accessible.
  const hideBundleNavCss = `
<style>
  .top-nav, #progress-bar { display: none !important; }
  html, body {
    padding-top: 0 !important;
    overflow: visible !important;
    height: auto !important;
  }
  /* Style the relocated narrate button to match the .toc-btn pill so it sits
     naturally between Expand All / Play All / Print. The base #narrate-btn
     rule in styles.css forces a 36×36 circle with overflow:hidden — we have
     to explicitly reset width/height/min-width/border-radius/overflow or
     the pill collapses into a clipped circle. */
  .toc-actions #narrate-btn {
    width: auto !important;
    height: auto !important;
    min-width: 0 !important;
    overflow: visible !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 0.72rem !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    padding: 0.35rem 0.7rem !important;
    border: 1.5px solid var(--clr-border, #d4d0c8) !important;
    border-radius: 50px !important;
    background: var(--clr-bg, #fff) !important;
    color: var(--clr-text-light, #555) !important;
    cursor: pointer !important;
    white-space: nowrap !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.35em !important;
    line-height: 1 !important;
  }
  .toc-actions #narrate-btn:hover {
    border-color: var(--clr-primary, #2a7a6e) !important;
    color: var(--clr-primary, #2a7a6e) !important;
    background: rgba(42,122,110,0.04) !important;
  }
  .toc-actions #narrate-btn svg {
    width: 0.9em;
    height: 0.9em;
  }
  /* Active states from script.js (data-state) — keep the playing/paused tint
     on the icon but don't break the pill background. */
  .toc-actions #narrate-btn[data-state="playing"],
  .toc-actions #narrate-btn[data-state="paused"] {
    border-color: var(--clr-primary, #2a7a6e) !important;
    color: var(--clr-primary, #2a7a6e) !important;
  }
  /* (#audio-bar styles live on the parent document so the bar can be
     position:fixed against the user's actual viewport — the iframe-side
     CSS deliberately does NOT touch the bar to avoid inflating
     scrollHeight via a positioning feedback loop.) */
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

  // Report live content height to the parent so the iframe can auto-size
  // and the outer window does all the scrolling. ResizeObserver covers
  // accordions opening, images loading, etc.
  //
  // Coalesce calls via requestAnimationFrame so a burst of mutations
  // (e.g., a class flip on accordion-body, then style mutations during
  // the ensuing CSS transition) results in ONE measurement per frame
  // taken after the browser has settled the layout — not a half-stale
  // measurement from the moment the class changed.
  // Coalesce reportHeight calls through requestAnimationFrame so a burst
  // of mutations only produces one measurement per frame, taken after the
  // browser has settled layout.
  //
  // We deliberately exclude documentElement.scrollHeight from the
  // measurement: in srcdoc iframes (and any page with `html { overflow-y:
  // scroll }`, which this bundle sets) <html>.scrollHeight latches at the
  // maximum scrollable area it has ever reported and refuses to shrink.
  // Including it caused the iframe to grow on accordion-open but never
  // shrink on accordion-close, leaving a huge gap above the React footer.
  // body.scrollHeight, body.offsetHeight, and documentElement.offsetHeight
  // all track the live layout correctly.
  var measureScheduled = false;
  function measureAndPost() {
    measureScheduled = false;
    try {
      var b = document.body;
      var h = Math.max(
        b ? b.scrollHeight : 0,
        b ? b.offsetHeight : 0,
        document.documentElement.offsetHeight
      );
      window.parent.postMessage({ __weeklyIframeHeight: h }, '*');
    } catch (err) { /* noop */ }
  }
  function reportHeight() {
    if (measureScheduled) return;
    measureScheduled = true;
    requestAnimationFrame(measureAndPost);
  }
  function startObserving() {
    if (window.ResizeObserver && document.body) {
      new ResizeObserver(reportHeight).observe(document.body);
    }
    // Also catch dynamic content (new nodes appearing). We intentionally
    // do NOT watch attribute/characterData mutations — they fire on every
    // class flip and text-node update (e.g., the audio bar's seek timer)
    // and just spam reportHeight without telling us anything ResizeObserver
    // doesn't already cover.
    if (window.MutationObserver && document.body) {
      new MutationObserver(reportHeight).observe(document.body, {
        childList: true, subtree: true,
      });
    }
    // Final safety net: when any CSS transition ends (notably the
    // accordion-body's max-height transition), force a measurement so we
    // catch the post-transition stable size.
    document.addEventListener('transitionend', reportHeight, true);
    reportHeight();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }
  window.addEventListener('load', reportHeight);

  // ── Audio control bar: graft into the parent document ──────────────────
  // The bundle's #audio-bar is position:fixed, but inside an iframe with
  // scrolling="no" + auto-sized height, "fixed" anchors to the iframe
  // content (the iframe never scrolls), so the bar sits above the React
  // footer instead of tracking the user's viewport. It also can't be
  // repositioned with JS, because position:absolute inside the iframe
  // would feed its top value back into document.scrollHeight and inflate
  // the iframe height (creating a huge gap when accordions collapse).
  //
  // Solution: when script.js creates #audio-bar inside the iframe, move
  // the element into window.parent.document.body. Same-origin srcdoc lets
  // us do this directly, the existing event listeners survive the move,
  // and position:fixed in the parent doc anchors to the real viewport.
  // We also patch document.getElementById on the iframe so script.js's
  // later re-queries (e.g., 'ab-play') still find the relocated element.
  function injectParentAudioCss() {
    if (!window.parent || window.parent === window) return;
    var pDoc;
    try { pDoc = window.parent.document; } catch (e) { return; }
    if (pDoc.getElementById('weekly-bundle-audio-bar-css')) return;
    var st = pDoc.createElement('style');
    st.id = 'weekly-bundle-audio-bar-css';
    st.textContent =
      '#audio-bar{position:fixed;bottom:-60px;left:50%;transform:translateX(-50%);' +
      'z-index:9999;display:flex;align-items:center;gap:0.4rem;padding:0.5rem 0.8rem;' +
      'background:rgba(255,255,255,0.85);-webkit-backdrop-filter:blur(12px) saturate(180%);' +
      'backdrop-filter:blur(12px) saturate(180%);border:1px solid rgba(255,255,255,0.3);' +
      'border-radius:30px;box-shadow:0 4px 24px rgba(0,0,0,0.12);transition:bottom 0.3s ease;' +
      'max-width:400px;width:90%;color:#2d2d2d;font-family:Inter,sans-serif;font-size:0.85rem;}' +
      '#audio-bar.visible{bottom:1.5rem;}' +
      '#audio-bar .audio-bar-btn{background:none;border:none;cursor:pointer;font-size:1.1rem;' +
      'padding:0.2rem 0.3rem;color:#2d2d2d;border-radius:4px;transition:background 0.15s;' +
      'line-height:1;flex-shrink:0;}' +
      '#audio-bar .audio-bar-btn:hover{background:rgba(42,122,110,0.1);}' +
      '#audio-bar #ab-play{width:2rem;text-align:center;}' +
      '#audio-bar .ab-skip{display:inline-flex;align-items:center;gap:1px;}' +
      '#audio-bar .ab-skip-arrow{font-size:0.65rem;}' +
      '#audio-bar .ab-skip-label{font-size:0.6rem;font-weight:700;}' +
      '#audio-bar .audio-bar-close{font-size:1.2rem;margin-left:auto;color:#8a8a8a;}' +
      '#audio-bar #ab-seek{flex:1;height:4px;min-width:60px;accent-color:#2a7a6e;cursor:pointer;}' +
      '#audio-bar #ab-time{font-size:0.7rem;color:#5a5a5a;min-width:45px;text-align:center;}';
    pDoc.head.appendChild(st);
  }
  injectParentAudioCss();

  // Patch getElementById so script.js's later re-queries (the bar lives in
  // parent.document after grafting) still resolve.
  var origGetById = document.getElementById.bind(document);
  document.getElementById = function (id) {
    var local = origGetById(id);
    if (local) return local;
    if (window.parent && window.parent !== window) {
      try { return window.parent.document.getElementById(id); } catch (e) {}
    }
    return null;
  };

  function tryGraftAudioBar() {
    if (!window.parent || window.parent === window) return false;
    // Use the un-patched lookup so we only catch a fresh bar in the iframe.
    var bar = origGetById('audio-bar');
    if (!bar) return false;
    var pDoc;
    try { pDoc = window.parent.document; } catch (e) { return false; }
    // Sweep any stale bar from a previous lesson.
    var leftover = pDoc.getElementById('audio-bar');
    if (leftover && leftover !== bar) {
      try { leftover.remove(); } catch (e) {}
    }
    try { pDoc.body.appendChild(bar); } catch (e) { return false; }
    return true;
  }
  if (!tryGraftAudioBar()) {
    var graftMo = new MutationObserver(function () {
      if (tryGraftAudioBar()) graftMo.disconnect();
    });
    function startGraftWatch() {
      if (document.body) graftMo.observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startGraftWatch);
    } else {
      startGraftWatch();
    }
  }

  // Cleanup: when the iframe is torn down (route change), remove our grafted
  // bar from the parent so the next lesson doesn't see two.
  window.addEventListener('pagehide', function () {
    if (window.parent && window.parent !== window) {
      try {
        var bar = window.parent.document.getElementById('audio-bar');
        if (bar) bar.remove();
        var st = window.parent.document.getElementById('weekly-bundle-audio-bar-css');
        if (st) st.remove();
      } catch (e) {}
    }
  });

  // Relocate the bundle's "play full lesson" narrate button out of the
  // hidden .top-nav and into the visible .toc-actions block. script.js
  // creates the button after DOMContentLoaded with just an SVG icon, so we
  // watch for it, append a "Play All" label, and slot it next to Expand All
  // / Print so it reads naturally in the TOC header.
  function ensurePlayAllLabel(btn) {
    if (btn.querySelector('.play-all-label')) return;
    var span = document.createElement('span');
    span.className = 'play-all-label';
    span.textContent = 'Play All';
    btn.appendChild(span);
  }
  function relocateNarrateBtn() {
    var btn = document.getElementById('narrate-btn');
    if (!btn) return false;
    var actions = document.querySelector('.toc-actions');
    if (!actions) return false;
    ensurePlayAllLabel(btn);
    if (btn.parentElement === actions) return true;
    btn.title = btn.title || 'Play full lesson';
    // Sit between Expand All (first) and Print (last) — order requested by
    // the user: Expand All / Play All / Print.
    var printBtn = actions.querySelector('.print-btn, [onclick*="print"]');
    if (printBtn) {
      actions.insertBefore(btn, printBtn);
    } else {
      actions.appendChild(btn);
    }
    return true;
  }
  // script.js mutates the button's innerHTML on play/pause (replacing the
  // icon), which would clobber our label. Re-append the label whenever
  // the button's contents change.
  function watchNarrateBtn(btn) {
    var lo = new MutationObserver(function(){ ensurePlayAllLabel(btn); });
    lo.observe(btn, { childList: true });
  }
  function tryRelocate() {
    if (relocateNarrateBtn()) {
      var btn = document.getElementById('narrate-btn');
      if (btn) watchNarrateBtn(btn);
      return true;
    }
    return false;
  }
  if (!tryRelocate()) {
    var mo = new MutationObserver(function(){
      if (tryRelocate()) mo.disconnect();
    });
    if (document.documentElement) {
      mo.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

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
