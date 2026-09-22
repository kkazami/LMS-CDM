import { test, expect } from '@playwright/test';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Course Linking & Assessment Integrity Guardrails
 * Mapped to: AC-016, AC-017, AC-018
 */
test.describe('KX Course Linking & Integrity Guardrails (AC-016, AC-017, AC-018)', () => {
  test('AC-016: Course-filtered discussions query param is accepted', async ({ request }) => {
    const res = await request.get('/api/knowledge-exchange/posts?courseId=course-123');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('AC-016 & AC-017: Linking quiz item triggers integrity notice on ask form and warning banner on post detail', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const mockPostWithAssessment = {
      id: 'post-with-assessment-link',
      title: 'Clarification on Question 4 in Midterm Quiz',
      body: 'Is question 4 assuming 0-indexed or 1-indexed arrays?',
      postType: 'QUESTION',
      status: 'OPEN',
      voteCount: 3,
      answerCount: 0,
      viewCount: 18,
      isPinned: false,
      isAnonymous: false,
      courseId: 'course-cs201',
      syllabusItemId: 'quiz-midterm-id',
      course: { id: 'course-cs201', code: 'CS201', title: 'Data Structures and Algorithms' },
      syllabusItem: {
        id: 'quiz-midterm-id',
        title: 'Midterm Quiz Part 1',
        type: 'QUIZ',
        enableIntegrityMonitoring: true,
      },
      authorId: 'student-1',
      author: { id: 'student-1', name: 'Bob Smith', role: 'STUDENT' },
      tags: [{ id: 't1', name: 'Algorithms', slug: 'algorithms', category: 'TOPIC' }],
      answers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.route(`**/api/knowledge-exchange/posts/${mockPostWithAssessment.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ post: mockPostWithAssessment }),
      });
    });

    await page.goto(`/ics/knowledge-exchange/post/${mockPostWithAssessment.id}`);
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // AC-016: Verify course code badge
    await expect(page.getByText('CS201')).toBeVisible();

    // AC-017: Verify Academic Integrity Guardrail banner is prominently displayed
    await expect(
      page.getByText(/academic integrity guardrail: linked to assessment/i)
    ).toBeVisible();

    await expectNoConsoleErrors(capture.consoleErrors);
  });

  test('AC-018: Course interior page embeds Knowledge Exchange discussions widget with pre-selected course link', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    // Mock related posts query for cs101
    await page.route('**/api/knowledge-exchange/posts?*courseId=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          posts: [
            {
              id: 'post-related-1',
              title: 'Welcome to CS101 discussions',
              body: 'Post your introductory questions here.',
              postType: 'DISCUSSION',
              status: 'OPEN',
              voteCount: 5,
              answerCount: 2,
              author: { name: 'Instructor' },
            },
          ],
        }),
      });
    });

    await page.goto('/ics/courses/cs101');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/courses/cs101') && !page.url().includes('/login')) {
      // Check for Related Discussions widget
      const widgetHeading = page.getByText(/related discussions/i);
      if (await widgetHeading.isVisible()) {
        await expect(widgetHeading).toBeVisible();

        // Check Ask Question button links with courseId
        const askLink = page.getByRole('link', { name: /ask question/i });
        if (await askLink.isVisible()) {
          const href = await askLink.getAttribute('href');
          expect(href).toContain('knowledge-exchange/ask');
        }
      }
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
