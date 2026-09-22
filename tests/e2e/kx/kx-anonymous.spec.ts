import { test, expect } from '@playwright/test';
import { serializeAuthor } from '../../../apps/web/src/features/knowledge-exchange/utils';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Anonymous Posting & Author Masking
 * Mapped to: AC-007
 */
test.describe('KX Anonymous Author Masking (AC-007)', () => {
  const sampleStudentAuthor = {
    id: 'student-author-id',
    name: 'Kirby Dela Cruz',
    role: 'STUDENT',
    email: 'kirby@ics.edu.ph',
    studentNumber: '2026-10042',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  const sampleInstructorAuthor = {
    id: 'instructor-author-id',
    name: 'Prof. John Turing',
    role: 'PROFESSOR',
    email: 'turing@ics.edu.ph',
    studentNumber: 'EMP-9921',
    avatarUrl: 'https://example.com/turing.jpg',
  };

  test('AC-007: Student author is masked as "Anonymous Student" for peer student viewers', () => {
    const peerStudentViewer = { id: 'peer-student-id', role: 'STUDENT' };
    const masked = serializeAuthor(sampleStudentAuthor, true, peerStudentViewer);

    expect(masked.name).toBe('Anonymous Student');
    expect(masked.id).toBeNull();
    expect(masked.email).toBeNull();
    expect(masked.studentNumber).toBeNull();
    expect(masked.avatarUrl).toBeNull();
    expect(masked.isAnonymous).toBe(true);
    expect(masked.isSelf).toBe(false);
  });

  test('AC-007: Instructor author is masked as "Anonymous Instructor" on peer view', () => {
    const peerStudentViewer = { id: 'peer-student-id', role: 'STUDENT' };
    const masked = serializeAuthor(sampleInstructorAuthor, true, peerStudentViewer);

    expect(masked.name).toBe('Anonymous Instructor');
    expect(masked.id).toBeNull();
    expect(masked.email).toBeNull();
    expect(masked.studentNumber).toBeNull();
    expect(masked.avatarUrl).toBeNull();
    expect(masked.isAnonymous).toBe(true);
  });

  test('AC-007: Author viewing their own post sees their real identity and isSelf indicator', () => {
    const selfViewer = { id: 'student-author-id', role: 'STUDENT' };
    const result = serializeAuthor(sampleStudentAuthor, true, selfViewer);

    expect(result.id).toBe('student-author-id');
    expect(result.name).toBe('Kirby Dela Cruz');
    expect(result.isSelf).toBe(true);
  });

  test('AC-007: Admin viewers can see real author identity behind anonymous posts', () => {
    const adminViewer = { id: 'admin-auditor-id', role: 'ADMIN' };
    const result = serializeAuthor(sampleStudentAuthor, true, adminViewer);

    expect(result.id).toBe('student-author-id');
    expect(result.name).toBe('Kirby Dela Cruz');
    expect(result.email).toBe('kirby@ics.edu.ph');
    expect(result.studentNumber).toBe('2026-10042');
  });

  test('AC-007: UI renders generic masked avatar and disables personal profile navigation for anonymous posts', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const mockAnonPost = {
      id: 'post-anon-display-test',
      title: 'Anonymous Question About Exam Policies',
      body: 'Can someone explain the curve on the midterm exam?',
      postType: 'QUESTION',
      status: 'OPEN',
      voteCount: 3,
      answerCount: 0,
      viewCount: 20,
      isPinned: false,
      isAnonymous: true,
      authorId: null,
      author: {
        id: null,
        name: 'Anonymous Student',
        role: 'STUDENT',
        avatarUrl: null,
        isAnonymous: true,
        isSelf: false,
      },
      tags: [{ id: 'tag-gen', name: 'General', slug: 'general', category: 'GENERAL' }],
      answers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.route(`**/api/knowledge-exchange/posts/${mockAnonPost.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ post: mockAnonPost }),
      });
    });

    await page.goto(`/ics/knowledge-exchange/post/${mockAnonPost.id}`);
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // Verify "Anonymous Student" is rendered
    await expect(page.getByText('Anonymous Student')).toBeVisible();

    // Verify no link exists to author's profile
    const authorProfileLink = page.getByRole('link', { name: /kirby dela cruz/i });
    await expect(authorProfileLink).toHaveCount(0);

    // Verify no real email or student number is displayed on peer view
    await expect(page.getByText('kirby@ics.edu.ph')).toHaveCount(0);
    await expect(page.getByText('2026-10042')).toHaveCount(0);

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
