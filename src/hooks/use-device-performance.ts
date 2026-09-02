import { useState } from "react";

function isLowPowerDevice() {
  if (typeof window === "undefined") return false;

  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean };
    }
  ).connection;
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;

  return Boolean(
    connection?.saveData ||
    (typeof memory === "number" && memory <= 4) ||
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4),
  );
}

/** Identifies devices where a 30fps, low-overhead 3D profile is preferable. */
export function useDevicePerformance() {
  return useState(isLowPowerDevice)[0];
}
