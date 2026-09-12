/**
 * Sentry Configuration with Education Data Privacy Policy
 * - Screenshots disabled (prevents capturing student grades/scores)
 * - Breadcrumbs stripped of PII
 * - Sensitive navigation routes sanitized
 */

interface SentryBreadcrumb {
  category?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SentryEvent {
  breadcrumbs?: SentryBreadcrumb[];
  [key: string]: unknown;
}

export const sentryConfig = {
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 0.2,
  attachScreenshot: false,
  attachViewHierarchy: false,
  beforeSend(event: SentryEvent) {
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) => ({
        ...b,
        data: undefined,
      }));
    }
    return event;
  },
  beforeBreadcrumb(breadcrumb: SentryBreadcrumb) {
    if (breadcrumb.category === 'navigation') {
      const sensitiveRoutes = ['/grades', '/profile', '/users'];
      const navData = breadcrumb.data as { to?: string } | undefined;
      if (sensitiveRoutes.some((r) => navData?.to?.includes(r))) {
        return null;
      }
    }
    return breadcrumb;
  },
};
