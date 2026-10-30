import { ApiClientError } from '@lms/api-client';

export function dashboardErrorMessage(error: unknown, hasSavedData: boolean): string {
  let message = 'Your dashboard could not load. Please try again.';
  if (error instanceof ApiClientError) {
    if (error.status === 404 || error.status === 405 || error.status === 426) message = 'The dashboard service needs an update. Please contact your LMS administrator.';
    else if (error.status === 401) message = 'Your session has expired. Please sign in again.';
    else if (error.status === 403) message = 'This dashboard is available to ICS student and faculty accounts. Please check your signed-in account.';
    else if (error.status >= 500) message = 'The LMS server could not load your dashboard. Please try again shortly.';
    else if (error.status === 0) message = error.message;
  }
  return message + (hasSavedData ? ' Showing your last loaded dashboard.' : '');
}
