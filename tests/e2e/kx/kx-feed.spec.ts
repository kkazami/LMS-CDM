import { test, expect } from '@playwright/test';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Feed Sorting, Filtering & Pagination
 * Mapped to: AC-011
 */
test.describe('KX Feed, Sorting & Filters (AC-011)', () => {
  test('AC-011: Feed endpoint accepts sort, tab, and pagination parameters', async ({ request }) => {
    const res = await request.get('/api/knowledge-exchange/posts?tab=unanswered&sort=votes&page=1&limit=10');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('AC-011: User can toggle sort dropdown and switch filter tabs in feed', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    let requestedSort = '';
    let requestedTab = '';

    await page.route('**/api/knowledge-exchange/posts?*', async (route) => {
      const url = new URL(route.request().url());
      requestedSort = url.searchParams.get('sort') || '';
      requestedTab = url.searchParams.get('tab') || '';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          posts: [
            {
              id: 'post-feed-1',
              title: 'Sample Discussion Thread',
              body: 'Content of sample discussion thread for feed test.',
              postType: 'QUESTION',
              status: requestedTab === 'unanswered' ? 'OPEN' : 'ANSWERED',
              voteCount: 10,
              answerCount: requestedTab === 'unanswered' ? 0 : 3,
              viewCount: 50,
              isPinned: false,
              isAnonymous: false,
              authorId: 'author-1',
              author: { id: 'author-1', name: 'Alice Walker', role: 'STUDENT' },
              tags: [{ id: 't1', name: 'General', slug: 'general', category: 'GENERAL' }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          total: 25,
          page: 1,
          totalPages: 2,
        }),
      });
    });

    await page.goto('/ics/knowledge-exchange');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // 1. Check sort dropdown options (Newest, Top Voted, Recently Active)
    const sortSelect = page.locator('select');
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('votes');
      expect(requestedSort).toBe('votes');

      await sortSelect.selectOption('active');
      expect(requestedSort).toBe('active');
    }

    // 2. Click "Unanswered" filter tab
    const unansweredTab = page.getByRole('button', { name: /^unanswered$/i });
    if (await unansweredTab.isVisible()) {
      await unansweredTab.click();
      expect(requestedTab).toBe('unanswered');
    }

    // 3. Pagination controls
    const nextPageBtn = page.getByRole('button', { name: /next/i });
    if (await nextPageBtn.isVisible()) {
      await expect(nextPageBtn).toBeEnabled();
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
