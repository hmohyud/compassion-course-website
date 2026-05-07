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
     naturally between Expand All / Play All / Print. */
  .toc-actions #narrate-btn {
    font-family: 'Inter', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0.35rem 0.7rem;
    border: 1.5px solid var(--clr-border, #d4d0c8);
    border-radius: 50px;
    background: var(--clr-bg, #fff);
    color: var(--clr-text-light, #555);
    cursor: pointer;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    line-height: 1;
  }
  .toc-actions #narrate-btn:hover {
    border-color: var(--clr-primary, #2a7a6e);
    color: var(--clr-primary, #2a7a6e);
    background: rgba(42,122,110,0.04);
  }
  .toc-actions #narrate-btn svg {
    width: 0.9em;
    height: 0.9em;
  }
  /* Active states from script.js (data-state) — keep the playing/paused tint
     on the icon but don't break the pill background. */
  .toc-actions #narrate-btn[data-state="playing"],
  .toc-actions #narrate-btn[data-state="paused"] {
    border-color: var(--clr-primary, #2a7a6e);
    color: var(--clr-primary, #2a7a6e);
  }
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
  function reportHeight() {
    try {
      var h = Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0,
        document.documentElement.offsetHeight,
        document.body ? document.body.offsetHeight : 0
      );
      window.parent.postMessage({ __weeklyIframeHeight: h }, '*');
    } catch (err) { /* noop */ }
  }
  function startObserving() {
    if (window.ResizeObserver && document.body) {
      new ResizeObserver(reportHeight).observe(document.body);
    }
    // Also catch dynamic content that doesn't trigger ResizeObserver.
    if (window.MutationObserver && document.body) {
      new MutationObserver(reportHeight).observe(document.body, {
        childList: true, subtree: true, attributes: true, characterData: true,
      });
    }
    reportHeight();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }
  window.addEventListener('load', reportHeight);

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
