export type Role = 'ADMIN' | 'PROFESSOR' | 'TEACHER' | 'STUDENT' | 'PARENT';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
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
  instituteId: string;
  institute: {
    code: string;
    name: string;
  };
}
