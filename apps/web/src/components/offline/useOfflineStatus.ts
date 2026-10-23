"use client";

import { createContext, useContext } from "react";
import type { OfflineStatusState } from "@/lib/ite/offline/types";

export interface OfflineContextValue extends OfflineStatusState {
  userId?: string;
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<number>;
}

export const OfflineContext = createContext<OfflineContextValue>({
  online: true,
  pendingCount: 0,
  syncing: false,
  lastSyncedAt: null,
  hasIndexedDb: true,
  isIteStudent: false,
  syncNow: async () => {},
  refreshPendingCount: async () => 0,
});

export function useOfflineStatus(): OfflineContextValue {
  return useContext(OfflineContext);
}
