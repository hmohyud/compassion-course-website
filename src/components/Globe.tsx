import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { clusterMarkers, type MarkerCluster } from '../data/markerPoints';

const PI = Math.PI;

// Auto-tour: min interval between auto-selections (ms)
const AUTO_SELECT_INTERVAL = 5000;
// After user interaction, wait this long before resuming auto-select
const AUTO_SELECT_RESUME_MS = 15000;
// How long each auto-selected tooltip stays visible
const AUTO_SELECT_DURATION = 3500;

// Convert lat/lon to 3D position on unit sphere
function latLonToVec3(lat: number, lon: number, radius = 1): THREE.Vector3 {
  const phi = (90 - lat) * (PI / 180);
  const theta = (lon + 180) * (PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Generate a clean marker texture with subtle outer ring
function createMarkerTexture(size = 64, color = '239, 142, 47'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const center = size / 2;
  const radius = size * 0.3;

  // Outer glow
  const gradient = ctx.createRadialGradient(center, center, radius * 0.6, center, center, radius * 1.5);
  gradient.addColorStop(0, `rgba(${color}, 0.5)`);
  gradient.addColorStop(1, `rgba(${color}, 0)`);
  ctx.beginPath();
  ctx.arc(center, center, radius * 1.5, 0, PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // White outline ring
  ctx.beginPath();
  ctx.arc(center, center, radius + 1, 0, PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fill();

  // Solid core
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, PI * 2);
  ctx.fillStyle = `rgba(${color}, 1)`;
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface TooltipData {
  visible: boolean;
  dotX: number;
  dotY: number;
  spriteIdx: number; // index of the selected sprite for live tracking
  dotBehind: boolean; // true when dot is on back side of globe
  names: string[];
  count: number;
}

const MOBILE_BREAKPOINT = 1080;

const Globe: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cloudCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(500);
  const [isMobile, setIsMobile] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false, dotX: 0, dotY: 0, spriteIdx: -1, dotBehind: false, names: [], count: 0,
  });
  const [globeReady, setGlobeReady] = useState(false);

  // Refs for animation state
  const pointerDown = useRef(false);
  const lastPointerX = useRef(0);
  const pointerStartX = useRef(0);
  const pointerStartY = useRef(0);
  const pointerStartTime = useRef(0);
  const velocity = useRef(0);
  const targetPhi = useRef(0);
  const smoothPhi = useRef(0);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const markersRef = useRef<THREE.Sprite[]>([]);
  const markerGroupRef = useRef<THREE.Group | null>(null);
  const clustersRef = useRef<MarkerCluster[]>([]);
  const cloudDrift = useRef(0);
  const frameId = useRef(0);
  const raycaster = useRef(new THREE.Raycaster());
  const tooltipRef = useRef(tooltip);
  tooltipRef.current = tooltip;
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  const hoveredIdx = useRef(-1);
  const baseScales = useRef<number[]>([]);

  // Passive auto-select state — selects markers as they cross the front of the globe
  const autoSelectEnabled = useRef(true);  // false after user clicks/drags
  const lastAutoSelectTime = useRef(0);
  const lastAutoSelectIdx = useRef(-1);    // avoid re-selecting the same marker
  const autoSelectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInteractionTime = useRef(0);
  const userHasSelected = useRef(false);   // true once user manually clicks a marker

  // Responsive sizing + mobile detection
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setCanvasSize(Math.min(width, 720));
      }
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle click on marker
  const handleMarkerClick = useCallback((event: PointerEvent) => {
    if (isMobileRef.current) return; // disable dot selection on mobile
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.current.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.current.intersectObjects(markersRef.current);

    if (intersects.length > 0) {
      const sprite = intersects[0].object as THREE.Sprite;
      const idx = markersRef.current.indexOf(sprite);
      if (idx >= 0 && clustersRef.current[idx]) {
        // Don't allow clicking dots on the back side of the globe
        const worldPos = sprite.getWorldPosition(new THREE.Vector3());
        const camToOrigin = cameraRef.current.position.clone().negate().normalize();
        const markerDir = worldPos.clone().normalize();
        if (camToOrigin.dot(markerDir) > 0.15) return; // behind globe

        const cluster = clustersRef.current[idx];
        const projected = worldPos.clone().project(cameraRef.current);
        const screenX = (projected.x * 0.5 + 0.5) * rect.width;
        const screenY = (-projected.y * 0.5 + 0.5) * rect.height;

        setTooltip({
          visible: true,
          dotX: screenX,
          dotY: screenY,
          spriteIdx: idx,
          dotBehind: false,
          names: cluster.names,
          count: cluster.count,
        });
        return;
      }
    }

    setTooltip(prev => prev.visible ? { ...prev, visible: false, spriteIdx: -1, dotBehind: false } : prev);
  }, []);

  // Main Three.js setup
  useEffect(() => {
    if (!canvasRef.current || !cloudCanvasRef.current) return;

    const width = canvasSize;
    const dpr = Math.min(window.devicePixelRatio, 2);

    // --- Main Scene (earth + markers) ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // --- Cloud Scene (clouds only, rendered to separate canvas) ---
    const cloudScene = new THREE.Scene();

    // --- Camera (shared) ---
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 3.45);
    cameraRef.current = camera;

    // --- Main Renderer ---
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, width);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // --- Cloud Renderer (separate canvas, sits above hand overlay) ---
    const cloudRenderer = new THREE.WebGLRenderer({
      canvas: cloudCanvasRef.current,
      alpha: true,
      antialias: false,
    });
    cloudRenderer.setPixelRatio(dpr);
    cloudRenderer.setSize(width, width);
    cloudRenderer.outputColorSpace = THREE.SRGBColorSpace;

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(2, 1, 3);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xc4dff6, 0.3);
    fillLight.position.set(-2, -0.5, -1);
    scene.add(fillLight);

    // --- Texture Loader ---
    const loader = new THREE.TextureLoader();

    // --- Earth Sphere ---
    const earthGeom = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      shininess: 15,
      specular: new THREE.Color(0x333333),
    });
    const earthMesh = new THREE.Mesh(earthGeom, earthMat);
    scene.add(earthMesh);

    loader.load('/textures/earth-day.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      earthMat.needsUpdate = true;
      setGlobeReady(true);
    });
    loader.load('/textures/earth-topology.png', (tex) => {
      earthMat.bumpMap = tex;
      earthMat.bumpScale = 0.02;
      earthMat.needsUpdate = true;
    });

    // --- Cloud Sphere (in cloud scene only) ---
    const cloudGeom = new THREE.SphereGeometry(1.02, 48, 48);
    const cloudMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
    cloudScene.add(cloudMesh);

    loader.load('/images/earth-clouds.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      cloudMat.map = tex;
      cloudMat.needsUpdate = true;
    });

    // --- Density Markers ---
    const clusters = clusterMarkers(3);
    clustersRef.current = clusters;
    const markerTexture = createMarkerTexture(64, '239, 142, 47');   // orange
    const hoverTexture = createMarkerTexture(64, '196, 74, 26');     // dark orange-red #c44a1a
    const sprites: THREE.Sprite[] = [];
    const maxCount = Math.max(...clusters.map(c => c.count));

    const scales: number[] = [];
    for (const cluster of clusters) {
      const mat = new THREE.SpriteMaterial({
        map: markerTexture,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const sprite = new THREE.Sprite(mat);

      const pos = latLonToVec3(cluster.lat, cluster.lon, 1.005);
      sprite.position.copy(pos);

      // Density sizing — small to medium dots with glow
      const normalizedCount = Math.log2(cluster.count + 1) / Math.log2(maxCount + 1);
      const scale = 0.022 + normalizedCount * 0.05;
      sprite.scale.set(scale, scale, 1);
      scales.push(scale);

      sprite.userData.clusterIndex = sprites.length;
      scene.add(sprite);
      sprites.push(sprite);
    }
    markersRef.current = sprites;
    baseScales.current = scales;

    // Tilt + marker group
    const thetaTilt = 0.25;
    earthMesh.rotation.x = thetaTilt;
    cloudMesh.rotation.x = thetaTilt;

    const markerGroup = new THREE.Group();
    markerGroup.rotation.x = thetaTilt;
    markerGroupRef.current = markerGroup;
    for (const s of sprites) {
      scene.remove(s);
      markerGroup.add(s);
    }
    scene.add(markerGroup);

    // --- Animation Loop ---
    const animate = () => {
      frameId.current = requestAnimationFrame(animate);

      if (!pointerDown.current) {
        velocity.current *= 0.95;
        targetPhi.current += 0.0006 + velocity.current;
      }
      smoothPhi.current += (targetPhi.current - smoothPhi.current) * 0.15;
      cloudDrift.current += 0.00012; // slow independent drift

      earthMesh.rotation.y = smoothPhi.current;
      markerGroup.rotation.y = smoothPhi.current;
      // Clouds: slow horizontal drift + gentle vertical tilt that changes over time
      cloudMesh.rotation.y = smoothPhi.current * 0.25 + cloudDrift.current;
      cloudMesh.rotation.x = thetaTilt + Math.sin(cloudDrift.current * 0.8) * 0.06; // slow up-down drift
      cloudMesh.rotation.z = Math.sin(cloudDrift.current * 0.4) * 0.03; // subtle axial wobble

      renderer.render(scene, camera);
      cloudRenderer.render(cloudScene, camera);

      // Live-track the selected sprite for tooltip stem
      const tt = tooltipRef.current;
      if (tt.visible && tt.spriteIdx >= 0 && tt.spriteIdx < sprites.length) {
        const sprite = sprites[tt.spriteIdx];
        const worldPos = sprite.getWorldPosition(new THREE.Vector3());
        const projected = worldPos.clone().project(camera);
        const sx = (projected.x * 0.5 + 0.5) * width;
        const sy = (-projected.y * 0.5 + 0.5) * width;

        // Check if dot is on back side of globe
        const camToOrigin = camera.position.clone().negate().normalize();
        const markerDir = worldPos.clone().normalize();
        const facingDot = camToOrigin.dot(markerDir);
        const isBehind = facingDot > 0.15;

        setTooltip(prev => {
          if (!prev.visible || prev.spriteIdx !== tt.spriteIdx) return prev;
          const posChanged = Math.abs(prev.dotX - sx) >= 0.5 || Math.abs(prev.dotY - sy) >= 0.5;
          const behindChanged = prev.dotBehind !== isBehind;
          if (!posChanged && !behindChanged) return prev;
          return { ...prev, dotX: sx, dotY: sy, dotBehind: isBehind };
        });
      }

      // --- Passive auto-select: pick markers crossing the front center ---
      const now = Date.now();
      if (
        autoSelectEnabled.current &&
        !userHasSelected.current &&
        !pointerDown.current &&
        !isMobileRef.current &&
        !tt.visible &&
        now - lastAutoSelectTime.current > AUTO_SELECT_INTERVAL
      ) {
        // camToOrigin points from camera toward globe center: (0,0,-1)
        // For front-facing markers, camToOrigin.dot(markerDir) is negative
        // So we use -dot to get a positive value for front-facing markers
        const camToOrigin = camera.position.clone().negate().normalize();
        let bestIdx = -1;
        let bestScore = -Infinity;

        for (let i = 0; i < sprites.length; i++) {
          if (i === lastAutoSelectIdx.current) continue;
          const wp = sprites[i].getWorldPosition(new THREE.Vector3());
          const dir = wp.clone().normalize();
          const behindCheck = camToOrigin.dot(dir);
          // behindCheck > 0 means behind globe, < 0 means front-facing
          // We want front-facing markers: behindCheck should be well negative
          if (behindCheck > -0.3) continue; // skip anything not clearly front-facing
          const frontScore = -behindCheck; // higher = more directly facing camera
          if (frontScore > bestScore) {
            const cluster = clusters[i];
            if (cluster && cluster.count >= 3) {
              bestScore = frontScore;
              bestIdx = i;
            }
          }
        }

        if (bestIdx >= 0) {
          lastAutoSelectTime.current = now;
          lastAutoSelectIdx.current = bestIdx;
          const sprite = sprites[bestIdx];
          const worldPos = sprite.getWorldPosition(new THREE.Vector3());
          const projected = worldPos.clone().project(camera);
          const sx = (projected.x * 0.5 + 0.5) * width;
          const sy = (-projected.y * 0.5 + 0.5) * width;
          const cluster = clusters[bestIdx];

          setTooltip({
            visible: true,
            dotX: sx,
            dotY: sy,
            spriteIdx: bestIdx,
            dotBehind: false,
            names: cluster.names,
            count: cluster.count,
          });

          // Auto-dismiss after duration
          if (autoSelectTimer.current) clearTimeout(autoSelectTimer.current);
          autoSelectTimer.current = setTimeout(() => {
            setTooltip(prev =>
              prev.spriteIdx === bestIdx
                ? { ...prev, visible: false, spriteIdx: -1, dotBehind: false }
                : prev
            );
          }, AUTO_SELECT_DURATION);
        }
      }
    };
    animate();

    // --- Pointer Interaction (on cloud canvas since it's on top) ---
    const interactCanvas = cloudCanvasRef.current!;

    const onPointerDown = (e: PointerEvent) => {
      pointerDown.current = true;
      lastPointerX.current = e.clientX;
      pointerStartX.current = e.clientX;
      pointerStartY.current = e.clientY;
      pointerStartTime.current = Date.now();
      velocity.current = 0;
      interactCanvas.style.cursor = 'grabbing';
      // Pause auto-select, resume after inactivity
      autoSelectEnabled.current = false;
      lastInteractionTime.current = Date.now();
      if (autoSelectTimer.current) clearTimeout(autoSelectTimer.current);
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerStartX.current;
      const dy = e.clientY - pointerStartY.current;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const elapsed = Date.now() - pointerStartTime.current;

      pointerDown.current = false;
      interactCanvas.style.cursor = 'grab';

      if (dist < 5 && elapsed < 400) {
        handleMarkerClick(e);
        userHasSelected.current = true;  // user manually clicked
      }

      // Resume auto-select after inactivity
      setTimeout(() => {
        if (Date.now() - lastInteractionTime.current >= AUTO_SELECT_RESUME_MS - 100) {
          autoSelectEnabled.current = true;
          userHasSelected.current = false;
        }
      }, AUTO_SELECT_RESUME_MS);
    };

    const onPointerOut = () => {
      pointerDown.current = false;
      interactCanvas.style.cursor = 'grab';
      // Reset hover
      if (hoveredIdx.current >= 0) {
        const oldS = baseScales.current[hoveredIdx.current];
        if (oldS) sprites[hoveredIdx.current]?.scale.set(oldS, oldS, 1);
        (sprites[hoveredIdx.current]?.material as THREE.SpriteMaterial).map = markerTexture;
        hoveredIdx.current = -1;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerDown.current) {
        // Dragging — rotate globe
        const delta = e.clientX - lastPointerX.current;
        lastPointerX.current = e.clientX;
        const dragSpeed = delta / 150;
        targetPhi.current += dragSpeed;
        velocity.current = dragSpeed;
        setTooltip(prev => prev.visible ? { ...prev, visible: false, spriteIdx: -1, dotBehind: false } : prev);
        // Reset hover during drag
        if (hoveredIdx.current >= 0) {
          const oldS = baseScales.current[hoveredIdx.current];
          if (oldS) sprites[hoveredIdx.current]?.scale.set(oldS, oldS, 1);
          (sprites[hoveredIdx.current]?.material as THREE.SpriteMaterial).map = markerTexture;
          hoveredIdx.current = -1;
          interactCanvas.style.cursor = 'grabbing';
        }
      } else {
        // Not dragging — check hover on markers (disabled on mobile)
        if (isMobileRef.current) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || !cameraRef.current) return;
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.current.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.current.intersectObjects(sprites);

        let hitIdx = intersects.length > 0
          ? sprites.indexOf(intersects[0].object as THREE.Sprite)
          : -1;

        // Don't hover dots on back side of globe
        if (hitIdx >= 0) {
          const wp = sprites[hitIdx].getWorldPosition(new THREE.Vector3());
          const camToOrigin = camera.position.clone().negate().normalize();
          if (camToOrigin.dot(wp.clone().normalize()) > 0.15) hitIdx = -1;
        }

        if (hitIdx !== hoveredIdx.current) {
          // Unhover previous
          if (hoveredIdx.current >= 0) {
            const oldS = baseScales.current[hoveredIdx.current];
            if (oldS) sprites[hoveredIdx.current]?.scale.set(oldS, oldS, 1);
            (sprites[hoveredIdx.current]?.material as THREE.SpriteMaterial).map = markerTexture;
          }
          // Hover new — enlarge + swap to coral texture
          if (hitIdx >= 0) {
            const s = baseScales.current[hitIdx];
            if (s) sprites[hitIdx].scale.set(s * 1.6, s * 1.6, 1);
            (sprites[hitIdx].material as THREE.SpriteMaterial).map = hoverTexture;
            interactCanvas.style.cursor = 'pointer';
          } else {
            interactCanvas.style.cursor = 'grab';
          }
          hoveredIdx.current = hitIdx;
        }
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      pointerDown.current = true;
      lastPointerX.current = e.touches[0].clientX;
      pointerStartX.current = e.touches[0].clientX;
      pointerStartY.current = e.touches[0].clientY;
      pointerStartTime.current = Date.now();
      velocity.current = 0;
      autoSelectEnabled.current = false;
      lastInteractionTime.current = Date.now();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pointerDown.current || !e.touches[0]) return;
      const delta = e.touches[0].clientX - lastPointerX.current;
      lastPointerX.current = e.touches[0].clientX;
      const dragSpeed = delta / 150;
      targetPhi.current += dragSpeed;
      velocity.current = dragSpeed;
    };

    const onTouchEnd = () => {
      pointerDown.current = false;
      setTimeout(() => {
        if (Date.now() - lastInteractionTime.current >= AUTO_SELECT_RESUME_MS - 100) {
          autoSelectEnabled.current = true;
          userHasSelected.current = false;
        }
      }, AUTO_SELECT_RESUME_MS);
    };

    interactCanvas.addEventListener('pointerdown', onPointerDown);
    interactCanvas.addEventListener('pointerup', onPointerUp);
    interactCanvas.addEventListener('pointerout', onPointerOut);
    interactCanvas.addEventListener('pointermove', onPointerMove);
    interactCanvas.addEventListener('touchstart', onTouchStart, { passive: true });
    interactCanvas.addEventListener('touchmove', onTouchMove, { passive: true });
    interactCanvas.addEventListener('touchend', onTouchEnd);

    return () => {
      cancelAnimationFrame(frameId.current);
      interactCanvas.removeEventListener('pointerdown', onPointerDown);
      interactCanvas.removeEventListener('pointerup', onPointerUp);
      interactCanvas.removeEventListener('pointerout', onPointerOut);
      interactCanvas.removeEventListener('pointermove', onPointerMove);
      interactCanvas.removeEventListener('touchstart', onTouchStart);
      interactCanvas.removeEventListener('touchmove', onTouchMove);
      interactCanvas.removeEventListener('touchend', onTouchEnd);

      renderer.dispose();
      cloudRenderer.dispose();
      earthGeom.dispose();
      earthMat.dispose();
      cloudGeom.dispose();
      cloudMat.dispose();
      markerTexture.dispose();
      hoverTexture.dispose();
      for (const s of sprites) {
        (s.material as THREE.SpriteMaterial).dispose();
      }
    };
  }, [canvasSize, handleMarkerClick]);

  const tooltipName = tooltip.names.length > 0
    ? tooltip.names[0]
    : 'This region';
  const tooltipExtra = tooltip.names.length > 1
    ? ` +${tooltip.names.length - 1} more`
    : '';

  // Fixed tooltip anchor position (top-right area of the globe canvas)
  const tooltipAnchorX = canvasSize * 0.82;
  const tooltipAnchorY = canvasSize * 0.08;

  return (
    <div className="globe-container notranslate" translate="no" ref={containerRef}>
      <div
        className={`globe-canvas-wrap${globeReady ? ' globe-ready' : ''}`}
        style={{
          width: canvasSize,
          height: canvasSize,
          maxWidth: '100%',
          position: 'relative',
        }}
      >
        <div className="globe-glow" />
        {/* Main canvas: earth + markers */}
        <canvas
          ref={canvasRef}
          className="globe-canvas"
          style={{
            width: canvasSize,
            height: canvasSize,
          }}
        />
        {/* Cloud canvas: layered above hand (z-index 2) via CSS */}
        <canvas
          ref={cloudCanvasRef}
          className="globe-cloud-layer"
          style={{
            width: canvasSize,
            height: canvasSize,
            cursor: 'grab',
          }}
        />
        {/* SVG stem line connecting tooltip to dot — z-index drops behind globe when dot is on back */}
        {!isMobile && tooltip.visible && (
          <svg
            className="globe-tooltip-stem"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: canvasSize,
              height: canvasSize,
              pointerEvents: 'none',
              zIndex: tooltip.dotBehind ? -1 : 3,
            }}
          >
            <line
              x1={tooltipAnchorX}
              y1={tooltipAnchorY + 30}
              x2={tooltip.dotX}
              y2={tooltip.dotY}
              stroke="rgba(239, 142, 47, 0.7)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <circle
              cx={tooltip.dotX}
              cy={tooltip.dotY}
              r={tooltip.dotBehind ? 2.5 : 3.5}
              fill={tooltip.dotBehind ? 'none' : 'rgba(239, 142, 47, 0.9)'}
              stroke={tooltip.dotBehind ? 'rgba(239, 142, 47, 0.5)' : 'white'}
              strokeWidth={tooltip.dotBehind ? 1 : 1.5}
            />
          </svg>
        )}
        <div
          className={`globe-tooltip ${!isMobile && tooltip.visible ? 'visible' : ''}`}
          style={{ left: tooltipAnchorX, top: tooltipAnchorY }}
        >
          <div className="globe-tooltip-name">
            {tooltipName}{tooltipExtra}
          </div>
          <div className="globe-tooltip-count">
            {tooltip.count} participant{tooltip.count !== 1 ? 's' : ''} in this area
          </div>
        </div>
      </div>
    </div>
  );
};

export default Globe;
