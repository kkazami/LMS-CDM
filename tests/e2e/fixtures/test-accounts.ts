/**
 * Test account credentials for E2E testing.
 *
 * NEVER use production credentials.
 * Values are loaded from environment variables with fallback to
 * the seeded development accounts from prisma/seed.ts.
 *
 * For CI or custom environments, set:
 *   E2E_STUDENT_EMAIL, E2E_STUDENT_PASSWORD
 *   E2E_INSTRUCTOR_EMAIL, E2E_INSTRUCTOR_PASSWORD
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 *   E2E_INSTITUTE (default: ics)
 */

export const TEST_INSTITUTE = process.env.E2E_INSTITUTE || 'ics';

export const TEST_ACCOUNTS = {
  student: {
    email: process.env.E2E_STUDENT_EMAIL || 'student@ics.edu.ph',
    password: process.env.E2E_STUDENT_PASSWORD || 'password123',
    role: 'STUDENT' as const,
    institute: TEST_INSTITUTE,
  },
  instructor: {
    email: process.env.E2E_INSTRUCTOR_EMAIL || 'instructor@ics.edu.ph',
    password: process.env.E2E_INSTRUCTOR_PASSWORD || 'password123',
    role: 'PROFESSOR' as const,
    institute: TEST_INSTITUTE,
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@ics.edu.ph',
    password: process.env.E2E_ADMIN_PASSWORD || 'password123',
    role: 'ADMIN' as const,
    institute: TEST_INSTITUTE,
  },
} as const;

export type TestRole = keyof typeof TEST_ACCOUNTS;
