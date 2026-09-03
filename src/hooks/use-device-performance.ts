import { useState } from "react";

export type QualityTier = "low" | "medium" | "high";

export interface DeviceQuality {
  tier: QualityTier;
  isMobile: boolean;
  modelFile: string;
  compressedModelFile: string;
  pixelRatio: [number, number];
  frameRate: number;
  shadows: boolean;
  shadowMapSize: number;
  environmentResolution: number;
  contactShadows: boolean;
  antialias: boolean;
  secondaryLights: boolean;
  airflowCount: number;
  renderMode: "always" | "demand";
}

const QUALITY_PROFILES: Record<QualityTier, Omit<DeviceQuality, "tier">> = {
  low: {
    isMobile: true,
    modelFile: "car-low.glb",
    compressedModelFile: "car-low-ktx2.glb",
    pixelRatio: [1, 1],
    frameRate: 30,
    shadows: false,
    shadowMapSize: 256,
    environmentResolution: 64,
    contactShadows: false,
    antialias: false,
    secondaryLights: false,
    airflowCount: 18,
    renderMode: "demand",
  },
  medium: {
    isMobile: false,
    modelFile: "car-medium.glb",
    compressedModelFile: "car-medium-ktx2.glb",
    pixelRatio: [1, 1.25],
    frameRate: 45,
    shadows: true,
    shadowMapSize: 512,
    environmentResolution: 128,
    contactShadows: false,
    antialias: false,
    secondaryLights: true,
    airflowCount: 30,
    renderMode: "demand",
  },
  high: {
    isMobile: false,
    modelFile: "car.glb",
    compressedModelFile: "car-ktx2.glb",
    pixelRatio: [1, 1.5],
    frameRate: 60,
    shadows: true,
    shadowMapSize: 1024,
    environmentResolution: 256,
    contactShadows: true,
    antialias: true,
    secondaryLights: true,
    airflowCount: 46,
    renderMode: "always",
  },
};

type NavigatorWithDeviceSignals = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
};

function hasSoftwareRenderer(gl: WebGLRenderingContext): boolean {
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (!debugInfo) return false;
  const renderer = String(
    gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "",
  ).toLowerCase();
  return /swiftshader|llvmpipe|software rasterizer|software renderer/.test(
    renderer,
  );
}

function inspectWebGL() {
  try {
    const canvas = document.createElement("canvas");
    // Do not request a high-performance context for capability detection: on
    // hybrid laptops that can wake the discrete GPU before the real canvas is
    // created. The actual renderer receives the tier-specific power hint.
    const webgl2 = canvas.getContext("webgl2");
    const gl = webgl2 ?? canvas.getContext("webgl");
    if (!gl)
      return {
        supported: false,
        webgl2: false,
        maxTextureSize: 0,
        software: false,
      };
    return {
      supported: true,
      webgl2: Boolean(webgl2),
      maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
      software: hasSoftwareRenderer(gl),
    };
  } catch {
    return {
      supported: false,
      webgl2: false,
      maxTextureSize: 0,
      software: false,
    };
  }
}

function detectQuality(): DeviceQuality {
  if (typeof window === "undefined") {
    return { tier: "high", ...QUALITY_PROFILES.high };
  }

  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "low" || forced === "medium" || forced === "high") {
    return { tier: forced, ...QUALITY_PROFILES[forced] };
  }

  const signals = navigator as NavigatorWithDeviceSignals;
  const connection = signals.connection;
  const memory = signals.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const isMobile =
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 1;
  const webgl = inspectWebGL();
  const slowNetwork =
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g";
  const lowPower = Boolean(
    connection?.saveData ||
    slowNetwork ||
    (cores > 0 && cores <= 2) ||
    (memory !== undefined && memory <= 2) ||
    webgl.software ||
    !webgl.supported ||
    (webgl.maxTextureSize > 0 && webgl.maxTextureSize < 4096) ||
    (isMobile &&
      ((cores > 0 && cores <= 4) || (memory !== undefined && memory <= 4))),
  );

  if (lowPower) return { tier: "low", ...QUALITY_PROFILES.low, isMobile };

  const mediumPower = Boolean(
    isMobile ||
    !webgl.webgl2 ||
    (cores > 0 && cores <= 6) ||
    (memory !== undefined && memory <= 6) ||
    window.innerWidth < 1024,
  );
  if (mediumPower) {
    return { tier: "medium", ...QUALITY_PROFILES.medium, isMobile };
  }

  return { tier: "high", ...QUALITY_PROFILES.high, isMobile };
}

/** Selects a stable rendering and asset profile once per page load. */
export function useDevicePerformance() {
  return useState(detectQuality)[0];
}
