import { Component, useCallback, useEffect, useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import type { GLTFLoader } from "three-stdlib";
import { optionOf, type Config } from "@/lib/experience";
import type { DeviceQuality } from "@/hooks/use-device-performance";
import {
  classifyCarPart,
  type CustomizationGroup,
} from "./material-classification";

const MODEL_BASE_URL = `${import.meta.env.BASE_URL}models/`;
const TRANSCODER_PATH = `${import.meta.env.BASE_URL}basis/`;
const TARGET_LENGTH = 4.4;

type MaterialBuckets = Record<CustomizationGroup, THREE.MeshStandardMaterial[]>;

function isMesh(child: THREE.Object3D): child is THREE.Mesh {
  return child instanceof THREE.Mesh && Boolean(child.geometry);
}

function setTextureColorSpaces(material: THREE.MeshStandardMaterial) {
  const maps = material as unknown as Record<string, THREE.Texture | null>;
  if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
  if (material.emissiveMap) {
    material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
  }

  // glTF data maps are sampled in linear/non-color space. GLTFLoader already
  // infers this from each texture slot; keeping it explicit also protects the
  // WebP fallback path and future asset exports.
  for (const key of [
    "normalMap",
    "roughnessMap",
    "metalnessMap",
    "aoMap",
    "displacementMap",
    "clearcoatMap",
    "clearcoatRoughnessMap",
    "clearcoatNormalMap",
    "transmissionMap",
    "thicknessMap",
    "iridescenceMap",
    "iridescenceThicknessMap",
    "sheenRoughnessMap",
  ]) {
    const texture = maps[key];
    if (texture) texture.colorSpace = THREE.NoColorSpace;
  }
  if (maps["sheenColorMap"])
    maps["sheenColorMap"].colorSpace = THREE.SRGBColorSpace;
}

function addMaterial(
  bucket: THREE.MeshStandardMaterial[],
  material: THREE.Material,
) {
  if (
    material instanceof THREE.MeshStandardMaterial &&
    !bucket.includes(material)
  ) {
    bucket.push(material);
  }
}

function emptyBuckets(): MaterialBuckets {
  return {
    BODY: [],
    RIMS: [],
    INTERIOR: [],
    TRIM: [],
    OTHER: [],
  };
}

function styleAndCollectMaterials(clone: THREE.Object3D): MaterialBuckets {
  const buckets = emptyBuckets();
  const materialCache = new Map<string, THREE.Material>();

  clone.traverse((child) => {
    if (!isMesh(child)) return;
    const sourceMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    const materials = sourceMaterials.map((source) => {
      const group = classifyCarPart(
        child.name,
        source.name,
        child.userData as Record<string, unknown>,
      );
      // A source material can be reused by multiple semantic parts. Clone per
      // group so a selector can never mutate an unrelated mesh through a
      // shared material reference.
      const cacheKey = `${source.uuid}:${group}`;
      const cached = materialCache.get(cacheKey);
      if (cached) {
        addMaterial(buckets[group], cached);
        return cached;
      }

      const material = source.clone();
      if (material instanceof THREE.MeshStandardMaterial) {
        setTextureColorSpaces(material);
      }
      const name = `${child.name} ${source.name}`.toLowerCase();

      // Keep lamp assemblies as geometry. The studio rig provides their
      // illumination without allowing emissive materials to wash out paint.
      if (
        material instanceof THREE.MeshStandardMaterial &&
        (name.includes("light") || name.includes("light_emis"))
      ) {
        material.emissive.set("#000000");
        material.emissiveIntensity = 0;
      }

      // Preserve the cabin's cool glass tint while keeping it visible in the
      // studio. Mesh names are used because palette materials have generic
      // names after offline optimization.
      if (name.includes("window")) {
        material.transparent = true;
        material.opacity = 0.72;
        material.depthWrite = false;
        material.side = THREE.DoubleSide;

        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.color.set("#263c50");
          material.metalness = 0;
          material.roughness = 0.12;
          material.transmission = 0.38;
          material.thickness = 0.08;
          material.ior = 1.46;
          material.clearcoat = 0.3;
          material.clearcoatRoughness = 0.1;
        } else if (material instanceof THREE.MeshStandardMaterial) {
          material.color.set("#263c50");
          material.metalness = 0.05;
          material.roughness = 0.16;
        }
      }

      // Keep the rear lens visible as a dark red transparent surface.
      if (name.includes("red_glass")) {
        material.transparent = true;
        material.opacity = 0.86;
        material.depthWrite = false;
        material.side = THREE.DoubleSide;

        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.color.set("#5a1722");
          material.metalness = 0;
          material.roughness = 0.16;
          material.transmission = 0.12;
          material.thickness = 0.04;
          material.ior = 1.46;
          material.clearcoat = 0.25;
          material.clearcoatRoughness = 0.12;
        } else if (material instanceof THREE.MeshStandardMaterial) {
          material.color.set("#5a1722");
          material.metalness = 0;
          material.roughness = 0.2;
        }
      }

      materialCache.set(cacheKey, material);
      addMaterial(buckets[group], material);
      return material;
    });
    child.material = materials.length === 1 ? materials[0]! : materials;
  });

  return buckets;
}

function disposeClonedMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!isMesh(child)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

function CarModel({
  config,
  quality,
  modelUrl,
  compressed,
}: {
  config: Config;
  quality: DeviceQuality;
  modelUrl: string;
  compressed: boolean;
}) {
  const { gl } = useThree();
  const ktx2Loader = useMemo(() => {
    if (!compressed) return null;
    // detectSupport must run against the actual Canvas renderer before the
    // GLTF parser requests its first KTX2 texture.
    return new KTX2Loader()
      .setTranscoderPath(TRANSCODER_PATH)
      .detectSupport(gl)
      .setWorkerLimit(1);
  }, [compressed, gl]);
  useEffect(() => {
    return () => ktx2Loader?.dispose();
  }, [ktx2Loader]);
  const extendLoader = useCallback(
    (loader: GLTFLoader) => {
      if (ktx2Loader) {
        loader.setKTX2Loader(
          ktx2Loader as unknown as Parameters<GLTFLoader["setKTX2Loader"]>[0],
        );
      }
    },
    [ktx2Loader],
  );
  const { scene } = useGLTF(modelUrl, false, true, extendLoader);

  const { root, materials } = useMemo(() => {
    const clone = scene.clone(true);
    const materials = styleAndCollectMaterials(clone);

    clone.traverse((child) => {
      if (!isMesh(child)) return;
      child.castShadow = quality.shadows;
      child.receiveShadow = quality.shadows;
    });

    // Normalize the model around its measured bounds so all quality assets
    // keep the same camera, hotspot, and garage-floor contracts.
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());

    const holder = new THREE.Group();
    holder.add(clone);
    if (size.z > size.x) holder.rotation.y = Math.PI / 2;
    const length = Math.max(size.x, size.z);
    holder.scale.setScalar(TARGET_LENGTH / length);

    holder.updateMatrixWorld(true);
    const presentationBox = new THREE.Box3().setFromObject(holder);
    const presentationCenter = presentationBox.getCenter(new THREE.Vector3());
    holder.position.x -= presentationCenter.x;
    holder.position.y -= presentationBox.min.y;
    holder.position.z -= presentationCenter.z;

    return { root: holder, materials };
  }, [quality.shadows, scene]);

  useEffect(() => {
    const exterior = optionOf("exterior", config.exterior);
    const wheel = optionOf("wheels", config.wheels);
    const interior = optionOf("interior", config.interior);
    const trimColor =
      config.trim === "open-pore"
        ? "#4b3020"
        : config.trim === "aluminium"
          ? "#a5abb4"
          : "#16191e";
    const colors: Record<Exclude<CustomizationGroup, "OTHER">, string> = {
      BODY: exterior.hex ?? "#14171c",
      RIMS: wheel.hex ?? "#2a2d33",
      INTERIOR: interior.hex ?? "#1b1d21",
      TRIM: trimColor,
    };

    for (const group of Object.keys(colors) as Array<
      Exclude<CustomizationGroup, "OTHER">
    >) {
      materials[group].forEach((material) => {
        // Keep every texture, normal, roughness, metalness, transparency and
        // environment setting from the asset. The body base-color map is a
        // small source-color palette, not a detail map; it would multiply the
        // selected paint and prevent colors such as green from rendering
        // correctly. Other groups keep their base-color maps.
        if (group === "BODY") material.map = null;
        material.color.set(colors[group]);
        material.needsUpdate = true;
      });
    }
  }, [config.exterior, config.interior, config.trim, config.wheels, materials]);

  useEffect(() => () => disposeClonedMaterials(root), [root]);

  return <primitive object={root} />;
}

class Ktx2FallbackBoundary extends Component<
  { children: React.ReactNode; onError: (error: unknown) => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Vehicle presentation layer for the pre-joined, tiered car assets. */
export function Car({
  config,
  quality,
}: {
  config: Config;
  quality: DeviceQuality;
}) {
  const [compressedFailed, setCompressedFailed] = useState(false);
  const compressedUrl = `${MODEL_BASE_URL}${quality.compressedModelFile}`;
  const fallbackUrl = `${MODEL_BASE_URL}${quality.modelFile}`;

  if (compressedFailed) {
    return (
      <CarModel
        config={config}
        quality={quality}
        modelUrl={fallbackUrl}
        compressed={false}
      />
    );
  }

  return (
    <Ktx2FallbackBoundary
      onError={(error) => {
        console.warn(
          "[BMW Experience] KTX2 asset failed; using WebP GLB",
          error,
        );
        setCompressedFailed(true);
      }}
    >
      <CarModel
        config={config}
        quality={quality}
        modelUrl={compressedUrl}
        compressed
      />
    </Ktx2FallbackBoundary>
  );
}
