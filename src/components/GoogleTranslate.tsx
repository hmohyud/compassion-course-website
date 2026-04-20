import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (
          options: { pageLanguage: string; layout: number },
          elementId: string
        ) => void;
      };
    };
  }
}

/**
 * Google Translate widget.
 *
 * The widget lives in #google-translate-portal (index.html, outside #root)
 * so React never reconciles it and it survives route changes.
 *
 * Instead of moving the portal into the navbar (which causes it to be
 * destroyed when React unmounts the old Navigation), we keep it in <body>
 * with position:fixed and dynamically set its `left` to the right edge
 * of .nav-logo. This keeps it visually next to the logo on every page.
 */
const GoogleTranslate: React.FC = () => {
  const scriptLoaded = useRef(false);
  const barObserverRef = useRef<MutationObserver | null>(null);

  /** Measure .nav-logo's right edge and position the portal there */
  const positionPortal = useCallback(() => {
    const portal = document.getElementById('google-translate-portal');
    const navLogo = document.querySelector('.nav-logo');
    if (!portal || !navLogo) return;

    const rect = navLogo.getBoundingClientRect();
    portal.style.left = `${rect.right + 8}px`; // 8px gap after logo
  }, []);

  /**
   * Detect the Google Translate top bar and set --gt-bar-height on :root
   * so the navbar + content shift down to avoid being covered.
   * Also toggle .gt-translated on <html> so we can force hamburger nav.
   */
  const updateBarOffset = useCallback(() => {
    // Google's newer translate bar uses this class
    const bar = document.querySelector<HTMLElement>(
      '.VIpgJd-ZVi9od-ORHb-OEVmcd'
    );
    const height = bar && bar.offsetHeight > 0 ? bar.offsetHeight : 0;
    document.documentElement.style.setProperty(
      '--gt-bar-height',
      `${height}px`
    );
    // When the translate bar is visible, add a class so CSS can force mobile nav
    document.documentElement.classList.toggle('gt-translated', height > 0);
  }, []);

  // Position on every render (route change) + listen for resize
  useEffect(() => {
    positionPortal();

    window.addEventListener('resize', positionPortal);
    return () => window.removeEventListener('resize', positionPortal);
  });

  // Watch for the Google Translate bar appearing / disappearing
  useEffect(() => {
    // Initial check
    updateBarOffset();

    // Observe body for Google adding/removing the translate bar
    const observer = new MutationObserver(() => {
      updateBarOffset();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    barObserverRef.current = observer;

    return () => {
      observer.disconnect();
      barObserverRef.current = null;
      // Reset offset when unmounting
      document.documentElement.style.setProperty('--gt-bar-height', '0px');
    };
  }, [updateBarOffset]);

  // One-time: create the widget and load the script
  useEffect(() => {
    if (scriptLoaded.current) return;

    const portal = document.getElementById('google-translate-portal');
    if (!portal) return;

    scriptLoaded.current = true;

    portal.className = 'nav-translate notranslate';
    portal.setAttribute('translate', 'no');

    const translateDiv = document.createElement('div');
    translateDiv.id = 'google_translate_element';
    portal.appendChild(translateDiv);

    window.googleTranslateElementInit = () => {
      if (window.google?.translate) {
        // layout: 2 = SIMPLE — compact dropdown without the "Google
        // Translate" branding text, which saves horizontal space.
        new window.google.translate.TranslateElement(
          { pageLanguage: 'en', layout: 2 },
          'google_translate_element'
        );
      }
    };

    const existing = document.querySelector(
      'script[src*="translate.google.com/translate_a/element.js"]'
    );
    if (existing) {
      if (window.google?.translate) {
        window.googleTranslateElementInit();
      }
      return;
    }

    // Retry the loader a couple of times if it fails (transient network
    // errors). Without this, the widget just silently disappears.
    function tryLoad(attempt: number) {
      const script = document.createElement('script');
      script.src =
        'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.onerror = () => {
        script.remove();
        if (attempt < 2) {
          window.setTimeout(() => tryLoad(attempt + 1), 800 * (attempt + 1));
        }
      };
      document.body.appendChild(script);
    }
    tryLoad(0);

    // Re-anchor Google's language-picker iframe to the viewport. Google
    // writes absolute `left`/`top` inline on the iframe every time it
    // opens, which can push it off-screen on narrow viewports. CSS
    // `!important` loses because inline styles of the same priority
    // beat class selectors. The only robust fix is to observe the
    // iframe's `style` attribute and overwrite its position once Google
    // has placed it.
    const MARGIN = 8;
    const MAX_POPUP_WIDTH = 480;

    function injectScrollCss(frame: HTMLIFrameElement) {
      // Google's picker content is a wide single-row table (~2600px)
      // that gets hard-clipped when we clamp the iframe's width. Inject
      // CSS that allows HORIZONTAL scroll inside the iframe while
      // letting the iframe grow to the content's natural height (we
      // resize the iframe element itself in sizeFrameHeight below).
      try {
        const d = frame.contentDocument;
        if (!d || !d.head) return;
        if (d.head.querySelector('style[data-cc-scroll]')) return;
        const style = d.createElement('style');
        style.setAttribute('data-cc-scroll', '1');
        style.textContent = `
          html, body {
            margin: 0 !important;
            overflow-x: auto !important;
            overflow-y: visible !important;
            -webkit-overflow-scrolling: touch;
            font-family: 'DM Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif !important;
            background: #fff !important;
          }
          /* Language links inside the grid — subtle hover to match site. */
          a {
            text-decoration: none !important;
            color: #3f3f46 !important;
            font-size: 13px !important;
            padding: 4px 8px !important;
            display: inline-block;
            border-radius: 4px !important;
            transition: background 0.12s ease, color 0.12s ease;
          }
          a:hover {
            background: #ecfdf5 !important;
            color: #0d9488 !important;
          }
        `;
        d.head.appendChild(style);
      } catch { /* cross-origin — ignore */ }
    }

    function sizeFrameHeight(frame: HTMLIFrameElement) {
      // Size the iframe element to match its content's intrinsic height
      // so there's no vertical scrollbar — user gets horizontal scroll
      // only. Bail silently on cross-origin.
      try {
        const d = frame.contentDocument;
        if (!d) return;
        const h = Math.max(
          d.body?.scrollHeight || 0,
          d.documentElement?.scrollHeight || 0,
        );
        if (h > 0) {
          frame.style.setProperty('height', `${h}px`, 'important');
        }
      } catch { /* cross-origin — ignore */ }
    }

    function anchorFrame(frame: HTMLIFrameElement) {
      if (!portal) return;
      const triggerRect = portal.getBoundingClientRect();
      const maxFrameWidth = Math.min(MAX_POPUP_WIDTH, window.innerWidth - MARGIN * 2);
      const naturalWidth = frame.offsetWidth || maxFrameWidth;
      const frameWidth = Math.max(160, Math.min(naturalWidth, maxFrameWidth));
      const idealLeft = triggerRect.left;
      const maxLeft = window.innerWidth - frameWidth - MARGIN;
      const left = Math.max(MARGIN, Math.min(idealLeft, maxLeft));
      // position:fixed so the popup stays anchored to the navbar
      // (which is itself position:fixed) as the user scrolls. No
      // scrollY offset needed — viewport-relative coordinates.
      const top = triggerRect.bottom + 4;
      frame.style.setProperty('position', 'fixed', 'important');
      frame.style.setProperty('left', `${left}px`, 'important');
      frame.style.setProperty('top', `${top}px`, 'important');
      frame.style.setProperty('width', `${frameWidth}px`, 'important');
      frame.style.setProperty('max-width', `${maxFrameWidth}px`, 'important');
      frame.style.setProperty('right', 'auto', 'important');
      injectScrollCss(frame);
      sizeFrameHeight(frame);
    }

    const tracked = new WeakSet<HTMLIFrameElement>();

    function isPickerCandidate(frame: HTMLIFrameElement): boolean {
      // Match the legacy class AND any iframe Google inserts with
      // `.skiptranslate`. Google's newer SIMPLE-layout picker uses
      // hashed classnames (e.g. `VIpgJd-ZVi9od-xl07Ob-OEVmcd`)
      // instead of the documented `.goog-te-menu-frame` — but those
      // hashes churn, so we key off `.skiptranslate`, which has been
      // stable across Google UI revisions.
      if (frame.classList.contains('goog-te-menu-frame')) return true;
      if (frame.classList.contains('skiptranslate')) return true;
      return false;
    }

    function shouldAnchor(frame: HTMLIFrameElement): boolean {
      // The translate banner bar ALSO carries `.skiptranslate` and sits
      // pinned to the top with near-full-width. Don't move it.
      const rect = frame.getBoundingClientRect();
      const isTopBanner = rect.top < 20 && rect.width > window.innerWidth * 0.8;
      return !isTopBanner;
    }

    function trackFrame(frame: HTMLIFrameElement) {
      if (tracked.has(frame)) return;
      tracked.add(frame);
      if (shouldAnchor(frame)) anchorFrame(frame);
      const styleObs = new MutationObserver(() => {
        if (shouldAnchor(frame)) anchorFrame(frame);
      });
      styleObs.observe(frame, { attributes: true, attributeFilter: ['style'] });
    }

    function pickerFrames(): HTMLIFrameElement[] {
      return [...document.querySelectorAll<HTMLIFrameElement>('iframe')]
        .filter(isPickerCandidate);
    }

    const bodyObserver = new MutationObserver(() => {
      pickerFrames().forEach(trackFrame);
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    // Also re-anchor every known frame on viewport resize so the popup
    // doesn't get stranded off-screen when the user resizes while it's
    // open.
    function onResize() {
      pickerFrames().forEach((f) => { if (shouldAnchor(f)) anchorFrame(f); });
    }
    window.addEventListener('resize', onResize);
  }, []);

  return null;
};

export default GoogleTranslate;
