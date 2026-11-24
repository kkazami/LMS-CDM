import type { IctLabModuleId } from "./types";

export type ShapePrimitive =
  | { type: "line"; x1: number; y1: number; x2: number; y2: number }
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | { type: "circle"; cx: number; cy: number; r: number };

export interface NormalizedShape {
  primitives: readonly ShapePrimitive[];
}

export interface Point2D {
  x: number;
  y: number;
}

export interface ModuleThemeConfig {
  id: IctLabModuleId;
  name: string;
  accentDark: string;
  accentLight: string;
  accentRgb: [number, number, number];
  shape: NormalizedShape;
  cardBorderHoverClass: string;
  cardShadowHoverClass: string;
  focusRingClass: string;
  iconContainerClass: string;
  titleHoverClass: string;
  badgeClass: string;
  buttonClass: string;
}

/**
 * Code Playground: `< / >` programming symbol.
 * Normalized within [0..1] with comfortable margins.
 */
export const CODE_PLAYGROUND_SHAPE: NormalizedShape = {
  primitives: [
    // Left angle `<`
    { type: "line", x1: 0.32, y1: 0.28, x2: 0.18, y2: 0.5 },
    { type: "line", x1: 0.18, y1: 0.5, x2: 0.32, y2: 0.72 },
    // Forward slash `/`
    { type: "line", x1: 0.58, y1: 0.22, x2: 0.42, y2: 0.78 },
    // Right angle `>`
    { type: "line", x1: 0.68, y1: 0.28, x2: 0.82, y2: 0.5 },
    { type: "line", x1: 0.82, y1: 0.5, x2: 0.68, y2: 0.72 },
  ],
};

/**
 * Hardware Explorer: CPU chip with outer substrate, inner die, and perimeter pins.
 */
export const HARDWARE_EXPLORER_SHAPE: NormalizedShape = {
  primitives: [
    // Outer chip package
    { type: "rect", x: 0.26, y: 0.26, w: 0.48, h: 0.48 },
    // Inner silicon die / core
    { type: "rect", x: 0.38, y: 0.38, w: 0.24, h: 0.24 },
    // Top pins
    { type: "line", x1: 0.34, y1: 0.26, x2: 0.34, y2: 0.16 },
    { type: "line", x1: 0.44, y1: 0.26, x2: 0.44, y2: 0.16 },
    { type: "line", x1: 0.56, y1: 0.26, x2: 0.56, y2: 0.16 },
    { type: "line", x1: 0.66, y1: 0.26, x2: 0.66, y2: 0.16 },
    // Bottom pins
    { type: "line", x1: 0.34, y1: 0.74, x2: 0.34, y2: 0.84 },
    { type: "line", x1: 0.44, y1: 0.74, x2: 0.44, y2: 0.84 },
    { type: "line", x1: 0.56, y1: 0.74, x2: 0.56, y2: 0.84 },
    { type: "line", x1: 0.66, y1: 0.74, x2: 0.66, y2: 0.84 },
    // Left pins
    { type: "line", x1: 0.26, y1: 0.34, x2: 0.16, y2: 0.34 },
    { type: "line", x1: 0.26, y1: 0.44, x2: 0.16, y2: 0.44 },
    { type: "line", x1: 0.26, y1: 0.56, x2: 0.16, y2: 0.56 },
    { type: "line", x1: 0.26, y1: 0.66, x2: 0.16, y2: 0.66 },
    // Right pins
    { type: "line", x1: 0.74, y1: 0.34, x2: 0.84, y2: 0.34 },
    { type: "line", x1: 0.74, y1: 0.44, x2: 0.84, y2: 0.44 },
    { type: "line", x1: 0.74, y1: 0.56, x2: 0.84, y2: 0.56 },
    { type: "line", x1: 0.74, y1: 0.66, x2: 0.84, y2: 0.66 },
  ],
};

/**
 * LAN Cable Guide: RJ45 modular plug with latch tab, body, cable collar, and 8 contact pins.
 */
