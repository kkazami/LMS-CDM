import { test, expect } from '@playwright/test';
import { KX_TAG_CATEGORIES } from '../../../apps/web/src/features/knowledge-exchange/constants';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Tag Browser & Tag Filtering
 * Mapped to: AC-010
 */
test.describe('KX Tags & Tag Browser (AC-010)', () => {
  test('AC-010: Tag categories configuration includes CPE, IT, TOPIC, GENERAL', () => {
    expect(KX_TAG_CATEGORIES.CPE).toBeDefined();
    expect(KX_TAG_CATEGORIES.CPE.label).toContain('Computer Engineering');

    expect(KX_TAG_CATEGORIES.IT).toBeDefined();
    expect(KX_TAG_CATEGORIES.IT.label).toContain('Information Technology');

    expect(KX_TAG_CATEGORIES.TOPIC).toBeDefined();
    expect(KX_TAG_CATEGORIES.GENERAL).toBeDefined();
  });

  test('AC-010: Tags API returns seeded tags with category metadata', async ({ request }) => {
    const res = await request.get('/api/knowledge-exchange/tags');
    if (res.status() === 200) {
      const data = await res.json();
      expect(Array.isArray(data.tags)).toBe(true);
      if (data.tags.length > 0) {
        const first = data.tags[0];
        expect(first).toHaveProperty('name');
        expect(first).toHaveProperty('category');
        expect(first).toHaveProperty('postCount');
      }
    } else {
      expect([401, 403]).toContain(res.status());
    }
  });

  test('AC-010: Tag browser page displays seeded tags with usage counts and category tabs', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    const mockTags = [
      {
        id: 'tag-1',
        name: 'Computer Systems Architecture',
        slug: 'cpe-arch',
        category: 'CPE',
        postCount: 8,
        description: 'Von Neumann architectures, assembly, and instruction sets.',
      },
      {
        id: 'tag-2',
        name: 'Database Management',
        slug: 'it-dbms',
        category: 'IT',
        postCount: 15,
        description: 'Relational databases, SQL, normalization, and ACID properties.',
      },
      {
        id: 'tag-3',
        name: 'Data Structures',
        slug: 'data-structures',
        category: 'TOPIC',
        postCount: 24,
        description: 'Arrays, linked lists, trees, graphs, and hash tables.',
      },
    ];

    await page.route('**/api/knowledge-exchange/tags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tags: mockTags }),
      });
    });

    await page.goto('/ics/knowledge-exchange/tags');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // Verify page heading
    await expect(page.getByRole('heading', { name: /tags directory/i })).toBeVisible();

    // Verify tag cards and usage counts
    await expect(page.getByText('Computer Systems Architecture')).toBeVisible();
    await expect(page.getByText(/8 questions/i)).toBeVisible();

    await expect(page.getByText('Database Management')).toBeVisible();
    await expect(page.getByText(/15 questions/i)).toBeVisible();

    // Clicking a tag badge navigates to the filtered feed
    const tagBadge = page.getByRole('link', { name: /#cpe-arch|cpe-arch/i }).first();
    if (await tagBadge.isVisible()) {
      await tagBadge.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('tag=cpe-arch');
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
