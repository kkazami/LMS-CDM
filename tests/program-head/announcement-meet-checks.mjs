import assert from 'node:assert/strict';
import path from 'node:path';
import { asAccount } from './administrator-checks.mjs';

export async function announcementMeetBrowserChecks({ pageFor, base, db, accounts, check, output }) {
  const { createAnnouncement } = await import('../../apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/stream/actions.ts');
  const { googleMeetLinks } = await import('../../apps/web/src/lib/academic-structure/meeting-links.ts');
  const content = 'Meet UI fixture. ' + 'Please review the class instructions. '.repeat(8)
    + '\nhttps://meet.google.com/abc-defg-hij\nhttps://meet.google.com/lookup/class_1\nhttps://meet.google.com/abc-defg-hij';
  const expected = ['https://meet.google.com/abc-defg-hij', 'https://meet.google.com/lookup/class_1'];
  const enrollment = await db.enrollment.create({ data: { courseId: 'program-class', studentId: 'student', status: 'APPROVED' } });
  let announcement, notification, page;
  try {
    await check('announcement notifications preserve complete late Meet links after preview truncation', async () => {
      const form = new FormData();
      for (const [key, value] of Object.entries({ courseId: 'program-class', instituteCode: 'ics', content })) form.set(key, value);
      assert.equal((await asAccount(accounts.faculty, () => createAnnouncement({}, form))).message, 'success');
      announcement = await db.announcement.findFirstOrThrow({ where: { courseId: 'program-class', content } });
      notification = await db.notification.findFirstOrThrow({ where: { userId: 'student', type: 'ANNOUNCEMENT', message: { contains: 'Meet UI fixture' } } });
      assert.deepEqual(googleMeetLinks(notification.message), expected);
      await db.notification.createMany({ data: [
        { id: 'meet-ui-direct', userId: 'student', type: 'REMINDER', title: 'Meeting reminder', message: 'Join the class meeting', link: expected[0] },
        { id: 'meet-ui-plain', userId: 'student', type: 'ANNOUNCEMENT', title: 'Ordinary notice', message: 'Please submit your work.', link: '/ics/announcements' },
        { id: 'meet-ui-lookalike', userId: 'student', type: 'ANNOUNCEMENT', title: 'Untrusted destination', message: 'https://meet.google.com.example.org/abc-defg-hij', link: '/ics/announcements' },
      ] });
    });
    await check('Announcements and Notifications show working Meet buttons on desktop and mobile', async () => {
      page = await pageFor('student');
      await page.addInitScript(() => sessionStorage.setItem('gamification_daily_reward_dismissed_student', '1'));
      for (const [name, viewport] of [['desktop', { width: 1366, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
        await page.setViewportSize(viewport);
        await page.goto(base + '/ics/announcements');
        const card = page.locator('#announcement-' + announcement.id);
        const meetings = card.getByRole('link', { name: /Join Google Meet/ });
        await meetings.first().waitFor();
        assert.equal(await meetings.count(), 2, 'Repeated URLs must yield one button each');
        assert.equal(await card.getByRole('button', { name: 'Read more' }).count(), 1, 'Meet actions remain visible in the collapsed card');
        for (let i = 0; i < expected.length; i++) {
          assert.equal(await meetings.nth(i).getAttribute('href'), expected[i]);
          assert.equal(await meetings.nth(i).getAttribute('target'), '_blank');
          assert.match(await meetings.nth(i).getAttribute('rel'), /noopener/);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Announcement layout must fit the viewport');
        await page.screenshot({ path: path.join(output, 'announcements-meet-' + name + '.png'), fullPage: true });
        await page.goto(base + '/ics/students');
        await page.getByRole('button', { name: 'Notifications', exact: true }).click();
        const row = page.locator('#notification-' + notification.id);
        const join = row.getByRole('link', { name: /Join Google Meet/ });
        await join.first().waitFor();
        assert.equal(await join.count(), 2);
        assert.equal(await page.locator('#notification-meet-ui-direct').getByRole('link', { name: /Join Google Meet/ }).count(), 1);
        for (const id of ['plain', 'lookalike']) assert.equal(await page.locator('#notification-meet-ui-' + id).getByRole('link', { name: /Join Google Meet/ }).count(), 0);
        await join.first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, 'notifications-meet-' + name + '.png') });
        const currentUrl = page.url();
        const popupPromise = page.waitForEvent('popup');
        await join.first().click();
        const popup = await popupPromise;
        await popup.close();
        assert.equal(page.url(), currentUrl, 'Joining must not trigger notification-row navigation');
        await page.waitForFunction(id => !document.querySelector('#notification-' + id + ' [aria-label="Mark as read"]'), notification.id);
      }
      assert.equal((await db.notification.findUniqueOrThrow({ where: { id: notification.id } })).isRead, true);
    });
  } finally {
    await page?.context().close();
    if (notification) await db.notification.deleteMany({ where: { id: notification.id } });
    await db.notification.deleteMany({ where: { id: { in: ['meet-ui-direct', 'meet-ui-plain', 'meet-ui-lookalike'] } } });
    if (announcement) await db.announcement.delete({ where: { id: announcement.id } });
    await db.enrollment.delete({ where: { id: enrollment.id } });
  }
}
