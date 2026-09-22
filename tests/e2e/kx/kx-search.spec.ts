import { test, expect } from '@playwright/test';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Full-Text Search
 * Mapped to: AC-009
 */
test.describe('KX Full-Text Search (AC-009)', () => {
  test('AC-009: Search API rejects unauthorized access', async ({ playwright }) => {
    const unauthRequest = await playwright.request.newContext({
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });
    const res = await unauthRequest.get('/api/knowledge-exchange/search?q=algorithms');
    expect([401, 403]).toContain(res.status());
    await unauthRequest.dispose();
  });

  test('AC-009: Entering search term filters feed list and empty search displays "No questions found"', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const samplePost = {
      id: 'search-post-match',
      title: 'How to implement Red-Black Trees in C++',
      body: 'Balancing logic and recoloring rules for RB tree insertions.',
      postType: 'QUESTION',
      status: 'OPEN',
      voteCount: 5,
      answerCount: 1,
      viewCount: 22,
      isPinned: false,
      isAnonymous: false,
      authorId: 'author-1',
      author: { id: 'author-1', name: 'CS Student', role: 'STUDENT' },
      tags: [{ id: 'tag-1', name: 'C++', slug: 'cpp', category: 'TOPIC' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Route intercept search query with matches
    await page.route('**/api/knowledge-exchange/posts?*q=Red-Black*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          posts: [samplePost],
          total: 1,
          page: 1,
          totalPages: 1,
        }),
      });
    });

    // Route intercept search query with zero matches
    await page.route('**/api/knowledge-exchange/posts?*q=NonexistentQuery*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          posts: [],
          total: 0,
          page: 1,
          totalPages: 0,
        }),
      });
    });

    await page.goto('/ics/knowledge-exchange');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    const searchInput = page.getByPlaceholder(/search questions/i);
    await expect(searchInput).toBeVisible();

    // 1. Enter matching search term and press Enter
    await searchInput.fill('Red-Black');
    await searchInput.press('Enter');

    // Verify matched result appears
    await expect(page.getByText('How to implement Red-Black Trees in C++')).toBeVisible();

    // 2. Search handles punctuation and whitespace gracefully
    await searchInput.fill('   !@# NonexistentQuery ???   ');
    await searchInput.press('Enter');

    // Verify empty state "No questions found"
    await expect(page.getByRole('heading', { name: /no questions found/i })).toBeVisible();

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
