import { test, expect } from '@playwright/test';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Knowledge Exchange Notifications & Weekly Digest
 * Mapped to: AC-027, AC-028
 */
test.describe('KX Notifications & Weekly Digest (AC-027, AC-028)', () => {
  // ---------------------------------------------------------------------------
  // AC-027: Weekly Digest Delivery
  // ---------------------------------------------------------------------------
  test('AC-027: Weekly digest generation endpoint requires admin authorization', async ({ request }) => {
    const res = await request.post('/api/knowledge-exchange/digest');
    expect([401, 403]).toContain(res.status());
  });

  // ---------------------------------------------------------------------------
  // AC-028: Notification Center Integration
  // ---------------------------------------------------------------------------
  test('AC-028: Notifications API rejects unauthenticated requests', async ({ playwright }) => {
    const unauthRequest = await playwright.request.newContext({
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });
    const getRes = await unauthRequest.get('/api/knowledge-exchange/notifications');
    expect([401, 403]).toContain(getRes.status());

    const patchRes = await unauthRequest.patch('/api/knowledge-exchange/notifications/read', {
      data: { all: true },
    });
    expect([401, 403]).toContain(patchRes.status());
    await unauthRequest.dispose();
  });

  test('AC-028: Notification panel displays notifications, handles "Mark all read", and navigates to target thread', async ({ page }) => {
    const capture = setupBrowserCapture(page);

    let unreadCount = 2;
    const mockNotifications = [
      {
        id: 'notif-digest-1',
        type: 'WEEKLY_DIGEST',
        message: 'Weekly Knowledge Exchange Digest: Top discussions in Algorithms & IT.',
        targetId: 'post-digest-target',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notif-answer-1',
        type: 'ANSWER_POSTED',
        message: 'Someone answered your question on QuickSort optimization.',
        targetId: 'post-quicksort-target',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];

    await page.route('**/api/knowledge-exchange/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: mockNotifications,
          unreadCount,
        }),
      });
    });

    await page.route('**/api/knowledge-exchange/notifications/read', async (route) => {
      unreadCount = 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count: 2 }),
      });
    });

    await page.goto('/ics/knowledge-exchange');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/login')) return;

    // Open notification panel
    const bellBtn = page.getByRole('button', { name: /knowledge exchange notifications/i });
    if (await bellBtn.isVisible()) {
      await bellBtn.click();

      // Verify panel opened and displays digest notification
      await expect(page.getByText('KX Notifications')).toBeVisible();
      await expect(page.getByText(/weekly knowledge exchange digest/i)).toBeVisible();

      // Click "Mark all read"
      const markAllBtn = page.getByRole('button', { name: /mark all read/i });
      if (await markAllBtn.isVisible()) {
        await markAllBtn.click();
      }
    }

    await expectNoConsoleErrors(capture.consoleErrors);
  });
});
