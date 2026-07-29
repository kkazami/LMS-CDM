/**
 * useActivitySubmission — Shared submission hook for all activity modules.
 *
 * Provides a consistent interface for POSTing activity results to the
 * /api/activities/submit endpoint. Handles loading state, error handling,
 * and success responses.
 *
 * Usage (from any activity component):
 *   const { submit, isSubmitting, error, result } = useActivitySubmission();
 *
 *   const handleComplete = async () => {
 *     await submit({
 *       studentId: session.user.id,
 *       assignmentId: template.id,
 *       activityType: "pc-build",
 *       variantSeed: seed,
 *       startedAt: startTime.toISOString(),
 *       completionTimeSeconds: elapsed,
 *       attempts: attemptCount,
 *       stateCheck: { cpu_installed: true, ram_seated: false },
 *       score: 75,
 *       maxScore: 100,
 *       passed: true,
 *     });
 *   };
 */

"use client";

import { useState, useCallback } from "react";
import type { ActivitySubmission } from "../types";

/** Shape of the success response from /api/activities/submit */
interface SubmissionResult {
  id: string;
  score: number;
  maxScore: number;
  passed: boolean;
  submittedAt: string;
}

/** Error shape returned by the API on validation failure */
interface SubmissionError {
  message: string;
  errors?: Record<string, string[]>;
}

interface UseActivitySubmissionReturn {
  /** Call this to POST a completed activity submission. */
  submit: (payload: ActivitySubmission) => Promise<SubmissionResult | null>;
  /** True while the POST is in flight. */
  isSubmitting: boolean;
  /** Error message from the last failed submission, or null. */
  error: string | null;
  /** Detailed field-level validation errors, if any. */
  fieldErrors: Record<string, string[]> | null;
  /** The result of the last successful submission, or null. */
  result: SubmissionResult | null;
  /** Resets error and result state (e.g. to retry). */
  reset: () => void;
}

export function useActivitySubmission(): UseActivitySubmissionReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setFieldErrors(null);
    setResult(null);
  }, []);

  const submit = useCallback(
    async (payload: ActivitySubmission): Promise<SubmissionResult | null> => {
      setIsSubmitting(true);
      setError(null);
      setFieldErrors(null);

      try {
        const response = await fetch("/api/activities/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data: { message: string; submission?: SubmissionResult; errors?: Record<string, string[]> } =
          await response.json();

        if (!response.ok) {
          const err = data as SubmissionError;
          setError(err.message || "Submission failed.");
          if (err.errors) {
            setFieldErrors(err.errors);
          }
          return null;
        }

        if (data.submission) {
          setResult(data.submission);
          return data.submission;
        }

        // Shouldn't happen, but handle gracefully
        setError("Unexpected response format.");
        return null;
      } catch (err) {
        // Network error or JSON parse failure
        const message =
          err instanceof Error ? err.message : "Network error. Please try again.";
        setError(message);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { submit, isSubmitting, error, fieldErrors, result, reset };
}
