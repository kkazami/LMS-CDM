// Student and class setup belongs to Account Management in both navigation layouts.
export function getNavigationPath(pathname: string, instituteCode: string) {
  const onboarding = `/${instituteCode}/admin/onboarding`;
  return pathname === onboarding || pathname.startsWith(onboarding + "/")
    ? pathname.replace(onboarding, `/${instituteCode}/accounts`)
    : pathname;
}
