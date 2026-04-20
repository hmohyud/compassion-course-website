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
    // has placed it. See docs/research in this PR.
    function anchorFrame(frame: HTMLIFrameElement) {
      if (!portal) return;
      const triggerRect = portal.getBoundingClientRect();
      const frameWidth = frame.offsetWidth || 200;
      const margin = 8;
      // Prefer the trigger's left edge; shift left if that would run
      // the iframe past the viewport's right side.
      const idealLeft = triggerRect.left;
      const maxLeft = window.innerWidth - frameWidth - margin;
      const left = Math.max(margin, Math.min(idealLeft, maxLeft));
      const top = triggerRect.bottom + window.scrollY + 4;
      frame.style.setProperty('left', `${left}px`, 'important');
      frame.style.setProperty('top', `${top}px`, 'important');
      frame.style.setProperty('max-width', `calc(100vw - ${margin * 2}px)`, 'important');
    }

    const bodyObserver = new MutationObserver(() => {
      document
        .querySelectorAll<HTMLIFrameElement>('iframe.goog-te-menu-frame')
        .forEach((frame) => {
          if (frame.dataset.ccAnchored) return;
          frame.dataset.ccAnchored = '1';
          // Re-anchor whenever Google rewrites this iframe's style.
          const styleObs = new MutationObserver(() => anchorFrame(frame));
          styleObs.observe(frame, { attributes: true, attributeFilter: ['style'] });
          // Anchor immediately on first sighting too.
          anchorFrame(frame);
        });
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }, []);

  return null;
};

export default GoogleTranslate;
