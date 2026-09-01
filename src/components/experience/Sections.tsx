import { useEffect, useState } from "react";
import { useExperience } from "@/hooks/use-experience";
import { ENGINEERING, HOTSPOTS, MODES, type DriveMode } from "@/lib/experience";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ActionButton, Reveal } from "@/components/ui-kit/Reveal";
import { Telemetry } from "./Telemetry";

const scrollTo = (id: string) =>
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });

export function Hero() {
  const [entered, setEntered] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setEntered(true);
      return;
    }
    const t = setTimeout(() => setEntered(true), 500);
    return () => clearTimeout(t);
  }, [reduced]);

  return (
    <section
      id="hero"
      data-section="hero"
      className="pointer-events-none relative z-10 flex min-h-[100svh] flex-col justify-between py-28"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-10">
        <div
          className={`transition-[opacity,transform] duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            entered ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <p className="eyebrow">BMW Performance Experience</p>
          <h1
            id="hero-heading"
            className="mt-8 text-[15vw] leading-[0.84] sm:text-[9vw] lg:text-[7.4vw]"
          >
            The Ultimate
            <br />
            <span className="text-muted-foreground">Driving Experience</span>
          </h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-10">
        <div
          className={`flex flex-col gap-10 transition-[opacity,transform] delay-500 duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] lg:flex-row lg:items-end lg:justify-between ${
            entered ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            An independent portfolio concept. Move around the vehicle, explore
            its engineering, then build your own specification.
          </p>
          <div className="pointer-events-auto flex flex-wrap items-center gap-x-8 gap-y-2">
            <ActionButton onClick={() => scrollTo("explore")}>
              Explore the vehicle
            </ActionButton>
            <ActionButton
              variant="outline"
              onClick={() => scrollTo("configure")}
            >
              Configure
            </ActionButton>
          </div>
        </div>
      </div>
    </section>
  );
}

const STATS = [
  { value: "625", unit: "HP", label: "Power" },
  { value: "3.2", unit: "SEC", label: "0–100 km/h" },
  { value: "305", unit: "KM/H", label: "Top speed" },
];

