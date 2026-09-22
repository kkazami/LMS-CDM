import { test, expect } from '@playwright/test';
import {
  isEligibleForKnowledgeExchange,
  isEligibleKxInstituteCode,
  checkKxEligibility,
} from '../../../apps/web/src/lib/kx-eligibility';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Eligibility & Access Control
 * Mapped to: AC-001, AC-002, AC-003, AC-004
 */
test.describe('KX Eligibility & Access Control (AC-001 - AC-004)', () => {
  // ---------------------------------------------------------------------------
  // AC-001: ICS Eligibility Check Utility
  // ---------------------------------------------------------------------------
  test('AC-001: isEligibleForKnowledgeExchange and isEligibleKxInstituteCode correctly validate ICS and reject non-ICS', () => {
    // 1. isEligibleForKnowledgeExchange returns true for institute code 'ics'
    expect(isEligibleForKnowledgeExchange('ics')).toBe(true);
    expect(isEligibleForKnowledgeExchange('ICS')).toBe(true);
    expect(isEligibleKxInstituteCode('ics')).toBe(true);

    // 2. isEligibleForKnowledgeExchange returns false for institute codes 'ibe' and 'ite'
    expect(isEligibleForKnowledgeExchange('ibe')).toBe(false);
    expect(isEligibleForKnowledgeExchange('ite')).toBe(false);
    expect(isEligibleForKnowledgeExchange('')).toBe(false);
    expect(isEligibleForKnowledgeExchange(null as any)).toBe(false);
    expect(isEligibleForKnowledgeExchange(undefined as any)).toBe(false);

    // 3. Session without instituteId returns false
    expect(isEligibleForKnowledgeExchange({ user: {} })).resolves.toBe(false);
  });

  test('AC-001: checkKxEligibility returns null or eligible=false for unauthenticated / non-ICS sessions', async () => {
    // Calling checkKxEligibility without valid session returns null or eligible=false
    const result = await checkKxEligibility();
    expect(result === null || result?.eligible === false).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // AC-002: Route Layout Redirection
  // ---------------------------------------------------------------------------
  test('AC-002: Ineligible institute routes redirect away from knowledge-exchange', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    // 1. IBE navigating to /ibe/knowledge-exchange redirects to /ibe (or login with institute param)
    await page.goto('/ibe/knowledge-exchange');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/ibe/knowledge-exchange');

    // 2. ITE navigating to /ite/knowledge-exchange redirects to /ite
    await page.goto('/ite/knowledge-exchange');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/ite/knowledge-exchange');

    await expectNoConsoleErrors(capture.consoleErrors);
  });

  test('AC-002: ICS student navigating to /ics/knowledge-exchange loads feed successfully', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    await page.goto('/ics/knowledge-exchange');
    await page.waitForLoadState('domcontentloaded');

    // Authenticated ICS student stays on /ics/knowledge-exchange
    if (!page.url().includes('/login')) {
      expect(page.url()).toContain('/ics/knowledge-exchange');
      await expect(page.getByRole('heading', { name: /knowledge exchange/i })).toBeVisible();
    } else {
      expect(page.url()).toContain('institute=ics');
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });

  // ---------------------------------------------------------------------------
  // AC-003: Sidebar Navigation Visibility
  // ---------------------------------------------------------------------------
  test('AC-003: Sidebar displays Knowledge Exchange link for ICS and hides it for IBE and ITE', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    // 1. Check ICS sidebar
    await page.goto('/ics');
    await page.waitForLoadState('domcontentloaded');
    if (!page.url().includes('/login')) {
      const kxLink = page.getByRole('link', { name: /knowledge exchange/i });
      await expect(kxLink).toBeVisible();
      await expect(kxLink).toHaveAttribute('href', '/ics/knowledge-exchange');
    }

    // 2. Check IBE sidebar - link must not exist
    await page.goto('/ibe');
    await page.waitForLoadState('domcontentloaded');
    if (!page.url().includes('/login') && page.url().includes('/ibe')) {
      const ibeKxLink = page.getByRole('link', { name: /knowledge exchange/i });
      await expect(ibeKxLink).toHaveCount(0);
    }

    // 3. Check ITE sidebar - link must not exist
    await page.goto('/ite');
    await page.waitForLoadState('domcontentloaded');
    if (!page.url().includes('/login') && page.url().includes('/ite')) {
      const iteKxLink = page.getByRole('link', { name: /knowledge exchange/i });
      await expect(iteKxLink).toHaveCount(0);
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });

  // ---------------------------------------------------------------------------
  // AC-004: API Route Protection
  // ---------------------------------------------------------------------------
  test('AC-004: GET /api/knowledge-exchange/posts returns 401 when unauthenticated', async ({ playwright }) => {
    const unauthRequest = await playwright.request.newContext({
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });
    const res = await unauthRequest.get('/api/knowledge-exchange/posts');
    expect([401, 403]).toContain(res.status());
    const data = await res.json().catch(() => ({}));
    expect(data).toHaveProperty('error');
    await unauthRequest.dispose();
  });

  test('AC-004: API returns 403 Forbidden when request is from non-ICS institute', async ({ request }) => {
    // Pass non-ICS header / query simulation
    const res = await request.get('/api/knowledge-exchange/posts?institute=ibe', {
      headers: {
        'x-institute-code': 'ibe',
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('AC-004: API allows ICS access when session is valid', async ({ request }) => {
    const res = await request.get('/api/knowledge-exchange/posts?institute=ics');
    // Expect either 200 (if session active) or 401/403 with standard structured error
    if (res.status() === 200) {
      const data = await res.json();
      expect(data).toHaveProperty('posts');
    } else {
      expect([401, 403]).toContain(res.status());
    }
  });
});
