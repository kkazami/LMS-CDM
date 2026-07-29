import { create } from "zustand";

interface ActivityState {
  // Timer State
  timerRunning: boolean;
  elapsedSeconds: number;
  timerIntervalId: NodeJS.Timeout | null;
  
  // Activity State
  attempts: number;
  score: number;
  isComplete: boolean;
  stateCheck: Record<string, boolean | number | string>;

  // Actions
  startTimer: () => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  
  incrementAttempts: () => void;
  setScore: (score: number) => void;
  markComplete: (complete: boolean) => void;
  updateStateCheck: (key: string, value: boolean | number | string) => void;
  resetActivity: () => void;
}

/**
 * useActivityStore — Shared global state for an interactive activity session.
 * Manages the timer (feeds into completionTimeSeconds) and generic state
 * like score and attempts.
 * 
 * Note: Each activity module may compose this or build its own specific
 * store on top, but this provides the common denominator required for submission.
 */
export const useActivityStore = create<ActivityState>((set, get) => ({
  // Initial State
  timerRunning: false,
  elapsedSeconds: 0,
  timerIntervalId: null,
  
  attempts: 0,
  score: 0,
  isComplete: false,
  stateCheck: {},

  // Timer Actions
  startTimer: () => {
    if (get().timerRunning) return;
    const intervalId = setInterval(() => {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }, 1000);
    set({ timerRunning: true, timerIntervalId: intervalId });
  },
  
  pauseTimer: () => {
    const { timerIntervalId } = get();
    if (timerIntervalId) clearInterval(timerIntervalId);
    set({ timerRunning: false, timerIntervalId: null });
  },
  
  stopTimer: () => {
    const { timerIntervalId } = get();
    if (timerIntervalId) clearInterval(timerIntervalId);
    set({ timerRunning: false, timerIntervalId: null });
  },
  
  resetTimer: () => {
    const { timerIntervalId } = get();
    if (timerIntervalId) clearInterval(timerIntervalId);
    set({ timerRunning: false, timerIntervalId: null, elapsedSeconds: 0 });
  },

  // Activity Actions
  incrementAttempts: () => set((state) => ({ attempts: state.attempts + 1 })),
  
  setScore: (score) => set({ score }),
  
  markComplete: (isComplete) => set({ isComplete }),
  
  updateStateCheck: (key, value) =>
    set((state) => ({
      stateCheck: { ...state.stateCheck, [key]: value },
    })),
    
  resetActivity: () => {
    get().resetTimer();
    set({
      attempts: 0,
      score: 0,
      isComplete: false,
      stateCheck: {},
    });
  },
}));
