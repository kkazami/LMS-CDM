/**
 * CdM LMS Standardized Motion Tokens
 * Enforces consistent timing curves, physics springs, and durations across all UI components.
 */

export const motionTokens = {
  duration: {
    instant: 0,
    micro: 80, // Sub-100ms button press feedback
    fast: 150, // Hover transitions, badge toggles
    normal: 200, // Card hover, input focus rings
    moderate: 300, // Modals, sheets, drawers
    slow: 400, // Page entrances, hero reveals
    xslow: 600, // Number roll counters, skeletons
  },
  easing: {
    enter: [0.22, 1, 0.36, 1], // Fast start, soft end (spring-like deceleration)
    exit: [0.55, 0, 1, 0.45], // Clean exit
    micro: [0.34, 1.56, 0.64, 1], // Physical button bounce
    smooth: [0.4, 0, 0.2, 1], // Material standard
    data: [0.25, 0.46, 0.45, 0.94], // Data/number counters
  },
  spring: {
    gentle: { type: "spring", stiffness: 120, damping: 20 },
    snappy: { type: "spring", stiffness: 300, damping: 30 },
    bouncy: { type: "spring", stiffness: 400, damping: 17 },
    stiff: { type: "spring", stiffness: 600, damping: 40 },
  },
} as const;

export type MotionTokens = typeof motionTokens;
