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

  /** Measure .nav-logo's right edge and position the portal there */
  const positionPortal = useCallback(() => {
    const portal = document.getElementById('google-translate-portal');
    const navLogo = document.querySelector('.nav-logo');
    if (!portal || !navLogo) return;

    const rect = navLogo.getBoundingClientRect();
    portal.style.left = `${rect.right + 8}px`; // 8px gap after logo
  }, []);

  // Position on every render (route change) + listen for resize
  useEffect(() => {
    positionPortal();

    window.addEventListener('resize', positionPortal);
    return () => window.removeEventListener('resize', positionPortal);
  });

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
        new window.google.translate.TranslateElement(
          { pageLanguage: 'en', layout: 0 },
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

    const script = document.createElement('script');
    script.src =
      'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return null;
};

export default GoogleTranslate;
