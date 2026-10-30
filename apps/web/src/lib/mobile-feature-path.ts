/** Only these existing ICS workspaces may be opened by the native feature shell. */
export function mobileFeaturePath(value: string | null): string | null {
  if (!value || !value.startsWith('/ics/') || /[\\\s\x00-\x1f\x7f]/.test(value)) return null;
  const url = new URL(value, 'https://mobile.invalid');
  if (url.origin !== 'https://mobile.invalid' || url.pathname !== value.split(/[?#]/)[0]) return null;
  const segment = '[A-Za-z0-9_-]+';
  const allowed = new RegExp(`^/ics/(?:teachers|organization|manage-leaderboard|courses/archived|activities/codelab(?:/${segment}){0,2}|knowledge-exchange(?:/${segment}){0,3}|courses/${segment}/(?:labs(?:/${segment})?|classwork/forms/${segment}(?:/respond)?))$`);
  return allowed.test(url.pathname) ? url.pathname + url.search + url.hash : null;
}
