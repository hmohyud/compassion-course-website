import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Observes all <video> elements on the page using IntersectionObserver.
 * - When a video scrolls into view (≥40% visible), it auto-plays (muted).
 * - When it scrolls out of view, it auto-pauses — UNLESS the user manually
 *   clicked play, in which case it keeps playing.
 * - If the user manually pauses, we won't auto-resume on next scroll-in.
 * - Videos with `autoplay` + `loop` (hero bg videos) are skipped.
 * - Uses MutationObserver for dynamically-added videos (SPA navigation).
 *
 * Call once in Layout so it covers all pages.
 */
export function useVideoAutoplay() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Videos the user manually paused — won't auto-resume
    const userPaused = new WeakSet<HTMLVideoElement>();
    // Videos the user manually started — won't auto-pause on scroll-off
    const userPlayed = new WeakSet<HTMLVideoElement>();
    // Track which videos we've already wired up
    const observed = new WeakSet<HTMLVideoElement>();

    function handlePause(e: Event) {
      const video = e.target as HTMLVideoElement;
      if (video.dataset.autoplayPausing === 'true') return;
      // User manually paused
      userPaused.add(video);
      userPlayed.delete(video);
    }

    function handlePlay(e: Event) {
      const video = e.target as HTMLVideoElement;
      if (video.dataset.autoplayStarting !== 'true') {
        // User manually clicked play — respect it, don't auto-pause
        userPaused.delete(video);
        userPlayed.add(video);
      }
    }

    function isNativeAutoplay(video: HTMLVideoElement) {
      return video.loop && video.autoplay;
    }

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (isNativeAutoplay(video)) return;

          if (entry.isIntersecting) {
            // Video scrolled into view — auto-play if user hasn't manually paused
            if (userPaused.has(video)) return;
            // If user is already playing it manually, leave it alone
            if (!video.paused) return;

            video.muted = true;
            video.dataset.autoplayStarting = 'true';
            video.play()
              .catch(() => {
                // Autoplay blocked — user can click play
              })
              .finally(() => {
                delete video.dataset.autoplayStarting;
              });
          } else {
            // Video scrolled out of view
            // Only auto-pause if the user didn't manually start it
            if (!video.paused && !userPlayed.has(video)) {
              video.dataset.autoplayPausing = 'true';
              video.pause();
              requestAnimationFrame(() => {
                delete video.dataset.autoplayPausing;
              });
            }
          }
        });
      },
      { threshold: 0.4 }
    );

    /** Wire up a single video element */
    function setupVideo(video: HTMLVideoElement) {
      if (observed.has(video) || isNativeAutoplay(video)) return;
      observed.add(video);
      video.addEventListener('pause', handlePause);
      video.addEventListener('play', handlePlay);
      intersectionObserver.observe(video);
    }

    /** Scan the DOM for any video elements and wire them up */
    function scanForVideos() {
      document.querySelectorAll('video').forEach((v) => setupVideo(v as HTMLVideoElement));
    }

    // Initial scan (small delay for React render)
    const timer = setTimeout(scanForVideos, 150);

    // Watch for dynamically added videos (SPA page transitions)
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLVideoElement) {
            setupVideo(node);
          }
          if (node instanceof HTMLElement) {
            node.querySelectorAll('video').forEach((v) => setupVideo(v as HTMLVideoElement));
          }
        }
      }
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
      document.querySelectorAll('video').forEach((video) => {
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('play', handlePlay);
      });
    };
  }, [pathname]);
}
