import type {
  LoginRequest,
  LoginResponse,
  AuthUser,
  Course,
  CourseAnnouncementItem,
  CourseStreamResponse,
  CourseClassworkResponse,
  CreateClassworkInput,
  CoursePeopleResponse,
  CourseGradesResponse,
  CourseSubmissionResponse,
  GradeSubmissionInput,
  Announcement,
  Grade,
  GradeSummary,
  Assignment,
  LeaderboardEntry,
  FlashcardDeck,
  FlashcardCard,
  FlashcardCardProgress,
  FlashcardStudyStats,
  GamificationProfile,
  StudentBadge,
  LoginRewardResult,
  TaskItem,
  NoteItem,
  LmsCalendarEvent,
  CourseMaterialsGroup,
  AppNotification,
  RegisterPushTokenInput,
} from '@lms/types';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, getToken } = config;

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...((options.headers as Record<string, string>) || {}),
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

      refresh: () =>
        request<{ success: boolean; expiresAt: string }>('/api/auth/refresh', {
          method: 'POST',
        }),

      logout: () =>
        request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
    },

    courses: {
      list: (instituteCode: string) =>
        request<{ courses: Course[] }>(`/api/courses?institute=${instituteCode}`),

      get: (courseId: string) =>
        request<{ course: Course }>(`/api/courses/${courseId}`),

      getStream: (courseId: string) =>
        request<CourseStreamResponse>(`/api/courses/${courseId}/stream`),

      postStream: (courseId: string, content: string) =>
        request<{ success: boolean; announcement: CourseAnnouncementItem }>(
          `/api/courses/${courseId}/stream`,
          {
            method: 'POST',
            body: JSON.stringify({ content }),
          }
        ),

      getClasswork: (courseId: string) =>
        request<CourseClassworkResponse>(`/api/courses/${courseId}/classwork`),

      createClasswork: (courseId: string, data: CreateClassworkInput) =>
        request<{ success: boolean; item: any }>(
          `/api/courses/${courseId}/classwork`,
          {
            method: 'POST',
            body: JSON.stringify(data),
          }
        ),

      getPeople: (courseId: string) =>
        request<CoursePeopleResponse>(`/api/courses/${courseId}/people`),

      getGrades: (courseId: string) =>
        request<CourseGradesResponse>(`/api/courses/${courseId}/grades`),

      getGradebook: (courseId: string) =>
        request<{
          course: { id: string; title: string; code: string };
          students: Array<{ id: string; name: string; email: string; studentNumber?: string | null; avatarUrl?: string | null }>;
          assignments: Array<{ id: string; title: string; maxPoints: number | null; type: string; dueDate?: string | null }>;
          grades: Record<string, Record<string, { submissionId: string | null; grade: number | null; status: string | null; isReturned: boolean; submittedAt: string | null; attachments: any[] }>>;
          gradingPolicy: any;
        }>(`/api/courses/${courseId}/gradebook`),

      submitAssignment: (
        courseId: string,
        syllabusItemId: string,
        status = 'SUBMITTED',
        attachmentUrl?: string,
        fileName?: string,
        idempotencyKey?: string,
        attachments?: Array<{ url: string; fileName?: string; type?: string }>
      ) =>
        request<CourseSubmissionResponse>(`/api/courses/${courseId}/submissions`, {
          method: 'POST',
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
          body: JSON.stringify({ syllabusItemId, status, attachmentUrl, fileName, attachments }),
        }),

      gradeSubmission: (courseId: string, data: GradeSubmissionInput) =>
        request<{ success: boolean; submission: any }>(
          `/api/courses/${courseId}/submissions/grade`,
          {
            method: 'POST',
            body: JSON.stringify(data),
          }
        ),

      getEnrollments: (courseId: string, status?: string) =>
        request<{ enrollments: any[]; totalCount: number }>(
          `/api/courses/${courseId}/enrollments${status ? `?status=${status}` : ''}`
        ),

      updateEnrollment: (courseId: string, enrollmentId: string, action: 'APPROVE' | 'REJECT') =>
        request<{ success: boolean; enrollment: any }>(`/api/courses/${courseId}/enrollments`, {
          method: 'PATCH',
          body: JSON.stringify({ enrollmentId, action }),
        }),

      broadcast: (courseId: string, message: string, category = 'GENERAL') =>
        request<{ success: boolean; broadcast: any }>(`/api/courses/${courseId}/broadcast`, {
          method: 'POST',
          body: JSON.stringify({ message, category }),
        }),
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
        request<{ entries: LeaderboardEntry[] }>(`/api/leaderboard?institute=${instituteCode}`),
    },

    flashcards: {
      listDecks: (instituteCode: string) =>
        request<{ decks: FlashcardDeck[] }>(`/api/flashcards/decks?institute=${instituteCode}`),

      getCards: (deckId: string) =>
        request<{ cards: FlashcardCard[] }>(`/api/flashcards/cards?deckId=${deckId}`),

      recordProgress: (cardId: string, status: string) =>
        request<{ progress: FlashcardCardProgress }>('/api/flashcards/progress', {
          method: 'POST',
          body: JSON.stringify({ cardId, status }),
        }),

      completeSession: (deckId: string, stats: FlashcardStudyStats) =>
        request<{ success: boolean; expEarned: number }>('/api/flashcards/complete-session', {
          method: 'POST',
          body: JSON.stringify({ deckId, ...stats }),
        }),

      createDeck: (data: { title: string; description: string; tags: string[]; color: string; courseId?: string }) =>
        request<{ deck: FlashcardDeck }>('/api/flashcards/decks', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },

    workspace: {
      getTasks: (instituteCode: string) =>
        request<{ tasks: TaskItem[] }>(`/api/workspace/tasks?institute=${instituteCode}`),

      createTask: (data: { title: string; description?: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; dueDate?: string; courseId?: string }) =>
        request<{ task: TaskItem }>('/api/workspace/tasks', {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      updateTask: (taskId: string, data: Partial<TaskItem>) =>
        request<{ task: TaskItem }>(`/api/workspace/tasks?id=${taskId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),

      deleteTask: (taskId: string) =>
        request<{ success: boolean }>(`/api/workspace/tasks?id=${taskId}`, {
          method: 'DELETE',
        }),

      getNotes: (instituteCode: string) =>
        request<{ notes: NoteItem[] }>(`/api/workspace/notes?institute=${instituteCode}`),

      createNote: (data: { title: string; content: string; category?: string; color?: string }) =>
        request<{ note: NoteItem }>('/api/workspace/notes', {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      updateNote: (noteId: string, data: Partial<NoteItem>) =>
        request<{ note: NoteItem }>(`/api/workspace/notes?id=${noteId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),

      deleteNote: (noteId: string) =>
        request<{ success: boolean }>(`/api/workspace/notes?id=${noteId}`, {
          method: 'DELETE',
        }),

      getEvents: (instituteCode: string) =>
        request<{ events: LmsCalendarEvent[] }>(`/api/workspace/events?institute=${instituteCode}`),

      createEvent: (data: { title: string; eventDate: string; eventType: string; description?: string; courseId?: string }) =>
        request<{ event: LmsCalendarEvent }>('/api/workspace/events', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },

    gamification: {
      getProfile: () =>
        request<{ profile: GamificationProfile }>('/api/gamification/heartbeat'),

      sendHeartbeat: () =>
        request<{ success: boolean; expEarned: number; newBadges: StudentBadge[] }>('/api/gamification/heartbeat', {
          method: 'POST',
        }),

      getBadges: () =>
        request<{ badges: StudentBadge[] }>('/api/gamification/badges'),

      updatePrivacy: (isLeaderboardAnonymized: boolean) =>
        request<{ success: boolean }>('/api/gamification/privacy', {
          method: 'PUT',
          body: JSON.stringify({ isLeaderboardAnonymized }),
        }),
    },

    materials: {
      list: (instituteCode: string) =>
        request<{ groups: CourseMaterialsGroup[] }>(`/api/materials?institute=${instituteCode}`),
    },

    notifications: {
      list: () =>
        request<{ notifications: AppNotification[]; unreadCount?: number }>('/api/notifications'),

      markRead: (notificationId: string) =>
        request<{ success: boolean }>('/api/notifications', {
          method: 'PATCH',
          body: JSON.stringify({ id: notificationId }),
        }),

      markAllRead: () =>
        request<{ success: boolean }>('/api/notifications', {
          method: 'PATCH',
          body: JSON.stringify({ action: 'markAllRead' }),
        }),

      registerPushToken: (data: RegisterPushTokenInput) =>
        request<{ success: boolean }>('/api/notifications/push-token', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },

    upload: {
      file: async (fileUri: string, fileName: string, mimeType: string) => {
        const formData = new FormData();
        formData.append('file', {
          uri: fileUri,
          name: fileName,
          type: mimeType,
        } as any);

        return request<{ url: string; fileName: string; fileSize: number }>('/api/upload', {
          method: 'POST',
          body: formData,
        });
      },
    },

    profile: {
      get: () => request<{ user: AuthUser; profile?: GamificationProfile }>('/api/profile'),
      update: (data: { name?: string; bio?: string; phone?: string; department?: string; yearLevel?: string }) =>
        request<{ user: AuthUser }>('/api/profile', {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      updateAvatar: (avatarUrl: string) =>
        request<{ user: AuthUser }>('/api/profile/avatar', {
          method: 'POST',
          body: JSON.stringify({ avatarUrl }),
        }),
    },

    institutes: {
      list: () =>
        request<{ institutes: Array<{ id: string; code: string; name: string }> }>('/api/institutes'),
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
