"use client";

import { useSyncExternalStore } from "react";

const storageKey = "cdm:codelab:reduce-motion:v1";
const mediaQuery = "(prefers-reduced-motion: reduce)";
const listeners = new Set<() => void>();
let media: MediaQueryList | undefined;
let savedPreference: boolean | undefined;
let inMemoryPreference: boolean | undefined;

function getMedia() {
  return media ??= window.matchMedia(mediaQuery);
}

function readPreference() {
  try {
    return inMemoryPreference ?? (window.localStorage.getItem(storageKey) === "on");
  } catch {
    return false;
  }
}

function notify() {
  listeners.forEach(listener => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== storageKey && event.key !== null) return;
  savedPreference = readPreference();
  notify();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (listeners.size === 1) {
    savedPreference = readPreference();
    getMedia().addEventListener("change", notify);
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      getMedia().removeEventListener("change", notify);
      window.removeEventListener("storage", onStorage);
      savedPreference = undefined;
    }
  };
}

function getPreference() {
  if (getMedia().matches) return "system";
  savedPreference ??= readPreference();
  return savedPreference ? "reduced" : "full";
}

export function useCodeLabMotionPreference() {
  return useSyncExternalStore(subscribe, getPreference, () => "full" as const);
}

export function useCodeLabReducedMotion() {
  return useCodeLabMotionPreference() !== "full";
}

export function setCodeLabReducedMotion(reduced: boolean) {
  savedPreference = reduced;
  try {
    if (reduced) window.localStorage.setItem(storageKey, "on");
    else window.localStorage.removeItem(storageKey);
    inMemoryPreference = undefined;
  } catch {
    inMemoryPreference = reduced;
  }
  notify();
}
