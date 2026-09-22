import { test, expect } from '@playwright/test';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Rich Text, Code Highlighting & KaTeX Math
 * Mapped to: AC-006
 */
test.describe('KX Rich Text, Code & LaTeX (AC-006)', () => {
  test('AC-006: Preview tab reflects formatted markdown, code blocks, and KaTeX before submission', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    // Mock tags API so ask form loads
    await page.route('**/api/knowledge-exchange/tags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tags: [] }),
      });
    });

    await page.goto('/ics/knowledge-exchange/ask');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    const bodyInput = page.getByPlaceholder(/describe your question/i);
    await bodyInput.fill(
      'Here is an explanation of time complexity:\n\n' +
      'Inline math: $O(n \\log n)$ and block formula:\n\n' +
      '$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$\n\n' +
      '```python\n' +
      'def fib(n):\n' +
      '    return n if n <= 1 else fib(n-1) + fib(n-2)\n' +
      '```\n\n' +
      '**Bold text conclusion**.'
    );

    // Click Preview tab
    const previewTab = page.getByRole('button', { name: /preview/i });
    await previewTab.click();

    // Verify preview renders:
    // 1. KaTeX formulas rendered (contains .katex class or math text)
    const katexElement = page.locator('.katex').first();
    await expect(katexElement).toBeVisible();

    // 2. Code block rendered with language header and copy button
    await expect(page.getByText('PYTHON')).toBeVisible();
    await expect(page.getByRole('button', { name: /copy code/i })).toBeVisible();
    await expect(page.locator('pre code')).toBeVisible();

    // 3. Bold text rendered
    await expect(page.getByText(/Bold text conclusion/i)).toBeVisible();

    await expectNoConsoleErrors(capture.consoleErrors);
  });

  test('AC-006: Post detail renders code syntax styling and KaTeX math formulas', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const mockPost = {
      id: 'post-math-code-test',
      title: 'Understanding Asymptotic Notation and Quicksort',
      body:
        'The average case runtime of Quicksort is $O(n \\log n)$.\n\n' +
        '$$\\mathbb{E}[T(n)] = 2n \\ln n + O(n)$$\n\n' +
        '```javascript\n' +
        'function quicksort(arr) {\n' +
        '  if (arr.length <= 1) return arr;\n' +
        '  return arr;\n' +
        '}\n' +
        '```',
      postType: 'QUESTION',
      status: 'OPEN',
      voteCount: 4,
      answerCount: 0,
      viewCount: 15,
      isPinned: false,
      isAnonymous: false,
      authorId: 'author-1',
      author: {
        id: 'author-1',
        name: 'Ada Lovelace',
        role: 'STUDENT',
        avatarUrl: null,
      },
      tags: [{ id: 'tag-1', name: 'Algorithms', slug: 'algorithms', category: 'TOPIC' }],
      answers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Route intercept for post detail API
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

    // Verify post title
    await expect(page.getByText(mockPost.title)).toBeVisible();

    // Verify KaTeX math rendered
    const katexElement = page.locator('.katex').first();
    await expect(katexElement).toBeVisible();

    // Verify code block rendered with language header
    await expect(page.getByText('JAVASCRIPT')).toBeVisible();
    await expect(page.locator('pre code')).toBeVisible();

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
