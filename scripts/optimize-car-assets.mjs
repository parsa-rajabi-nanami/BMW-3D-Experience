import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = "@gltf-transform/cli@4.5.0";
const ASSET_DIR = join(ROOT, "public", "models");

const ASSETS = [
  { source: "car.glb", output: "car-ktx2.glb", onlyIfSmaller: true },
  {
    source: "car-medium.glb",
    output: "car-medium-ktx2.glb",
    onlyIfSmaller: true,
  },
  { source: "car-low.glb", output: "car-low-ktx2.glb", onlyIfSmaller: true },
];

function run(command, args) {
  execFileSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
  });
}

function parseGlb(file) {
  const bytes = readFileSync(file);
  if (bytes.toString("ascii", 0, 4) !== "glTF") {
    throw new Error(`Not a GLB file: ${file}`);
  }

  const jsonLength = bytes.readUInt32LE(12);
  const jsonStart = 20;
  if (bytes.toString("ascii", 16, 20) !== "JSON") {
    throw new Error(`Missing JSON chunk: ${file}`);
  }
  const json = JSON.parse(
    bytes.toString("utf8", jsonStart, jsonStart + jsonLength),
  );
  const binaryHeader = jsonStart + jsonLength;
  if (bytes.toString("ascii", binaryHeader + 4, binaryHeader + 8) !== "BIN\0") {
    throw new Error(`Missing BIN chunk: ${file}`);
  }
  const binaryLength = bytes.readUInt32LE(binaryHeader);
  const binaryStart = binaryHeader + 8;
  if (binaryStart + binaryLength !== bytes.length) {
    throw new Error(`GLB length mismatch: ${file}`);
  }

  return {
    json,
    binary: bytes.subarray(binaryStart, binaryStart + binaryLength),
  };
}

function align4(value) {
  return (value + 3) & ~3;
}

function classifyMesh(name) {
  if (/paint_geo/i.test(name)) return "BODY";
  if (/wheel1a_3d/i.test(name)) return "RIMS";
  if (/interior/i.test(name)) return "INTERIOR";
  if (/carbon1_geo/i.test(name)) return "TRIM";
  return "OTHER";
}

