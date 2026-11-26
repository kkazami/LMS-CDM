export type IcsFeature = 'learning-materials' | 'codelab' | 'ohmward' | 'knowledge-exchange' | 'practical-labs' | 'assessment' | 'classwork' | 'course-tools' | 'create-class' | 'archives' | 'organization' | 'seasons';

export function icsFeaturePath(feature: IcsFeature, courseId?: string, assignmentId?: string, postId?: string, action?: string): string | null {
  const validId = (value?: string) => typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
  if (feature === 'learning-materials') return '/ics/learning-materials';
  if (feature === 'create-class') return '/ics/teachers?mobileAction=add-class';
  if (feature === 'archives') return '/ics/courses/archived';
  if (feature === 'organization') return '/ics/organization';
  if (feature === 'seasons') return '/ics/manage-leaderboard';
  if (feature === 'codelab') return '/ics/activities/codelab';
  if (feature === 'ohmward') return '/ics/activities/ohmward';
  if (feature === 'knowledge-exchange') return validId(postId) ? `/ics/knowledge-exchange/post/${postId}` : '/ics/knowledge-exchange';
  if (feature === 'course-tools') {
    return validId(courseId) && (action === 'people' || action === 'gradebook') ? `/ics/courses/${courseId}/${action}` : null;
  }
  if (feature === 'classwork') {
    if (!validId(courseId) || assignmentId !== undefined && !validId(assignmentId)) return null;
    const root = `/ics/courses/${courseId}/classwork`;
    if (action === 'form') return `${root}/forms/${assignmentId ?? 'new'}`;
    if (action === 'add') return `${root}?mobileAction=add`;
    if (action === 'edit' || action === 'delete') return assignmentId ? `${root}?mobileAction=${action}&itemId=${assignmentId}` : null;
    return assignmentId ? `${root}/${assignmentId}` : root;
  }
  if (feature === 'practical-labs' && action === 'link') return validId(courseId) && validId(assignmentId) ? `/ics/courses/${courseId}/labs?itemId=${assignmentId}` : null;
  if (feature === 'assessment') return validId(courseId) && validId(assignmentId) ? `/ics/courses/${courseId}/classwork/forms/${assignmentId}` : null;
  if (!validId(courseId) || assignmentId !== undefined && !validId(assignmentId)) return null;
  return `/ics/courses/${courseId}/labs${assignmentId ? `/${assignmentId}` : ''}`;
}

export function featureUrlIsTrusted(value: string, baseUrl: string): boolean {
  try {
    const target = new URL(value);
    return target.origin === new URL(baseUrl).origin && !target.username && !target.password;
  } catch { return false; }
}
