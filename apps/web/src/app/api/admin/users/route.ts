import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
/**
 * Admin Users API — List & Create
 *
 * GET  /api/admin/users  — Paginated user listing with search & filters
 * POST /api/admin/users  — Create a new user account
 */

import { randomBytes } from 'node:crypto';
import { administratorInstitute } from '@/lib/administrator-scope';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { hashArgonPassword, ordinaryPasswordPolicyError } from '@/lib/password-hashing';
import { passwordPilotBlocklist, passwordWritePilotEnabled } from '@/lib/password-write-pilot';
import { limitAuthenticatedOperation } from '@/lib/authenticated-rate-limits';
import { previewImport, commitImport } from '@/lib/roster/imports';
import { rosterActor, rosterError } from '@/lib/roster/policy';
import { HEADERS } from '@/lib/roster/csv';
import { db } from '@/lib/db';
import {
  requireAdmin,
  parsePermissions,
} from '@/lib/rbac';
import {
  normalizeRole,
  DEFAULT_ROLE_PERMISSIONS,
  AUDIT_ACTIONS,
  type LMSUser,
  type PaginatedResponse,
} from '@/lib/admin-types';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET admin/users/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const search = searchParams.get('search') ?? '';
    const roleFilter = searchParams.get('role') ?? '';
    const statusFilter = searchParams.get('status') ?? '';
    const instituteCode = searchParams.get('instituteCode') ?? '';

    // Build where clause
    const where: Record<string, unknown> = { instituteId: session.user.instituteId, role: { in: ['STUDENT','student','PROFESSOR','professor','INSTRUCTOR','instructor','TEACHER','teacher'] } };

    // Search across name, email, uniqueId
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { uniqueId: { contains: search } },
      ];
    }

    // Role filter — normalize and match both upper/lowercase variants
    if (roleFilter) {
      const normalized = canonicalRole(roleFilter);
      if (!['INSTRUCTOR','STUDENT'].includes(normalized)) return NextResponse.json({ message: 'Only students and instructors may be listed.' }, { status: 403 });
      if (normalized === 'INSTRUCTOR') {
        where.role = { in: ['PROFESSOR', 'professor', 'TEACHER', 'teacher', 'INSTRUCTOR', 'instructor'] };
      } else if (normalized === 'STUDENT') {
        where.role = { in: ['STUDENT', 'student'] };
      }
    }

    // Status filter
    if (statusFilter === 'active') {
      where.isActive = true;
      where.activationStatus = 'ACTIVE';
    } else if (statusFilter === 'pending') {
      where.activationStatus = 'PENDING_ACTIVATION';
    } else if (statusFilter === 'suspended') {
      where.isActive = false;
    }

    // Institute scope
    if (instituteCode) {
      where.institute = { code: instituteCode };
    }

    const [total, users] = await db.$transaction([
      db.user.count({ where }),
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          uniqueId: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
          section: true,
          activationStatus: true,
          invitationVersion: true,
          programMemberships: { where: { kind: 'STUDENT', isActive: true }, select: { program: { select: { code: true } } } },
          role: true,
          isActive: true,
          permissions: true,
          createdAt: true,
          institute: { select: { code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data: LMSUser[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      uniqueId: u.uniqueId,
      studentNumber: u.studentNumber,
      firstName: u.firstName,
      lastName: u.lastName,
      section: u.section,
      activationStatus: u.activationStatus,
      invitationVersion: u.invitationVersion,
      program: u.programMemberships[0]?.program.code ?? '',
      role: normalizeRole(u.role),
      isActive: u.isActive,
      permissions: parsePermissions(u.permissions),
      createdAt: u.createdAt.toISOString(),
      instituteCode: u.institute.code,
    }));

    const response: PaginatedResponse<LMSUser> = {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json(response);
  } catch (err) {
    const error = err as { status?: number; message?: string };
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "POST admin/users/route.ts");
  const headers = { 'Cache-Control': 'private, no-store' };
  if (ceilingDenial) {
    ceilingDenial.headers.set('Cache-Control', headers['Cache-Control']);
    return ceilingDenial;
  }

  try {
    const session = await requireAdmin();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ message: 'Invalid account details.' }, { status: 400, headers });
    }
    if (!body.role || canonicalRole(body.role) === 'STUDENT') {
      const actor = await rosterActor(request);
      const values = [body.studentNumber ?? body.student_Id ?? '', body.last_name ?? '', body.first_name ?? '', body.email ?? '', body.program ?? '', body.section ?? ''];
      const csv = HEADERS.STUDENTS.join(',') + '\r\n' + values.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
      const batch = await previewImport(actor, { type: 'STUDENTS', csv });
      if (batch.rows[0].proposedAction !== 'NEW') return NextResponse.json({ message: (batch.rows[0].issues as string[]).join(' ') || 'Student already exists.' }, { status: 400 });
      const result = await commitImport(actor, batch.id, {});
      if (result.rows[0].outcome !== 'CREATED') return NextResponse.json({ message: result.rows[0].error ?? 'Student creation failed.' }, { status: 409 });
      return NextResponse.json({ message: 'Student created pending activation. Send an invitation from Account Invitations.' }, { status: 201 });
    }

    const { name, email, uniqueId, role, instituteCode, password } = body as {
      name?: string;
      email?: string;
      uniqueId?: string;
      role?: string;
      instituteCode?: string;
      password?: string;
    };

    // Validate required fields
    if (typeof name !== 'string' || !name || typeof email !== 'string' || !email ||
        typeof instituteCode !== 'string' || !instituteCode ||
        (uniqueId != null && typeof uniqueId !== 'string')) {
      return NextResponse.json(
        { message: 'Name, email, and instituteCode are required.' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format.' },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { message: 'Email is already registered.' },
        { status: 409 }
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

    // Normalize role and get default permissions
    if (role && !['INSTRUCTOR','STUDENT'].includes(canonicalRole(role))) return NextResponse.json({ message: 'Only Super User may create Administrators.' }, { status: 403 });
    await administratorInstitute(session.user, instituteCode);
    const normalizedRole = role ? normalizeRole(role) : 'STUDENT';
    // Store as DB-compatible role string
    const dbRole = normalizedRole === 'INSTRUCTOR' ? 'PROFESSOR' : normalizedRole;
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[normalizedRole];

    if (password != null && (typeof password !== 'string' || !password.length || password.length > 1024)) {
      return NextResponse.json({ message: 'Invalid temporary password.' }, { status: 400, headers });
    }
    const pilot = passwordWritePilotEnabled(dbRole);
    const rawPassword = password ?? randomBytes(18).toString('base64url');
    if (pilot) {
      const issue = ordinaryPasswordPolicyError(rawPassword, await passwordPilotBlocklist());
      if (issue) return NextResponse.json({ message: issue }, { status: 400, headers });
    } else if (Buffer.byteLength(rawPassword, 'utf8') > 72) {
      return NextResponse.json({ message: 'Temporary passwords must be at most 72 UTF-8 bytes.' }, { status: 400, headers });
    }
    await limitAuthenticatedOperation('instructorProvisioning', session.user.id);
    const hashedPassword = pilot ? await hashArgonPassword(rawPassword) : await hash(rawPassword, 10);

    const user = await db.$transaction(async tx => {
      const created = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          uniqueId: uniqueId ?? '',
          role: dbRole,
          isActive: true,
          permissions: JSON.stringify(defaultPerms),
          instituteId: institute.id,
        },
        select: { id: true, name: true, email: true, uniqueId: true, role: true, isActive: true, permissions: true, createdAt: true },
      });
      await tx.auditLog.create({
        data: { adminId: session.user.id, targetId: created.id, action: AUDIT_ACTIONS.ACCOUNT_CREATED,
          metadata: JSON.stringify({ instituteId: institute.id, role: normalizedRole, outcome: 'CREATED' }) },
      });
      return created;
    });

    return NextResponse.json(
      {
        message: 'User created successfully.',
        user: {
          ...user,
          role: normalizeRole(user.role),
          permissions: parsePermissions(user.permissions),
          createdAt: user.createdAt.toISOString(),
        },
        temporaryPassword: password ? undefined : rawPassword,
      },
      { status: 201, headers }
    );
  } catch (err) {
    const error = err as { status?: number; message?: string; code?: string } | null;
    if (err instanceof Error && err.name === 'AccessError') {
      const response = rosterError(err);
      response.headers.set('Cache-Control', headers['Cache-Control']);
      return response;
    }
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ message: error.message }, { status: error.status, headers });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ message: 'An account with those details already exists.' }, { status: 409, headers });
    }
    return NextResponse.json(
      { message: 'Unable to create the account right now.' },
      { status: 503, headers }
    );
  }
}
