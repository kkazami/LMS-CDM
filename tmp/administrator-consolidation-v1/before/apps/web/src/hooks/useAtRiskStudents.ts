"use client";

import { useState, useEffect, useCallback } from "react";
import type { RiskAnalysisResult } from "@/lib/risk-scoring";

export interface AtRiskStudentItem extends RiskAnalysisResult {
  id: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
}

/**
 * Custom hook to fetch real at-risk student metrics for a given course (or all courses).
 *
 * @param courseId - Optional course ID filter. If omitted or 'all', fetches for all taught courses.
 * @returns Object with students array (sorted by riskScore desc), isLoading, error, and refetch handler.
 */
export function useAtRiskStudents(courseId?: string) {
  const [students, setStudents] = useState<AtRiskStudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAtRiskStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const param = courseId && courseId !== "all" ? `?courseId=${courseId}` : "";
      const res = await fetch(`/api/analytics/at-risk${param}`);
      if (!res.ok) {
        throw new Error("Failed to fetch at-risk student data.");
      }
      const data = (await res.json()) as { atRiskStudents: AtRiskStudentItem[] };
      setStudents(data.atRiskStudents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchAtRiskStudents();
  }, [fetchAtRiskStudents]);

  return {
    students,
    isLoading,
    error,
    refetch: fetchAtRiskStudents,
  };
}
