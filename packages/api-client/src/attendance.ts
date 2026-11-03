import type { AttendanceOverview, AttendanceMutation, AttendanceMutationResult, AttendanceCode } from '@lms/types';

export function attendanceClient(request: <T>(path: string, options?: RequestInit) => Promise<T>, download: (path: string) => Promise<string>) {
  const root = (courseId: string) => `/api/courses/${encodeURIComponent(courseId)}/attendance`;
  return {
    overview: (courseId: string, page = 1) => request<AttendanceOverview>(`${root(courseId)}?page=${page}`),
    mutate: (courseId: string, input: AttendanceMutation) => request<AttendanceMutationResult>(root(courseId), { method: 'POST', body: JSON.stringify(input) }),
    codes: (courseId: string, sessionId: string) => request<AttendanceCode>(`${root(courseId)}/${encodeURIComponent(sessionId)}/codes`),
    challenge: (courseId: string, sessionId: string) => request<{ challenge: string }>(`${root(courseId)}/${encodeURIComponent(sessionId)}/challenge`, { method: 'POST' }),
    assignments: () => request<Array<{ id: string; title: string }>>('/api/attendance/assignments'),
    exportCsv: (courseId: string, from = '', to = '') => download(`${root(courseId)}/export?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`),
  };
}
