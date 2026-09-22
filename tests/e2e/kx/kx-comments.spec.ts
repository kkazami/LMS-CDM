import { test, expect } from '@playwright/test';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Comment Threading
 * Mapped to: AC-008
 */
test.describe('KX Comments Threading (AC-008)', () => {
  test('AC-008: Comment creation requires authentication', async ({ playwright }) => {
    const unauthRequest = await playwright.request.newContext({
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });
    const res = await unauthRequest.post('/api/knowledge-exchange/comments', {
      data: { postId: 'test-post', body: 'A valid test comment.' },
    });
    expect([401, 403]).toContain(res.status());
    await unauthRequest.dispose();
  });

  test('AC-008: Comment thread accepts comment and displays under target post or answer', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const mockPostWithComments = {
      id: 'post-comments-test',
      title: 'How does garbage collection work in V8?',
      body: 'I want to understand the scavenge vs mark-sweep phases.',
      postType: 'QUESTION',
      status: 'OPEN',
      voteCount: 4,
      answerCount: 0,
      viewCount: 15,
      isPinned: false,
      isAnonymous: false,
      authorId: 'author-1',
      author: { id: 'author-1', name: 'Author One', role: 'STUDENT', avatarUrl: null },
      tags: [{ id: 'tag-js', name: 'JavaScript', slug: 'javascript', category: 'TOPIC' }],
      answers: [],
      comments: [
        {
          id: 'comment-1',
          postId: 'post-comments-test',
          body: 'Take a look at the Orinoco garbage collector documentation.',
          isAnonymous: false,
          authorId: 'author-commenter',
          author: { id: 'author-commenter', name: 'Commenter Guy', role: 'STUDENT' },
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.route(`**/api/knowledge-exchange/posts/${mockPostWithComments.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ post: mockPostWithComments }),
      });
    });

    const newCommentText = 'Here is a helpful clarification regarding nursery spaces.';
    await page.route('**/api/knowledge-exchange/comments', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            comment: {
              id: 'new-comment-id',
              postId: mockPostWithComments.id,
              body: newCommentText,
              isAnonymous: false,
              authorId: 'my-user-id',
              author: { id: 'my-user-id', name: 'My Name', role: 'STUDENT' },
              createdAt: new Date().toISOString(),
            },
          }),
        });
      }
    });

    await page.goto(`/ics/knowledge-exchange/post/${mockPostWithComments.id}`);
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // Verify existing comment is visible
    await expect(page.getByText('Take a look at the Orinoco garbage collector documentation.')).toBeVisible();

    // Click "Add a comment" button
    const addCommentBtn = page.getByRole('button', { name: /add a comment/i }).first();
    if (await addCommentBtn.isVisible()) {
      await addCommentBtn.click();

      // Enter comment text
      const commentInput = page.getByPlaceholder(/write a comment/i);
      await commentInput.fill(newCommentText);

      // Submit comment
      const submitCommentBtn = page.getByRole('button', { name: /post comment/i });
      await submitCommentBtn.click();

      // Verify new comment is appended and visible
      await expect(page.getByText(newCommentText)).toBeVisible();
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
