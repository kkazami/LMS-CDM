"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme-context";
import type { createParticleField } from "./particle-field";
import styles from "./CodeLabBackdrop.module.css";
import { useCodeLabReducedMotion } from "./codelab-motion";

type ParticleField = ReturnType<typeof createParticleField>;

export default function CodeLabBackdrop() {
  const hostRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<ParticleField | null>(null);
  const { themeMode } = useTheme();
  const reduced = useCodeLabReducedMotion();
  const darkRef = useRef(themeMode === "dark");

  useEffect(() => {
    darkRef.current = themeMode === "dark";
    fieldRef.current?.setTheme(darkRef.current);
  }, [themeMode]);

  useEffect(() => {
    if (reduced) return;
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    void import("./particle-field").then(({ createParticleField }) => {
      if (!cancelled) fieldRef.current = createParticleField(host, darkRef.current);
    }).catch(() => {
      // Decoration can be omitted when WebGL or its lazy-loaded chunk is unavailable.
    });
    return () => {
      cancelled = true;
      fieldRef.current?.dispose();
      fieldRef.current = null;
    };
  }, [reduced]);

  return reduced ? null : <div ref={hostRef} className={styles.backdrop} aria-hidden="true" />;
}
