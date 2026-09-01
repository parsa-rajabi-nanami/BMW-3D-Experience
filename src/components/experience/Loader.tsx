import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

export function LoadingCurtain() {
  const { progress, active } = useProgress();
  const [gone, setGone] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const complete = !active && progress >= 100;
    if (complete) {
      const t1 = setTimeout(() => setGone(true), 450);
      const t2 = setTimeout(() => setHidden(true), 1600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    // A failed WebGL context or a cached request can leave drei at 0% with no
    // active request. Never let that state block the rest of the experience.
    const safety = setTimeout(() => {
      setGone(true);
      setHidden(true);
    }, 2600);
    return () => clearTimeout(safety);
  }, [active, progress]);

  if (hidden) return null;

  const percent = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-0 z-100 flex flex-col justify-between bg-[#07080a] px-6 py-10 transition-opacity duration-1000 sm:px-12 ${
        gone ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="eyebrow">M Performance Experience</div>
      <div>
        <div className="display text-[13vw] leading-[0.85] sm:text-[9vw]">
          Precision
          <br />
          <span className="text-muted-foreground">Loading…</span>
        </div>
        <div
          role="progressbar"
          aria-label="Loading vehicle experience"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-10 flex items-end justify-between gap-6"
        >
          <div className="h-px flex-1 bg-border">
            <div
              className="h-px bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${Math.max(4, percent)}%` }}
            />
          </div>
          <div className="display text-2xl tabular-nums">{percent}%</div>
        </div>
      </div>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        Preparing the vehicle, lighting rig and configurator. An independent
        portfolio concept — not affiliated with, endorsed by or produced by BMW.
      </p>
    </div>
  );
}
