export type Role = 'ADMIN' | 'PROFESSOR' | 'TEACHER' | 'STUDENT' | 'PARENT';

export interface LoginRequest {
  email: string;
  password: string;
  instituteCode?: string;
}

export interface LoginResponse {
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
    name: string;
    email: string;
    role: string;
    institute: {
      code: string;
      name: string;
    };
  };
}

export interface RegisterRequest {
  name: string;
  email: string;
  studentNumber: string;
  password: string;
  confirmPassword: string;
  instituteCode: string;
}

export interface AuthUser {
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