export const LAN_CABLE_GUIDE_SHAPE: NormalizedShape = {
  primitives: [
    // Main plug body
    { type: "rect", x: 0.28, y: 0.3, w: 0.44, h: 0.52 },
    // Top latch tab
    { type: "line", x1: 0.42, y1: 0.3, x2: 0.42, y2: 0.16 },
    { type: "line", x1: 0.42, y1: 0.16, x2: 0.58, y2: 0.16 },
    { type: "line", x1: 0.58, y1: 0.16, x2: 0.58, y2: 0.3 },
    // Cable boot collar at bottom
    { type: "rect", x: 0.36, y: 0.82, w: 0.28, h: 0.1 },
    // Wire separator shelf
    { type: "line", x1: 0.3, y1: 0.54, x2: 0.7, y2: 0.54 },
    // 8 gold contact pins
    { type: "line", x1: 0.34, y1: 0.36, x2: 0.34, y2: 0.46 },
    { type: "line", x1: 0.386, y1: 0.36, x2: 0.386, y2: 0.46 },
    { type: "line", x1: 0.431, y1: 0.36, x2: 0.431, y2: 0.46 },
    { type: "line", x1: 0.477, y1: 0.36, x2: 0.477, y2: 0.46 },
    { type: "line", x1: 0.523, y1: 0.36, x2: 0.523, y2: 0.46 },
    { type: "line", x1: 0.569, y1: 0.36, x2: 0.569, y2: 0.46 },
    { type: "line", x1: 0.614, y1: 0.36, x2: 0.614, y2: 0.46 },
    { type: "line", x1: 0.66, y1: 0.36, x2: 0.66, y2: 0.46 },
  ],
};

export const ICT_MODULE_THEMES: Record<IctLabModuleId, ModuleThemeConfig> = {
  "code-playground": {
    id: "code-playground",
    name: "Code Playground",
    accentDark: "#10b981", // emerald-500
    accentLight: "#059669", // emerald-600
    accentRgb: [16, 185, 129],
    shape: CODE_PLAYGROUND_SHAPE,
    cardBorderHoverClass: "hover:border-emerald-400 dark:hover:border-emerald-500/50",
    cardShadowHoverClass: "hover:shadow-emerald-500/10 dark:hover:shadow-emerald-950/30",
    focusRingClass: "focus:ring-emerald-500",
    iconContainerClass:
      "border-emerald-200/80 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
    titleHoverClass: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    badgeClass:
      "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    buttonClass:
      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 dark:bg-emerald-600 dark:hover:bg-emerald-500",
  },
  "hardware-explorer": {
    id: "hardware-explorer",
    name: "Hardware Explorer",
    accentDark: "#f59e0b", // amber-500
    accentLight: "#d97706", // amber-600
    accentRgb: [245, 158, 11],
    shape: HARDWARE_EXPLORER_SHAPE,
    cardBorderHoverClass: "hover:border-amber-400 dark:hover:border-amber-500/50",
    cardShadowHoverClass: "hover:shadow-amber-500/10 dark:hover:shadow-amber-950/30",
    focusRingClass: "focus:ring-amber-500",
    iconContainerClass:
      "border-amber-200/80 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white",
    titleHoverClass: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    badgeClass:
      "border-amber-200 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300",
    buttonClass:
      "bg-amber-700 hover:bg-amber-800 text-white shadow-amber-700/20 dark:bg-amber-600 dark:hover:bg-amber-500",
  },
  "lan-cable-guide": {
    id: "lan-cable-guide",
    name: "LAN Cable Guide",
    accentDark: "#06b6d4", // cyan-500
    accentLight: "#0891b2", // cyan-600
    accentRgb: [6, 182, 212],
    shape: LAN_CABLE_GUIDE_SHAPE,
    cardBorderHoverClass: "hover:border-cyan-400 dark:hover:border-cyan-500/50",
    cardShadowHoverClass: "hover:shadow-cyan-500/10 dark:hover:shadow-cyan-950/30",
    focusRingClass: "focus:ring-cyan-500",
    iconContainerClass:
      "border-cyan-200/80 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white",
    titleHoverClass: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
    badgeClass:
      "border-cyan-200 dark:border-cyan-800/40 bg-cyan-50/70 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-300",
    buttonClass:
      "bg-cyan-700 hover:bg-cyan-800 text-white shadow-cyan-700/20 dark:bg-cyan-600 dark:hover:bg-cyan-500",
  },
};

