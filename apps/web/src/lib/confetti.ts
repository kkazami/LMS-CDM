import confetti from "canvas-confetti";

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
}

export function fireConfetti(options: ConfettiOptions = {}) {
  // Accessibility check: Do not fire confetti if user prefers reduced motion
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const {
    particleCount = 50,
    spread = 60,
    origin = { x: 0.5, y: 0.7 },
    colors = ["#F97316", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"],
  } = options;

  confetti({
    particleCount,
    spread,
    origin,
    colors,
    disableForReducedMotion: true,
  });
}

/**
 * Fires a celebratory multi-directional burst for high-value achievements or level ups
 */
export function fireLevelUpConfetti(primaryColor?: string) {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const colors = primaryColor
    ? [primaryColor, "#F59E0B", "#10B981", "#3B82F6"]
    : ["#F97316", "#F59E0B", "#10B981", "#3B82F6"];

  confetti({
    particleCount: 60,
    angle: 60,
    spread: 55,
    origin: { x: 0 },
    colors,
    disableForReducedMotion: true,
  });

  confetti({
    particleCount: 60,
    angle: 120,
    spread: 55,
    origin: { x: 1 },
    colors,
    disableForReducedMotion: true,
  });
}
