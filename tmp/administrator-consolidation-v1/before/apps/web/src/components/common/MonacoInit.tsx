"use client";

import { useEffect } from "react";
import { loader } from "@monaco-editor/react";

function isMonacoCancel(arg: unknown): boolean {
  if (!arg) return false;
  if (arg === "Canceled" || arg === "Canceled: Canceled") return true;

  if (typeof arg === "object") {
    const errorObj = arg as {
      message?: unknown;
      name?: unknown;
      stack?: unknown;
      type?: unknown;
      msg?: unknown;
    };
    if (errorObj.type === "cancelation" || errorObj.msg === "operation is manually canceled") return true;
    if (errorObj.message === "Canceled" || errorObj.name === "Canceled") return true;
    if (
      typeof errorObj.message === "string" &&
      (errorObj.message.includes("Canceled: Canceled") || errorObj.message.includes("Canceled"))
    ) {
      return true;
    }
    if (
      typeof errorObj.stack === "string" &&
      errorObj.stack.includes("monaco-editor") &&
      errorObj.stack.includes("Canceled")
    ) {
      return true;
    }
  }

  if (typeof arg === "string") {
    if (arg.includes("Canceled: Canceled")) return true;
    if (arg.includes("[  ERR") && arg.includes("Canceled")) return true;
    if (arg.includes("of.cancel") && arg.includes("Canceled")) return true;
  }

  return false;
}

let isInitialized = false;

function initMonacoConfig() {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  // Pin Monaco CDN to stable version aligned with package.json
  loader.config({
    paths: {
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs",
    },
  });

  // Intercept console.error to silence harmless Monaco WebKit clipboard cancellation noise
  // and provide meaningful diagnostics for Monaco script loading errors
  const originalConsoleError = console.error;
  console.error = function (...args: unknown[]) {
    if (args.some(isMonacoCancel)) {
      return;
    }

    // Enhance cryptic "Monaco initialization: error: {}" when the rejection is an empty DOM ErrorEvent
    if (
      args.length >= 2 &&
      typeof args[0] === "string" &&
      args[0].includes("Monaco initialization: error:")
    ) {
      const err = args[1];
      const isDomEvent =
        (typeof Event !== "undefined" && err instanceof Event) ||
        (err && typeof err === "object" && ("isTrusted" in err || ("type" in err && (err as { type: unknown }).type === "error")));

      if (isDomEvent || (err && typeof err === "object" && Object.keys(err).length === 0)) {
        originalConsoleError.apply(console, [
          "Monaco initialization failed to load scripts from CDN. Verify network connectivity and Content-Security-Policy (https://cdn.jsdelivr.net):",
          err,
        ]);
        return;
      }
    }

    originalConsoleError.apply(console, args);
  };

  // Intercept unhandled promise rejections from Monaco cancellation tokens
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    if (isMonacoCancel(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  // Also hook into Monaco unexpected error handler once initialized
  loader.init().then((monaco) => {
    const editorApi = monaco?.editor as unknown as {
      setUnexpectedErrorHandler?: (fn: (err: unknown) => void) => void;
    };
    if (typeof editorApi?.setUnexpectedErrorHandler === "function") {
      editorApi.setUnexpectedErrorHandler((err: unknown) => {
        if (isMonacoCancel(err)) return;
        originalConsoleError.apply(console, [err]);
      });
    }
  }).catch(() => {
    // Ignore initialization errors in background
  });
}

// Eagerly initialize on client module load before any React component mounts
if (typeof window !== "undefined") {
  initMonacoConfig();
}

export default function MonacoInit() {
  useEffect(() => {
    initMonacoConfig();
  }, []);

  return null;
}
