import type {
  NormalizedShape,
  Point2D,
  ShapePrimitive,
} from "@/lib/ict-lab/particle-shapes";

export interface VisualKitTopicTheme {
  id: string;
  name: string;
  accentDark: string;
  accentLight: string;
  accentRgb: [number, number, number];
  shape: NormalizedShape;
  cardBorderHoverClass: string;
  cardShadowHoverClass: string;
  focusRingClass: string;
  iconTileHoverClass: string;
  titleHoverClass: string;
  buttonClass: string;
}

/**
 * 1. Human Heart: rose red (#f43f5e)
 * Heart outline with an ECG pulse line across it.
 */
export const HEART_SHAPE: NormalizedShape = {
  primitives: [
    // Left lobe of heart
    { type: "line", x1: 0.5, y1: 0.32, x2: 0.38, y2: 0.2 },
    { type: "line", x1: 0.38, y1: 0.2, x2: 0.24, y2: 0.22 },
    { type: "line", x1: 0.24, y1: 0.22, x2: 0.16, y2: 0.34 },
    { type: "line", x1: 0.16, y1: 0.34, x2: 0.16, y2: 0.48 },
    { type: "line", x1: 0.16, y1: 0.48, x2: 0.26, y2: 0.64 },
    { type: "line", x1: 0.26, y1: 0.64, x2: 0.5, y2: 0.86 },
    // Right lobe of heart
    { type: "line", x1: 0.5, y1: 0.32, x2: 0.62, y2: 0.2 },
    { type: "line", x1: 0.62, y1: 0.2, x2: 0.76, y2: 0.22 },
    { type: "line", x1: 0.76, y1: 0.22, x2: 0.84, y2: 0.34 },
    { type: "line", x1: 0.84, y1: 0.34, x2: 0.84, y2: 0.48 },
    { type: "line", x1: 0.84, y1: 0.48, x2: 0.74, y2: 0.64 },
    { type: "line", x1: 0.74, y1: 0.64, x2: 0.5, y2: 0.86 },
    // ECG pulse trace across heart
    { type: "line", x1: 0.18, y1: 0.5, x2: 0.36, y2: 0.5 },
    { type: "line", x1: 0.36, y1: 0.5, x2: 0.4, y2: 0.53 },
    { type: "line", x1: 0.4, y1: 0.53, x2: 0.47, y2: 0.3 },
    { type: "line", x1: 0.47, y1: 0.3, x2: 0.53, y2: 0.65 },
    { type: "line", x1: 0.53, y1: 0.65, x2: 0.58, y2: 0.47 },
    { type: "line", x1: 0.58, y1: 0.47, x2: 0.63, y2: 0.5 },
    { type: "line", x1: 0.63, y1: 0.5, x2: 0.82, y2: 0.5 },
  ],
};

/**
 * 2. Human Digestive System: orange (#fb923c)
 * Stomach bean with a coiled small-intestine squiggle.
 */
export const DIGESTIVE_SHAPE: NormalizedShape = {
  primitives: [
    // Esophagus
    { type: "line", x1: 0.44, y1: 0.16, x2: 0.44, y2: 0.26 },
    // Stomach greater curvature
    { type: "line", x1: 0.44, y1: 0.26, x2: 0.3, y2: 0.3 },
    { type: "line", x1: 0.3, y1: 0.3, x2: 0.26, y2: 0.42 },
    { type: "line", x1: 0.26, y1: 0.42, x2: 0.32, y2: 0.54 },
    { type: "line", x1: 0.32, y1: 0.54, x2: 0.46, y2: 0.54 },
    { type: "line", x1: 0.46, y1: 0.54, x2: 0.54, y2: 0.48 },
    // Stomach lesser curvature
    { type: "line", x1: 0.44, y1: 0.26, x2: 0.42, y2: 0.38 },
    { type: "line", x1: 0.42, y1: 0.38, x2: 0.54, y2: 0.48 },
    // Intestine coiled loops
    { type: "line", x1: 0.54, y1: 0.48, x2: 0.64, y2: 0.56 },
    { type: "line", x1: 0.64, y1: 0.56, x2: 0.52, y2: 0.62 },
    { type: "line", x1: 0.52, y1: 0.62, x2: 0.36, y2: 0.62 },
    { type: "line", x1: 0.36, y1: 0.62, x2: 0.3, y2: 0.7 },
    { type: "line", x1: 0.3, y1: 0.7, x2: 0.48, y2: 0.72 },
    { type: "line", x1: 0.48, y1: 0.72, x2: 0.66, y2: 0.72 },
    { type: "line", x1: 0.66, y1: 0.72, x2: 0.68, y2: 0.8 },
    { type: "line", x1: 0.68, y1: 0.8, x2: 0.52, y2: 0.82 },
    { type: "line", x1: 0.52, y1: 0.82, x2: 0.36, y2: 0.82 },
    { type: "line", x1: 0.36, y1: 0.82, x2: 0.48, y2: 0.88 },
    { type: "line", x1: 0.48, y1: 0.88, x2: 0.5, y2: 0.92 },
  ],
};

