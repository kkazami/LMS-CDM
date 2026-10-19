import { canonicalRole } from './capabilities';
export function displayCourseCode(course: { code: string; courseCode?: string }) {
  return course.courseCode && course.code.toUpperCase() === course.courseCode.toUpperCase() ? '' : course.code;
}
export function academicCourse(course: {
  id: string; code: string; courseCode?: string; title: string; section: string; subject: string; room: string;
  instructor: { id: string; name: string; role: string; instituteId: string } | null;
}, instituteId: string) {
  const assigned = course.instructor;
  return { id: course.id, code: displayCourseCode(course), courseCode: '', title: course.title, section: course.section,
    subject: course.subject, room: course.room, description: '', coverImage: '',
    instructor: assigned && canonicalRole(assigned.role) === 'INSTRUCTOR' && assigned.instituteId === instituteId ? { id: assigned.id, name: assigned.name } : null };
}
