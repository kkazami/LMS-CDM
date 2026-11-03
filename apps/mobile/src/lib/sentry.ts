import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';

export const navigationMonitoring = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
  useDispatchedActionData: false,
});

export function sanitizeMonitoringEvent<T extends Sentry.Event>(event: T): T {
  delete event.user;
  delete event.request;
  delete event.extra;
  delete event.breadcrumbs;
  delete event.message;
  delete event.logentry;
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map(value => ({ ...value, value: 'Mobile application error' }));
  }
  if (event.contexts) {
    event.contexts = Object.fromEntries(Object.entries(event.contexts).filter(([key]) => ['app', 'device', 'os', 'runtime', 'trace'].includes(key)));
  }
  return event;
}

export const sentryConfig: NonNullable<Parameters<typeof Sentry.init>[0]> = {
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN && !__DEV__,
  enableNative: !isRunningInExpoGo(),
  sendDefaultPii: false,
  tracesSampleRate: 0.05,
  profilesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  enableLogs: false,
  attachScreenshot: false,
  attachViewHierarchy: false,
  integrations: [navigationMonitoring],
  beforeBreadcrumb: () => null,
  beforeSend: sanitizeMonitoringEvent,
  beforeSendTransaction: event => {
    sanitizeMonitoringEvent(event);
    event.transaction = event.transaction?.replace(/\?.*$/, '').replace(/\/[a-z0-9_-]{16,}(?=\/|$)/gi, '/:id');
    event.spans = event.spans?.map(span => ({ ...span, description: span.op, data: {} }));
    return event;
  },
};
Sentry.init(sentryConfig);
