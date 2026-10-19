import assert from 'node:assert/strict';
import path from 'node:path';

export async function mobileNavigationBrowserChecks({ pageFor, base, check, output }) {
  await check('mobile More shows eligible CodeLab and Knowledge Exchange shortcuts without clipping', async () => {
    for (const [role, institute, dashboard, width, dark] of [
      ['student', 'ics', 'students', 320, false],
      ['student', 'ics', 'students', 390, true],
      ['faculty', 'ics', 'teachers', 390, false],
      ['admin', 'ics', 'admin', 390, false],
      ['foreign', 'ibe', 'teachers', 390, false],
    ]) {
      const page = await pageFor(role);
      try {
        await page.setViewportSize({ width, height: 844 });
        await page.addInitScript(({ dark }) => {
          localStorage.setItem('cdm-theme-mode', dark ? 'dark' : 'light');
          sessionStorage.setItem('gamification_daily_reward_dismissed_student', '1');
        }, { dark });
        await page.goto(`${base}/${institute}/${dashboard}`);
        await page.getByRole('button', { name: 'Open more navigation options' }).click();
        const sheet = page.getByRole('dialog', { name: 'More navigation options' });
        await sheet.waitFor();
        const codeLab = sheet.locator(`a[href='/${institute}/activities/codelab']`);
        const exchange = sheet.getByRole('link', { name: /^Knowledge Exchange\b/ });
        assert.equal(await codeLab.count(), institute === 'ics' && role !== 'admin' ? 1 : 0);
        assert.equal(await exchange.count(), institute === 'ics' ? 1 : 0);
        assert.equal(await page.getByRole('button', { name: 'Open menu', exact: true }).count(), 0, 'Mobile navigation uses a single More menu');
        if (role === 'faculty') {
          for (const label of ['Archived Classes', 'Organizational Chart', 'Student Analytics', 'Manage Leaderboard', 'CodeLab Analytics']) assert.equal(await sheet.getByRole('link', { name: new RegExp('^' + label) }).count(), 1, label);
        }
        if (role === 'admin') {
          for (const label of ['Faculty & Program Heads', 'Backup & Recovery', 'Security Tools', 'Help']) assert.equal(await sheet.getByRole('link', { name: new RegExp('^' + label) }).count(), 1, label);
        }
        await page.keyboard.press('Shift+Tab');
        assert.ok(await sheet.getByRole('button', { name: 'Sign Out / Switch Account' }).evaluate(element => document.activeElement === element), 'Focus stays within More');
        await page.keyboard.press('Tab');
        assert.ok(await sheet.getByRole('button', { name: 'Close menu' }).evaluate(element => document.activeElement === element));
        for (const link of await sheet.getByRole('link').all()) {
          const bounds = await link.boundingBox();
          assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44, 'Links retain usable touch targets');
        }
        if (institute === 'ics' && role !== 'admin') {
          const title = exchange.getByText('Knowledge Exchange', { exact: true });
          assert.ok(await title.evaluate(element => element.scrollWidth <= element.clientWidth), 'Full Knowledge Exchange label must fit');
          assert.equal(await codeLab.getAttribute('href'), '/ics/activities/codelab');
          assert.equal(await exchange.getAttribute('href'), '/ics/knowledge-exchange');
        }
        if (role === 'student' && width === 320) {
          for (const label of ['Leaderboards', 'Achievements']) assert.ok(await sheet.getByText(label, { exact: true }).evaluate(element => element.getBoundingClientRect().height <= parseFloat(getComputedStyle(element).lineHeight) * 1.1), 'Existing labels must not wrap a trailing letter');
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: path.join(output, `mobile-more-${role}-${width}.png`) });
        await sheet.getByRole('button', { name: 'Close menu' }).click();
        assert.equal(await sheet.count(), 0);
        assert.ok(await page.getByRole('button', { name: 'Open more navigation options' }).evaluate(element => document.activeElement === element));
      } finally { await page.context().close(); }
    }
  });
  await check('student mobile shortcuts open their real destinations and close More', async () => {
    const page = await pageFor('student');
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript(() => sessionStorage.setItem('gamification_daily_reward_dismissed_student', '1'));
      for (const [label, destination] of [['CodeLab', '/ics/activities/codelab'], ['Knowledge Exchange', '/ics/knowledge-exchange']]) {
        await page.goto(base + '/ics/students');
        await page.getByRole('button', { name: 'Open more navigation options' }).click();
        const sheet = page.getByRole('dialog', { name: 'More navigation options' });
        await sheet.getByRole('link', { name: new RegExp('^' + label + '\\b') }).click();
        await page.waitForURL(base + destination);
        assert.equal(await sheet.count(), 0);
      }
    } finally { await page.context().close(); }
  });
}
