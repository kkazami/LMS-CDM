export interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface TargetPoint {
  x: number;
  y: number;
}

export interface CanvasBounds {
  width: number;
  height: number;
}

export interface StepOptions {
  stiffness?: number; // default: 0.09
  damping?: number; // default: 0.85
  pointerPos?: { x: number; y: number } | null;
  repelRadius?: number; // default: 50px
  repelStrength?: number; // default: 1.2
  bounds?: CanvasBounds;
}

export const DEFAULT_STIFFNESS = 0.09;
export const DEFAULT_DAMPING = 0.85;
export const DEFAULT_REPEL_RADIUS = 50;
export const DEFAULT_REPEL_STRENGTH = 1.2;
export const DEFAULT_DISTANCE_THRESHOLD = 0.5;
export const DEFAULT_SPEED_THRESHOLD = 0.02;

/**
 * Pure physics step for a collection of particles toward immutable targets.
 * Applies spring attraction to target, velocity damping, optional local pointer repulsion,
 * and strict boundary clamping.
 */
export function stepParticles(
  particles: readonly ParticleState[],
  targets: readonly TargetPoint[],
  options?: StepOptions
): ParticleState[] {
  const stiffness = options?.stiffness ?? DEFAULT_STIFFNESS;
  const damping = options?.damping ?? DEFAULT_DAMPING;
  const pointerPos = options?.pointerPos ?? null;
  const repelRadius = options?.repelRadius ?? DEFAULT_REPEL_RADIUS;
  const repelStrength = options?.repelStrength ?? DEFAULT_REPEL_STRENGTH;
  const bounds = options?.bounds;

  const count = Math.min(particles.length, targets.length);
  const next: ParticleState[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const p = particles[i];
    const target = targets[i];

    // Spring force toward fixed target
    const ax = (target.x - p.x) * stiffness;
    const ay = (target.y - p.y) * stiffness;

    let vx = (p.vx + ax) * damping;
    let vy = (p.vy + ay) * damping;

    // Optional short-range local pointer repel (decays with distance, never moves target)
    if (pointerPos) {
      const dx = p.x - pointerPos.x;
      const dy = p.y - pointerPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < repelRadius && dist > 0.001) {
        const factor = (1 - dist / repelRadius) * repelStrength;
        vx += (dx / dist) * factor;
        vy += (dy / dist) * factor;
      }
    }

    let nextX = p.x + vx;
    let nextY = p.y + vy;

    // Strict boundary clamping if bounds are provided
    if (bounds && bounds.width > 0 && bounds.height > 0) {
      if (nextX < 0) {
        nextX = 0;
        vx = 0;
      } else if (nextX > bounds.width) {
        nextX = bounds.width;
        vx = 0;
      }

      if (nextY < 0) {
        nextY = 0;
        vy = 0;
      } else if (nextY > bounds.height) {
        nextY = bounds.height;
        vy = 0;
      }
    }

    next[i] = {
      x: nextX,
      y: nextY,
      vx,
      vy,
    };
  }

  return next;
}

/**
 * Settled check: returns true ONLY when every particle is within distanceThreshold of its
 * target AND its speed is below speedThreshold.
 */
export function isSettled(
  particles: readonly ParticleState[],
  targets: readonly TargetPoint[],
  threshold?: { distance?: number; speed?: number }
): boolean {
  if (particles.length === 0) return true;

  const distThreshold = threshold?.distance ?? DEFAULT_DISTANCE_THRESHOLD;
  const speedThreshold = threshold?.speed ?? DEFAULT_SPEED_THRESHOLD;
  const count = Math.min(particles.length, targets.length);

  for (let i = 0; i < count; i++) {
    const p = particles[i];
    const target = targets[i];

    const dist = Math.hypot(p.x - target.x, p.y - target.y);
    if (dist > distThreshold) {
      return false;
    }

    const speed = Math.hypot(p.vx, p.vy);
    if (speed > speedThreshold) {
      return false;
    }
  }

  return true;
}

