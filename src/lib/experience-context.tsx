import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CATEGORIES,
  DEFAULT_CONFIG,
  SECTION_VIEWS,
  totalPrice,
  type CategoryKey,
  type Config,
  type DriveMode,
  type SectionId,
} from "./experience";
import {
  ExperienceContext,
  type Ctx,
  type OrbitState,
} from "./experience-context-value";
const SAVED_CONFIG_KEY = "m-experience-config";

function readSavedConfig(): Config {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(SAVED_CONFIG_KEY) ?? "null",
    ) as Partial<Config> | null;
    if (!saved || typeof saved !== "object") return DEFAULT_CONFIG;
    const candidate = saved as Partial<Record<CategoryKey, unknown>>;
    return CATEGORIES.reduce<Config>(
      (next, category) => {
        const value = candidate[category.key];
        next[category.key] =
          typeof value === "string" &&
          category.options.some((option) => option.id === value)
            ? value
            : DEFAULT_CONFIG[category.key];
        return next;
      },
      { ...DEFAULT_CONFIG },
    );
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const orbit = useRef<OrbitState>({
    theta: SECTION_VIEWS.hero.theta,
    phi: SECTION_VIEWS.hero.phi,
    radius: SECTION_VIEWS.hero.radius,
    targetTheta: SECTION_VIEWS.hero.theta,
    targetPhi: SECTION_VIEWS.hero.phi,
    targetRadius: SECTION_VIEWS.hero.radius,
    userDriven: false,
  });

  const [section, setSectionState] = useState<SectionId>("hero");
  const [hotspot, setHotspot] = useState<string | null>(null);
  const [topic, setTopic] = useState("aerodynamics");
  const [mode, setMode] = useState<DriveMode>("comfort");
  const [config, setConfig] = useState<Config>(readSavedConfig);

  const focus = useCallback(
    (view: { theta: number; phi: number; radius: number }) => {
      const o = orbit.current;
      // keep the shortest rotational path so the car never spins the long way round
      const delta =
        ((view.theta - o.theta + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      o.targetTheta = o.theta + delta;
      o.targetPhi = view.phi;
      o.targetRadius = view.radius;
      o.userDriven = false;
    },
    [],
  );

  const adjustOrbit = useCallback(
    (deltaTheta: number, deltaPhi: number, deltaRadius: number) => {
      const o = orbit.current;
      o.targetTheta += deltaTheta;
      o.targetPhi = Math.min(1.52, Math.max(0.35, o.targetPhi + deltaPhi));
      o.targetRadius = Math.min(
        16,
        Math.max(3.2, o.targetRadius + deltaRadius),
      );
      o.userDriven = true;
    },
    [],
  );

  const setSection = useCallback(
    (s: SectionId) => {
      setSectionState((prev) => {
        if (prev !== s) focus(SECTION_VIEWS[s]);
        return s;
      });
    },
    [focus],
  );

  const setOption = useCallback((key: CategoryKey, id: string) => {
    setConfig((c) => ({ ...c, [key]: id }));
  }, []);

  const saveConfig = useCallback(() => {
    try {
      window.localStorage.setItem(SAVED_CONFIG_KEY, JSON.stringify(config));
      return true;
    } catch {
      return false;
    }
  }, [config]);

  const resetConfig = useCallback(() => setConfig(DEFAULT_CONFIG), []);

  const value = useMemo<Ctx>(
    () => ({
      orbit,
      section,
      setSection,
      focus,
      adjustOrbit,
      hotspot,
      setHotspot,
      topic,
      setTopic,
      mode,
      setMode,
      config,
      setOption,
      saveConfig,
      resetConfig,
      price: totalPrice(config),
      interactive: section === "explore" || section === "configure",
    }),
    [
      section,
      setSection,
      focus,
      adjustOrbit,
      hotspot,
      topic,
      mode,
      config,
      setOption,
      saveConfig,
      resetConfig,
    ],
  );

  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
}
