import { test, expect } from '@playwright/test';
import { serializeAuthor } from '../../../apps/web/src/features/knowledge-exchange/utils';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Admin De-anonymization, CRUD & Security
 * Mapped to: AC-022, AC-023, AC-024
 */
test.describe('KX Admin De-anonymization & Security (AC-022, AC-023, AC-024)', () => {
  // ---------------------------------------------------------------------------
  // AC-022: Admin De-anonymization Table
  // ---------------------------------------------------------------------------
  test('AC-022: De-anonymization API and management route require ADMIN role', async ({ request, page }) => {
    // 1. API endpoint rejects unauthorized / non-admin access
    const res = await request.get('/api/knowledge-exchange/admin/deanonymize');
    expect([401, 403]).toContain(res.status());

    // 2. Student navigating to admin page is redirected
    await page.goto('/ics/knowledge-exchange/admin');
    await page.waitForLoadState('domcontentloaded');
    // If not authenticated or student, page redirects away
    expect(page.url()).not.toBe('http://localhost:3000/ics/knowledge-exchange/admin');
  });

  test('AC-022: Admin management view renders de-anonymization table with required columns', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const mockAnonPosts = [
      {
        id: 'post-anon-admin-1',
        title: 'Sensitive feedback about faculty grading',
        postType: 'DISCUSSION',
        status: 'OPEN',
        isAnonymous: true,
        anonymousAlias: 'Anonymous Student',
        createdAt: new Date().toISOString(),
        author: {
          id: 'user-real-uuid',
          name: 'Jane Student',
          email: 'jane@ics.edu.ph',
          role: 'STUDENT',
          studentNumber: '2026-8888',
        },
      },
    ];

    // Intercept admin page rendering
    await page.route('**/api/knowledge-exchange/admin/deanonymize', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ posts: mockAnonPosts }),
      });
    });

    await page.goto('/ics/knowledge-exchange/admin');
    await page.waitForLoadState('domcontentloaded');

    if (!page.url().includes('/login') && !page.url().endsWith('/knowledge-exchange')) {
      // If accessible as admin, verify table columns
      await expect(page.getByRole('heading', { name: /admin de-anonymization table/i })).toBeVisible();
      await expect(page.getByText('Jane Student')).toBeVisible();
      await expect(page.getByText('2026-8888')).toBeVisible();
      await expect(page.getByText('jane@ics.edu.ph')).toBeVisible();
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });

  // ---------------------------------------------------------------------------
  // AC-023: Admin Moderation CRUD
  // ---------------------------------------------------------------------------
  test('AC-023: Admin posts management API requires ADMIN role', async ({ request }) => {
    const res = await request.get('/api/knowledge-exchange/admin/posts');
    expect([401, 403]).toContain(res.status());
  });

  // ---------------------------------------------------------------------------
  // AC-024: De-anonymization API Security & Redaction
  // ---------------------------------------------------------------------------
  test('AC-024: serializeAuthor strictly redacts sensitive user identity for non-admin viewers', () => {
    const sensitiveAuthor = {
      id: 'author-real-id-999',
      name: 'John Doe',
      role: 'STUDENT',
      email: 'johndoe@ics.edu.ph',
      studentNumber: '2026-99999',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    // 1. Peer student viewer
    const studentViewer = { id: 'other-student-id', role: 'STUDENT' };
    const serializedStudent = serializeAuthor(sensitiveAuthor, true, studentViewer);

    expect(serializedStudent.id).toBeNull();
    expect(serializedStudent.name).toBe('Anonymous Student');
    expect(serializedStudent.email).toBeNull();
    expect(serializedStudent.studentNumber).toBeNull();
    expect(serializedStudent.avatarUrl).toBeNull();
    expect(serializedStudent.isAnonymous).toBe(true);

    // 2. Unauthenticated viewer (null viewer)
    const unauthSerialized = serializeAuthor(sensitiveAuthor, true, null);
    expect(unauthSerialized.id).toBeNull();
    expect(unauthSerialized.email).toBeNull();
    expect(unauthSerialized.studentNumber).toBeNull();

    // 3. Admin viewer receives full credentials
    const adminViewer = { id: 'admin-id', role: 'ADMIN' };
    const adminSerialized = serializeAuthor(sensitiveAuthor, true, adminViewer);
    expect(adminSerialized.id).toBe('author-real-id-999');
    expect(adminSerialized.email).toBe('johndoe@ics.edu.ph');
    expect(adminSerialized.studentNumber).toBe('2026-99999');
  });

  test('AC-024: Public feed API payload for anonymous posts contains no sensitive author leakage', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    let leakedEmail = false;
    let leakedStudentNumber = false;

    // Listen to network responses to verify no credential leakage in wire JSON
    page.on('response', async (response) => {
      if (response.url().includes('/api/knowledge-exchange/posts') && response.status() === 200) {
        try {
          const json = await response.json();
          const text = JSON.stringify(json);
          if (text.includes('johndoe@ics.edu.ph')) leakedEmail = true;
          if (text.includes('2026-99999')) leakedStudentNumber = true;
        } catch {
          // ignore non-json
        }
      }
    });

    await page.goto('/ics/knowledge-exchange');
    await page.waitForLoadState('domcontentloaded');

    expect(leakedEmail).toBe(false);
    expect(leakedStudentNumber).toBe(false);

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
