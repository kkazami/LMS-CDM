import type { LoginRequest, LoginResponse, AuthUser, ApiResponse } from '@lms/types';
import type { Course } from '@lms/types';
import type { Announcement } from '@lms/types';
import type { Grade, GradeSummary } from '@lms/types';
import type { Assignment } from '@lms/types';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, getToken } = config;

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (getToken) {
      const token = await getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiClientError(response.status, error.message || 'Request failed', error.errors);
    }

    return response.json();
  }

  return {
    auth: {
      login: (data: LoginRequest) =>
        request<LoginResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      register: (data: {
        name: string;
        email: string;
        studentNumber: string;
        password: string;
        confirmPassword: string;
        instituteCode: string;
      }) =>
        request<LoginResponse>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      me: () => request<{ user: AuthUser }>('/api/auth/me'),

      logout: () =>
        request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
    },

    courses: {
      list: (instituteCode: string) =>
        request<{ courses: Course[] }>(`/api/courses?institute=${instituteCode}`),

      get: (courseId: string) =>
        request<{ course: Course }>(`/api/courses/${courseId}`),
    },

    announcements: {
      list: (instituteCode: string) =>
        request<{ announcements: Announcement[] }>(`/api/announcements?institute=${instituteCode}`),
    },

    grades: {
      list: (instituteCode: string) =>
        request<{ grades: Grade[]; summary: GradeSummary[] }>(`/api/grades?institute=${instituteCode}`),
    },

    assignments: {
      list: (instituteCode: string) =>
        request<{ assignments: Assignment[] }>(`/api/assignments?institute=${instituteCode}`),

      getByCourse: (courseId: string) =>
        request<{ assignments: Assignment[] }>(`/api/assignments?courseId=${courseId}`),
    },

    leaderboard: {
      get: (instituteCode: string) =>
        request<{ entries: Array<{ rank: number; userId: string; userName: string; totalPoints: number; currentStreak: number }> }>(
          `/api/leaderboard?institute=${instituteCode}`
        ),
    },

    profile: {
      get: () => request<{ user: AuthUser }>('/api/profile'),
      update: (data: { name?: string }) =>
        request<{ user: AuthUser }>('/api/profile', {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
    },

    institutes: {
      list: () => request<{ institutes: Array<{ id: string; code: string; name: string }> }>('/api/institutes'),
    },
  };
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export type ApiClient = ReturnType<typeof createApiClient>;
