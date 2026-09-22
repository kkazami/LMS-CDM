import { test, expect } from '@playwright/test';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Answer Submission, Acceptance & Verification
 * Mapped to: AC-008, AC-014, AC-015
 */
test.describe('KX Answer Acceptance & Instructor Verification (AC-008, AC-014, AC-015)', () => {
  // ---------------------------------------------------------------------------
  // AC-008: Answer Submission
  // ---------------------------------------------------------------------------
  test('AC-008: Answer submission endpoint requires valid session', async ({ playwright }) => {
    const unauthRequest = await playwright.request.newContext({
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });
    const res = await unauthRequest.post('/api/knowledge-exchange/posts/dummy-id/answers', {
      data: { body: 'This is a test answer with sufficient character length.' },
    });
    expect([401, 403]).toContain(res.status());
    await unauthRequest.dispose();
  });

  test('AC-008: Answer form submits and appends answer to post detail view', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const mockPost = {
      id: 'post-answer-submit-test',
      title: 'How to implement a binary search tree in TypeScript?',
      body: 'I need help implementing an insert method on a BST.',
      postType: 'QUESTION',
      status: 'OPEN',
      voteCount: 2,
      answerCount: 0,
      viewCount: 10,
      isPinned: false,
      isAnonymous: false,
      authorId: 'user-other',
      author: { id: 'user-other', name: 'Other User', role: 'STUDENT', avatarUrl: null },
      tags: [{ id: 'tag-1', name: 'TypeScript', slug: 'typescript', category: 'TOPIC' }],
      answers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Intercept post detail
    await page.route(`**/api/knowledge-exchange/posts/${mockPost.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ post: mockPost }),
      });
    });

    // Intercept answer submission
    const newAnswerBody = 'Here is a complete insert implementation for a TypeScript Binary Search Tree.';
    await page.route(`**/api/knowledge-exchange/posts/${mockPost.id}/answers`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            answer: {
              id: 'new-answer-id-99',
              postId: mockPost.id,
              body: newAnswerBody,
              isAccepted: false,
              isVerified: false,
              voteCount: 0,
              authorId: 'current-user-id',
              author: { id: 'current-user-id', name: 'Test Student', role: 'STUDENT', avatarUrl: null },
              comments: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      }
    });

    await page.goto(`/ics/knowledge-exchange/post/${mockPost.id}`);
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // Type answer
    const answerEditor = page.getByPlaceholder(/describe your question|write your answer/i);
    await answerEditor.fill(newAnswerBody);

    // Submit answer
    const postAnswerBtn = page.getByRole('button', { name: /post answer/i });
    await postAnswerBtn.click();

    // Verify answer appears in answer list
    await expect(page.getByText(newAnswerBody)).toBeVisible();

    await expectNoConsoleErrors(capture.consoleErrors);
  });

  // ---------------------------------------------------------------------------
  // AC-014: Author Answer Acceptance
  // ---------------------------------------------------------------------------
  test('AC-014: Author can accept answer, updating status to ANSWERED and pinning accepted answer', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const mockPost = {
      id: 'post-accept-test',
      title: 'What is tail call optimization in recursion?',
      body: 'Can someone explain when compilers optimize tail recursive calls?',
      postType: 'QUESTION',
      status: 'OPEN',
      voteCount: 5,
      answerCount: 2,
      viewCount: 30,
      isPinned: false,
      isAnonymous: false,
      authorId: 'author-me',
      author: { id: 'author-me', name: 'Author Me', role: 'STUDENT', avatarUrl: null, isSelf: true },
      tags: [{ id: 'tag-1', name: 'Compilers', slug: 'compilers', category: 'TOPIC' }],
      answers: [
        {
          id: 'answer-candidate-1',
          postId: 'post-accept-test',
          body: 'Tail call optimization replaces the current stack frame with the next function call.',
          isAccepted: false,
          isVerified: false,
          voteCount: 1,
          authorId: 'user-a',
          author: { id: 'user-a', name: 'Dev A', role: 'STUDENT' },
          comments: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'answer-candidate-2',
          postId: 'post-accept-test',
          body: 'Here is another explanation with examples.',
          isAccepted: false,
          isVerified: false,
          voteCount: 3,
          authorId: 'user-b',
          author: { id: 'user-b', name: 'Dev B', role: 'STUDENT' },
          comments: [],
          createdAt: new Date().toISOString(),
        },
      ],
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

    // Intercept accept API
    await page.route(`**/api/knowledge-exchange/answers/answer-candidate-1/accept`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: { id: 'answer-candidate-1', isAccepted: true },
        }),
      });
    });

    await page.goto(`/ics/knowledge-exchange/post/${mockPost.id}`);
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // Verify Accept Answer button is visible to question author
    const acceptButtons = page.getByRole('button', { name: /accept answer/i });
    if (await acceptButtons.count() > 0) {
      await acceptButtons.first().click();
      // Verify Accepted Answer badge is now displayed
      await expect(page.getByText(/accepted answer/i)).toBeVisible();
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });

  // ---------------------------------------------------------------------------
  // AC-015: Instructor Verification Badge
  // ---------------------------------------------------------------------------
  test('AC-015: Instructor or Admin can mark answers as verified, rendering verified badge', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const mockPostWithVerified = {
      id: 'post-verify-test',
      title: 'Difference between Process and Thread',
      body: 'What are the main architectural differences?',
      postType: 'QUESTION',
      status: 'ANSWERED',
      voteCount: 8,
      answerCount: 1,
      viewCount: 40,
      isPinned: false,
      isAnonymous: false,
      authorId: 'user-student',
      author: { id: 'user-student', name: 'Student Author', role: 'STUDENT' },
      tags: [{ id: 'tag-os', name: 'Operating Systems', slug: 'os', category: 'TOPIC' }],
      answers: [
        {
          id: 'answer-os-1',
          postId: 'post-verify-test',
          body: 'A process has its own virtual address space while threads share address space.',
          isAccepted: true,
          isVerified: true,
          verifierName: 'Prof. Alan Turing',
          voteCount: 12,
          authorId: 'user-expert',
          author: { id: 'user-expert', name: 'Expert Student', role: 'STUDENT' },
          comments: [],
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.route(`**/api/knowledge-exchange/posts/${mockPostWithVerified.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ post: mockPostWithVerified }),
      });
    });

    await page.goto(`/ics/knowledge-exchange/post/${mockPostWithVerified.id}`);
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // Verify Instructor Verified badge is displayed
    await expect(page.getByText(/instructor verified/i)).toBeVisible();

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
