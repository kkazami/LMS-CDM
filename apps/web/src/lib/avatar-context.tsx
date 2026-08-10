"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AvatarContextValue {
  /** The current user's avatar URL (null = use initials) */
  avatarUrl: string | null;
  /** Update the avatar URL after a successful upload */
  setAvatarUrl: (url: string | null) => void;
}

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({
  children,
  initialAvatarUrl,
}: {
  children: ReactNode;
  initialAvatarUrl: string | null;
}) {
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(initialAvatarUrl);

  const setAvatarUrl = useCallback((url: string | null) => {
    setAvatarUrlState(url);
  }, []);

  return (
    <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar(): AvatarContextValue {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error("useAvatar must be used within <AvatarProvider>");
  return ctx;
}
