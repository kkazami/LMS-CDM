export type Role = 'ADMIN' | 'PROFESSOR' | 'TEACHER' | 'STUDENT' | 'PARENT';

export type LoginRequest = ({ email: string; identifier?: never } | { identifier: string; email?: never }) & {
  password: string;
  instituteCode?: string;
  acceptedPolicies: boolean;
};

export interface LoginResponse {
  mobileCapabilities?: { studentReceipts: number; hybridDrafts: number; agenda: number };
  message: string;
  token: string;
  expiresAt?: string;
  rewardReceipt?: {
    rewarded: boolean;
    streak: number;
    expEarned: number;
  };
  user: {
    id: string;
    instituteId: string;
    name: string;
    email: string;
    role: string;
    requiresEnrollment?: boolean;
    institute: {
      code: string;
      name: string;
    };
  };
}

export interface AuthUser {
  requiresEnrollment?: boolean;
  id: string;
  name: string;
  email: string;
  role: string;
  studentNumber?: string | null;
  bio?: string | null;
  phone?: string | null;
  department?: string | null;
  yearLevel?: string | null;
  avatarUrl?: string | null;
  coverColor?: string | null;
  instituteId: string;
  institute: {
    code: string;
    name: string;
  };
}
