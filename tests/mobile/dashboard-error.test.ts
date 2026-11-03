import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiClientError } from '../../packages/api-client/src/index';
import { dashboardErrorMessage } from '../../apps/mobile/src/lib/dashboard-error';

test('missing dashboard services are distinguished from connectivity and session failures', () => {
  assert.match(dashboardErrorMessage(new ApiClientError(404, 'HTTP 404'), false), /service needs an update/);
  assert.match(dashboardErrorMessage(new ApiClientError(500, 'Internal error'), false), /LMS server/);
  assert.match(dashboardErrorMessage(new ApiClientError(401, 'Unauthorized'), false), /sign in again/);
  assert.match(dashboardErrorMessage(new ApiClientError(403, 'Forbidden'), false), /signed-in account/);
  assert.equal(dashboardErrorMessage(new ApiClientError(0, 'Cannot reach the LMS server.'), false), 'Cannot reach the LMS server.');
  assert.match(dashboardErrorMessage(new ApiClientError(404, 'HTTP 404'), true), /Showing your last loaded dashboard/);
  assert.doesNotMatch(dashboardErrorMessage(new Error('Private diagnostic'), false), /Private diagnostic/);
});
