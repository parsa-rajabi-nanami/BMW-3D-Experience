import { useState } from "react";

function isLowPowerDevice() {
  if (typeof window === "undefined") return false;

  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const signals = [
    typeof memory === "number" && memory <= 4,
    navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4,
    connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g" ||
      connection?.effectiveType === "3g",
    coarsePointer && window.innerWidth < 768,
  ].filter(Boolean).length;

  // Save-Data is an explicit user preference. Otherwise require multiple
  // weak signals so one imprecise browser metric does not downgrade desktop
  // rendering or newer mobile devices.
  return Boolean(connection?.saveData || signals >= 2);
}

/** Identifies devices where a 30fps, low-overhead 3D profile is preferable. */
export function useDevicePerformance() {
  return useState(isLowPowerDevice)[0];
}
