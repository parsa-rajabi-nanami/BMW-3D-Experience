import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { optionOf, type Config } from "@/lib/experience";

const MODEL_URL = "/models/car.glb";
const TARGET_LENGTH = 4.4;

type MaterialBuckets = {
  paint: THREE.MeshStandardMaterial[];
  wheel: THREE.MeshStandardMaterial[];
  brake: THREE.MeshStandardMaterial[];
  interior: THREE.MeshStandardMaterial[];
  trim: THREE.MeshStandardMaterial[];
};

const INTERACTIVE_WHEEL_GROUP = "Wheel1A_3D";

function isMesh(child: THREE.Object3D): child is THREE.Mesh {
  return child instanceof THREE.Mesh && Boolean(child.geometry);
}

function materialKey(mesh: THREE.Mesh, material: THREE.Material): string {
  const attributes = Object.entries(mesh.geometry.attributes)
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
    .map(([name, attribute]) => `${name}:${attribute.itemSize}`)
    .join(",");
  return `${material.name}|${attributes}`;
}

function floatAttribute(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
) {
  const values = new Float32Array(attribute.count * attribute.itemSize);
  for (let index = 0; index < attribute.count; index += 1) {
    for (let component = 0; component < attribute.itemSize; component += 1) {
      values[index * attribute.itemSize + component] = attribute.getComponent(
        index,
        component,
      );
    }
  }
  return new THREE.Float32BufferAttribute(values, attribute.itemSize);
}

/**
 * The supplied GLB uses normalized Int16 vertex attributes. Three.js can
 * render those attributes correctly, but transforming them in-place can
 * overflow the quantized storage when a part scale is applied. Converting
 * every vertex attribute to float before merging preserves the decoded values
 * and also makes mixed source attribute types mergeable.
 */
function cloneGeometryForMerge(
  source: THREE.BufferGeometry,
  relativeMatrix: THREE.Matrix4,
) {
  const geometry = source.clone();
  Object.entries(geometry.attributes).forEach(([name, attribute]) => {
    geometry.setAttribute(name, floatAttribute(attribute));
  });
  geometry.applyMatrix4(relativeMatrix);
  return geometry;
}

/**
 * Merge the source export's many tiny same-material meshes inside one vehicle
 * part. The source keeps four wheel groups and four caliper groups as named
 * parents; those parents are deliberately left intact for future interaction.
 */
