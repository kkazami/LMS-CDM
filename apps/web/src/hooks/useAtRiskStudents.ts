"use client";
import { useState, useEffect } from 'react';
import type { RiskAnalysisResult } from '@/lib/risk-scoring';
export interface AtRiskStudentItem extends RiskAnalysisResult { id: string; courseId: string; courseTitle: string; courseCode: string }
export function useAtRiskStudents(courseId?: string) {
  const [students, setStudents] = useState<AtRiskStudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState({ courseId, page: 1 });
  const page = selection.courseId === courseId ? selection.page : 1;
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true); setError(null); setStudents([]);
    const query = new URLSearchParams({ page: String(page), ...(courseId && courseId !== 'all' ? { courseId } : {}) });
    void (async () => {
      try {
        const res = await fetch(`/api/analytics/at-risk?${query}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch student data.');
        if (!controller.signal.aborted) { setStudents(data.atRiskStudents || []); setPagination(data.pagination); }
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'An error occurred.'); }
      finally { if (!controller.signal.aborted) setIsLoading(false); }
    })();
    return () => controller.abort();
  }, [courseId, page, revision]);
  return { students, isLoading, error, pagination, setPage: (next: number) => setSelection({ courseId, page: next }), refetch: () => setRevision(value => value + 1) };
}