/**
 * 3. Animal Cell: teal (#14b8a6)
 * Large cell circle with a nucleus circle inside and small organelle dots/ovals.
 */
export const CELL_SHAPE: NormalizedShape = {
  primitives: [
    // Outer cell membrane
    { type: "circle", cx: 0.5, cy: 0.5, r: 0.38 },
    // Central nucleus
    { type: "circle", cx: 0.46, cy: 0.46, r: 0.14 },
    // Nucleolus
    { type: "circle", cx: 0.44, cy: 0.44, r: 0.05 },
    // Mitochondria ovals
    { type: "rect", x: 0.64, y: 0.28, w: 0.12, h: 0.06 },
    { type: "rect", x: 0.24, y: 0.6, w: 0.12, h: 0.06 },
    // Lysosome / vacuole
    { type: "circle", cx: 0.68, cy: 0.6, r: 0.05 },
    // Centrosome
    { type: "circle", cx: 0.3, cy: 0.34, r: 0.04 },
    // Golgi folds
    { type: "line", x1: 0.46, y1: 0.7, x2: 0.6, y2: 0.68 },
    { type: "line", x1: 0.44, y1: 0.74, x2: 0.62, y2: 0.72 },
  ],
};

/**
 * 4. Plant Anatomy: green (#22c55e)
 * Seedling with stem, two leaves, and root fan.
 */
export const PLANT_SHAPE: NormalizedShape = {
  primitives: [
    // Stem
    { type: "line", x1: 0.5, y1: 0.7, x2: 0.5, y2: 0.3 },
    // Left leaf
    { type: "line", x1: 0.5, y1: 0.44, x2: 0.36, y2: 0.38 },
    { type: "line", x1: 0.36, y1: 0.38, x2: 0.24, y2: 0.32 },
    { type: "line", x1: 0.24, y1: 0.32, x2: 0.34, y2: 0.46 },
    { type: "line", x1: 0.34, y1: 0.46, x2: 0.5, y2: 0.46 },
    { type: "line", x1: 0.5, y1: 0.44, x2: 0.24, y2: 0.32 }, // leaf vein
    // Right leaf
    { type: "line", x1: 0.5, y1: 0.38, x2: 0.64, y2: 0.32 },
    { type: "line", x1: 0.64, y1: 0.32, x2: 0.76, y2: 0.26 },
    { type: "line", x1: 0.76, y1: 0.26, x2: 0.66, y2: 0.4 },
    { type: "line", x1: 0.66, y1: 0.4, x2: 0.5, y2: 0.4 },
    { type: "line", x1: 0.5, y1: 0.38, x2: 0.76, y2: 0.26 }, // leaf vein
    // Roots
    { type: "line", x1: 0.5, y1: 0.7, x2: 0.5, y2: 0.88 },
    { type: "line", x1: 0.5, y1: 0.73, x2: 0.38, y2: 0.84 },
    { type: "line", x1: 0.5, y1: 0.73, x2: 0.62, y2: 0.84 },
    { type: "line", x1: 0.5, y1: 0.76, x2: 0.44, y2: 0.88 },
    { type: "line", x1: 0.5, y1: 0.76, x2: 0.56, y2: 0.88 },
  ],
};

/**
 * 5. Water Cycle: sky blue (#0ea5e9)
 * Cloud outline with raindrops and a small sun circle.
 */
