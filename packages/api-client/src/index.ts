import type {
  LoginRequest,
  LoginResponse,
  AuthUser,
  Course,
  MobileDashboard,
  ClassSchedule,
  CourseAnnouncementItem,
  CourseStreamResponse,
  CourseClassworkResponse,
  CreateClassworkInput,
  CoursePeopleResponse,
  CourseGradeItem,
  CourseFeedbackComment,
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

export interface CourseGradeSummary {
  averagePercentage: number | null;
  gradePoint: number | null;
  gradePointFormatted: string;
  remark: string;
  totalEarnedPoints: number;
  totalPossiblePoints: number;
  totalItems: number;
  completedCount: number;
  gradedCount: number;
  missingCount: number;
}

export interface CourseGradesResponse {
  summary: CourseGradeSummary | null;
  items: CourseGradeItem[];
  feedback: CourseFeedbackComment[];
}

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
  timeoutMs?: number;
  onUnauthorized?: (token: string) => void;
  onRequestComplete?: (measurement: { path: string; durationMs: number; bytes: number; status: number }) => void;
}

interface GradebookPayload {
  course: { id: string; title: string; code: string };
  students: Array<{ id: string; name: string; email: string; studentNumber?: string | null; avatarUrl?: string | null }>;
  assignments: Array<{ id: string; title: string; maxPoints: number | null; type: string; dueDate?: string | null }>;
  grades: Record<string, Record<string, { submissionId: string | null; grade: number | null; status: string | null; isReturned: boolean; submittedAt: string | null; attachments: any[] }>>;
  gradingPolicy: any;
  pagination?: { page: number; totalPages: number };
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, getToken } = config;

  async function request<T>(path: string, options: RequestInit = {}, timeoutMs = config.timeoutMs ?? 30000): Promise<T> {
    const startedAt = Date.now();
    const requestToken = getToken ? await getToken() : null;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...((options.headers as Record<string, string>) || {}),
    };

    if (requestToken) headers['Authorization'] = `Bearer ${requestToken}`;
    const assertCurrentSession = async () => {
      if (requestToken && getToken && requestToken !== await getToken()) {
        throw new ApiClientError(0, 'This response belongs to a previous sign-in.');
      }
    };

    const controller = new AbortController();
    const abort = () => controller.abort();
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        credentials: requestToken ? 'omit' : options.credentials,
        headers,
        signal: controller.signal,
      });
      await assertCurrentSession();
      if (response.status === 401 && requestToken) config.onUnauthorized?.(requestToken);

      if (!response.ok) {
        let message = `HTTP ${response.status}: ${response.statusText || 'Request failed'}`;
        let errors: any = undefined;
        let bodyData: any = undefined;

        try {
          const text = await response.text();
          try {
            const json = JSON.parse(text);
            if (json && typeof json === 'object') {
              bodyData = json;
              if (json.reply) message = json.reply;
              else if (json.message) message = json.message;
              else if (json.error) message = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
              if (json.errors) errors = json.errors;
            }
          } catch {
            // If non-JSON, surface raw text if short and not HTML
            const trimmed = text.trim();
            if (trimmed.length > 0 && trimmed.length <= 150 && !trimmed.startsWith('<')) {
              message = trimmed;
            }
          }
        } catch {
          // Fallback to HTTP status message
        }

        throw new ApiClientError(response.status, message, errors, bodyData);
      }

      const text = await response.text();
      await assertCurrentSession();
      config.onRequestComplete?.({ path: path.split('?')[0], durationMs: Date.now() - startedAt, bytes: text.length, status: response.status });
      try {
        return JSON.parse(text);
      } catch {
        throw new ApiClientError(
          response.status,
          `HTTP ${response.status}: Received non-JSON response from server`
        );
      }
    } catch (error) {
      if (controller.signal.aborted && !options.signal?.aborted) {
        throw new ApiClientError(0, 'The server took too long to respond. Check your connection and try again.');
      }
      if (error instanceof TypeError) {
        throw new ApiClientError(0, 'Cannot reach the LMS server. Check your connection and server address.');
      }
      throw error;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  }

  return {
    auth: {
      forgotPassword: (email: string) => request<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
      resetPassword: (email: string, otp: string, newPassword: string) => request<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) }),
      register: (data: { name: string; email: string; studentNumber: string; password: string; confirmPassword: string; instituteCode: string; acceptedPolicies: boolean }) =>
        request<LoginResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
      login: (data: LoginRequest) =>
        request<LoginResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      me: () => request<{ user: AuthUser; mobileCapabilities?: LoginResponse['mobileCapabilities'] }>('/api/auth/me'),

      refresh: () =>
        request<{ success: boolean; expiresAt: string }>('/api/auth/refresh', {
          method: 'POST',
        }),

      logout: () =>
        request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
    },

    mobileDashboard: {
      get: () => request<MobileDashboard>('/api/mobile/dashboard'),
      reorder: (courseIds: string[]) => request<{ success: boolean }>('/api/mobile/dashboard', {
        method: 'PATCH', body: JSON.stringify({ courseIds }),
      }),
    },

    courses: {
      joinWithCode: (code: string) => request<{ courseId: string; redirectTo: string }>('/api/student/join-class', { method: 'POST', body: JSON.stringify({ code }) }),
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

      updateStream: (courseId: string, announcementId: string, content: string) =>
        request<{ success: boolean; announcement: CourseAnnouncementItem }>(
          `/api/courses/${courseId}/stream`,
          {
            method: 'PATCH',
            body: JSON.stringify({ announcementId, content }),
          }
        ),

      deleteStream: (courseId: string, announcementId: string) =>
        request<{ success: boolean }>(
          `/api/courses/${courseId}/stream?announcementId=${encodeURIComponent(announcementId)}`,
          {
            method: 'DELETE',
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

      // Preserve complete-roster consumers while each server query/response stays bounded.
      getGradebook: async (courseId: string) => {
        const first = await request<GradebookPayload>(`/api/courses/${courseId}/gradebook?page=1`);
        const totalPages = first.pagination?.totalPages ?? 1;
        if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > 200) throw new ApiClientError(422, 'This roster is too large for the complete gradebook view.');
        const students = [...first.students], grades = { ...first.grades };
        for (let page = 2; page <= totalPages; page++) {
          const next = await request<GradebookPayload>(`/api/courses/${courseId}/gradebook?page=${page}`);
          students.push(...next.students); Object.assign(grades, next.grades);
        }
        const { pagination, ...result } = first;
        return { ...result, students, grades };
      },

      submitAssignment: (
        courseId: string,
        syllabusItemId: string,
        status = 'SUBMITTED',
        attachmentUrl?: string,
        fileName?: string,
        idempotencyKey?: string,
        attachments?: Array<{ url: string; fileName?: string; type?: string }>,
        replaceAttachments = false
      ) =>
        request<CourseSubmissionResponse>(`/api/courses/${courseId}/submissions`, {
          method: 'POST',
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
          body: JSON.stringify({ syllabusItemId, status, attachmentUrl, fileName, attachments, ...(replaceAttachments ? { replaceAttachments: true } : {}) }),
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

      getBroadcasts: (courseId: string) =>
        request<{
          broadcasts: Array<{
            id: string;
            message: string;
            category: string;
            scope: string;
            scopeLabel: string;
            recipientCount: number;
            createdAt: string;
            senderName?: string;
            senderAvatar?: string | null;
          }>;
          enrolledStudents: Array<{
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
          }>;
        }>(`/api/courses/${courseId}/broadcast`),

      broadcast: (courseId: string, message: string, category = 'GENERAL', scope: string = 'ALL') =>
        request<{ success: boolean; broadcast: any }>(`/api/courses/${courseId}/broadcast`, {
          method: 'POST',
          body: JSON.stringify({ message, category, scope }),
        }),

      updateBroadcast: (courseId: string, broadcastId: string, message: string, category?: string) =>
        request<{ success: boolean; broadcast: any }>(`/api/courses/${courseId}/broadcast`, {
          method: 'PATCH',
          body: JSON.stringify({ broadcastId, message, category }),
        }),

      deleteBroadcast: (courseId: string, broadcastId: string) =>
        request<{ success: boolean }>(
          `/api/courses/${courseId}/broadcast?broadcastId=${encodeURIComponent(broadcastId)}`,
          {
            method: 'DELETE',
          }
        ),
    },

    announcements: {
      list: (instituteCode: string, params?: { courseId?: string; page?: number; limit?: number }) => {
        const query = new URLSearchParams({ institute: instituteCode });
        if (params?.courseId) query.set('courseId', params.courseId);
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        return request<{
          announcements: Announcement[];
          pagination?: { page: number; limit: number; totalCount: number; totalPages: number; hasMore: boolean };
        }>(`/api/announcements?${query.toString()}`);
      },
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

      recordProgress: (cardId: string, selfRating: 'knew_it' | 'still_learning', idempotencyKey?: string) =>
        request<{ correct: boolean; correctAnswer: string }>('/api/flashcards/progress', {
          method: 'POST',
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
          body: JSON.stringify({ cardId, selfRating }),
        }),

      completeSession: (deckId: string, stats: { cardsReviewed: number; durationSeconds: number; idempotencyKey: string }) =>
        request<{ success: boolean; grantedExp?: number; duplicate?: boolean }>('/api/flashcards/complete-session', {
          method: 'POST',
          body: JSON.stringify({ deckId, ...stats }),
        }).then(result => ({ ...result, expEarned: result.grantedExp ?? 0 })),

      createDeck: (data: { title: string; description: string; tags: string[]; color: string; courseId?: string }) =>
        request<{ deck: FlashcardDeck }>('/api/flashcards/decks', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },

    workspace: {
      getAgenda: async () => {
        const data = await request<{ events?: LmsCalendarEvent[]; schedules?: ClassSchedule[] }>('/api/workspace/events?view=agenda');
        if (!Array.isArray(data.events)) throw new ApiClientError(426, 'Update the web backend to use the mobile agenda.');
        return { events: data.events, schedules: data.schedules || [] };
      },
      getTasks: async (instituteCode: string) => ({ tasks: await request<TaskItem[]>(`/api/workspace/tasks?institute=${instituteCode}`) }),

      createTask: (data: { title: string; description?: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; dueDate?: string; courseId?: string }) =>
        request<TaskItem>('/api/workspace/tasks', {
          method: 'POST',
          body: JSON.stringify({ ...data, priority: data.priority.toLowerCase() }),
        }).then(task => ({ task })),

      updateTask: (taskId: string, data: Partial<TaskItem>) =>
        request<TaskItem>('/api/workspace/tasks', {
          method: 'PATCH',
          body: JSON.stringify({ ...data, id: taskId, ...(data.priority ? { priority: data.priority.toLowerCase() } : {}) }),
        }).then(task => ({ task })),

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

      getEvents: async (instituteCode: string) => ({ events: await request<LmsCalendarEvent[]>(`/api/workspace/events?institute=${instituteCode}`) }),

      createEvent: (data: { title: string; eventDate: string; eventType: string; description?: string; courseId?: string }) =>
        request<LmsCalendarEvent>('/api/workspace/events', {
          method: 'POST',
          body: JSON.stringify(data),
        }).then(event => ({ event })),
    },

    gamification: {
      getProfile: () =>
        request<{
          profile: GamificationProfile;
          rewardReceipt?: { rewarded: boolean; streak: number; expEarned: number } | null;
        }>('/api/gamification/heartbeat'),

      getHeartbeat: () =>
        request<{
          profile: GamificationProfile;
          rewardReceipt?: { rewarded: boolean; streak: number; expEarned: number } | null;
        }>('/api/gamification/heartbeat'),

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
        request<{ notifications: AppNotification[]; unreadCount?: number }>('/api/notifications?includeCommunity=1'),

      markRead: (notificationId: string) =>
        request<{ success: boolean }>('/api/notifications?includeCommunity=1', {
          method: 'PATCH',
          body: JSON.stringify({ id: notificationId }),
        }),

      markAllRead: () =>
        request<{ success: boolean }>('/api/notifications?includeCommunity=1', {
          method: 'PATCH',
          body: JSON.stringify({ action: 'markAllRead' }),
        }),

      delete: (notificationId: string) =>
        request<{ success: boolean; count?: number }>(`/api/notifications?includeCommunity=1&id=${encodeURIComponent(notificationId)}`, {
          method: 'DELETE',
        }),

      clearAll: () =>
        request<{ success: boolean; count?: number }>('/api/notifications?includeCommunity=1&all=true', {
          method: 'DELETE',
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
        }, 300000);
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

    analytics: {
      getAtRisk: (courseId?: string) => {
        const query = courseId && courseId !== 'all' ? `?courseId=${encodeURIComponent(courseId)}` : '';
        return request<{ atRiskStudents: any[] }>(`/api/analytics/at-risk${query}`);
      },
      importSupplementary: (data: {
        courseId: string;
        rows: Array<{
          studentEmail?: string;
          studentNumber?: string;
          supplementaryScore: any;
        }>;
        commit?: boolean;
      }) =>
        request<{
          courseTitle: string;
          courseCode: string;
          totalRows: number;
          validCount: number;
          invalidCount: number;
          canCommit: boolean;
          results: Array<{
            identifier: string;
            matchedStudent: {
              id: string;
              name: string;
              email: string;
              studentNumber: string | null;
            } | null;
            score: number | null;
            isValid: boolean;
            error?: string;
          }>;
          message?: string;
          createdAssignmentId?: string;
          updatedCount?: number;
        }>('/api/analytics/supplementary-import', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },

    chatbot: {
      sendMessage: (
        message: string,
        history?: Array<{ role: 'user' | 'bot' | 'model'; text: string }>
      ) =>
        request<{
          reply: string;
          role?: string;
          rateLimited?: boolean;
          error?: string;
        }>('/api/chatbot/message', {
          method: 'POST',
          body: JSON.stringify({ message, history }),
        }),
    },

    meetings: {
      list: (params?: { courseId?: string; status?: string; cursor?: string; take?: number }) => {
        const query = new URLSearchParams();
        if (params?.courseId && params.courseId !== 'all' && params.courseId !== 'ALL') {
          query.set('courseId', params.courseId);
        }
        if (params?.status && params.status !== 'all' && params.status !== 'ALL') {
          query.set('status', params.status);
        }
        if (params?.cursor) query.set('cursor', params.cursor);
        if (params?.take) query.set('take', String(params.take));
        const qs = query.toString();
        return request<MeetingsListResponse>(`/api/ite/meetings${qs ? `?${qs}` : ''}`);
      },

      join: (id: string) =>
        request<{ joinUrl: string }>(`/api/ite/meetings/${id}/join`, {
          method: 'POST',
        }),

      create: (data: CreateMeetingInput) =>
        request<ClassMeetingItem>('/api/ite/meetings', {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      cancel: (id: string) =>
        request<ClassMeetingItem>(`/api/ite/meetings/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'cancel' }),
        }),

      getAttendance: (id: string) =>
        request<MeetingAttendanceResponse>(`/api/ite/meetings/${id}/attendance`),
    },

    ite: {
      getParticipation: () =>
        request<StudentParticipationResponse>('/api/ite/students/my-participation'),
      getFocusSummary: () =>
        request<FocusSummaryResponse>('/api/ite/focus/summary'),
      getSuggestions: () =>
        request<StudySuggestionsResponse>('/api/ite/guidance/suggestions'),
      getInstructorAtRiskSummary: () =>
        request<InstructorAtRiskSummaryResponse>('/api/ite/instructor/at-risk-summary'),
      getCourseParticipation: (courseId: string) =>
        request<CourseParticipationDetailResponse>(`/api/ite/courses/${courseId}/participation`),
    },

    broadcasts: {
      list: (courseId: string) =>
        request<CourseBroadcastResponse>(`/api/courses/${courseId}/broadcast`),
      create: (courseId: string, data: { message: string; category?: string; scope?: string }) =>
        request<CreateBroadcastResponse>(`/api/courses/${courseId}/broadcast`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      delete: (courseId: string, broadcastId: string) =>
        request<{ success: boolean }>(
          `/api/courses/${courseId}/broadcast?broadcastId=${encodeURIComponent(broadcastId)}`,
          { method: 'DELETE' }
        ),
    },

    forms: {
      list: (courseId: string) =>
        request<CourseFormsResponse>(`/api/courses/${courseId}/forms`),
      getResponses: (courseId: string, formId: string, params?: { q?: string; sort?: string }) => {
        const query = new URLSearchParams();
        if (params?.q) query.set('q', params.q);
        if (params?.sort) query.set('sort', params.sort);
        const qs = query.toString();
        return request<FormResponsesResponse>(
          `/api/courses/${courseId}/forms/${formId}/responses${qs ? `?${qs}` : ''}`
        );
      },
    },

    knowledgeExchange: {
      listPosts: (params?: {
        tab?: string;
        sort?: string;
        search?: string;
        tag?: string;
        courseId?: string;
        page?: number;
        limit?: number;
      }) => {
        const query = new URLSearchParams();
        if (params?.tab) query.set('tab', params.tab);
        if (params?.sort) query.set('sort', params.sort);
        if (params?.search) query.set('search', params.search);
        if (params?.tag) query.set('tag', params.tag);
        if (params?.courseId) query.set('courseId', params.courseId);
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        const qs = query.toString();
        return request<KxFeedResponse>(`/api/knowledge-exchange/posts${qs ? `?${qs}` : ''}`);
      },
    },
  };
}

export type MeetingStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
export type MeetingProvider = 'GOOGLE_MEET' | 'GOOGLE_CLASSROOM' | 'ZOOM' | 'MICROSOFT_TEAMS' | 'OTHER';

export interface ClassMeetingItem {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  createdById: string;
  title: string;
  description: string | null;
  provider: MeetingProvider;
  joinUrl?: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  status: MeetingStatus;
  derivedStatus: MeetingStatus;
  primaryTimeIso: string;
  formattedPrimaryDateTime: string;
  formattedStartedTime: string | null;
  formattedEndedTime: string | null;
  durationLabel: string | null;
  joinCount?: number;
  hasJoined?: boolean;
  createdAt: string;
}

export interface MeetingAttendee {
  userId: string;
  name: string;
  studentNumber: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  formattedJoinedAt: string;
}

export interface MeetingAttendanceResponse {
  meetingId: string;
  totalAttendees: number;
  attendees: MeetingAttendee[];
}

export interface CreateMeetingInput {
  courseId: string;
  title: string;
  description?: string;
  joinUrl: string;
  scheduledAt?: string;
  startNow?: boolean;
}

export interface MeetingsListResponse {
  meetings: ClassMeetingItem[];
  nextCursor: string | null;
}

export interface DailySeriesItem {
  date: string;
  count: number;
}

export interface StudentCourseParticipation {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  engagementScore: number;
  trend: 'improving' | 'declining' | 'stable';
  dailySeries: DailySeriesItem[];
  onTimeRate: number | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  lastActivityAt: string | null;
  hasEnoughData: boolean;
}

export interface StudentParticipationResponse {
  courses: StudentCourseParticipation[];
}

export interface DailyFocusStat {
  date: string;
  label: string;
  focusedMinutes: number;
}

export interface FocusSummaryResponse {
  focusedMinutesThisWeek: number;
  focusedMinutesLastWeek: number;
  completedSessionsThisWeek: number;
  averageTabSwitchesThisWeek: number;
  longestCompletedSessionMinutes: number;
  sevenDaySeries: DailyFocusStat[];
  activeSessionId: string | null;
}

export type SuggestionPriority = 1 | 2 | 3 | 4 | 5;
export type SuggestionCategory = 'OVERDUE' | 'DUE_SOON' | 'ENGAGEMENT' | 'FOCUS' | 'ON_TRACK';

export interface StudySuggestion {
  id: string;
  title: string;
  detail: string;
  href: string;
  priority: SuggestionPriority;
  category: SuggestionCategory;
}

export interface StudySuggestionsResponse {
  suggestions: StudySuggestion[];
}

export interface KxPostAuthor {
  id: string | null;
  name: string;
  role: string | null;
  email: string | null;
  studentNumber: string | null;
  avatarUrl: string | null;
  initials?: string;
}

export interface KxTagItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  postCount: number;
}

export interface KxPostItem {
  id: string;
  title: string;
  body: string;
  postType: string;
  status: string;
  isAnonymous: boolean;
  authorId: string | null;
  instituteId: string;
  courseId: string | null;
  viewCount: number;
  voteCount: number;
  answerCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  userVote: number;
  isBookmarked: boolean;
  author: KxPostAuthor;
  tags: KxTagItem[];
}

export interface KxFeedResponse {
  posts: KxPostItem[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface InstructorAtRiskReason {
  detail: string;
  code?: string;
}

export interface InstructorAtRiskEntry {
  studentId: string;
  name: string;
  courseTitle: string;
  courseId: string;
  riskLevel: 'HIGH';
  reasons: InstructorAtRiskReason[];
}

export interface InstructorAtRiskSummaryResponse {
  entries: InstructorAtRiskEntry[];
}

export interface CourseParticipationStudentRow {
  studentId: string;
  name: string;
  email: string;
  studentNumber?: string | null;
  avatarUrl: string | null;
  engagementScore: number;
  trend: 'UP' | 'DOWN' | 'STABLE' | 'improving' | 'declining' | 'stable';
  lastActivityAt: string | null;
  overdueCount: number;
  daysInactive?: number;
  gradeAvg: number | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  suggestedAction?: string;
  reasons: Array<{ code?: string; type?: string; detail: string; severity?: string; suggestedAction?: string }>;
  dailySeries: Array<{ date: string; count: number }>;
  computedAt: string | null;
}

export interface CourseParticipationKpis {
  activeThisWeek: number;
  avgEngagement: number;
  highCount: number;
  mediumCount: number;
}

export interface CourseParticipationDetailResponse {
  students: CourseParticipationStudentRow[];
  kpis: CourseParticipationKpis;
  courseDaily: Array<{ date: string; count: number }>;
  computedAt: string | null;
}

export interface CourseBroadcastItem {
  id: string;
  senderId: string;
  message: string;
  category: string;
  scope: string;
  scopeLabel?: string;
  recipientCount: number;
  createdAt: string;
  senderName?: string;
  senderAvatar?: string | null;
}

export interface CourseBroadcastEnrolledStudent {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface CourseBroadcastResponse {
  broadcasts: CourseBroadcastItem[];
  enrolledStudents: CourseBroadcastEnrolledStudent[];
}

export interface CreateBroadcastResponse {
  success: boolean;
  broadcast: CourseBroadcastItem;
}

export interface CourseFormItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  timeLimitMinutes: number | null;
  maxAttempts: number | null;
  passingScore: number | null;
  dueDate: string | null;
  createdAt: string;
  _count?: {
    questions: number;
    attempts: number;
  };
}

export interface CourseFormsResponse {
  forms: CourseFormItem[];
}

export interface FormAttemptUser {
  id: string;
  name: string;
  email: string;
  studentNumber: string | null;
  avatarUrl: string | null;
}

export interface FormAttemptItem {
  id: string;
  formId: string;
  userId: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  startedAt: string;
  submittedAt: string | null;
  user: FormAttemptUser;
}

export interface FormResponsesResponse {
  attempts: FormAttemptItem[];
}




export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export type ApiClient = ReturnType<typeof createApiClient>;
