"use client";

import { useEffect } from "react";
import { loader } from "@monaco-editor/react";

function isMonacoCancel(arg: unknown): boolean {
  if (!arg) return false;
  if (arg === "Canceled" || arg === "Canceled: Canceled") return true;

  if (typeof arg === "object") {
    const errorObj = arg as { message?: unknown; name?: unknown; stack?: unknown };
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

if (typeof window !== "undefined") {
  // Pin Monaco CDN to stable version aligned with package.json
  loader.config({
    paths: {
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs",
    },
  });

  // Intercept console.error to silence harmless Monaco WebKit clipboard cancellation noise
  const originalConsoleError = console.error;
  console.error = function (...args: unknown[]) {
    if (args.some(isMonacoCancel)) {
      return;
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

export default function MonacoInit() {
  useEffect(() => {
    // Ensure handlers are active on mount
  }, []);

  return null;
}
