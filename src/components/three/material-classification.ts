export type CustomizationGroup =
  "BODY" | "RIMS" | "INTERIOR" | "TRIM" | "OTHER";

const GROUPS: CustomizationGroup[] = [
  "BODY",
  "RIMS",
  "INTERIOR",
  "TRIM",
  "OTHER",
];

function metadataGroup(value: unknown): CustomizationGroup | null {
  return typeof value === "string" &&
    GROUPS.includes(value as CustomizationGroup)
    ? (value as CustomizationGroup)
    : null;
}

/**
 * The optimized GLBs carry this value in node extras. The name rules are an
 * intentional fallback for the existing WebP assets and for older exports.
 * Mesh names win over material names because palette optimization can replace
 * semantic material names (for example, Paint uses PaletteMaterial006).
 */
export function classifyCarPart(
  meshName: string,
  materialName = "",
  userData?: Record<string, unknown>,
): CustomizationGroup {
  const metadata = metadataGroup(userData?.["customizationGroup"]);
  if (metadata) return metadata;

  const mesh = meshName.toLowerCase();
  if (mesh.includes("paint_geo")) return "BODY";
  if (mesh.includes("wheel1a_3d")) return "RIMS";
  if (mesh.includes("interior")) return "INTERIOR";
  if (mesh.includes("carbon1_geo")) return "TRIM";

  const material = materialName.toLowerCase();
  if (material.includes("paint")) return "BODY";
  if (material.includes("wheel1a") || material.includes("rim")) return "RIMS";
  if (material.includes("interior")) return "INTERIOR";
  if (material.includes("carbon1")) return "TRIM";
  return "OTHER";
}
