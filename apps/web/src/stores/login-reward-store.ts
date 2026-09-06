import { create } from "zustand";

interface LoginRewardState {
  shown: boolean;
  markShown: () => void;
}

export const useLoginRewardStore = create<LoginRewardState>((set) => ({
  shown: false,
  markShown: () => set({ shown: true }),
}));
