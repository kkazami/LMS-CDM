export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  studentNumber?: string | null;
  isActive: boolean;
  instituteId: string;
  createdAt: string;
}
