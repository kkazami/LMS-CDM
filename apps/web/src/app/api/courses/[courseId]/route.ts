import { requireCourseAccess } from '@/lib/course-access';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { visibleSyllabusForms } from '@/lib/forms/visibility';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { requireOwnedUpload } from '@/lib/private-upload';
import { revalidatePath } from 'next/cache';

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/** Wide web cover and optional mobile thumbnail are independently editable. */
export async function PATCH(request: Request, context: RouteContext) {
  const denial = await denyLegacyApi(request, 'PATCH courses/[courseId]/route.ts');
  if (denial) return denial;
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    const { courseId } = await context.params;
    const course = await requireCourseAccess(session.user, courseId, true);
    let input: unknown;
    try { input = await request.json(); } catch { throw new AccessError(400, 'Invalid request.'); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AccessError(400, 'Invalid request.');
    const entries = Object.entries(input);
    if (!entries.length || entries.some(([key]) => key !== 'coverImage' && key !== 'mobileCoverImage')) throw new AccessError(400, 'Choose a web cover or mobile thumbnail.');
    const data: { coverImage?: string; mobileCoverImage?: string | null } = {};
    const result: { coverImage?: string | null; mobileCoverImage?: string | null } = {};
    for (const [field, image] of entries) {
      const preset = typeof image === 'string' && (field === 'coverImage'
        ? /^\/course-banners\/(programming|database|networking|webdev|cybersecurity)\.svg$/.test(image)
        : /^\/course-banners\/mobile\/(programming|database|networking|webdev|cybersecurity)\.svg$/.test(image));
      const asset = typeof image === 'string' && /^\/api\/assets\/[a-zA-Z0-9-]{1,100}$/.test(image);
      if (image !== null && !preset && !asset) throw new AccessError(400, 'Choose a class banner or upload an image.');
      if (asset) {
        await requireOwnedUpload(db, session.user, image as string);
        const file = await db.privateAsset.findUnique({ where: { id: (image as string).split('/').pop()! }, select: { mimeType: true } });
        if (!file || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.mimeType)) throw new AccessError(400, 'The class cover must be an image.');
      }
      if (field === 'coverImage') data.coverImage = (image as string | null) ?? '';
      else data.mobileCoverImage = image as string | null;
      result[field as keyof typeof result] = image as string | null;
    }
    await db.course.update({ where: { id: courseId }, data });
    for (const page of ['teachers', 'students', 'courses']) revalidatePath(`/${course.institute.code.toLowerCase()}/${page}`);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error('COURSE_COVER_API_ERROR', error);
    return NextResponse.json({ message: 'Unable to update the class cover.' }, { status: 500 });
  }
}

export async function GET(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "GET courses/[courseId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;
    await requireCourseAccess(session.user, courseId);

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        code: true,
        courseCode: true,
        title: true,
        description: true,
        room: true,
        section: true,
        subject: true,
        coverImage: true,
        mobileCoverImage: true,
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        institute: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        syllabusItems: {
          where: session.user.role.toUpperCase() === 'STUDENT' ? await visibleSyllabusForms(undefined, session.user.id) : {},
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            maxPoints: true,
            dueDate: true,
            orderIndex: true,
          },
          orderBy: { orderIndex: 'asc' },
          take: 20,
        },
        announcements: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!course) {
      return NextResponse.json({ message: 'Course not found.' }, { status: 404 });
    }

    const pendingWorkCount = course.instructor?.id === session.user.id
      ? await db.studentSubmission.count({ where: { syllabusItem: { courseId }, status: 'SUBMITTED', grade: null } })
      : undefined;

    return NextResponse.json(
      {
        course: {
          ...course,
          courseCode: course.courseCode || course.code,
          pendingWorkCount,
          instructorName: course.instructor?.name || 'Instructor',
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error('COURSE_DETAIL_API_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch course details.' }, { status: 500 });
  }
}
