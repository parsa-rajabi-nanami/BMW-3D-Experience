import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useExperience } from "@/hooks/use-experience";
import {
  BASE_PRICE,
  CATEGORIES,
  currency,
  optionOf,
  SECTION_VIEWS,
  type CategoryKey,
} from "@/lib/experience";
import { ActionButton, Reveal } from "@/components/ui-kit/Reveal";

const CATEGORY_VIEWS: Record<
  CategoryKey,
  { theta: number; phi: number; radius: number }
> = {
  exterior: { theta: 2.55, phi: 1.22, radius: 6.8 },
  wheels: { theta: 1.15, phi: 1.44, radius: 4.6 },
  interior: { theta: 1.9, phi: 1.0, radius: 4.4 },
  trim: { theta: 2.1, phi: 1.05, radius: 5.2 },
};

export function ConfiguratorSection() {
  const { config, setOption, price, focus } = useExperience();
  const [tab, setTab] = useState<CategoryKey>("exterior");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = CATEGORIES.find((c) => c.key === tab)!;

  const selectTab = (key: CategoryKey) => {
    setTab(key);
    focus(CATEGORY_VIEWS[key]);
  };

  return (
    <section
      id="configure"
      data-section="configure"
      className="pointer-events-none relative z-10 min-h-[100svh] py-24"
      aria-labelledby="configure-heading"
    >
      <div className="mx-auto grid max-w-[1600px] gap-10 px-6 sm:px-10 lg:grid-cols-[1fr_400px]">
        <div className="lg:pt-10">
          <Reveal>
            <p className="eyebrow">04 · Configurator</p>
            <h2
              id="configure-heading"
              className="mt-6 text-[13vw] leading-[0.86] sm:text-6xl lg:text-7xl"
            >
              Make it
              <br />
              <span className="text-muted-foreground">yours</span>
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Drag to rotate and use a trackpad pinch or wheel to move closer.
              Body, rim, interior and trim choices update the live vehicle
              preview and estimated price instantly.
            </p>
          </Reveal>
        </div>

        <Reveal
          delay={120}
          className="pointer-events-auto panel self-end p-6 sm:p-8 lg:sticky lg:top-28"
        >
          <div
            role="tablist"
            aria-label="Configuration categories"
            className="flex flex-wrap gap-x-5 gap-y-2 border-b border-border pb-4"
          >
            {CATEGORIES.map((c, index) => (
              <button
                key={c.key}
                type="button"
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                role="tab"
                id={`tab-${c.key}`}
                aria-selected={tab === c.key}
                aria-controls="config-options-panel"
                tabIndex={tab === c.key ? 0 : -1}
                onClick={() => selectTab(c.key)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft")
                    return;
                  event.preventDefault();
                  const nextIndex =
                    event.key === "ArrowRight"
                      ? (index + 1) % CATEGORIES.length
                      : (index - 1 + CATEGORIES.length) % CATEGORIES.length;
                  const next = CATEGORIES[nextIndex];
                  if (!next) return;
                  selectTab(next.key);
                  tabRefs.current[nextIndex]?.focus();
                }}
                className={`cursor-pointer text-[10px] font-semibold tracking-[0.26em] transition-colors ${
                  tab === c.key
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div
            id="config-options-panel"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
          >
            <ul className="mt-6 space-y-1">
              {active.options.map((o) => {
                const selected = config[tab] === o.id;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => setOption(tab, o.id)}
                      aria-pressed={selected}
                      className={`group flex w-full items-center gap-4 border px-4 py-3.5 text-left transition-[background-color,border-color] duration-300 ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:border-border-strong"
                      }`}
                    >
                      {o.hex ? (
                        <span
                          aria-hidden="true"
                          className="size-6 shrink-0 border border-border-strong"
                          style={{ backgroundColor: o.hex }}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="size-6 shrink-0 border border-border-strong bg-surface-elevated"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold tracking-[0.14em] uppercase">
                          {o.name}
                        </span>
                        {o.note && (
                          <span className="block text-[10px] tracking-[0.2em] text-muted-foreground">
                            {o.note}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[10px] tracking-[0.2em] text-muted-foreground tabular-nums">
                        {o.price === 0 ? "INCL." : `+${currency(o.price)}`}
                      </span>
                      <Check
                        aria-hidden="true"
                        className={`size-4 shrink-0 transition-opacity ${
                          selected ? "text-primary opacity-100" : "opacity-0"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div
            aria-live="polite"
            className="mt-8 flex items-end justify-between border-t border-border pt-5"
          >
            <div>
              <p className="eyebrow">Estimated concept price</p>
              <p className="display mt-1 text-4xl tabular-nums">
                {currency(price)}
              </p>
            </div>
            <p className="text-right text-[10px] leading-relaxed tracking-[0.2em] text-muted-foreground">
              BASE
              <br />
              {currency(BASE_PRICE)}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function SummarySection() {
  const { config, price, saveConfig, resetConfig, focus } = useExperience();
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">(
    "idle",
  );

  useEffect(() => {
    setSaveState("idle");
  }, [config]);

  const rows: { label: string; value: string }[] = [
    { label: "Vehicle", value: "M Performance Concept" },
    ...CATEGORIES.map((c) => ({
      label: c.label,
      value: optionOf(c.key, config[c.key]).name,
    })),
  ];

  return (
    <section
      id="summary"
      data-section="summary"
      className="pointer-events-none relative z-10 min-h-[100svh] py-28"
      aria-labelledby="summary-heading"
    >
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <Reveal>
          <p className="eyebrow">07 · Your build</p>
          <h2
            id="summary-heading"
            className="mt-6 text-[12vw] leading-[0.86] sm:text-6xl lg:text-7xl"
          >
            Configuration
            <br />
            <span className="text-muted-foreground">summary</span>
          </h2>
        </Reveal>

        <Reveal delay={100} className="pointer-events-auto mt-14 max-w-3xl">
          <dl className="divide-y divide-border border-y border-border">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between gap-6 py-5"
              >
                <dt className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                  {r.label}
                </dt>
                <dd className="text-sm font-semibold tracking-[0.12em] uppercase">
                  {r.value}
                </dd>
              </div>
            ))}
            <div className="flex items-end justify-between gap-6 py-7">
              <dt className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                Estimated price
              </dt>
              <dd className="display text-5xl tabular-nums">
                {currency(price)}
              </dd>
            </div>
          </dl>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-2">
            <ActionButton
              onClick={() => {
                const ok = saveConfig();
                setSaveState(ok ? "saved" : "error");
              }}
            >
              {saveState === "saved"
                ? "Build saved"
                : saveState === "error"
                  ? "Save failed"
                  : "Save build"}
            </ActionButton>
            <ActionButton
              variant="outline"
              onClick={() => {
                resetConfig();
                focus(SECTION_VIEWS.configure);
                document
                  .getElementById("configure")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Start over
            </ActionButton>
            <ActionButton
              variant="ghost"
              onClick={() =>
                document
                  .getElementById("configure")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Configure again
            </ActionButton>
          </div>
          <p
            role="status"
            aria-live="polite"
            className="mt-4 min-h-4 text-[10px] tracking-[0.2em] text-muted-foreground uppercase"
          >
            {saveState === "saved"
              ? "Your build is saved on this device."
              : saveState === "error"
                ? "Storage is unavailable. Try again or keep this summary open."
                : ""}
          </p>
          <p className="mt-8 text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
            Concept pricing · no commerce system connected
          </p>
        </Reveal>
      </div>
    </section>
  );
}
