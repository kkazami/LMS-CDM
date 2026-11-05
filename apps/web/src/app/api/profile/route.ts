import { profileBanner, profilePreferences, bannerAssetId } from '@/lib/profile-banner';
import { getInstituteName } from "@lms/types";
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { evaluateProfileDepartmentUpdate } from '@/lib/ite-programs/registration';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET profile/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { institute: true },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentNumber: (user as Record<string, unknown>).studentNumber || null,
        avatarUrl: user.avatarUrl ?? null,
        bio: user.bio,
        phone: user.phone,
        department: user.department,
        yearLevel: user.yearLevel,
        coverColor: user.coverColor,
        bannerImageUrl: profileBanner(user.preferences),
        instituteId: user.instituteId,
        institute: {
          code: user.institute.code,
          name: getInstituteName(user.institute.code, user.institute.name),
        },
      },
    });
  } catch (error) {
    console.error('PROFILE_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "PUT profile/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio, phone, department, yearLevel, coverColor, bannerImageUrl } = body as {
      name?: string;
      bio?: string;
      phone?: string;
      department?: string;
      yearLevel?: string;
      coverColor?: string;
      bannerImageUrl?: string;
    };

    let departmentToPersist = department;
    if (department !== undefined) {
      const currentUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          role: true,
          department: true,
          section: true,
          institute: { select: { code: true } },
          programMemberships: {
            where: { isActive: true },
            select: {
              isActive: true,
              kind: true,
              program: { select: { code: true, name: true } },
            },
          },
          enrollments: {
            where: { status: 'APPROVED' },
            select: {
              status: true,
              course: {
                select: {
                  section: true,
                  program: { select: { code: true, name: true } },
                },
              },
            },
          },
        },
      });

      if (!currentUser) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
      }

      const deptDecision = evaluateProfileDepartmentUpdate({
        instituteCode: currentUser.institute.code,
        userRole: currentUser.role,
        currentRecord: currentUser,
        requestedDepartment: department,
      });

      if (!deptDecision.allowed) {
        return NextResponse.json(
          { message: deptDecision.message || 'Program cannot be changed.' },
          { status: deptDecision.status ?? 403 }
        );
      }
      departmentToPersist = deptDecision.departmentToPersist;
    }

    let bannerPreferences: string | undefined;
    let previousPreferences: string | undefined;
    if (bannerImageUrl !== undefined) {
      if (bannerImageUrl !== '') {
        const id = bannerAssetId(bannerImageUrl);
        if (!id) return NextResponse.json({ message: 'Choose an uploaded banner image.' }, { status: 400 });
        const asset = await db.privateAsset.findFirst({ where: { id, ownerId: session.user.id, instituteId: session.user.instituteId, scanStatus: { in: ['CLEAN', 'UNSCANNED'] }, mimeType: { in: ['image/png', 'image/jpeg', 'image/webp'] }, size: { lte: 5 * 1024 * 1024 } }, select: { id: true } });
        if (!asset) return NextResponse.json({ message: 'Choose your own PNG, JPEG or WebP image, up to 5 MB.' }, { status: 400 });
      }
      const current = await db.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { preferences: true } });
      previousPreferences = current.preferences;
      bannerPreferences = JSON.stringify({ ...profilePreferences(current.preferences), bannerImageUrl });
    }
    const updated = await db.user.update({
      where: { id: session.user.id, ...(previousPreferences !== undefined ? { preferences: previousPreferences } : {}) },
      data: {
        ...(bannerPreferences !== undefined ? { preferences: bannerPreferences } : {}),
        ...(name ? { name } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(departmentToPersist !== undefined ? { department: departmentToPersist } : {}),
        ...(yearLevel !== undefined ? { yearLevel } : {}),
        ...(coverColor !== undefined ? { coverColor } : {}),
      },
      include: { institute: true },
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        studentNumber: (updated as Record<string, unknown>).studentNumber || null,
        avatarUrl: updated.avatarUrl ?? null,
        bio: updated.bio,
        phone: updated.phone,
        department: updated.department,
        yearLevel: updated.yearLevel,
        coverColor: updated.coverColor,
        bannerImageUrl: profileBanner(updated.preferences),
        instituteId: updated.instituteId,
        institute: {
          code: updated.institute.code,
          name: getInstituteName(updated.institute.code, updated.institute.name),
        },
      },
    });
  } catch (error) {
    console.error('PROFILE_UPDATE_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
