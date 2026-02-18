import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  hasGlow: boolean;
}

interface ShootingStar {
  x: number;
  y: number;
  angle: number;
  speed: number;
  length: number;
  life: number;
  maxLife: number;
  alpha: number;
}

const STAR_COUNT = 220;
const SHOOTING_STAR_INTERVAL = 8; // seconds between shooting stars

const StarrySky: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const rafRef = useRef<number>(0);
  const lastShootingRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const hero = canvas.parentElement;
    if (!hero) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Generate stars once
    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      // Most stars small, a few medium, rare large
      const r = Math.random();
      const radius = r < 0.7 ? 0.4 + Math.random() * 0.8
                   : r < 0.92 ? 1.0 + Math.random() * 0.6
                   : 1.5 + Math.random() * 0.5;
      stars.push({
        x: Math.random(),
        y: Math.random(),
        radius,
        baseAlpha: 0.5 + Math.random() * 0.5,
        twinkleSpeed: 0.4 + Math.random() * 2.0,
        twinklePhase: Math.random() * Math.PI * 2,
        hasGlow: radius > 1.3,
      });
    }
    starsRef.current = stars;

    // Resize handling
    const dpr = Math.min(window.devicePixelRatio, 2);
    const resize = () => {
      const rect = hero.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(hero);

    // Spawn a shooting star
    const spawnShootingStar = () => {
      shootingStarsRef.current.push({
        x: Math.random() * 0.6 + 0.1,
        y: Math.random() * 0.3 + 0.05,
        angle: Math.PI * 0.15 + Math.random() * 0.3,
        speed: 0.15 + Math.random() * 0.2,
        length: 100 + Math.random() * 150,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.6,
        alpha: 0.7 + Math.random() * 0.3,
      });
    };

    // Animation loop
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const dt = 1 / 60;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw stars
      for (const star of starsRef.current) {
        const alpha = prefersReducedMotion
          ? star.baseAlpha
          : Math.max(
              0.15,
              Math.min(
                1.0,
                star.baseAlpha +
                  0.25 *
                    Math.sin(elapsed * star.twinkleSpeed + star.twinklePhase)
              )
            );

        const sx = star.x * w;
        const sy = star.y * h;

        // Soft glow for brighter stars
        if (star.hasGlow && !prefersReducedMotion) {
          const glowRadius = star.radius * dpr * 5;
          const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowRadius);
          gradient.addColorStop(0, `rgba(200, 220, 255, ${alpha * 0.3})`);
          gradient.addColorStop(1, 'rgba(200, 220, 255, 0)');
          ctx.beginPath();
          ctx.arc(sx, sy, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Star dot
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }

      // Shooting stars
      if (!prefersReducedMotion) {
        if (elapsed - lastShootingRef.current > SHOOTING_STAR_INTERVAL) {
          spawnShootingStar();
          lastShootingRef.current = elapsed;
        }

        const active: ShootingStar[] = [];
        for (const ss of shootingStarsRef.current) {
          ss.life += dt;
          if (ss.life > ss.maxLife) continue;

          const progress = ss.life / ss.maxLife;
          const fadeAlpha = progress < 0.15
            ? progress / 0.15
            : 1 - (progress - 0.15) / 0.85;

          const currentX = (ss.x + Math.cos(ss.angle) * ss.speed * ss.life) * w;
          const currentY = (ss.y + Math.sin(ss.angle) * ss.speed * ss.life) * h;
          const tailX = currentX - Math.cos(ss.angle) * ss.length * dpr * fadeAlpha;
          const tailY = currentY - Math.sin(ss.angle) * ss.length * dpr * fadeAlpha;

          const gradient = ctx.createLinearGradient(tailX, tailY, currentX, currentY);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
          gradient.addColorStop(1, `rgba(255, 255, 255, ${ss.alpha * fadeAlpha})`);

          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(currentX, currentY);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.5 * dpr;
          ctx.stroke();

          // Bright head
          ctx.beginPath();
          ctx.arc(currentX, currentY, 1.5 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${ss.alpha * fadeAlpha})`;
          ctx.fill();

          active.push(ss);
        }
        shootingStarsRef.current = active;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) {
      animate(performance.now());
    } else {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="starry-sky-canvas"
      aria-hidden="true"
    />
  );
};

export default StarrySky;
