import { useEffect, useRef, useState } from "react";

const CHANNELS = [
  { key: "RPM", max: 7600, unit: "", base: 4200, swing: 3200 },
  { key: "TORQUE", max: 750, unit: "NM", base: 520, swing: 220 },
  { key: "POWER", max: 625, unit: "HP", base: 380, swing: 240 },
  { key: "BRAKE", max: 100, unit: "%", base: 24, swing: 70 },
  { key: "TEMPERATURE", max: 130, unit: "°C", base: 92, swing: 22 },
  { key: "G-FORCE", max: 1.4, unit: "G", base: 0.6, swing: 0.7 },
] as const;

export function Telemetry({ active }: { active: boolean }) {
  const [values, setValues] = useState<number[]>(CHANNELS.map((c) => c.base));
  const t = useRef(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      t.current += 0.08;
      setValues(
        CHANNELS.map(
          (c, i) =>
            c.base +
            Math.sin(t.current * (0.8 + i * 0.17) + i) * 0.5 * c.swing +
            Math.random() * c.swing * 0.05,
        ),
      );
    }, 90);
    return () => window.clearInterval(id);
  }, [active]);

  return (
    <div
      role="group"
      aria-label="Simulated track telemetry"
      className={`grid grid-cols-2 gap-x-8 gap-y-6 transition-opacity duration-700 sm:grid-cols-3 ${
        active ? "opacity-100" : "pointer-events-none opacity-25"
      }`}
    >
      {CHANNELS.map((c, i) => {
        const v = Math.max(0, Math.min(c.max, values[i] ?? c.base));
        return (
          <div key={c.key}>
            <div className="flex items-baseline justify-between">
              <span className="text-[9px] tracking-[0.3em] text-muted-foreground">
                {c.key}
              </span>
              <span className="display text-lg tabular-nums">
                {c.max <= 2 ? v.toFixed(2) : Math.round(v)}
                <span className="ml-1 text-[9px] tracking-widest text-muted-foreground">
                  {c.unit}
                </span>
              </span>
            </div>
            <div
              role="meter"
              aria-label={c.key}
              aria-valuemin={0}
              aria-valuemax={c.max}
              aria-valuenow={v}
              className="mt-2 h-px w-full bg-border"
            >
              <div
                className="h-px bg-primary transition-[width] duration-100 ease-linear"
                style={{ width: `${(v / c.max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
