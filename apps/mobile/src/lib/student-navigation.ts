const id = '[A-Za-z0-9_-]+';
export function studentReturnRoute(path: string, params: Record<string, unknown> = {}): string | null {
  if (!new RegExp(`^/student/(?:dashboard|courses(?:/${id}(?:/(?:assignment|materials)/${id})?)?|assignments|agenda|community|profile|alerts|grades|flashcards(?:/${id})?|assessment|codelab|practical-labs|knowledge-exchange)$`).test(path)) return null;
  const query = new URLSearchParams();
  for (const key of ['courseId', 'formId', 'assignmentId', 'postId']) {
    if (typeof params[key] === 'string' && /^[A-Za-z0-9_-]+$/.test(params[key] as string)) query.set(key, params[key] as string);
  }
  if (typeof params.tab === 'string' && ['STREAM', 'CLASSWORK', 'PEOPLE', 'GRADES'].includes(params.tab)) query.set('tab', params.tab);
  return path + (query.size ? `?${query}` : '');
}
export function restoreStudentReturn(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/student/')) return null;
  try {
    const url = new URL(value, 'https://mobile.invalid');
    return url.origin === 'https://mobile.invalid' ? studentReturnRoute(url.pathname, Object.fromEntries(url.searchParams)) : null;
  } catch { return null; }
}
export function studentNotificationRoute(link: string | null | undefined, institute: string): string | null {
  if (!link || !['ics', 'ite', 'ibe'].includes(institute) || /[\\\s%#]/.test(link)) return null;
  const prefix = `/${institute}`;
  if (!link.startsWith(prefix + '/')) return null;
  const path = link.split('?')[0];
  const form = new RegExp(`^${prefix}/courses/(${id})/classwork/forms/(${id})(?:/respond)?$`).exec(path);
  if (form && institute === 'ics') return `/student/assessment?courseId=${form[1]}&formId=${form[2]}`;
  const lab = new RegExp(`^${prefix}/courses/(${id})/labs(?:/(${id}))?$`).exec(path);
  if (lab && institute === 'ics') return `/student/practical-labs?courseId=${lab[1]}${lab[2] ? `&assignmentId=${lab[2]}` : ''}`;
  const question = new RegExp(`^${prefix}/knowledge-exchange/post/(${id})$`).exec(path);
  if (question && institute === 'ics') return `/student/knowledge-exchange?postId=${question[1]}`;
  const assignment = new RegExp(`^${prefix}/courses/(${id})/(?:classwork|assignments)/(${id})$`).exec(path);
  if (assignment) return `/student/courses/${assignment[1]}/assignment/${assignment[2]}`;
  const material = new RegExp(`^${prefix}/courses/(${id})/materials/(${id})$`).exec(path);
  if (material) return `/student/courses/${material[1]}/materials/${material[2]}`;
  const course = new RegExp(`^${prefix}/courses/(${id})(?:/(?:classwork|grades|stream))?$`).exec(path);
  if (course) return `/student/courses/${course[1]}${path.endsWith('/grades') ? '?tab=GRADES' : path.endsWith('/stream') ? '?tab=STREAM' : ''}`;
  if (path === `${prefix}/activities/codelab` && institute === 'ics') return '/student/codelab';
  if (path === `${prefix}/knowledge-exchange` && institute === 'ics') return '/student/knowledge-exchange';
  if (path === `${prefix}/grades`) return '/student/grades';
  if (path === `${prefix}/announcements`) return '/student/announcements';
  if (path === `${prefix}/calendar`) return '/student/agenda';
  if (path === `${prefix}/courses`) return '/student/courses';
  if (path === `${prefix}/profile`) return '/student/profile';
  if (path === `${prefix}/students`) return '/student/dashboard';
  if (path === `${prefix}/meetings` && institute === 'ite') return '/student/meetings';
  return null;
}
