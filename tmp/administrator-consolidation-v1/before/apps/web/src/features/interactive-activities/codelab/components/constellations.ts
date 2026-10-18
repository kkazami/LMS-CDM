/**
 * Antigravity Particle Morphing Constellation System
 *
 * Each particle has:
 * - (idleX, idleY): Scattered ambient position across the card with gentle floating
 * - (targetX, targetY): Precise silhouette vertex forming the official language logo
 * - radius: Micro-fine dot radius (0.45 to 0.75px in 100x100 viewBox)
 * - delay: Staggered entrance timing (0ms to 320ms) for ultra-smooth 60fps morphing
 */

export interface MorphParticle {
  idleX: number;
  idleY: number;
  targetX: number;
  targetY: number;
  radius: number;
  delay: number;
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return Math.round((x - Math.floor(x)) * 10000) / 10000;
}

// Interpolate evenly along multi-segment paths with optimal spacing
function interpolateSegments(pts: [number, number][], density = 0.26): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(1, Math.round(dist * density));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      result.push([
        Math.round((p1[0] + (p2[0] - p1[0]) * t) * 10) / 10,
        Math.round((p1[1] + (p2[1] - p1[1]) * t) * 10) / 10,
      ]);
    }
  }
  result.push(pts[pts.length - 1]);
  return result;
}

// Builds particle pairs: maps target logo vertices to organic idle scatter positions
function buildMorphSet(targetVertices: [number, number][], seedBase: number): MorphParticle[] {
  const total = targetVertices.length;
  return targetVertices.map(([tx, ty], i) => {
    // Generate uniform random scatter across the 100x100 card
    const ix = Math.round((pseudoRandom(seedBase + i * 3) * 88 + 6) * 10) / 10;
    const iy = Math.round((pseudoRandom(seedBase + i * 3 + 1) * 88 + 6) * 10) / 10;

    // Subtle size variation for depth
    const r = Math.round((0.52 + pseudoRandom(seedBase + i) * 0.22) * 100) / 100;

    // Smooth stagger: 0ms to 320ms delay
    const delay = Math.round((i / Math.max(total, 1)) * 320);

    return {
      idleX: ix,
      idleY: iy,
      targetX: tx,
      targetY: ty,
      radius: r,
      delay,
    };
  });
}

// ─── 1. PYTHON LOGO (Exact Official SVG Vector Contour) ─────────────
function getPythonTargets(): [number, number][] {
  const bluePath: [number, number][] = [
    // Top head curve
    [49.4, 12.6],
    [43.5, 12.6],
    [37.7, 13.3],
    [32.5, 15.9],
    [32.5, 20.4],
    [32.5, 28.5],
    // Neck
    [43.5, 28.5],
    [49.7, 28.5],
    [49.7, 31.0],
    // Left shoulder
    [33.1, 31.0],
    [25.5, 31.0],
    [19.5, 32.5],
    [15.6, 37.0],
    [13.5, 42.2],
    [13.5, 47.5],
    [13.5, 53.9],
    [15.6, 59.1],
    [20.1, 63.0],
    [23.9, 64.8],
    [30.2, 64.8],
    // Inner waist
    [30.2, 56.0],
    [37.0, 46.1],
    [40.5, 45.5],
    // Center tongue
    [57.0, 45.5],
    [65.6, 40.9],
    [67.0, 35.9],
    [67.0, 22.6],
    [65.6, 17.5],
    [60.4, 13.9],
    [49.4, 12.6],
  ];

  const blueContour = interpolateSegments(bluePath, 0.28);
  const blueEye: [number, number][] = [
    [39.9, 18.7],
    [38.7, 18.7],
    [41.1, 18.7],
    [39.9, 17.5],
  ];

  const yellowContour: [number, number][] = blueContour.map(([x, y]) => [
    Math.round((100 - x) * 10) / 10,
    Math.round((100 - y) * 10) / 10,
  ]);
  const yellowEye: [number, number][] = blueEye.map(([x, y]) => [
    Math.round((100 - x) * 10) / 10,
    Math.round((100 - y) * 10) / 10,
  ]);

  return [...blueContour, ...blueEye, ...yellowContour, ...yellowEye];
}

// ─── 2. C++ LOGO (Hexagon Shield + C + ++) ──────────────────────────
function getCppTargets(): [number, number][] {
  const hexPath: [number, number][] = [
    [50, 10], [82, 28], [82, 72], [50, 90], [18, 72], [18, 28], [50, 10],
  ];
  const cPath: [number, number][] = [
    [56, 32], [42, 32], [32, 42], [32, 58], [42, 68], [56, 68],
    [58, 60], [46, 60], [40, 54], [40, 46], [46, 40], [58, 40], [56, 32],
  ];
  const plus1H: [number, number][] = [[58, 50], [68, 50]];
  const plus1V: [number, number][] = [[63, 45], [63, 55]];
  const plus2H: [number, number][] = [[70, 50], [80, 50]];
  const plus2V: [number, number][] = [[75, 45], [75, 55]];

  return [
    ...interpolateSegments(hexPath, 0.26),
    ...interpolateSegments(cPath, 0.28),
    ...interpolateSegments(plus1H, 0.35),
    ...interpolateSegments(plus1V, 0.35),
    ...interpolateSegments(plus2H, 0.35),
    ...interpolateSegments(plus2V, 0.35),
  ];
}

