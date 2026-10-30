export type IcsFeature = 'codelab' | 'knowledge-exchange' | 'practical-labs' | 'assessment' | 'create-class' | 'archives' | 'organization' | 'seasons';

export function icsFeaturePath(feature: IcsFeature, courseId?: string, assignmentId?: string, postId?: string): string | null {
  const validId = (value?: string) => typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
  if (feature === 'create-class') return '/ics/teachers?mobileAction=add-class';
  if (feature === 'archives') return '/ics/courses/archived';
  if (feature === 'organization') return '/ics/organization';
  if (feature === 'seasons') return '/ics/manage-leaderboard';
  if (feature === 'codelab') return '/ics/activities/codelab';
  if (feature === 'knowledge-exchange') return validId(postId) ? `/ics/knowledge-exchange/post/${postId}` : '/ics/knowledge-exchange';
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
