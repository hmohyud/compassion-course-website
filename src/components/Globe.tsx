import { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { MARKER_POINTS } from '../data/markerPoints';

const PI = Math.PI;
const GLOBE_RADIUS = 0.8; // cobe's hardcoded sphere radius in normalized space

// Matches cobe's exact lat/lon → 3D → rotate → 2D projection
function projectPoint(
  lat: number,
  lon: number,
  phi: number,   // cobe phi = horizontal rotation (Y-axis spin)
  theta: number, // cobe theta = vertical tilt (X-axis)
  size: number,  // canvas pixel size (already multiplied by dpr)
  scale: number  // cobe scale config value
): [number, number, boolean] {
  // 1. Lat/lon to 3D — matches cobe's mapMarkers conversion exactly
  const latRad = lat * PI / 180;
  const lonRad = lon * PI / 180 - PI; // cobe subtracts PI from longitude
  const cosLat = Math.cos(latRad);
  const px3d = -cosLat * Math.cos(lonRad);
  const py3d = Math.sin(latRad);
  const pz3d = cosLat * Math.sin(lonRad);

  // 2. Apply cobe's rotation matrix: p * rotate(theta, phi)
  const cx = Math.cos(theta);
  const cy = Math.cos(phi);
  const sx = Math.sin(theta);
  const sy = Math.sin(phi);

  // Row-vector * matrix (p * rot) — confirmed working
  const rx = px3d * cy        + py3d * 0   + pz3d * sy;
  const ry = px3d * (sy * sx) + py3d * cx  + pz3d * (-cy * sx);
  const rz = px3d * (-sy * cx) + py3d * sx + pz3d * (cy * cx);

  // 3. Visibility: front-facing if z > 0
  const visible = rz > 0.05;

  // 4. Project to 2D screen — cobe uses orthographic projection
  const halfSize = size / 2;
  const pixelScale = halfSize * GLOBE_RADIUS * scale;
  const screenX = halfSize + rx * pixelScale;
  const screenY = halfSize - ry * pixelScale; // Y is flipped (screen Y goes down)

  return [screenX, screenY, visible];
}

const Globe: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(500);

  // Smooth drag state
  const pointerDown = useRef(false);
  const lastPointerX = useRef(0);
  const velocity = useRef(0);
  const targetPhi = useRef(0);
  const smoothPhi = useRef(0);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setCanvasSize(Math.min(width, 600));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !overlayRef.current) return;

    const width = canvasSize;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const theta = 0.25;
    const globeScale = 1.05;

    // Setup overlay canvas
    const overlay = overlayRef.current;
    const ctx = overlay.getContext('2d')!;
    overlay.width = width * dpr;
    overlay.height = width * dpr;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: dpr,
      width: width * dpr,
      height: width * dpr,
      phi: 0,
      theta: theta,
      dark: 0,
      diffuse: 1.4,
      mapSamples: 50000,
      mapBrightness: 4,
      baseColor: [0.96, 0.95, 0.93],
      markerColor: [0.059, 0.216, 0.376],
      glowColor: [0.9, 0.95, 0.92],
      markers: [],
      scale: globeScale,
      offset: [0, 0],
      onRender: (state) => {
        // Smooth rotation with momentum
        if (!pointerDown.current) {
          // Auto-rotate + momentum decay
          velocity.current *= 0.95; // friction
          targetPhi.current += 0.0012 + velocity.current;
        }

        // Lerp smoothPhi toward targetPhi for buttery interpolation
        smoothPhi.current += (targetPhi.current - smoothPhi.current) * 0.15;

        state.phi = smoothPhi.current;
        state.width = width * dpr;
        state.height = width * dpr;

        // Draw location dots on overlay
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        const canvasPixels = width * dpr;
        for (let i = 0; i < MARKER_POINTS.length; i++) {
          const [lat, lon] = MARKER_POINTS[i];
          const [px, py, visible] = projectPoint(lat, lon, smoothPhi.current, theta, canvasPixels, globeScale);

          if (!visible) continue;

          ctx.beginPath();
          ctx.arc(px, py, 2 * dpr, 0, PI * 2);
          ctx.fillStyle = 'rgba(239, 142, 47, 0.9)';
          ctx.fill();
        }
      },
    });

    const onPointerDown = (e: PointerEvent) => {
      pointerDown.current = true;
      lastPointerX.current = e.clientX;
      velocity.current = 0;
      if (overlayRef.current) overlayRef.current.style.cursor = 'grabbing';
    };

    const onPointerUp = () => {
      pointerDown.current = false;
      if (overlayRef.current) overlayRef.current.style.cursor = 'grab';
    };

    const onPointerOut = () => {
      pointerDown.current = false;
      if (overlayRef.current) overlayRef.current.style.cursor = 'grab';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDown.current) return;
      const delta = e.clientX - lastPointerX.current;
      lastPointerX.current = e.clientX;
      const dragSpeed = delta / 150;
      targetPhi.current += dragSpeed;
      velocity.current = dragSpeed; // capture velocity for momentum
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pointerDown.current || !e.touches[0]) return;
      const delta = e.touches[0].clientX - lastPointerX.current;
      lastPointerX.current = e.touches[0].clientX;
      const dragSpeed = delta / 150;
      targetPhi.current += dragSpeed;
      velocity.current = dragSpeed;
    };

    // Attach events to overlay (top layer)
    overlay.addEventListener('pointerdown', onPointerDown);
    overlay.addEventListener('pointerup', onPointerUp);
    overlay.addEventListener('pointerout', onPointerOut);
    overlay.addEventListener('pointermove', onPointerMove);
    overlay.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      globe.destroy();
      overlay.removeEventListener('pointerdown', onPointerDown);
      overlay.removeEventListener('pointerup', onPointerUp);
      overlay.removeEventListener('pointerout', onPointerOut);
      overlay.removeEventListener('pointermove', onPointerMove);
      overlay.removeEventListener('touchmove', onTouchMove);
    };
  }, [canvasSize]);

  return (
    <div className="globe-container" ref={containerRef}>
      <div className="globe-glow" />
      <div
        className="globe-canvas-wrap"
        style={{
          width: canvasSize,
          height: canvasSize,
          maxWidth: '100%',
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          className="globe-canvas"
          style={{
            width: canvasSize,
            height: canvasSize,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
        <canvas
          ref={overlayRef}
          className="globe-canvas"
          style={{
            width: canvasSize,
            height: canvasSize,
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: 'grab',
          }}
        />
      </div>
    </div>
  );
};

export default Globe;
