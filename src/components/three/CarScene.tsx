import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  Lightformer,
} from "@react-three/drei";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import * as THREE from "three";
import { useExperience } from "@/hooks/use-experience";
import { HOTSPOTS, MODES, SECTION_VIEWS } from "@/lib/experience";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { Car } from "./Car";
import { Airflow } from "./Airflow";

const PIVOT = new THREE.Vector3(0, 0.62, 0);

class SceneErrorBoundary extends Component<
  { children: ReactNode; onError: () => void; onRetry: () => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onError();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function SceneFallback({
  title = "3D preview loading",
  onRetry,
}: {
  title?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center px-6"
    >
      <div className="pointer-events-auto max-w-xs border border-border bg-background/90 p-5 text-center backdrop-blur-md">
        <span
          aria-hidden="true"
          className="mx-auto block size-2 rounded-full bg-primary shadow-[0_0_24px_var(--color-primary)]"
        />
        <p className="mt-4 text-[10px] font-semibold tracking-[0.25em] text-foreground uppercase">
          {title}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {onRetry
            ? "The experience is still available below while the vehicle preview recovers."
            : "This browser cannot display the 3D preview. The full experience remains available below."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 border border-border-strong px-4 py-2 text-[10px] font-semibold tracking-[0.24em] text-foreground uppercase transition-colors hover:border-primary hover:text-primary"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

function SceneLoading() {
  return (
    <Html center>
      <div className="border border-border bg-background/70 px-4 py-3 text-center backdrop-blur-md">
        <p
          role="status"
          className="text-[9px] font-semibold tracking-[0.25em] text-muted-foreground uppercase"
        >
          Preparing vehicle preview…
        </p>
      </div>
    </Html>
  );
}

function useWebGLSupport() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      setSupported(Boolean(context));
      canvas.remove();
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}

function useCompactViewport() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return compact;
}

function CameraRig({
  autoRotate,
  reduced,
}: {
  autoRotate: number;
  reduced: boolean;
}) {
  const { orbit } = useExperience();
  const camera = useThree((s) => s.camera);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const o = orbit.current;
    if (!o.userDriven && !reduced) o.targetTheta += autoRotate * delta;
    const k = 1 - Math.exp(-(reduced ? 40 : 3.4) * delta);
    o.theta += (o.targetTheta - o.theta) * k;
    o.phi += (o.targetPhi - o.phi) * k;
    o.radius += (o.targetRadius - o.radius) * k;
    const sinPhi = Math.sin(o.phi);
    camera.position.set(
      PIVOT.x + o.radius * sinPhi * Math.sin(o.theta),
      PIVOT.y + o.radius * Math.cos(o.phi),
      PIVOT.z + o.radius * sinPhi * Math.cos(o.theta),
    );
    camera.lookAt(PIVOT);
  });
  return null;
}

function LowPowerRenderLoop({ enabled }: { enabled: boolean }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => invalidate(), 1000 / 30);
    return () => window.clearInterval(interval);
  }, [enabled, invalidate]);

  return null;
}