export const WATER_CYCLE_SHAPE: NormalizedShape = {
  primitives: [
    // Sun in upper right
    { type: "circle", cx: 0.78, cy: 0.24, r: 0.09 },
    { type: "line", x1: 0.78, y1: 0.11, x2: 0.78, y2: 0.06 },
    { type: "line", x1: 0.91, y1: 0.18, x2: 0.95, y2: 0.15 },
    { type: "line", x1: 0.92, y1: 0.24, x2: 0.97, y2: 0.24 },
    { type: "line", x1: 0.66, y1: 0.18, x2: 0.62, y2: 0.15 },
    // Cloud bottom baseline
    { type: "line", x1: 0.22, y1: 0.56, x2: 0.64, y2: 0.56 },
    // Cloud puffs
    { type: "circle", cx: 0.28, cy: 0.48, r: 0.11 },
    { type: "circle", cx: 0.44, cy: 0.38, r: 0.14 },
    { type: "circle", cx: 0.58, cy: 0.46, r: 0.12 },
    // Raindrops below
    { type: "line", x1: 0.28, y1: 0.64, x2: 0.24, y2: 0.74 },
    { type: "line", x1: 0.42, y1: 0.64, x2: 0.38, y2: 0.74 },
    { type: "line", x1: 0.56, y1: 0.64, x2: 0.52, y2: 0.74 },
    { type: "line", x1: 0.35, y1: 0.78, x2: 0.31, y2: 0.88 },
    { type: "line", x1: 0.49, y1: 0.78, x2: 0.45, y2: 0.88 },
  ],
};

/**
 * 6. DC Electric Circuit: yellow (#eab308)
 * Rectangular loop with a battery symbol and a bulb circle.
 */
export const CIRCUIT_SHAPE: NormalizedShape = {
  primitives: [
    // Top and bottom wire loop
    { type: "line", x1: 0.22, y1: 0.26, x2: 0.78, y2: 0.26 },
    { type: "line", x1: 0.22, y1: 0.74, x2: 0.78, y2: 0.74 },
    // Left wires connecting to battery
    { type: "line", x1: 0.22, y1: 0.26, x2: 0.22, y2: 0.42 },
    { type: "line", x1: 0.22, y1: 0.58, x2: 0.22, y2: 0.74 },
    // Battery plates
    { type: "line", x1: 0.14, y1: 0.42, x2: 0.3, y2: 0.42 },
    { type: "line", x1: 0.18, y1: 0.48, x2: 0.26, y2: 0.48 },
    { type: "line", x1: 0.14, y1: 0.52, x2: 0.3, y2: 0.52 },
    { type: "line", x1: 0.18, y1: 0.58, x2: 0.26, y2: 0.58 },
    // Right wires connecting to bulb
    { type: "line", x1: 0.78, y1: 0.26, x2: 0.78, y2: 0.4 },
    { type: "line", x1: 0.78, y1: 0.6, x2: 0.78, y2: 0.74 },
    // Bulb load
    { type: "circle", cx: 0.78, cy: 0.5, r: 0.1 },
    // Filament X
    { type: "line", x1: 0.73, y1: 0.45, x2: 0.83, y2: 0.55 },
    { type: "line", x1: 0.73, y1: 0.55, x2: 0.83, y2: 0.45 },
  ],
};

