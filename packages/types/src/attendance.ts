export type AttendanceMode = 'IN_PERSON' | 'LIVE_REMOTE' | 'ASYNCHRONOUS';
export type AttendanceStatus = 'PRESENT' | 'TARDY' | 'ABSENT' | 'EXCUSED';
export type AttendanceVerification = 'NOT_CHECKED' | 'NEARBY' | 'OUTSIDE' | 'UNCLEAR' | 'DECLINED' | 'MOCK_REPORTED';
export interface AttendancePolicy {
  rollout: 'DISABLED' | 'PILOT' | 'ENABLED'; phase: number; pilotCourseIds: string[];
  locationEnabled: boolean; timezone: string; privacyReview: string;
  recordDays: number | null; eventDays: number | null; requestDays: number | null;
  verificationDays: number | null; arrangementDays: number | null;
}
export interface AttendanceSettings {
  liveLimit: number; asyncLimit: number; absenceThreshold: number; tardyThreshold: number;
  latitude: number | null; longitude: number | null; locationLabel: string;
}
export interface AttendanceRecord {
  id: string; studentId: string; name: string; studentNumber: string | null;
  required: boolean; eligibilityReason: string; status: AttendanceStatus | null;
  source: string; verification: AttendanceVerification; markedAt: string | null; revision: number;
  presentUntil: string;
  approvedArrangement: boolean;
}
export interface AttendanceRequest {
  id: string; recordId: string; studentId: string; name: string; submittedAt: string;
  reason: string | null; state: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'SUPERSEDED';
  verification: AttendanceVerification; revision: number; decisionReason: string | null;
  bulkEligible: boolean; approvedArrangement: boolean;
}
export interface AttendanceSession {
  id: string; title: string; instructions: string; mode: AttendanceMode;
  state: 'OPEN' | 'CLOSED' | 'CANCELLED'; opensAt: string; closesAt: string;
  presentUntil: string; timezone: string; sessionDate: string; requiresLocation: boolean;
  radius: number; liveCodeEnabled: boolean; records: AttendanceRecord[]; requests: AttendanceRequest[];
  legalHold: boolean;
}
export interface AttendanceSummary {
  studentId: string; name: string; present: number; tardy: number; absent: number; excused: number;
  absenceStreak: number; tardyStreak: number; pending: number;
}
export interface AttendanceOverview {
  asOf: string; course: { id: string; title: string; instituteCode: string; archived: boolean };
  enabled: boolean; phase: number; role: 'STUDENT' | 'MANAGER' | 'HELPER';
  policy: AttendancePolicy; settings: AttendanceSettings; sessions: AttendanceSession[];
  page: number; hasMore: boolean; summaries: AttendanceSummary[];
  students: Array<{ id: string; name: string; approvedArrangement: boolean }>;
  helpers: Array<{ id: string; userId: string; name: string }>;
  staff: Array<{ id: string; name: string }>;
}
export interface CreateAttendanceSession {
  title: string; instructions?: string; mode: AttendanceMode; durationMinutes: number;
  presentMinutes?: number; qrGraceSeconds?: number; liveCodeEnabled?: boolean;
  requiresLocation?: boolean; latitude?: number; longitude?: number; radius?: number;
}
export interface AttendanceLocation {
  latitude: number; longitude: number; accuracy: number; timestamp: number; mocked?: boolean;
}
export type AttendanceMutation =
  | { action: 'CREATE_SESSION'; input: CreateAttendanceSession }
  | { action: 'CHECK_IN'; sessionId: string; token?: string; code?: string; challenge?: string; location?: AttendanceLocation }
  | { action: 'REQUEST'; sessionId: string; reason?: string; challenge?: string; location?: AttendanceLocation }
  | { action: 'END' | 'CANCEL' | 'REGENERATE'; sessionId: string }
  | { action: 'MARK'; sessionId: string; recordId: string; status: AttendanceStatus; reason: string; revision: number }
  | { action: 'ADD_STUDENT'; sessionId: string; studentId: string; reason: string }
  | { action: 'DECIDE'; sessionId: string; requestId: string; revision: number; accept: boolean; status?: AttendanceStatus; reason?: string }
  | { action: 'ACCEPT_ALL'; sessionId: string; requests: Array<{ id: string; revision: number }>; acknowledgeUnverified: boolean }
  | { action: 'SETTINGS'; settings: AttendanceSettings }
  | { action: 'POLICY'; policy: AttendancePolicy }
  | { action: 'ARRANGEMENT'; studentId: string; enabled: boolean }
  | { action: 'GRANT'; userId: string }
  | { action: 'REVOKE'; grantId: string }
  | { action: 'HOLD'; sessionId: string; enabled: boolean; reason: string };
export interface AttendanceMutationResult { message: string; status?: AttendanceStatus; skipped?: number }
export interface AttendanceCode { token: string | null; qrImage: string | null; code: string | null; expiresAt: string; serverTime: string }