// ─── 3. C# LOGO (Purple Hexagon + C + #) ────────────────────────────
function getCSharpTargets(): [number, number][] {
  const hexPath: [number, number][] = [
    [50, 10], [82, 28], [82, 72], [50, 90], [18, 72], [18, 28], [50, 10],
  ];
  const cPath: [number, number][] = [
    [54, 32], [40, 32], [30, 42], [30, 58], [40, 68], [54, 68],
    [56, 60], [44, 60], [38, 54], [38, 46], [44, 40], [56, 40], [54, 32],
  ];
  const hashV1: [number, number][] = [[64, 42], [62, 58]];
  const hashV2: [number, number][] = [[72, 42], [70, 58]];
  const hashH1: [number, number][] = [[59, 46], [75, 46]];
  const hashH2: [number, number][] = [[58, 54], [74, 54]];

  return [
    ...interpolateSegments(hexPath, 0.26),
    ...interpolateSegments(cPath, 0.28),
    ...interpolateSegments(hashV1, 0.35),
    ...interpolateSegments(hashV2, 0.35),
    ...interpolateSegments(hashH1, 0.35),
    ...interpolateSegments(hashH2, 0.35),
  ];
}

// ─── 4. JAVA LOGO (Steam Flames + Coffee Cup + Saucer) ───────────────
function getJavaTargets(): [number, number][] {
  const flameL: [number, number][] = [
    [44, 16], [40, 26], [46, 36], [40, 46],
  ];
  const flameR: [number, number][] = [
    [56, 12], [50, 22], [58, 34], [52, 46],
  ];
  const rim: [number, number][] = [
    [26, 54], [74, 54], [76, 58], [24, 58], [26, 54],
  ];
  const handle: [number, number][] = [
    [68, 56], [78, 58], [82, 64], [78, 72], [64, 74],
  ];
  const midTier: [number, number][] = [
    [30, 66], [70, 66], [66, 72], [34, 72],
  ];
  const bottomTier: [number, number][] = [
    [34, 78], [66, 78], [62, 84], [38, 84],
  ];
  const saucer: [number, number][] = [
    [20, 88], [80, 88], [76, 92], [24, 92], [20, 88],
  ];

  return [
    ...interpolateSegments(flameL, 0.35),
    ...interpolateSegments(flameR, 0.35),
    ...interpolateSegments(rim, 0.28),
    ...interpolateSegments(handle, 0.3),
    ...interpolateSegments(midTier, 0.28),
    ...interpolateSegments(bottomTier, 0.28),
    ...interpolateSegments(saucer, 0.28),
  ];
}

// ─── 5. JAVASCRIPT LOGO (Square + 'J' + 'S') ────────────────────────
function getJavaScriptTargets(): [number, number][] {
  const square: [number, number][] = [
    [16, 16], [84, 16], [84, 84], [16, 84], [16, 16],
  ];
  const letterJ: [number, number][] = [
    [44, 38], [44, 64], [38, 72], [30, 70], [28, 64],
  ];
  const letterS: [number, number][] = [
    [72, 42], [58, 38], [52, 44], [54, 50], [66, 54], [70, 60], [68, 68], [54, 72],
  ];

  return [
    ...interpolateSegments(square, 0.24),
    ...interpolateSegments(letterJ, 0.35),
    ...interpolateSegments(letterS, 0.35),
  ];
}

// ─── 6. SQL LOGO (Relational Cylinder Database Stack) ───────────────
function getSqlTargets(): [number, number][] {
  const topEllipse: [number, number][] = [
    [30, 22], [50, 16], [70, 22], [70, 30], [50, 36], [30, 30], [30, 22],
  ];
  const midTier: [number, number][] = [
    [30, 30], [30, 52], [50, 58], [70, 52], [70, 30],
  ];
  const bottomTier: [number, number][] = [
    [30, 52], [30, 76], [50, 82], [70, 76], [70, 52],
  ];
  const baseRim: [number, number][] = [
    [30, 76], [50, 70], [70, 76],
  ];

  return [
    ...interpolateSegments(topEllipse, 0.28),
    ...interpolateSegments(midTier, 0.28),
    ...interpolateSegments(bottomTier, 0.28),
    ...interpolateSegments(baseRim, 0.28),
  ];
}

// ─── 7. HTML5 LOGO (HTML5 Shield + "5") ─────────────────────────────
function getHtmlTargets(): [number, number][] {
  const shield: [number, number][] = [
    [22, 16], [78, 16], [72, 74], [50, 86], [28, 74], [22, 16],
  ];
  const num5: [number, number][] = [
    [34, 28], [66, 28], [64, 36], [42, 36], [44, 48],
    [64, 48], [62, 68], [50, 74], [38, 68], [38, 60],
  ];

  return [
    ...interpolateSegments(shield, 0.28),
    ...interpolateSegments(num5, 0.32),
  ];
}

// ─── 8. CSS3 LOGO (CSS3 Shield + "3") ───────────────────────────────
function getCssTargets(): [number, number][] {
  const shield: [number, number][] = [
    [22, 16], [78, 16], [72, 74], [50, 86], [28, 74], [22, 16],
  ];
  const num3: [number, number][] = [
    [34, 28], [66, 28], [54, 46], [62, 48], [62, 68], [50, 74], [38, 68], [38, 60],
  ];

  return [
    ...interpolateSegments(shield, 0.28),
    ...interpolateSegments(num3, 0.32),
  ];
}

// ─── Exported Morph Sets (One per track) ─────────────────────────────
export const MORPH_CONSTELLATIONS: Record<string, MorphParticle[]> = {
  python: buildMorphSet(getPythonTargets(), 101),
  cpp: buildMorphSet(getCppTargets(), 202),
  csharp: buildMorphSet(getCSharpTargets(), 303),
  java: buildMorphSet(getJavaTargets(), 404),
  javascript: buildMorphSet(getJavaScriptTargets(), 505),
  sql: buildMorphSet(getSqlTargets(), 606),
  html: buildMorphSet(getHtmlTargets(), 707),
  css: buildMorphSet(getCssTargets(), 808),
};
