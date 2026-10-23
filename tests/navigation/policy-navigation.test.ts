import { test } from 'node:test';
import assert from 'node:assert/strict';
import { policyHref, policyReturnTo } from '../../apps/web/src/lib/policy-navigation';
import { getInstituteName } from '../../packages/types/src/institute';

test('footer policies return to the landing footer, including after opening another policy or support', () => {
  const terms = new URL(policyHref('/terms', '/', ''), 'https://lms.invalid');
  assert.equal(terms.searchParams.get('returnTo'), '/#site-footer');
  const privacy = new URL(policyHref('/privacy#your-rights', terms.pathname, terms.search.slice(1)), terms.origin);
  assert.equal(privacy.searchParams.get('returnTo'), '/#site-footer');
  assert.equal(privacy.hash, '#your-rights');
  const support = new URL(policyHref('/support', privacy.pathname, privacy.search.slice(1)), terms.origin);
  assert.equal(support.searchParams.get('returnTo'), '/#site-footer');
});

test('profile policies return to the profile policy section and login keeps its institute and mode', () => {
  const profile = new URL(policyHref('/privacy', '/ics/profile', ''), 'https://lms.invalid');
  assert.equal(profile.searchParams.get('returnTo'), '/ics/profile#lms-policies');
  const login = new URL(policyHref('/terms', '/login', 'institute=ibe&desktop=admin'), profile.origin);
  assert.equal(login.searchParams.get('returnTo'), '/login?institute=ibe&desktop=admin');
});

test('direct policy visits and unsafe return destinations fall back to the landing page', () => {
  for (const value of [null, '', '//foreign.invalid', 'https://foreign.invalid', 'javascript:alert(1)', '/\\foreign.invalid', '/terms', '/privacy?returnTo=/terms', '/support', '/\n/foreign.invalid']) {
    assert.equal(policyReturnTo(value), '/');
  }
  assert.equal(policyReturnTo('/ite/students?tab=courses#upcoming'), '/ite/students?tab=courses#upcoming');
});

test('ICS and ITE use the canonical names even with older stored data; other institute names remain intact', () => {
  assert.equal(getInstituteName('ics', 'Legacy institute name'), 'Institute of Computing Studies');
  assert.equal(getInstituteName('ICS', ''), 'Institute of Computing Studies');
  assert.equal(getInstituteName('ite', 'Institute of Technology and Engineering'), 'Institute of Teacher Education');
  assert.equal(getInstituteName('ITE', ''), 'Institute of Teacher Education');
  assert.equal(getInstituteName(undefined, 'Institute of Technology and Engineering'), 'Institute of Teacher Education');
  assert.equal(getInstituteName('ibe', 'Institute of Business and Entrepreneurship'), 'Institute of Business and Entrepreneurship');
  assert.equal(getInstituteName('custom', 'Custom Institute'), 'Custom Institute');
});
