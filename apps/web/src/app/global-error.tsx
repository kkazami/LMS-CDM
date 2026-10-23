"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: it replaces the root layout, so it renders its own <html>/<body>
 * and uses inline styles (global CSS is not loaded here). Dark theme to match the app.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F111A",
          color: "#F0F2F8",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: 440,
            margin: 16,
            padding: 32,
            textAlign: "center",
            background: "#141721",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 24,
          }}
        >
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#94A3B8" }}>
            The application hit an unexpected error. Please try again.
          </p>
          {error.digest && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#94A3B8", fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              minHeight: 44,
              padding: "8px 20px",
              border: 0,
              borderRadius: 12,
              background: "#F0F2F8",
              color: "#0F111A",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
