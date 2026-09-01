export type SectionId =
  | "hero"
  | "performance"
  | "explore"
  | "configure"
  | "engineering"
  | "modes"
  | "summary"
  | "closing";

export type DriveMode = "comfort" | "sport" | "track";

export interface Option {
  id: string;
  name: string;
  price: number;
  hex?: string;
  note?: string;
}

export const BASE_PRICE = 95000;

export const EXTERIORS: Option[] = [
  {
    id: "carbon-black",
    name: "Carbon Black",
    price: 0,
    hex: "#14171c",
    note: "Metallic",
  },
  {
    id: "alpine-white",
    name: "Alpine White",
    price: 900,
    hex: "#e8eaed",
    note: "Solid",
  },
  {
    id: "brooklyn-grey",
    name: "Brooklyn Grey",
    price: 1800,
    hex: "#4a4f57",
    note: "Metallic",
  },
  {
    id: "portimao-blue",
    name: "Portimao Blue",
    price: 2400,
    hex: "#1f4f9c",
    note: "Metallic",
  },
  {
    id: "toronto-red",
    name: "Toronto Red",
    price: 2400,
    hex: "#8c1420",
    note: "Metallic",
  },
];

export const WHEELS: Option[] = [
  {
    id: "m-sport",
    name: "M Sport",
    price: 0,
    hex: "#2a2d33",
    note: '20" Bi-colour',
  },
  {
    id: "m-performance",
    name: "M Performance",
    price: 3200,
    hex: "#6d737d",
    note: '21" Forged',
  },
  {
    id: "carbon",
    name: "Carbon",
    price: 7800,
    hex: "#0e1013",
    note: '21" Carbon fibre',
  },
];

export const BRAKES: Option[] = [
  {
    id: "m-sport",
    name: "M Sport",
    price: 0,
    hex: "#3a3f47",
    note: "Steel · Blue calipers",
  },
  {
    id: "performance",
    name: "Performance",
    price: 2900,
    hex: "#8a1f28",
    note: "Steel · Red calipers",
  },
  {
    id: "carbon-ceramic",
    name: "Carbon Ceramic",
    price: 8500,
    hex: "#c7a24a",
    note: "Ceramic · Gold",
  },
];

export const INTERIORS: Option[] = [
  { id: "black-leather", name: "Black Leather", price: 0, hex: "#1b1d21" },
  { id: "cognac-leather", name: "Cognac Leather", price: 1600, hex: "#8a5a2b" },
  { id: "ivory-leather", name: "Ivory Leather", price: 1600, hex: "#ded6c6" },
  { id: "alcantara", name: "Alcantara", price: 2200, hex: "#2b2f36" },
];

export const TRIMS: Option[] = [
  { id: "aluminium", name: "Brushed Aluminium", price: 0 },
  { id: "carbon-fibre", name: "M Carbon Fibre", price: 2100 },
  { id: "open-pore", name: "Open Pore Wood", price: 1400 },
];

