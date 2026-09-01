import { createContext, type MutableRefObject } from "react";
import type { CategoryKey, Config, DriveMode, SectionId } from "./experience";

export interface OrbitState {
  theta: number;
  phi: number;
  radius: number;
  targetTheta: number;
  targetPhi: number;
  targetRadius: number;
  userDriven: boolean;
}

export interface Ctx {
  orbit: MutableRefObject<OrbitState>;
  section: SectionId;
  setSection: (s: SectionId) => void;
  focus: (view: { theta: number; phi: number; radius: number }) => void;
  adjustOrbit: (
    deltaTheta: number,
    deltaPhi: number,
    deltaRadius: number,
  ) => void;
  hotspot: string | null;
  setHotspot: (id: string | null) => void;
  topic: string;
  setTopic: (id: string) => void;
  mode: DriveMode;
  setMode: (m: DriveMode) => void;
  config: Config;
  setOption: (key: CategoryKey, id: string) => void;
  saveConfig: () => boolean;
  resetConfig: () => void;
  price: number;
  interactive: boolean;
}

export const ExperienceContext = createContext<Ctx | null>(null);
