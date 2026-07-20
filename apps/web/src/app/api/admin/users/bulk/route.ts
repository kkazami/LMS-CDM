/**
 * Admin Bulk User Creation API
 *
 * POST /api/admin/users/bulk — Create multiple users in a single transaction
 */

import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import {
  requireAdmin,
  createAuditLog,
  getClientIp,
} from '@/lib/rbac';
import {
  normalizeRole,
  DEFAULT_ROLE_PERMISSIONS,
  AUDIT_ACTIONS,
} from '@/lib/admin-types';

interface BulkUserInput {
  name: string;
  email: string;
  uniqueId?: string;
  role?: string;
}

interface BulkResult {
  email: string;
  success: boolean;
  error?: string;
  userId?: string;
  temporaryPassword?: string;
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const { users, instituteCode } = body as {
      users?: BulkUserInput[];
      instituteCode?: string;
    };

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { message: 'A non-empty users array is required.' },
        { status: 400 }
      );
    }

    if (users.length > 500) {
      return NextResponse.json(
        { message: 'Maximum 500 users per bulk import.' },
        { status: 400 }
      );
    }

    if (!instituteCode) {
      return NextResponse.json(
        { message: 'instituteCode is required.' },
        { status: 400 }
      );
    }

    // Resolve institute
    const institute = await db.institute.findUnique({
      where: { code: instituteCode },
    });
    if (!institute) {
      return NextResponse.json(
        { message: 'Institute not found.' },
        { status: 404 }
      );
    }

    // Fetch existing emails for duplicate detection
    const emailList = users.map((u) => u.email?.toLowerCase()).filter(Boolean);
    const existingUsers = await db.user.findMany({
      where: { email: { in: emailList } },
      select: { email: true },
    });
    const existingEmails = new Set(existingUsers.map((u) => u.email));

    // Check for duplicates within the batch itself
    const seenEmails = new Set<string>();
    const results: BulkResult[] = [];
    const validUsers: Array<{
      name: string;
      email: string;
      uniqueId: string;
      role: string;
      password: string;
      hashedPassword: string;
      permissions: string;
    }> = [];

    for (const user of users) {
      const email = user.email?.toLowerCase()?.trim();

      // Validate required fields
      if (!user.name || !email) {
        results.push({
          email: email ?? 'MISSING',
          success: false,
          error: 'Name and email are required.',
        });
        continue;
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({
          email,
          success: false,
          error: 'Invalid email format.',
        });
        continue;
      }

      // Check DB duplicates
      if (existingEmails.has(email)) {
        results.push({
          email,
          success: false,
          error: 'Email already exists in the system.',
        });
        continue;
      }

      // Check batch duplicates
      if (seenEmails.has(email)) {
        results.push({
          email,
          success: false,
          error: 'Duplicate email within this batch.',
        });
        continue;
      }

      seenEmails.add(email);

      const normalizedRole = user.role ? normalizeRole(user.role) : 'STUDENT';
      const dbRole = normalizedRole === 'INSTRUCTOR' ? 'PROFESSOR' : normalizedRole;
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[normalizedRole];
      const rawPassword =
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);
      const hashedPassword = await hash(rawPassword, 10);

      validUsers.push({
        name: user.name.trim(),
        email,
        uniqueId: user.uniqueId?.trim() ?? '',
        role: dbRole,
        password: rawPassword,
        hashedPassword,
        permissions: JSON.stringify(defaultPerms),
      });
    }

    // Batch create in a transaction
    if (validUsers.length > 0) {
      const created = await db.$transaction(
        validUsers.map((u) =>
          db.user.create({
            data: {
              name: u.name,
              email: u.email,
              password: u.hashedPassword,
              uniqueId: u.uniqueId,
              role: u.role,
              isActive: true,
              permissions: u.permissions,
              instituteId: institute.id,
            },
            select: { id: true, email: true },
          })
        )
      );

      for (let i = 0; i < created.length; i++) {
        results.push({
          email: created[i].email,
          success: true,
          userId: created[i].id,
          temporaryPassword: validUsers[i].password,
        });
      }
    }

    // Audit log
    await createAuditLog({
      adminId: session.user.id,
      targetId: session.user.id, // Bulk action targets self as context
      action: AUDIT_ACTIONS.BULK_IMPORT,
      ipAddress: getClientIp(request),
      metadata: {
        totalRequested: users.length,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length,
        instituteCode,
      },
    });

    return NextResponse.json({
      message: `Processed ${users.length} users.`,
      summary: {
        total: users.length,
        created: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      results,
    });
  } catch (err) {
    const error = err as { status?: number; message?: string };
    console.error('ADMIN_BULK_CREATE_ERROR', err);
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}
