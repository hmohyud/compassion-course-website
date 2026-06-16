import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  type?: string;
}

/**
 * Minimal inline video player used for the marketing-page clips.
 *
 * We intentionally do NOT use the browser's native `controls` UI: these clips
 * stream with `preload="none"` and aren't reliably seekable while playing, so
 * the native scrubber is misleading. Instead we expose just two controls —
 * play/pause and mute/unmute.
 *
 * `playsInline` (+ `muted` default) keeps iOS from hijacking the clip into
 * fullscreen when it autoplays on scroll (see useVideoAutoplay). The element is
 * still a plain <video>, so the scroll autoplay/pause hook keeps working.
 */
export default function VideoPlayer({ src, poster, type = 'video/mp4' }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  // Keep the button state in sync with whatever drives the element — user
  // clicks AND the scroll autoplay hook both fire play/pause/volumechange.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVolume = () => setMuted(v.muted);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('volumechange', onVolume);
    setPlaying(!v.paused);
    setMuted(v.muted);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('volumechange', onVolume);
    };
  }, []);

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
  };

  return (
    <div className="cc-video">
      <video
        ref={ref}
        className="cc-video-el"
        preload="none"
        poster={poster}
        playsInline
        muted
        onClick={togglePlay}
      >
        <source src={src} type={type} />
      </video>
      <div className="cc-video-controls">
        <button
          type="button"
          className="cc-video-btn"
          onClick={togglePlay}
          aria-label={playing ? 'Pause video' : 'Play video'}
        >
          <i className={`fas ${playing ? 'fa-pause' : 'fa-play'}`} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="cc-video-btn"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute video' : 'Mute video'}
        >
          <i className={`fas ${muted ? 'fa-volume-xmark' : 'fa-volume-high'}`} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
