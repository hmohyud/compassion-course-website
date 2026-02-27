import { useEffect } from 'react';

/**
 * Observes elements with the `.reveal` class and adds `.visible`
 * when they scroll into view (IntersectionObserver, threshold 0.05).
 * rootMargin extends the trigger zone 50px below the viewport
 * so elements begin revealing slightly before they enter view.
 * Call once per page/layout mount.
 */
export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px 50px 0px' }
    );

    const elements = document.querySelectorAll('.reveal, .reveal-bounce');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
