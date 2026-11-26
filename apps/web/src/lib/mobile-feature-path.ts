/** Only these existing ICS and IBE workspaces may be opened by the native feature shell. */
export function mobileFeaturePath(value: string | null): string | null {
  if (!value || /[\\\s\x00-\x1f\x7f]/.test(value)) return null;
  const url = new URL(value, 'https://mobile.invalid');
  if (url.origin !== 'https://mobile.invalid' || url.pathname !== value.split(/[?#]/)[0]) return null;
  const segment = '[A-Za-z0-9_-]+';
  if (value.startsWith('/ics/')) {
    const allowedIcs = new RegExp(`^/ics/(?:teachers|organization|manage-leaderboard|courses/archived|activities/codelab(?:/${segment}){0,2}|activities/ohmward(?:/(?:primer|sandbox|progress|modules/${segment}|levels/${segment}|instructor(?:/students/${segment})?))?|knowledge-exchange(?:/${segment}){0,3}|courses/${segment}/(?:people|gradebook|labs(?:/${segment})?|classwork(?:/(?:forms/${segment}(?:/respond)?|${segment}))?))$`);
    return allowedIcs.test(url.pathname) ? url.pathname + url.search + url.hash : null;
  }
  if (value.startsWith('/ibe/')) {
    const allowedIbe = new RegExp(`^/ibe/(?:business-plan(?:/${segment})?|financial-statements(?:/${segment})?|hall-of-fame|learning-hub|mock-interview|wordwise|consultation|consultation-management|gradebooks|courses/archived|tasks|manage-leaderboard|teachers)$`);
    return allowedIbe.test(url.pathname) ? url.pathname + url.search + url.hash : null;
  }
  return null;
}
