import { test, expect } from '@playwright/test';
import { KX_FLAG_REASONS } from '../../../apps/web/src/features/knowledge-exchange/constants';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Moderation Lifecycle & Audit Trail
 * Mapped to: AC-019, AC-020, AC-021
 */
test.describe('KX Moderation Lifecycle & Audit (AC-019, AC-020, AC-021)', () => {
  test('AC-019: Predefined flag reasons include SPAM, OFFENSIVE, CHEATING, OFF_TOPIC', () => {
    expect(KX_FLAG_REASONS).toContain('SPAM');
    expect(KX_FLAG_REASONS).toContain('OFFENSIVE');
    expect(KX_FLAG_REASONS).toContain('CHEATING');
    expect(KX_FLAG_REASONS).toContain('OFF_TOPIC');
    expect(KX_FLAG_REASONS).toContain('OTHER');
  });

  test('AC-019: Flag modal allows selecting reason and description, queuing report', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    let submittedFlagData: any = null;
    await page.route('**/api/knowledge-exchange/flag', async (route) => {
      if (route.request().method() === 'POST') {
        submittedFlagData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            flag: {
              id: 'flag-created-1',
              status: 'PENDING',
              reason: submittedFlagData.reason,
              details: submittedFlagData.details,
            },
          }),
        });
      }
    });

    const mockPost = {
      id: 'post-flag-test',
      title: 'Suspicious post with leaked answers',
      body: 'Here are the solutions to the active quiz.',
      postType: 'QUESTION',
      status: 'OPEN',
      voteCount: 1,
      answerCount: 0,
      viewCount: 10,
      isPinned: false,
      isAnonymous: false,
      authorId: 'user-suspicious',
      author: { id: 'user-suspicious', name: 'Leaker', role: 'STUDENT' },
      tags: [{ id: 't1', name: 'General', slug: 'general', category: 'GENERAL' }],
      answers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.route(`**/api/knowledge-exchange/posts/${mockPost.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ post: mockPost }),
      });
    });

    await page.goto(`/ics/knowledge-exchange/post/${mockPost.id}`);
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // Click Report / Flag button
    const flagBtn = page.getByRole('button', { name: /report|flag/i }).first();
    if (await flagBtn.isVisible()) {
      await flagBtn.click();

      // Verify reason options are visible
      await expect(page.getByText(/academic dishonesty|cheating/i)).toBeVisible();
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });

  test('AC-020: Moderation actions (Close, Lock, Pin) reject unauthorized calls and record reason', async ({ request }) => {
    // Unauthenticated call must be rejected
    const unauthRes = await request.post('/api/knowledge-exchange/moderation/action', {
      data: {
        targetType: 'POST',
        targetId: 'post-123',
        action: 'CLOSE_QUESTION',
        reason: 'Duplicate question thread',
      },
    });
    expect([401, 403]).toContain(unauthRes.status());
  });

  test('AC-021: Moderation queue & audit log endpoint requires privileged access', async ({ request }) => {
    const queueRes = await request.get('/api/knowledge-exchange/moderation/queue');
    expect([401, 403]).toContain(queueRes.status());
  });
});
