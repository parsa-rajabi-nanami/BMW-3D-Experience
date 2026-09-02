import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 46;

/** Artistic airflow visualisation — streamlines sweeping over the body. */
export function Airflow({
  active,
  reduced,
}: {
  active: boolean;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#7fb4ff",
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    [],
  );
  const streams = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        z: -1.1 + (i % 12) * 0.2,
        y: 0.18 + Math.floor(i / 12) * 0.32 + (i % 3) * 0.04,
        speed: 2.4 + (i % 5) * 0.35,
        offset: (i * 0.37) % 1,
        len: 0.5 + (i % 4) * 0.22,
      })),
    [],
  );
  const opacity = useRef(0);

  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const target = active ? 0.5 : 0;
    opacity.current += (target - opacity.current) * (1 - Math.exp(-5 * delta));
    mat.opacity = opacity.current;
    if (!group.current) return;
    group.current.visible = opacity.current > 0.01;
    // The stream meshes are hidden for most of the experience. Avoid doing
    // per-stream CPU work while the visualisation is inactive.
    if (reduced || opacity.current <= 0.01) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const s = streams[i]!;
      // The nose is +X; air therefore enters from +X and travels rearward.
      const p = 4.5 - ((t * s.speed * 0.12 + s.offset) % 1) * 9;
      child.position.x = p;
      child.position.y = s.y + Math.sin(p * 1.1 + s.z * 2) * 0.09;
      const fade = Math.max(0, 1 - Math.abs(p) / 4.5);
      child.scale.set(s.len * (0.4 + fade), 1, 1);
    });
  });

  return (
    <group ref={group} visible={false}>
      {streams.map((s, i) => (
        <mesh key={i} position={[0, s.y, s.z]}>
          <boxGeometry args={[1, 0.006, 0.006]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