function Hotspots({ compact }: { compact: boolean }) {
  const { hotspot, setHotspot, focus, section } = useExperience();
  if (section !== "explore" || compact) return null;
  return (
    <>
      {HOTSPOTS.map((h) => (
        <Html
          key={h.id}
          position={h.position}
          center
          distanceFactor={9}
          zIndexRange={[20, 10]}
        >
          <button
            type="button"
            aria-label={h.label}
            aria-pressed={hotspot === h.id}
            onClick={() => {
              setHotspot(hotspot === h.id ? null : h.id);
              focus(h.view);
            }}
            className={`group flex max-w-[11rem] items-center gap-2 text-left text-[10px] leading-snug tracking-[0.2em] transition-colors sm:max-w-none sm:whitespace-nowrap sm:tracking-[0.28em] ${
              hotspot === h.id
                ? "text-primary"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            <span
              aria-hidden="true"
              className={`relative block size-2.5 rotate-45 border transition-[background-color,border-color] ${
                hotspot === h.id
                  ? "border-primary bg-primary/70"
                  : "border-foreground/60 bg-background/40 group-hover:border-primary"
              }`}
            />
            {h.id !== "led" && h.label.toUpperCase()}
          </button>
        </Html>
      ))}
    </>
  );
}

function SceneControls() {
  const { adjustOrbit, focus, section, interactive } = useExperience();

  if (!interactive) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-5 z-40 flex justify-center px-6 sm:bottom-8 sm:justify-end sm:px-10">
      <div
        role="group"
        className="panel flex items-center gap-1 px-2 py-2 sm:gap-2"
        aria-label="3D view controls"
      >
        <span className="hidden px-2 text-[9px] tracking-[0.24em] text-muted-foreground uppercase lg:inline">
          View controls
        </span>
        <button
          type="button"
          aria-label="Rotate vehicle left"
          title="Rotate left"
          onClick={() => adjustOrbit(0.45, 0, 0)}
          className="p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Rotate vehicle right"
          title="Rotate right"
          onClick={() => adjustOrbit(-0.45, 0, 0)}
          className="p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Tilt camera up"
          title="Tilt up"
          onClick={() => adjustOrbit(0, -0.16, 0)}
          className="p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronUp aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Tilt camera down"
          title="Tilt down"
          onClick={() => adjustOrbit(0, 0.16, 0)}
          className="p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => adjustOrbit(0, 0, -0.8)}
          className="p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ZoomIn aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => adjustOrbit(0, 0, 0.8)}
          className="p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ZoomOut aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Reset 3D view"
          title="Reset view"
          onClick={() => focus(SECTION_VIEWS[section])}
          className="p-2 text-muted-foreground transition-colors hover:text-primary"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Lighting({
  mode,
  compact,
  lowPower,
}: {
  mode: keyof typeof MODES;
  compact: boolean;
  lowPower: boolean;
}) {
  const cfg = MODES[mode];
  return (
    <>
      <hemisphereLight color="#e5efff" groundColor="#10161f" intensity={0.7} />
      <ambientLight intensity={0.48} />
      <directionalLight
        position={[5, 8, 6]}
        intensity={3.2 * cfg.exposure}
        castShadow={!compact && !lowPower}
        shadow-mapSize-width={lowPower ? 256 : 512}
        shadow-mapSize-height={lowPower ? 256 : 512}
        shadow-bias={-0.0004}
      />
      {!lowPower && (
        <>
          <spotLight
            position={[-6, 4.5, -5]}
            angle={0.65}
            intensity={18 * cfg.exposure}
            color={cfg.accent}
            penumbra={0.9}
          />
          <spotLight
            position={[1, 6.5, 8]}
            angle={0.75}
            intensity={20 * cfg.exposure}
            color="#ffffff"
            penumbra={0.85}
          />
        </>
      )}
      <Environment resolution={lowPower ? 64 : compact ? 128 : 256} frames={1}>
        <Lightformer
          intensity={4.8}
          position={[0, 6.5, 0]}
          scale={[10, 3, 1]}
          rotation-x={Math.PI / 2}
        />
        <Lightformer
          intensity={2.7}
          color={cfg.accent}
          position={[-6, 2, -2]}
          rotation-y={Math.PI / 2}
          scale={[18, 1.4, 1]}
        />
        <Lightformer
          intensity={2.3}
          color="#cfe0ff"
          position={[6, 2, 2]}
          rotation-y={-Math.PI / 2}
          scale={[18, 1, 1]}
        />
      </Environment>
    </>
  );
}

function GarageFloor({ compact }: { compact: boolean }) {
  const size = compact ? 72 : 112;
  const gridSize = compact ? 26 : 38;
  const divisions = compact ? 18 : 26;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.018, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color="#0e141b"
          metalness={0.12}
          roughness={0.84}
        />
      </mesh>
      <gridHelper
        args={[gridSize, divisions, "#34404d", "#202a35"]}
        position={[0, 0.002, 0]}
      />
    </group>
  );
}

function Stage({
  compact,
  pageVisible,
}: {
  compact: boolean;
  pageVisible: boolean;
}) {
  const { config, mode, section, topic } = useExperience();
  const reduced = useReducedMotion();
  const lowPower = useDevicePerformance();
  const autoRotate = useMemo(() => {
    if (section === "explore" || section === "configure") return 0.02;
    return MODES[mode].rotate * 0.6;
  }, [section, mode]);

  return (
    <>
      <color attach="background" args={["#080d13"]} />
      <fog attach="fog" args={["#080d13", 9, 30]} />
      <Lighting mode={mode} compact={compact} lowPower={lowPower} />
      <LowPowerRenderLoop enabled={lowPower && !reduced && pageVisible} />
      <CameraRig autoRotate={autoRotate} reduced={reduced} />
      <GarageFloor compact={compact} />
      <Suspense fallback={<SceneLoading />}>
        <Car config={config} />
      </Suspense>
      <Airflow
        active={section === "engineering" && topic === "aerodynamics"}
        reduced={reduced}
      />
      <Hotspots compact={compact} />
      {!compact && !lowPower && (
        <ContactShadows
          position={[0, 0.006, 0]}
          opacity={0.85}
          scale={22}
          blur={2.6}
          far={5}
          frames={1}
          resolution={256}
          color="#000000"
        />
      )}
    </>
  );
}

export function CarScene() {
  const { orbit, interactive } = useExperience();
  const wrap = useRef<HTMLDivElement>(null);
  const webGL = useWebGLSupport();
  const compact = useCompactViewport();
  const lowPower = useDevicePerformance();
  const [pageVisible, setPageVisible] = useState(true);
  const [sceneKey, setSceneKey] = useState(0);
  const [sceneFailed, setSceneFailed] = useState(false);

  const retryScene = () => {
    setSceneFailed(false);
    setSceneKey((key) => key + 1);
  };

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () =>
      document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const down = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest("button")) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const o = orbit.current;
      o.userDriven = true;
      o.targetTheta -= (e.clientX - lastX) * 0.006;
      o.targetPhi = Math.min(
        1.52,
        Math.max(0.35, o.targetPhi - (e.clientY - lastY) * 0.004),
      );
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      if (el.hasPointerCapture(e.pointerId))
        el.releasePointerCapture(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      const dy =
        e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const o = orbit.current;
      o.userDriven = true;
      o.targetRadius = Math.min(
        16,
        Math.max(3.2, o.targetRadius * Math.exp(dy * 0.0015)),
      );
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [orbit]);

  return (
    <>
      <div
        ref={wrap}
        role="group"
        aria-label="Interactive 3D vehicle preview"
        className={`fixed inset-0 z-0 touch-pan-y transition-[opacity] duration-700 ${
          interactive ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        style={{ pointerEvents: interactive ? "auto" : "none" }}
      >
        {webGL === true ? (
          <SceneErrorBoundary
            key={sceneKey}
            onError={() => setSceneFailed(true)}
            onRetry={retryScene}
          >
            <Canvas
              frameloop={
                pageVisible ? (lowPower ? "demand" : "always") : "never"
              }
              dpr={lowPower || compact ? [1, 1] : [1, 1.5]}
              shadows={!compact && !lowPower}
              gl={{
                antialias: !compact && !lowPower,
                powerPreference:
                  lowPower || compact ? "low-power" : "high-performance",
              }}
              camera={{ fov: 34, position: [6, 3, 8], near: 0.1, far: 120 }}
              aria-label="Interactive 3D vehicle preview"
              onCreated={({ gl }) => {
                gl.toneMapping = THREE.ACESFilmicToneMapping;
                gl.toneMappingExposure = 1.05;
                // The car and its directional shadow caster are static. Keep
                // the shadow map from being regenerated on every camera frame.
                if (!compact && !lowPower) {
                  gl.shadowMap.autoUpdate = false;
                  gl.shadowMap.needsUpdate = true;
                }
              }}
            >
              <Stage compact={compact} pageVisible={pageVisible} />
            </Canvas>
          </SceneErrorBoundary>
        ) : null}
      </div>
      {webGL === false && <SceneFallback title="3D preview unavailable" />}
      {webGL === true && sceneFailed && (
        <SceneFallback title="3D preview unavailable" onRetry={retryScene} />
      )}
      {webGL === true && !sceneFailed && <SceneControls />}
    </>
  );
}
