import { db } from '@/lib/db';
import { AccessError, revalidateActor, type Actor } from './actor';
import { audit } from './audit';
import { academicCourse } from './dto';

const courseSelect = {
  id: true, code: true, courseCode: true, title: true, section: true, subject: true, room: true,
  instructor: { select: { id: true, name: true, role: true, instituteId: true } },
} as const;

export async function oversight(actor: Actor, institute: { id: string; code: string }, courseId?: string) {
  return db.$transaction(async tx => {
    await revalidateActor(tx, actor, ['SUPER_USER']);
    const instituteRecord = await tx.institute.findUnique({ where: { id: institute.id }, select: { id: true, code: true, name: true } });
    if (!instituteRecord) throw new AccessError(404, 'Institute not found.');
    const courses = await tx.course.findMany({
      where: { instituteId: institute.id, isArchived: false, ...(courseId ? { id: courseId } : {}) },
      select: courseSelect, orderBy: { id: 'asc' },
    });
    if (courseId && !courses.length) throw new AccessError(404, 'Course not found.');
    const schedule = courseId ? await tx.calendarEvent.findMany({
      where: { courseId, instituteId: institute.id }, select: { id: true, title: true, eventDate: true, eventType: true }, orderBy: { id: 'asc' },
    }) : [];
    const materials = courseId ? await tx.syllabusItem.findMany({
      where: { courseId, type: 'MATERIAL' }, select: { id: true, title: true, type: true, dueDate: true }, orderBy: { id: 'asc' },
    }) : [];
    const announcements = courseId ? await tx.announcement.findMany({
      where: { courseId }, select: { id: true, createdAt: true }, orderBy: { id: 'asc' },
    }) : [];
    // Read current records through the explicit metadata selects and safe DTO;
    // course changes must not depend on a separately approved dataset snapshot.
    const mapped = courses.map(course => academicCourse(course, institute.id));
    await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: actor.id, instituteId: institute.id,
      action: courseId ? 'ACADEMIC_OVERSIGHT_COURSE_VIEW' : 'ACADEMIC_OVERSIGHT_COURSE_LIST', ...(courseId ? { courseId } : {}) });
    return courseId ? { institute: instituteRecord, course: {
      ...mapped[0], schedule: schedule.map(event => ({ id: event.id, title: event.title, eventType: event.eventType, eventDate: event.eventDate.toISOString(), description: '' })),
      materials: materials.map(material => ({ id: material.id, title: material.title, type: material.type, dueDate: material.dueDate?.toISOString() ?? null, description: '' })),
      announcements: announcements.map(item => ({ id: item.id, createdAt: item.createdAt.toISOString(), content: '' })),
    } } : { institute: instituteRecord, courses: mapped };
  });
}