function mergePartMeshes(part: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  part.traverse((child) => {
    if (isMesh(child) && !(child instanceof THREE.SkinnedMesh))
      meshes.push(child);
  });
  if (meshes.length < 2) return;

  part.updateWorldMatrix(true, true);
  const buckets = new Map<
    string,
    { material: THREE.Material; geometries: THREE.BufferGeometry[] }
  >();

  for (const mesh of meshes) {
    if (Array.isArray(mesh.material)) return;
    const material = mesh.material as THREE.Material;
    const key = materialKey(mesh, material);
    const bucket = buckets.get(key) ?? { material, geometries: [] };
    const relativeMatrix = new THREE.Matrix4()
      .copy(part.matrixWorld)
      .invert()
      .multiply(mesh.matrixWorld);
    const geometry = cloneGeometryForMerge(mesh.geometry, relativeMatrix);
    bucket.geometries.push(geometry);
    buckets.set(key, bucket);
  }

  const merged: THREE.Mesh[] = [];
  for (const [key, bucket] of buckets) {
    const geometry = mergeGeometries(bucket.geometries, false);
    bucket.geometries.forEach((source) => source.dispose());
    if (!geometry) return;
    const mesh = new THREE.Mesh(geometry, bucket.material);
    mesh.name = `${part.name}__merged__${key}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    merged.push(mesh);
  }

  part.clear();
  merged.forEach((mesh) => part.add(mesh));
}

function mergeVehicleGeometry(clone: THREE.Object3D) {
  const rootNode = clone.getObjectByName("RootNode") ?? clone;
  const parts: THREE.Object3D[] = [];

  rootNode.children.forEach((child) => {
    if (child.name !== INTERACTIVE_WHEEL_GROUP) {
      parts.push(child);
      return;
    }

    // Keep the four wheels and four calipers independently addressable. The
    // source places the calipers below one extra container node.
    child.children.forEach((wheelOrCaliper) => {
      if (/calliper/i.test(wheelOrCaliper.name)) {
        wheelOrCaliper.children.forEach((caliper) => parts.push(caliper));
      } else {
        parts.push(wheelOrCaliper);
      }
    });
  });

  parts.forEach((part) => mergePartMeshes(part));
}

function pushUnique(
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

function collectMaterials(clone: THREE.Object3D): MaterialBuckets {
  const buckets: MaterialBuckets = {
    paint: [],
    wheel: [],
    brake: [],
    interior: [],
    trim: [],
  };

  clone.traverse((child) => {
    if (!isMesh(child)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => {
      const name = material.name.toLowerCase();
      if (name.includes("paint")) pushUnique(buckets.paint, material);
      if (name.includes("wheel")) pushUnique(buckets.wheel, material);
      if (name.includes("calliper") && name.includes("zone"))
        pushUnique(buckets.brake, material);
      if (name.includes("interiora")) pushUnique(buckets.interior, material);
      if (name.includes("carbon1")) pushUnique(buckets.trim, material);
    });
  });

  return buckets;
}

function styleSourceMaterials(clone: THREE.Object3D) {
  const materialCache = new Map<string, THREE.Material>();

  clone.traverse((child) => {
    if (!isMesh(child)) return;
    const sourceMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    const materials = sourceMaterials.map((source) => {
      const cached = materialCache.get(source.uuid);
      if (cached) return cached;

      const material = source.clone();
      const name = source.name.toLowerCase();

      // Keep the lamp assemblies as geometry, but do not make them emit light.
      // The scene's studio rig provides the vehicle illumination so the lamps
      // do not wash out the bodywork or cast artificial pools of light.
      if (
        material instanceof THREE.MeshStandardMaterial &&
        (name.includes("light") || name === "light_emis")
      ) {
        material.emissive.set("#000000");
        material.emissiveIntensity = 0;
      }

      // The GLB's Window material is physically-based glass, but its source
      // alpha of 0.25 makes the cabin disappear in the studio. Preserve the
      // transmission model while adding a visible cool tint and reflections.
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

      // red_glass belongs to the lamp lens in the source hierarchy. Keep it
      // visible as a dark red lens without reintroducing emissive lighting.
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

      materialCache.set(source.uuid, material);
      return material;
    });
    child.material = materials.length === 1 ? materials[0]! : materials;
  });
}

/**
 * Vehicle presentation layer for the supplied car asset.
 *
 * Material names are the stable configuration seam while the named source
 * groups remain the interaction seam. Geometry is merged only within a part,
 * reducing the source export's hundreds of tiny wheel/caliper draw calls.
 */
export function Car({ config }: { config: Config }) {
  const { scene } = useGLTF(MODEL_URL);

  const { root, materials } = useMemo(() => {
    const clone = scene.clone(true);
    styleSourceMaterials(clone);
    mergeVehicleGeometry(clone);
    const materials = collectMaterials(clone);

    clone.traverse((child) => {
      if (!isMesh(child)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    // Normalize the source around its measured bounds, then rotate its long
    // axis to face +X at a known presentation length. The GLB's nose is on
    // +Z, so +PI/2 maps the nose to +X (the direction used by the hotspots
    // and the initial camera view).
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());

    const holder = new THREE.Group();
    holder.add(clone);
    if (size.z > size.x) holder.rotation.y = Math.PI / 2;
    const length = Math.max(size.x, size.z);
    const scale = TARGET_LENGTH / length;
    holder.scale.setScalar(scale);

    // Apply placement after every source transform, the presentation rotation,
    // and the final scale. This keeps the tires on the same y=0 contract as
    // the garage floor even when the GLB's export hierarchy changes.
    holder.updateMatrixWorld(true);
    const presentationBox = new THREE.Box3().setFromObject(holder);
    const presentationCenter = presentationBox.getCenter(new THREE.Vector3());
    holder.position.x -= presentationCenter.x;
    holder.position.y -= presentationBox.min.y;
    holder.position.z -= presentationCenter.z;

    return { root: holder, materials };
  }, [scene]);

  useEffect(() => {
    const exterior = optionOf("exterior", config.exterior);
    const wheel = optionOf("wheels", config.wheels);
    const brake = optionOf("brakes", config.brakes);
    const interior = optionOf("interior", config.interior);
    materials.paint.forEach((m) => {
      m.color.set(exterior.hex ?? "#14171c");
      m.roughness = exterior.note === "Solid" ? 0.36 : 0.26;
      m.needsUpdate = true;
    });
    materials.wheel.forEach((m) => {
      m.color.set(wheel.hex ?? "#2a2d33");
      m.metalness = wheel.id === "carbon" ? 0.4 : 0.9;
      m.roughness = wheel.id === "carbon" ? 0.5 : 0.3;
      m.needsUpdate = true;
    });
    materials.brake.forEach((m) => {
      m.color.set(brake.hex ?? "#3a3f47");
      m.needsUpdate = true;
    });
    materials.interior.forEach((m) => {
      m.color.set(interior.hex ?? "#1b1d21");
      m.needsUpdate = true;
    });
    materials.trim.forEach((m) => {
      const trimColor =
        config.trim === "open-pore"
          ? "#4b3020"
          : config.trim === "aluminium"
            ? "#a5abb4"
            : "#16191e";
      m.color.set(trimColor);
      m.needsUpdate = true;
    });
  }, [config, materials]);

  return <primitive object={root} />;
}

useGLTF.preload(MODEL_URL);
