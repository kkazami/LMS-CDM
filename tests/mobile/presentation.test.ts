import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectMobilePresentation, icsPresentation, icsTextInk } from '../../apps/mobile/src/lib/mobile-presentation';
import { getInstituteTheme } from '../../apps/mobile/src/lib/theme';

const session = (institute = 'ics', role = 'STUDENT') => ({
  isAuthenticated: true, isLoading: false, token: 'synthetic-session',
  user: { id: 'synthetic-user', role, institute: { code: institute } },
});

test('presentation requires an authenticated ICS identity, enabled flag, and matching role subtree', () => {
  assert.equal(selectMobilePresentation(session(), 'student', true), 'ics');
  for (const role of ['PROFESSOR', 'TEACHER']) assert.equal(selectMobilePresentation(session('ics', role), 'teacher', true), 'ics');
  for (const institute of ['ibe', 'ite', '', 'unknown']) assert.equal(selectMobilePresentation(session(institute), 'student', true), 'default');
  for (const role of ['ADMIN', 'PARENT', 'OTHER', '']) {
    for (const subtree of ['student', 'teacher'] as const) assert.equal(selectMobilePresentation(session('ics', role), subtree, true), 'default');
  }
  assert.equal(selectMobilePresentation(session(' ICS ', ' student '), 'student', true), 'ics');
  assert.equal(selectMobilePresentation(session(), 'teacher', true), 'default');
  assert.equal(selectMobilePresentation(session('ics', 'PROFESSOR'), 'student', true), 'default');
  assert.equal(selectMobilePresentation(session(), 'student', false), 'default');
});

test('logout, expiry, hydration, and account switching cannot reuse the previous presentation', () => {
  const signedOut = { ...session(), isAuthenticated: false, token: null, user: null };
  const transitions = [session(), signedOut, session('ibe'), signedOut, session('ite'), signedOut, session('ics', 'PROFESSOR')];
  assert.deepEqual(transitions.map(s => selectMobilePresentation(s, 'student', true)), ['ics', 'default', 'default', 'default', 'default', 'default', 'default']);
  assert.equal(selectMobilePresentation({ ...session(), isLoading: true }, 'student', true), 'default');
  assert.equal(selectMobilePresentation({ ...session(), token: null }, 'student', true), 'default');
  // Background verification and offline status do not alter existing authenticated access.
  assert.equal(selectMobilePresentation({ ...session(), isSessionVerified: false } as ReturnType<typeof session>, 'student', true), 'ics');
});

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
test('ICS text, accent, and status colors pass AA on their actual light and dark surfaces', () => {
  for (const dark of [false, true]) {
    const colors = getInstituteTheme('ics', dark).colors;
    for (const surface of [colors.background, colors.card, colors.cardSecondary]) {
      for (const ink of [colors.text, colors.textSecondary, colors.textMuted, icsPresentation.accent[dark ? 'dark' : 'light']]) {
        assert.ok(contrast(ink, surface) >= 4.5, `${ink} on ${surface}`);
      }
    }
    for (const status of ['success', 'warning', 'danger', 'info'] as const) assert.ok(contrast(colors[status], colors[`${status}Bg`]) >= 4.5, `${status}, dark=${dark}`);
  }
});

test('live primary-colored text resolves to accessible ink without changing fills or other colors', () => {
  assert.equal(icsTextInk('#FF7517', false), '#B84400');
  assert.equal(icsTextInk('#FF8A3D', true), '#FFAE79');
  assert.equal(icsTextInk('#FFFFFF', false), undefined);
  assert.equal(icsTextInk('#0F172A', true), undefined);
  assert.equal(icsTextInk(undefined, false), undefined);
  assert.equal(icsTextInk({ semantic: true }, false), undefined);
});
