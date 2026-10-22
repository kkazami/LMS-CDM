const POLICY_PATHS = new Set(['/terms', '/privacy', '/support']);

export function policyReturnTo(value: string | null): string {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return '/';
  const url = new URL(value, 'https://lms.invalid');
  if (url.origin !== 'https://lms.invalid' || POLICY_PATHS.has(url.pathname)) return '/';
  return url.pathname + url.search + url.hash;
}

export function policyHref(href: string, pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  const source = POLICY_PATHS.has(pathname)
    ? policyReturnTo(params.get('returnTo'))
    : pathname + (search ? `?${search}` : '') + (pathname === '/' ? '#site-footer' : pathname.endsWith('/profile') ? '#lms-policies' : '');
  const url = new URL(href, 'https://lms.invalid');
  url.searchParams.set('returnTo', source);
  return url.pathname + url.search + url.hash;
}
