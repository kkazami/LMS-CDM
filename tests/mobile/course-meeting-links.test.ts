import assert from 'node:assert/strict';
import { test } from 'node:test';
import { googleMeetLinks } from '../../apps/mobile/src/lib/links';
import { googleMeetLinks as webMeetingLinks } from '../../apps/web/src/lib/academic-structure/meeting-links';

test('native course announcements recognize the same valid Meet destinations as web and reject lookalikes', () => {
  const valid = 'https://meet.google.com/abc-defg-hij';
  const withDigits = 'https://meet.google.com/abc-defg-h4j?authuser=1';
  assert.deepEqual(googleMeetLinks(`Join class\n${valid}.\n${valid}`), [valid]);
  assert.deepEqual(googleMeetLinks(`Join class\n${withDigits}`), [withDigits]);
  for (const content of [
    `Join class\n${valid}`,
    `Join (${valid}?authuser=1).`,
    'https://meet.google.com/lookup/synthetic-class',
    'No meeting posted',
    'http://meet.google.com/abc-defg-hij',
    'https://meet.google.com.evil.invalid/abc-defg-hij',
    'https://meet.google.com@evil.invalid/abc-defg-hij',
    'https://user:password@meet.google.com/abc-defg-hij',
    'https://meet.google.com:8443/abc-defg-hij',
    'https://meet.google.com/redirect?url=https://evil.invalid',
    'https://evil.invalid/path/meet.google.com/abc-defg-hij',
  ]) assert.deepEqual(googleMeetLinks(content), webMeetingLinks(content));
});