export const VISUAL_KIT_TOPIC_THEMES: Record<string, VisualKitTopicTheme> = {
  "human-heart": {
    id: "human-heart",
    name: "Human Heart",
    accentDark: "#f43f5e", // rose-500
    accentLight: "#be123c", // rose-700
    accentRgb: [244, 63, 94],
    shape: HEART_SHAPE,
    cardBorderHoverClass: "hover:border-rose-400 dark:hover:border-rose-500/60",
    cardShadowHoverClass: "hover:shadow-rose-500/10 dark:hover:shadow-rose-950/40",
    focusRingClass: "focus:ring-rose-500",
    iconTileHoverClass: "group-hover:border-rose-300 dark:group-hover:border-rose-500/60 group-hover:scale-105",
    titleHoverClass: "group-hover:text-rose-600 dark:group-hover:text-rose-400",
    buttonClass: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs",
  },
  "digestive-system": {
    id: "digestive-system",
    name: "Digestive System",
    accentDark: "#fb923c", // orange-400
    accentLight: "#c2410c", // orange-700
    accentRgb: [251, 146, 60],
    shape: DIGESTIVE_SHAPE,
    cardBorderHoverClass: "hover:border-orange-400 dark:hover:border-orange-500/60",
    cardShadowHoverClass: "hover:shadow-orange-500/10 dark:hover:shadow-orange-950/40",
    focusRingClass: "focus:ring-orange-500",
    iconTileHoverClass: "group-hover:border-orange-300 dark:group-hover:border-orange-500/60 group-hover:scale-105",
    titleHoverClass: "group-hover:text-orange-600 dark:group-hover:text-orange-400",
    buttonClass: "bg-orange-600 hover:bg-orange-700 text-white shadow-xs",
  },
  "animal-cell": {
    id: "animal-cell",
    name: "Animal Cell",
    accentDark: "#14b8a6", // teal-500
    accentLight: "#0f766e", // teal-700
    accentRgb: [20, 184, 166],
    shape: CELL_SHAPE,
    cardBorderHoverClass: "hover:border-teal-400 dark:hover:border-teal-500/60",
    cardShadowHoverClass: "hover:shadow-teal-500/10 dark:hover:shadow-teal-950/40",
    focusRingClass: "focus:ring-teal-500",
    iconTileHoverClass: "group-hover:border-teal-300 dark:group-hover:border-teal-500/60 group-hover:scale-105",
    titleHoverClass: "group-hover:text-teal-600 dark:group-hover:text-teal-400",
    buttonClass: "bg-teal-600 hover:bg-teal-700 text-white shadow-xs",
  },
  "plant-photosynthesis": {
    id: "plant-photosynthesis",
    name: "Plant Anatomy",
    accentDark: "#22c55e", // green-500
    accentLight: "#15803d", // green-700
    accentRgb: [34, 197, 94],
    shape: PLANT_SHAPE,
    cardBorderHoverClass: "hover:border-emerald-400 dark:hover:border-emerald-500/60",
    cardShadowHoverClass: "hover:shadow-emerald-500/10 dark:hover:shadow-emerald-950/40",
    focusRingClass: "focus:ring-emerald-500",
    iconTileHoverClass: "group-hover:border-emerald-300 dark:group-hover:border-emerald-500/60 group-hover:scale-105",
    titleHoverClass: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs",
  },
  "water-cycle": {
    id: "water-cycle",
    name: "Water Cycle",
    accentDark: "#0ea5e9", // sky-500
    accentLight: "#0369a1", // sky-700
    accentRgb: [14, 165, 233],
    shape: WATER_CYCLE_SHAPE,
    cardBorderHoverClass: "hover:border-sky-400 dark:hover:border-sky-500/60",
    cardShadowHoverClass: "hover:shadow-sky-500/10 dark:hover:shadow-sky-950/40",
    focusRingClass: "focus:ring-sky-500",
    iconTileHoverClass: "group-hover:border-sky-300 dark:group-hover:border-sky-500/60 group-hover:scale-105",
    titleHoverClass: "group-hover:text-sky-600 dark:group-hover:text-sky-400",
    buttonClass: "bg-sky-600 hover:bg-sky-700 text-white shadow-xs",
  },
  "simple-electric-circuit": {
    id: "simple-electric-circuit",
    name: "DC Electric Circuit",
    accentDark: "#eab308", // yellow-500
    accentLight: "#a16207", // yellow-700
    accentRgb: [234, 179, 8],
    shape: CIRCUIT_SHAPE,
    cardBorderHoverClass: "hover:border-amber-400 dark:hover:border-amber-500/60",
    cardShadowHoverClass: "hover:shadow-amber-500/10 dark:hover:shadow-amber-950/40",
    focusRingClass: "focus:ring-amber-500",
    iconTileHoverClass: "group-hover:border-amber-300 dark:group-hover:border-amber-500/60 group-hover:scale-105",
    titleHoverClass: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    buttonClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-xs",
  },
};

/**
 * Safe neutral fallback theme for any unrecognized or missing diagram ID.
 */
export const DEFAULT_VISUAL_KIT_THEME: VisualKitTopicTheme = {
  id: "default-science-topic",
  name: "Science Topic",
  accentDark: "#0ea5e9",
  accentLight: "#0369a1",
  accentRgb: [14, 165, 233],
  shape: WATER_CYCLE_SHAPE,
  cardBorderHoverClass: "hover:border-sky-400 dark:hover:border-sky-500/60",
  cardShadowHoverClass: "hover:shadow-sky-500/10 dark:hover:shadow-sky-950/40",
  focusRingClass: "focus:ring-sky-500",
  iconTileHoverClass: "group-hover:border-sky-300 dark:group-hover:border-sky-500/60 group-hover:scale-105",
  titleHoverClass: "group-hover:text-sky-600 dark:group-hover:text-sky-400",
  buttonClass: "bg-sky-600 hover:bg-sky-700 text-white shadow-xs",
};

/**
 * Resolves the VisualKitTopicTheme for a given diagram ID with a safe fallback.
 */
export function getVisualKitTopicTheme(topicId?: string | null): VisualKitTopicTheme {
  if (!topicId) return DEFAULT_VISUAL_KIT_THEME;
  return VISUAL_KIT_TOPIC_THEMES[topicId] ?? DEFAULT_VISUAL_KIT_THEME;
}