function replaceTexturePayload(source, compressed, output, onlyIfSmaller) {
  const sourceGlb = parseGlb(source);
  const compressedGlb = parseGlb(compressed);
  const sourceJson = sourceGlb.json;
  const compressedJson = compressedGlb.json;
  const sourceImages = sourceJson.images ?? [];
  const compressedImages = compressedJson.images ?? [];

  if (sourceImages.length !== compressedImages.length) {
    throw new Error(`${source}: image count changed during compression`);
  }

  const candidates = sourceImages.map((image, index) => {
    const sourceView = sourceJson.bufferViews[image.bufferView];
    const compressedImage = compressedImages[index];
    const compressedView =
      compressedJson.bufferViews[compressedImage.bufferView];
    if (!sourceView || !compressedView) {
      throw new Error(`${source}: image ${index} has no buffer view`);
    }

    const replacement = {
      index,
      start: sourceView.byteOffset ?? 0,
      end: (sourceView.byteOffset ?? 0) + sourceView.byteLength,
      bytes: compressedGlb.binary.subarray(
        compressedView.byteOffset ?? 0,
        (compressedView.byteOffset ?? 0) + compressedView.byteLength,
      ),
    };
    return onlyIfSmaller &&
      replacement.bytes.byteLength >= sourceView.byteLength
      ? null
      : replacement;
  });
  const replacements = candidates.filter(Boolean);
  const replacementByIndex = new Map(
    replacements.map((replacement) => [replacement.index, replacement]),
  );

  const ordered = [...replacements].sort((a, b) => a.start - b.start);
  const newBinaryParts = [];
  const newImageOffsets = new Map();
  let cursor = 0;
  let newLength = 0;

  for (const replacement of ordered) {
    if (replacement.start < cursor) {
      throw new Error(`${source}: overlapping image buffer views`);
    }

    const unchanged = sourceGlb.binary.subarray(cursor, replacement.start);
    newBinaryParts.push(unchanged);
    newLength += unchanged.byteLength;

    const aligned = align4(newLength);
    if (aligned !== newLength) {
      newBinaryParts.push(Buffer.alloc(aligned - newLength));
      newLength = aligned;
    }

    newImageOffsets.set(replacement.index, newLength);
    newBinaryParts.push(replacement.bytes);
    newLength += replacement.bytes.byteLength;

    const padded = align4(newLength);
    if (padded !== newLength) {
      newBinaryParts.push(Buffer.alloc(padded - newLength));
      newLength = padded;
    }
    cursor = replacement.end;
  }

  const tail = sourceGlb.binary.subarray(cursor);
  newBinaryParts.push(tail);
  newLength += tail.byteLength;
  const newBinary = Buffer.concat(newBinaryParts, align4(newLength));

  const offsetAt = (offset) => {
    let nextOffset = offset;
    for (const replacement of ordered) {
      if (replacement.start >= offset) break;
      nextOffset +=
        align4(replacement.bytes.byteLength) -
        (replacement.end - replacement.start);
    }
    return nextOffset;
  };

  sourceJson.bufferViews.forEach((view, index) => {
    // The fallback Meshopt buffer is a separate logical buffer. Its offsets
    // must not move when image payloads in the GLB BIN buffer are replaced.
    if ((view.buffer ?? 0) !== 0) return;

    const imageIndex = sourceImages.findIndex(
      (image) => image.bufferView === index,
    );
    const byteOffset =
      imageIndex >= 0
        ? (newImageOffsets.get(imageIndex) ?? offsetAt(view.byteOffset ?? 0))
        : offsetAt(view.byteOffset ?? 0);
    if (byteOffset === undefined)
      throw new Error(`${source}: unmapped buffer view ${index}`);
    view.byteOffset = byteOffset;
    const replacement = replacementByIndex.get(imageIndex);
    if (replacement) {
      view.byteLength = replacement.bytes.byteLength;
    }
  });

  // Meshopt payloads live in buffer 0 as well, but their offsets are stored
  // inside each bufferView extension rather than in the bufferView itself.
  // Keep those offsets aligned with the shortened/repacked image payloads.
  sourceJson.bufferViews.forEach((view) => {
    const extension = view.extensions?.EXT_meshopt_compression;
    if (extension?.buffer === 0 && extension.byteOffset !== undefined) {
      extension.byteOffset = offsetAt(extension.byteOffset);
    }
  });

  sourceImages.forEach((image, index) => {
    if (!replacementByIndex.has(index)) return;
    image.mimeType = "image/ktx2";
    delete image.uri;
    const compressedImage = compressedImages[index];
    if (compressedImage.name) image.name = compressedImage.name;
  });

  const imageIsKtx2 = sourceImages.map((image, index) =>
    replacementByIndex.has(index),
  );
  const textureSource = (texture) =>
    texture.source ?? texture.extensions?.EXT_texture_webp?.source;
  sourceJson.textures.forEach((texture, index) => {
    const compressedTexture = compressedJson.textures[index];
    const basis = compressedTexture?.extensions?.KHR_texture_basisu;
    const sourceIndex = textureSource(texture);
    const useKtx2 = sourceIndex !== undefined && imageIsKtx2[sourceIndex];
    if (
      useKtx2 &&
      (!basis || compressedImages[basis.source]?.mimeType !== "image/ktx2")
    ) {
      throw new Error(`${source}: texture ${index} is not a KTX2 texture`);
    }
    if (useKtx2) {
      delete texture.source;
      delete texture.extensions?.EXT_texture_webp;
      texture.extensions = {
        ...(texture.extensions ?? {}),
        KHR_texture_basisu: { source: sourceIndex },
      };
    }
  });

  const hasKtx2 = imageIsKtx2.some(Boolean);
  const hasWebp = sourceJson.textures.some(
    (texture) => texture.extensions?.EXT_texture_webp,
  );
  sourceJson.extensionsUsed = [
    ...(sourceJson.extensionsUsed ?? []).filter(
      (name) => name !== "EXT_texture_webp" && name !== "KHR_texture_basisu",
    ),
    ...(hasWebp ? ["EXT_texture_webp"] : []),
    ...(hasKtx2 ? ["KHR_texture_basisu"] : []),
  ];
  sourceJson.extensionsRequired = [
    ...(sourceJson.extensionsRequired ?? []).filter(
      (name) => name !== "EXT_texture_webp" && name !== "KHR_texture_basisu",
    ),
    ...(hasWebp ? ["EXT_texture_webp"] : []),
    ...(hasKtx2 ? ["KHR_texture_basisu"] : []),
  ];

  const materialGroups = new Map();
  for (const node of sourceJson.nodes ?? []) {
    if (node.mesh === undefined) continue;
    const group = classifyMesh(node.name ?? "");
    node.extras = { ...(node.extras ?? {}), customizationGroup: group };
    for (const primitive of sourceJson.meshes[node.mesh]?.primitives ?? []) {
      const materialIndex = primitive.material;
      if (materialIndex === undefined) continue;
      const groups = materialGroups.get(materialIndex) ?? new Set();
      groups.add(group);
      materialGroups.set(materialIndex, groups);
    }
  }
  for (const [index, groups] of materialGroups) {
    const group = groups.size === 1 ? [...groups][0] : "OTHER";
    sourceJson.materials[index].extras = {
      ...(sourceJson.materials[index].extras ?? {}),
      customizationGroup: group,
    };
  }

  sourceJson.buffers[0].byteLength = newBinary.byteLength;
  const jsonBytes = Buffer.from(JSON.stringify(sourceJson));
  const paddedJson = Buffer.concat([
    jsonBytes,
    Buffer.alloc(align4(jsonBytes.byteLength) - jsonBytes.byteLength, 0x20),
  ]);
  const paddedBinary = Buffer.concat([
    newBinary,
    Buffer.alloc(align4(newBinary.byteLength) - newBinary.byteLength),
  ]);
  const header = Buffer.alloc(12);
  header.set([0x67, 0x6c, 0x54, 0x46], 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(
    12 + 8 + paddedJson.byteLength + 8 + paddedBinary.byteLength,
    8,
  );
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(paddedJson.byteLength, 0);
  jsonHeader.set([0x4a, 0x53, 0x4f, 0x4e], 4);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(paddedBinary.byteLength, 0);
  // Buffer.write's third argument is a byte length, not the encoding. Using
  // an explicit byte sequence keeps the GLB chunk type as BIN\0 on every
  // supported Node version.
  binaryHeader.set([0x42, 0x49, 0x4e, 0x00], 4);
  writeFileSync(
    output,
    Buffer.concat([header, jsonHeader, paddedJson, binaryHeader, paddedBinary]),
  );
  parseGlb(output);
}

const temporary = mkdtempSync(join(tmpdir(), "bmw-car-ktx2-"));
try {
  for (const asset of ASSETS) {
    const source = join(ASSET_DIR, asset.source);
    const png = join(temporary, `${asset.source}.png.glb`);
    const compressed = join(temporary, `${asset.source}.compressed.glb`);
    const output = join(ASSET_DIR, asset.output);

    // glTF Transform's KTX command accepts PNG/JPEG, not WebP. Decode the
    // existing WebP payloads losslessly first; this does not alter the source
    // fallback assets and lets the encoder preserve the glTF slot semantics.
    run("npx", [
      "--yes",
      CLI,
      "png",
      source,
      png,
      "--formats",
      "webp",
      "--quality",
      "100",
    ]);
    run("npx", [
      "--yes",
      CLI,
      "etc1s",
      png,
      compressed,
      "--slots",
      "*Texture",
      "--quality",
      "200",
      "--compression",
      "2",
      "--rdo",
      "--jobs",
      "4",
    ]);
    replaceTexturePayload(source, compressed, output, asset.onlyIfSmaller);
    console.log(`generated ${asset.output}`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
