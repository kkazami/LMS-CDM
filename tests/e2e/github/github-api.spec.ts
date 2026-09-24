import { test, expect } from '@playwright/test';

test.describe('GitHub Integration API Security & Validation', () => {
  // Test with unauthenticated session
  test.use({ storageState: { cookies: [], origins: [] } });

  test('rejects unauthenticated requests to /api/github/auth/status', async ({ request }) => {
    const res = await request.get('/api/github/auth/status');
    expect(res.status()).toBe(401);
  });

  test('rejects unauthenticated requests to /api/github/repos/link', async ({ request }) => {
    const res = await request.post('/api/github/repos/link', {
      data: {
        owner: 'test',
        repo: 'test-repo',
      },
    });
    expect(res.status()).toBe(401);
  });

  test('rejects unauthenticated requests to /api/github/comments', async ({ request }) => {
    const res = await request.post('/api/github/comments', {
      data: {
        repoLinkId: 'link_123',
        filePath: 'src/index.ts',
        lineNumber: 10,
        body: 'test comment',
      },
    });
    expect(res.status()).toBe(401);
  });

  test('rejects unauthenticated requests to /api/github/submissions', async ({ request }) => {
    const res = await request.post('/api/github/submissions', {
      data: {
        syllabusItemId: 'item_123',
        repoLinkId: 'link_123',
        commitSha: 'sha123',
      },
    });
    expect(res.status()).toBe(401);
  });

  test('webhook rejects payloads without signature', async ({ request }) => {
    const res = await request.post('/api/github/webhooks', {
      data: { action: 'push' },
    });
    expect(res.status()).toBe(401);
  });
});
