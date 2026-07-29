/**
 * GLTFErrorBoundary — Error boundary for 3D scene rendering failures.
 *
 * Catches errors from Three.js/R3F rendering (WebGL context lost,
 * shader compilation failures, model parse errors, etc.) and displays
 * a user-friendly fallback instead of a blank/broken canvas.
 *
 * Usage:
 *   <GLTFErrorBoundary>
 *     <Canvas>
 *       <MyModel />
 *     </Canvas>
 *   </GLTFErrorBoundary>
 *
 * The fallback includes a retry button that remounts the children.
 */

"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface GLTFErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback. If not provided, a default error UI is shown. */
  fallback?: ReactNode;
  /** Optional callback when an error is caught — use for logging/telemetry. */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface GLTFErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class GLTFErrorBoundary extends Component<
  GLTFErrorBoundaryProps,
  GLTFErrorBoundaryState
> {
  constructor(props: GLTFErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): GLTFErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging — never expose raw traces to students
    console.error("[GLTFErrorBoundary] 3D rendering error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8"
          style={{ minHeight: "300px" }}
          role="alert"
        >
          <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
          <h3 className="text-base font-semibold text-red-800 mb-1">
            3D View Unavailable
          </h3>
          <p className="text-sm text-red-600 text-center max-w-sm mb-4">
            The 3D model couldn&apos;t be displayed. This might be due to browser
            compatibility or a temporary loading issue.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
