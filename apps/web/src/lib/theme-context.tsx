"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export type ThemeMode = "light" | "dark";

interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "light",
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const requestedMode = useRef<ThemeMode>("light");
  const activeTransition = useRef<ViewTransition | null>(null);

  useEffect(() => {
    try {
      const saved = (localStorage.getItem("cdm-theme-mode") ||
        localStorage.getItem("lumina-theme-mode")) as ThemeMode | null;
      if (saved === "dark" || saved === "light") {
        requestedMode.current = saved;
        setThemeModeState(saved);
        document.documentElement.setAttribute("data-theme", saved);
        if (saved === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        setThemeModeState("light");
        document.documentElement.setAttribute("data-theme", "light");
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // ignore localStorage security errors
    }
    return () => {
      activeTransition.current?.skipTransition();
      activeTransition.current = null;
      document.documentElement.classList.remove("theme-reveal");
    };
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    requestedMode.current = mode;
    setThemeModeState(mode);
    try {
      localStorage.setItem("cdm-theme-mode", mode);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute("data-theme", mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    activeTransition.current?.skipTransition();
    activeTransition.current = null;
    document.documentElement.classList.remove("theme-reveal");
    applyTheme(mode);
  };

  const toggleTheme = (event?: React.MouseEvent<HTMLButtonElement>) => {
    const nextMode = requestedMode.current === "light" ? "dark" : "light";
    const root = document.documentElement;
    if (typeof document.startViewTransition !== "function" || typeof root.animate !== "function"
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setThemeMode(nextMode);
      return;
    }

    const bounds = event?.currentTarget.getBoundingClientRect();
    const x = event && event.detail > 0 ? event.clientX : bounds ? bounds.left + bounds.width / 2 : innerWidth / 2;
    const y = event && event.detail > 0 ? event.clientY : bounds ? bounds.top + bounds.height / 2 : innerHeight / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 1;
    activeTransition.current?.skipTransition();
    requestedMode.current = nextMode;
    root.classList.add("theme-reveal");
    let revealAnimation: Animation | undefined;

    try {
      const transition = document.startViewTransition(() => {
        // A newer click can supersede a transition before its DOM update runs.
        if (activeTransition.current === transition) flushSync(() => applyTheme(nextMode));
      });
      activeTransition.current = transition;
      void transition.ready.then(() => {
        if (activeTransition.current !== transition) return;
        const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`];
        revealAnimation = root.animate({ clipPath: nextMode === "dark" ? clipPath.reverse() : clipPath }, {
          duration: 600,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: nextMode === "dark" ? "::view-transition-old(root)" : "::view-transition-new(root)",
          fill: "forwards",
        });
      }).catch(() => { /* Skipped transitions still apply their latest requested theme. */ });
      void transition.finished.catch(() => {}).finally(() => {
        // Release the filled mask so it cannot affect the next transition's snapshots.
        revealAnimation?.cancel();
        if (activeTransition.current === transition) {
          activeTransition.current = null;
          root.classList.remove("theme-reveal");
        }
      });
    } catch {
      setThemeMode(nextMode);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
