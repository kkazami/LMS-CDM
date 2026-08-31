/**
 * Sentry Configuration with Education Data Privacy Policy
 * - Screenshots disabled (prevents capturing student grades/scores)
 * - Breadcrumbs stripped of PII
 * - Sensitive navigation routes sanitized
 */
export const sentryConfig = {
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 0.2,
  attachScreenshot: false,
  attachViewHierarchy: false,
  beforeSend(event: any) {
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b: any) => ({
        ...b,
        data: undefined, // Strip raw payload data from breadcrumbs
      }));
    }
    return event;
  },
  beforeBreadcrumb(breadcrumb: any) {
    if (breadcrumb.category === 'navigation') {
      const sensitiveRoutes = ['/grades', '/profile', '/users'];
      if (sensitiveRoutes.some((r) => breadcrumb.data?.to?.includes(r))) {
        return null;
      }
    }
    return breadcrumb;
  },
};