export function Performance() {
  return (
    <section
      id="performance"
      data-section="performance"
      className="pointer-events-none relative z-10 min-h-[100svh] py-28"
      aria-labelledby="performance-heading"
    >
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <Reveal>
          <p className="eyebrow">02 · Performance</p>
          <h2
            id="performance-heading"
            className="mt-6 max-w-2xl text-[11vw] leading-[0.88] sm:text-6xl"
          >
            Engineered for
            <br />
            <span className="text-muted-foreground">the limit</span>
          </h2>
        </Reveal>

        <ul className="mt-20 grid gap-px border-t border-border sm:grid-cols-3">
          {STATS.map((s, i) => (
            <Reveal
              as="li"
              key={s.label}
              delay={i * 140}
              className="border-b border-border py-10 sm:border-r sm:pr-8 sm:pl-0"
            >
              <div className="flex items-baseline gap-3">
                <span className="display text-[18vw] leading-none sm:text-[7vw]">
                  {s.value}
                </span>
                <span className="text-xs tracking-[0.3em] text-primary">
                  {s.unit}
                </span>
              </div>
              <p className="mt-4 text-[10px] tracking-[0.34em] text-muted-foreground uppercase">
                {s.label}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Explore() {
  const { hotspot, setHotspot, focus, section } = useExperience();
  const active = HOTSPOTS.find((h) => h.id === hotspot);

  return (
    <section
      id="explore"
      data-section="explore"
      className="pointer-events-none relative z-10 min-h-[100svh] py-28"
      aria-labelledby="explore-heading"
    >
      <div className="mx-auto flex min-h-[70vh] max-w-[1600px] flex-col justify-between gap-16 px-6 sm:px-10">
        <Reveal>
          <p className="eyebrow">03 · Interactive exploration</p>
          <h2
            id="explore-heading"
            className="mt-6 max-w-xl text-[11vw] leading-[0.88] sm:text-6xl"
          >
            Every angle,
            <br />
            <span className="text-muted-foreground">on your terms</span>
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Drag to rotate · scroll or pinch to zoom · select a marker to focus
            a technology.
          </p>
        </Reveal>

        <div className="pointer-events-auto grid gap-10 lg:grid-cols-[280px_1fr] lg:items-end">
          <ul className="space-y-1">
            {HOTSPOTS.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => {
                    setHotspot(hotspot === h.id ? null : h.id);
                    focus(h.view);
                  }}
                  aria-pressed={hotspot === h.id}
                  className={`flex w-full items-center justify-between gap-4 border-b border-border py-3.5 text-left text-[10px] font-semibold tracking-[0.24em] uppercase transition-colors ${
                    hotspot === h.id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {h.label}
                  <span
                    className={`h-px transition-[width,background-color] duration-500 ${
                      hotspot === h.id
                        ? "w-8 bg-primary"
                        : "w-3 bg-border-strong"
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>

          <div className="panel min-w-0 max-w-md p-7 lg:justify-self-end">
            {active ? (
              <>
                <p className="eyebrow max-w-full break-words leading-relaxed">
                  {active.label}
                </p>
                <p className="mt-4 max-w-prose break-words text-sm leading-relaxed text-foreground/90">
                  {active.copy}
                </p>
                <button
                  type="button"
                  onClick={() => setHotspot(null)}
                  className="mt-6 text-[10px] tracking-[0.3em] text-muted-foreground uppercase hover:text-foreground"
                >
                  Close detail
                </button>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {section === "explore"
                  ? "Select a highlighted point on the vehicle to reveal the technology behind it."
                  : "Scroll into this section to begin inspecting the vehicle."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Engineering() {
  const { topic, setTopic, focus } = useExperience();
  const active = ENGINEERING.find((t) => t.id === topic) ?? ENGINEERING[0];

  return (
    <section
      id="engineering"
      data-section="engineering"
      className="pointer-events-none relative z-10 min-h-[100svh] py-28"
      aria-labelledby="engineering-heading"
    >
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <Reveal>
          <p className="eyebrow">05 · Engineering &amp; technology</p>
          <h2
            id="engineering-heading"
            className="mt-6 max-w-2xl text-[11vw] leading-[0.88] sm:text-6xl"
          >
            Substance
            <br />
            <span className="text-muted-foreground">before style</span>
          </h2>
        </Reveal>

        <div className="pointer-events-auto mt-16 grid gap-px border-t border-border md:grid-cols-4">
          {ENGINEERING.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTopic(t.id);
                focus(t.view);
              }}
              aria-pressed={topic === t.id}
              className={`border-b border-border px-0 py-6 text-left transition-colors md:border-r md:px-5 ${
                topic === t.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="block text-[10px] font-semibold tracking-[0.3em]">
                {t.label}
              </span>
              <span
                className={`mt-4 block h-px transition-[width,background-color] duration-500 ${
                  topic === t.id ? "w-16 bg-primary" : "w-6 bg-border-strong"
                }`}
              />
            </button>
          ))}
        </div>

        <div
          key={active.id}
          aria-live="polite"
          className="mt-12 grid max-w-4xl gap-8 sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <p className="animate-fade-in text-lg leading-relaxed text-foreground/90 sm:text-xl">
            {active.copy}
          </p>
          <p className="display animate-fade-in text-4xl text-primary">
            {active.metric}
          </p>
        </div>
        {topic === "aerodynamics" && (
          <p className="mt-8 text-[10px] tracking-[0.28em] text-muted-foreground uppercase">
            Airflow visualisation active · artistic representation
          </p>
        )}
      </div>
    </section>
  );
}

export function Modes() {
  const { mode, setMode } = useExperience();

  return (
    <section
      id="modes"
      data-section="modes"
      className="pointer-events-none relative z-10 min-h-[100svh] py-28"
      aria-labelledby="modes-heading"
    >
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <Reveal>
          <p className="eyebrow">06 · Driving modes</p>
          <h2
            id="modes-heading"
            className="mt-6 max-w-xl text-[11vw] leading-[0.88] sm:text-6xl"
          >
            Three
            <br />
            <span className="text-muted-foreground">characters</span>
          </h2>
        </Reveal>

        <div className="pointer-events-auto mt-16 grid gap-px border-t border-border sm:grid-cols-3">
          {(Object.keys(MODES) as DriveMode[]).map((key) => {
            const m = MODES[key];
            const selected = mode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                aria-pressed={selected}
                className={`border-b border-border py-8 text-left transition-[background-color,border-color] duration-500 sm:border-r sm:px-6 ${
                  selected ? "bg-foreground/5" : "hover:bg-foreground/[0.03]"
                }`}
              >
                <span className="display block text-3xl">{m.label}</span>
                <span
                  className={`mt-4 block h-px transition-[width] duration-500 ${
                    selected ? "w-20" : "w-6"
                  }`}
                  style={{
                    backgroundColor: selected
                      ? m.accent
                      : "rgba(255,255,255,0.2)",
                  }}
                />
                <span className="mt-5 block max-w-xs text-xs leading-relaxed text-muted-foreground">
                  {m.tagline}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pointer-events-auto mt-14 max-w-3xl">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">Track telemetry · simulated concept data</p>
            {mode !== "track" && (
              <button
                type="button"
                onClick={() => setMode("track")}
                className="text-[10px] tracking-[0.3em] text-primary uppercase"
              >
                Activate track
              </button>
            )}
          </div>
          <div className="mt-8">
            <Telemetry active={mode === "track"} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Closing() {
  return (
    <section
      id="closing"
      data-section="closing"
      className="pointer-events-none relative z-10 flex min-h-[100svh] flex-col justify-end py-24"
      aria-labelledby="closing-heading"
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-10">
        <Reveal>
          <h2
            id="closing-heading"
            className="text-[13vw] leading-[0.85] sm:text-[8vw]"
          >
            Built for
            <br />
            <span className="text-muted-foreground">the drive</span>
          </h2>
        </Reveal>
        <Reveal
          delay={120}
          className="pointer-events-auto mt-14 flex flex-wrap items-center gap-x-8 gap-y-3"
        >
          <ActionButton onClick={() => scrollTo("configure")}>
            Build your specification
          </ActionButton>
          <ActionButton variant="outline" onClick={() => scrollTo("hero")}>
            Replay the experience
          </ActionButton>
        </Reveal>
        <div className="pointer-events-auto mt-24 flex flex-col justify-between gap-4 border-t border-border pt-8 text-[10px] tracking-[0.26em] text-muted-foreground uppercase sm:flex-row">
          <p>
            BMW Experience — independent portfolio concept · Designed by{" "}
            <a
              href="https://github.com/parsa-rajabi-nanami/BMW-3D-Experience"
              target="_blank"
              rel="noopener noreferrer"
              className="normal-case text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary"
            >
              Parsa Rajabi
            </a>{" "}
            ·{" "}
            <a
              href="https://github.com/parsa-rajabi-nanami/BMW-3D-Experience"
              target="_blank"
              rel="noopener noreferrer"
              className="normal-case text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary"
            >
              GitHub repository
            </a>
          </p>
          <p>Not affiliated with, endorsed by or produced by BMW AG</p>
        </div>
      </div>
    </section>
  );
}
