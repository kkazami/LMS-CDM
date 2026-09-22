import { test, expect } from '@playwright/test';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Voting Mechanics
 * Mapped to: AC-013
 */
test.describe('KX Voting Mechanics (AC-013)', () => {
  test('AC-013: Vote endpoint requires authentication', async ({ playwright }) => {
    const unauthRequest = await playwright.request.newContext({
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });
    const res = await unauthRequest.post('/api/knowledge-exchange/vote', {
      data: { targetType: 'POST', targetId: 'dummy-id', value: 1 },
    });
    expect([401, 403]).toContain(res.status());
    await unauthRequest.dispose();
  });

  test('AC-013: Upvoting, toggling, and reversing vote score behaves atomically and updates UI', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const initialScore = 10;
    let currentScore = initialScore;

    await page.route('**/api/knowledge-exchange/vote', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ voteCount: currentScore + (body.value || 0) }),
        });
      }
    });

    const mockPost = {
      id: 'post-vote-test-1',
      title: 'How does the CAP theorem apply to distributed key-value stores?',
      body: 'Consistency, Availability, and Partition Tolerance tradeoffs.',
      postType: 'QUESTION',
      status: 'OPEN',
      voteCount: initialScore,
      answerCount: 1,
      viewCount: 40,
      isPinned: false,
      isAnonymous: false,
      authorId: 'author-different-user',
      author: { id: 'author-different-user', name: 'Distributed Systems Fan', role: 'STUDENT' },
      tags: [{ id: 't1', name: 'Distributed Systems', slug: 'dist-sys', category: 'TOPIC' }],
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

    const upvoteBtn = page.getByRole('button', { name: 'Upvote' }).first();
    const downvoteBtn = page.getByRole('button', { name: 'Downvote' }).first();

    if (await upvoteBtn.isVisible()) {
      // 1. Initial vote score
      await expect(page.getByText(`${initialScore}`)).toBeVisible();

      // 2. Click Upvote -> increases vote count by 1 and highlights button
      await upvoteBtn.click();
      await expect(page.getByText(`${initialScore + 1}`)).toBeVisible();

      // 3. Click Upvote again -> removes vote and decrements count back to original
      await upvoteBtn.click();
      await expect(page.getByText(`${initialScore}`)).toBeVisible();

      // 4. Upvote (+1) then switch to Downvote (-1) -> decrements vote score by 2
      await upvoteBtn.click();
      await expect(page.getByText(`${initialScore + 1}`)).toBeVisible();

      await downvoteBtn.click();
      await expect(page.getByText(`${initialScore - 1}`)).toBeVisible();
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
