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

        // Google's SIMPLE layout shows "Select Language" until the user
        // picks a language. Since the page IS already in English, showing
        // that phrase is both noisy and misleading — replace it with
        // "English" so the control always reflects the current state.
        // We watch for the first label node and rewrite it on every
        // mutation (Google re-renders on language switch).
        const replaceDefault = () => {
          const label = portal.querySelector<HTMLElement>(
            '.goog-te-menu-value > span:first-child'
          );
          if (label && label.textContent?.trim() === 'Select Language') {
            label.textContent = 'English';
          }
        };
        // Kick once after the widget attaches, then observe for changes.
        window.setTimeout(replaceDefault, 0);
        const labelObserver = new MutationObserver(replaceDefault);
        labelObserver.observe(portal, {
          childList: true,
          subtree: true,
          characterData: true,
        });
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
  }, []);

  return null;
};

export default GoogleTranslate;
