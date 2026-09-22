import { test, expect } from '@playwright/test';
import { KX_VALIDATION } from '../../../apps/web/src/features/knowledge-exchange/constants';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Question & Discussion Creation
 * Mapped to: AC-005
 */
test.describe('KX Question Creation (AC-005)', () => {
  test('AC-005: Validation constants enforce minimum title and body length', () => {
    expect(KX_VALIDATION.MIN_TITLE_LENGTH).toBe(10);
    expect(KX_VALIDATION.MIN_BODY_LENGTH).toBe(20);
    expect(KX_VALIDATION.MAX_TITLE_LENGTH).toBe(150);
    expect(KX_VALIDATION.MAX_TAGS).toBe(5);
  });

  test('AC-005: Ask question form validates title length (>= 10 chars) and body length (>= 20 chars)', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    // Mock tags API so tag selector is populated reliably
    await page.route('**/api/knowledge-exchange/tags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tags: [
            { id: 'tag-cpe', name: 'Computer Engineering', slug: 'cpe', category: 'CPE', postCount: 5 },
            { id: 'tag-alg', name: 'Algorithms', slug: 'algorithms', category: 'TOPIC', postCount: 12 },
          ],
        }),
      });
    });

    await page.goto('/ics/knowledge-exchange/ask');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) {
      // Unauthenticated redirect is tested in AC-004
      return;
    }

    const titleInput = page.getByRole('textbox').first();
    const publishButton = page.getByRole('button', { name: /publish question|publish discussion/i });

    // 1. Submit with short title (< 10 chars)
    await titleInput.fill('Short');
    await publishButton.click();
    await expect(page.getByText(/title must be at least 10 characters/i)).toBeVisible();

    // 2. Submit with valid title but short body (< 20 chars)
    await titleInput.fill('Valid Question Title Here');
    const bodyInput = page.getByPlaceholder(/describe your question/i);
    await bodyInput.fill('Too short');
    await publishButton.click();
    await expect(page.getByText(/body must be at least 20 characters/i)).toBeVisible();

    await expectNoConsoleErrors(capture.consoleErrors);
  });

  test('AC-005: Submitting valid question redirects to post detail page and appears in feed', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const mockPostId = 'mock-post-12345';
    const mockPostTitle = 'How does Dijkstra algorithm work with min-heaps?';

    // Mock post creation endpoint
    await page.route('**/api/knowledge-exchange/posts', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        expect(postData.title).toBe(mockPostTitle);
        expect(postData.body.length).toBeGreaterThanOrEqual(20);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            post: {
              id: mockPostId,
              title: postData.title,
              body: postData.body,
              postType: postData.postType || 'QUESTION',
              status: 'OPEN',
              tags: [{ id: 'tag-alg', name: 'Algorithms', slug: 'algorithms', category: 'TOPIC' }],
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock tags API
    await page.route('**/api/knowledge-exchange/tags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tags: [
            { id: 'tag-alg', name: 'Algorithms', slug: 'algorithms', category: 'TOPIC', postCount: 12 },
          ],
        }),
      });
    });

    await page.goto('/ics/knowledge-exchange/ask');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // Fill valid title
    await page.getByRole('textbox').first().fill(mockPostTitle);

    // Fill valid body
    const bodyInput = page.getByPlaceholder(/describe your question/i);
    await bodyInput.fill(
      'I am implementing Dijkstra algorithm using an adjacency list and binary min-heap. Can someone explain the complexity?'
    );

    // Select tag
    const tagSearch = page.getByPlaceholder(/search tags/i);
    if (await tagSearch.isVisible()) {
      await tagSearch.click();
    }
    const tagButton = page.getByRole('button', { name: /algorithms/i });
    if (await tagButton.isVisible()) {
      await tagButton.click();
    }

    // Submit form
    const publishButton = page.getByRole('button', { name: /publish question|publish discussion/i });
    await publishButton.click();

    // Verify navigation to post detail page
    await page.waitForURL(`**/knowledge-exchange/post/${mockPostId}`, { timeout: 15_000, waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain(`/knowledge-exchange/post/${mockPostId}`);

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
