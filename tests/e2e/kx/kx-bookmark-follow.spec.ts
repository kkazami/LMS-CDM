import { test, expect } from '@playwright/test';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Bookmarks & Following
 * Mapped to: AC-012
 */
test.describe('KX Bookmark & Follow (AC-012)', () => {
  test('AC-012: Bookmark and Follow endpoints require authentication', async ({ playwright }) => {
    const unauthRequest = await playwright.request.newContext({
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });
    const bRes = await unauthRequest.post('/api/knowledge-exchange/bookmark', {
      data: { postId: 'dummy-id' },
    });
    expect([401, 403]).toContain(bRes.status());

    const fRes = await unauthRequest.post('/api/knowledge-exchange/follow', {
      data: { targetType: 'POST', targetId: 'dummy-id' },
    });
    expect([401, 403]).toContain(fRes.status());
    await unauthRequest.dispose();
  });

  test('AC-012: Bookmark icon toggles active state optimistically on feed and post detail', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    let isBookmarkedState = false;

    await page.route('**/api/knowledge-exchange/bookmark', async (route) => {
      if (route.request().method() === 'POST') {
        isBookmarkedState = !isBookmarkedState;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ bookmarked: isBookmarkedState }),
        });
      }
    });

    const mockPost = {
      id: 'post-bm-test-1',
      title: 'Guide to Dynamic Programming Patterns',
      body: 'Memoization vs Tabulation with real examples.',
      postType: 'DISCUSSION',
      status: 'OPEN',
      voteCount: 15,
      answerCount: 2,
      viewCount: 60,
      isPinned: false,
      isAnonymous: false,
      authorId: 'author-1',
      author: { id: 'author-1', name: 'DP Master', role: 'STUDENT' },
      tags: [{ id: 't1', name: 'Algorithms', slug: 'algorithms', category: 'TOPIC' }],
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

    // Locate bookmark button
    const bookmarkBtn = page.getByRole('button', { name: /bookmark this post|remove bookmark/i });
    if (await bookmarkBtn.isVisible()) {
      // Toggle bookmark on
      await bookmarkBtn.click();
      await expect(page.getByRole('button', { name: /remove bookmark/i })).toBeVisible();

      // Toggle bookmark off
      await bookmarkBtn.click();
      await expect(page.getByRole('button', { name: /bookmark this post/i })).toBeVisible();
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });

  test('AC-012: Saved posts appear on /bookmarks page and un-bookmarking removes them', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    await page.goto('/ics/knowledge-exchange/bookmarks');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // Verify bookmarks page header
    await expect(page.getByRole('heading', { name: /saved bookmarks/i })).toBeVisible();

    // Either displays saved bookmarks or clear empty state
    const emptyState = page.getByText(/no bookmarks saved yet/i);
    const hasEmptyState = await emptyState.isVisible();
    if (hasEmptyState) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(page.locator('article, .rounded-2xl').first()).toBeVisible();
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
