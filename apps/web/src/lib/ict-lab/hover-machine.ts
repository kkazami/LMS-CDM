export type HoverEvent =
  | { type: "pointerenter" }
  | { type: "pointerleave"; insideRect?: boolean }
  | { type: "pointercancel"; insideRect?: boolean }
  | { type: "pointermove"; insideRect?: boolean }
  | { type: "grace_timeout" }
  | { type: "focus" }
  | { type: "blur" };

export interface HoverMachineState {
  isHovered: boolean;
  isFocused: boolean;
  active: boolean; // isHovered || isFocused
  leaveTimerPending: boolean;
  leaveTimestamp: number | null;
}

export const LEAVE_GRACE_PERIOD_MS = 100; // 80..120ms

export function createInitialHoverState(): HoverMachineState {
  return {
    isHovered: false,
    isFocused: false,
    active: false,
    leaveTimerPending: false,
    leaveTimestamp: null,
  };
}

/**
 * Pure state machine managing card hover/focus activation with debounced leave grace period
 * and drag-cancel immunity.
 */
export function nextHoverState(
  current: HoverMachineState,
  event: HoverEvent,
  now: number = Date.now()
): HoverMachineState {
  switch (event.type) {
    case "pointerenter": {
      return {
        ...current,
        isHovered: true,
        active: true,
        leaveTimerPending: false,
        leaveTimestamp: null,
      };
    }
    case "pointermove": {
      // Moving inside the card rect cancels any pending leave and guarantees active hover
      if (event.insideRect !== false) {
        return {
          ...current,
          isHovered: true,
          active: true,
          leaveTimerPending: false,
          leaveTimestamp: null,
        };
      }
      return current;
    }
    case "pointercancel": {
      // If pointercancel fires while inside rect (e.g. browser initiating drag), do not clear hover
      if (event.insideRect !== false) {
        return {
          ...current,
          isHovered: true,
          active: true,
          leaveTimerPending: false,
          leaveTimestamp: null,
        };
      }
      // If outside rect, start grace period
      return {
        ...current,
        leaveTimerPending: true,
        leaveTimestamp: now,
      };
    }
    case "pointerleave": {
      // If pointer is still physically inside bounds (edge jitter), preserve hover
      if (event.insideRect === true) {
        return current;
      }
      // Enter leave grace period without immediately switching off hover
      return {
        ...current,
        leaveTimerPending: true,
        leaveTimestamp: now,
      };
    }
    case "grace_timeout": {
      // Grace period expired without any re-entry
      const isHovered = false;
      return {
        ...current,
        isHovered,
        active: current.isFocused || isHovered,
        leaveTimerPending: false,
        leaveTimestamp: null,
      };
    }
    case "focus": {
      return {
        ...current,
        isFocused: true,
        active: true,
      };
    }
    case "blur": {
      const isFocused = false;
      return {
        ...current,
        isFocused,
        active: current.isHovered || isFocused,
      };
    }
  }
}