/**
 * Compute the perimeter or length of a geometric primitive.
 */
function getPrimitiveLength(primitive: ShapePrimitive): number {
  switch (primitive.type) {
    case "line":
      return Math.hypot(primitive.x2 - primitive.x1, primitive.y2 - primitive.y1);
    case "rect":
      return 2 * (primitive.w + primitive.h);
    case "circle":
      return 2 * Math.PI * primitive.r;
  }
}

/**
 * Deterministically samples exactly `count` points from a normalized shape in [0..1] space.
 * Points are distributed proportionally to primitive lengths without any Math.random.
 */
export function sampleShapePoints(shape: NormalizedShape, count: number): Point2D[] {
  if (count <= 0 || shape.primitives.length === 0) {
    return [];
  }

  const lengths = shape.primitives.map(getPrimitiveLength);
  const totalLength = lengths.reduce((acc, l) => acc + l, 0);

  if (totalLength === 0) {
    return Array.from({ length: count }, () => ({ x: 0.5, y: 0.5 }));
  }

  // Largest remainder method (Hamilton-Hare) to allocate exact integer counts
  const rawCounts = lengths.map((l) => (l / totalLength) * count);
  const allocatedCounts = rawCounts.map((rc) => Math.floor(rc));
  let remaining = count - allocatedCounts.reduce((acc, c) => acc + c, 0);

  const remainders = rawCounts.map((rc, idx) => ({ idx, remainder: rc - Math.floor(rc) }));
  remainders.sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < remaining; i++) {
    allocatedCounts[remainders[i].idx]++;
  }

  const points: Point2D[] = [];

  for (let i = 0; i < shape.primitives.length; i++) {
    const primitive = shape.primitives[i];
    const n = allocatedCounts[i];
    if (n <= 0) continue;

    switch (primitive.type) {
      case "line": {
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n;
          const x = primitive.x1 + t * (primitive.x2 - primitive.x1);
          const y = primitive.y1 + t * (primitive.y2 - primitive.y1);
          points.push({
            x: Math.min(1, Math.max(0, x)),
            y: Math.min(1, Math.max(0, y)),
          });
        }
        break;
      }
      case "rect": {
        const perimeter = 2 * (primitive.w + primitive.h);
        for (let k = 0; k < n; k++) {
          const s = ((k + 0.5) / n) * perimeter;
          let px = primitive.x;
          let py = primitive.y;

          if (s < primitive.w) {
            // Top edge: left to right
            px = primitive.x + s;
            py = primitive.y;
          } else if (s < primitive.w + primitive.h) {
            // Right edge: top to bottom
            px = primitive.x + primitive.w;
            py = primitive.y + (s - primitive.w);
          } else if (s < 2 * primitive.w + primitive.h) {
            // Bottom edge: right to left
            px = primitive.x + primitive.w - (s - (primitive.w + primitive.h));
            py = primitive.y + primitive.h;
          } else {
            // Left edge: bottom to top
            px = primitive.x;
            py = primitive.y + primitive.h - (s - (2 * primitive.w + primitive.h));
          }

          points.push({
            x: Math.min(1, Math.max(0, px)),
            y: Math.min(1, Math.max(0, py)),
          });
        }
        break;
      }
      case "circle": {
        for (let k = 0; k < n; k++) {
          const theta = ((2 * Math.PI) / n) * k;
          const px = primitive.cx + primitive.r * Math.cos(theta);
          const py = primitive.cy + primitive.r * Math.sin(theta);
          points.push({
            x: Math.min(1, Math.max(0, px)),
            y: Math.min(1, Math.max(0, py)),
          });
        }
        break;
      }
    }
  }

  return points;
}