export const CATEGORIES = [
  { key: "exterior", label: "EXTERIOR", options: EXTERIORS },
  { key: "wheels", label: "WHEELS", options: WHEELS },
  { key: "brakes", label: "BRAKES", options: BRAKES },
  { key: "interior", label: "INTERIOR", options: INTERIORS },
  { key: "trim", label: "TRIM", options: TRIMS },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export type Config = Record<CategoryKey, string>;

export const DEFAULT_CONFIG: Config = {
  exterior: "alpine-white",
  wheels: "m-sport",
  brakes: "m-sport",
  interior: "black-leather",
  trim: "carbon-fibre",
};

export function optionOf(key: CategoryKey, id: string): Option {
  const cat = CATEGORIES.find((c) => c.key === key)!;
  return cat.options.find((o) => o.id === id) ?? (cat.options[0] as Option);
}

export function totalPrice(config: Config): number {
  return CATEGORIES.reduce(
    (sum, c) => sum + optionOf(c.key, config[c.key]).price,
    BASE_PRICE,
  );
}

export const HOTSPOTS = [
  {
    id: "led",
    label: "M Adaptive LED",
    position: [1.68, 0.52, 0.62] as [number, number, number],
    copy: "Laser-guided matrix optics read the road ahead and carve light around oncoming traffic without a single manual input.",
    view: { theta: 0.75, phi: 1.28, radius: 5.2 },
  },
  {
    id: "brakes",
    label: "Carbon Ceramic Brakes",
    position: [1.22, 0.3, -0.86] as [number, number, number],
    copy: "Ceramic composite discs shed unsprung mass and refuse to fade — repeatable stopping power, lap after lap.",
    view: { theta: 1.05, phi: 1.42, radius: 4.4 },
  },
  {
    id: "aero",
    label: "Active Aerodynamics",
    position: [-1.55, 0.78, 0.0] as [number, number, number],
    copy: "Air is routed, not fought. Adaptive flaps and a shaped underbody trade drag for downforce as speed builds.",
    view: { theta: 3.6, phi: 1.15, radius: 6.2 },
  },
  {
    id: "exhaust",
    label: "M Performance Exhaust",
    position: [-1.72, 0.28, -0.5] as [number, number, number],
    copy: "Titanium tailpipes and valve-controlled flow give the straight-six a voice that hardens with every driving mode.",
    view: { theta: 3.9, phi: 1.35, radius: 4.8 },
  },
  {
    id: "cockpit",
    label: "Driver Focused Cockpit",
    position: [0.1, 0.95, 0.35] as [number, number, number],
    copy: "Everything angled toward the driver. Curved display, carbon shells, and controls placed by instinct rather than layout.",
    view: { theta: 1.9, phi: 1.0, radius: 4.0 },
  },
] as const;

export const ENGINEERING = [
  {
    id: "aerodynamics",
    label: "AERODYNAMICS",
    copy: "A body sculpted by airflow. Every intake, gurney and diffuser exists to keep the car planted at speed.",
    metric: "−18% lift",
    view: { theta: 2.4, phi: 1.05, radius: 7.4 },
  },
  {
    id: "chassis",
    label: "CHASSIS",
    copy: "A bonded aluminium and carbon core, tuned on the Nordschleife until steering became telepathy.",
    metric: "1.9 Hz roll rate",
    view: { theta: 0.6, phi: 0.75, radius: 8.0 },
  },
  {
    id: "powertrain",
    label: "POWERTRAIN",
    copy: "Twin-turbo inline six with closed-deck block and cross-bank exhaust manifold. Response before volume.",
    metric: "625 HP",
    view: { theta: 5.6, phi: 1.2, radius: 6.0 },
  },
  {
    id: "braking",
    label: "BRAKING",
    copy: "Integrated brake-by-wire with two pedal characteristics, feeding ceramic discs behind forged wheels.",
    metric: "31 m · 100–0",
    view: { theta: 1.1, phi: 1.45, radius: 4.6 },
  },
] as const;

export const MODES: Record<
  DriveMode,
  {
    label: string;
    tagline: string;
    accent: string;
    exposure: number;
    rotate: number;
  }
> = {
  comfort: {
    label: "COMFORT",
    tagline: "Composed. Quiet. Effortless long-distance calm.",
    accent: "#5c87c9",
    exposure: 1.05,
    rotate: 0.06,
  },
  sport: {
    label: "SPORT",
    tagline: "Sharper throttle, firmer body, a harder edge to every input.",
    accent: "#1c6ef2",
    exposure: 1.2,
    rotate: 0.16,
  },
  track: {
    label: "TRACK",
    tagline: "Everything stripped back to lap time. Telemetry live.",
    accent: "#e2373f",
    exposure: 1.35,
    rotate: 0.3,
  },
};

export const SECTION_VIEWS: Record<
  SectionId,
  { theta: number; phi: number; radius: number }
> = {
  // The normalized vehicle points its nose along +X: start on-axis at the
  // front so the first frame presents the car's face. The shorter hero radius
  // gives the initial loading view a stronger, larger vehicle presence.
  hero: { theta: Math.PI / 2, phi: 1.18, radius: 7.2 },
  performance: { theta: 1.35, phi: 1.32, radius: 7.6 },
  explore: { theta: 0.9, phi: 1.2, radius: 6.4 },
  configure: { theta: 2.55, phi: 1.22, radius: 6.8 },
  engineering: { theta: 4.3, phi: 1.1, radius: 7.2 },
  modes: { theta: 3.15, phi: 1.28, radius: 7.0 },
  summary: { theta: 2.2, phi: 1.15, radius: 7.8 },
  closing: { theta: 2.05, phi: 1.3, radius: 11.5 },
};

export const currency = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
