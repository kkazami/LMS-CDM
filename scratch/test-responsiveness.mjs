import { chromium } from 'playwright';

const viewports = [
  { name: 'Mobile 320 (iPhone SE1)', width: 320, height: 568 },
  { name: 'Mobile 360 (Galaxy S8/A)', width: 360, height: 740 },
  { name: 'Mobile 375 (iPhone SE2/3)', width: 375, height: 667 },
  { name: 'Mobile 390 (iPhone 14/15)', width: 390, height: 844 },
  { name: 'Tablet 768 (iPad Portrait)', width: 768, height: 1024 },
  { name: 'Tablet 820 (iPad Air)', width: 820, height: 1180 },
  { name: 'Tablet 1024 (iPad Landscape)', width: 1024, height: 768 },
  { name: 'Desktop 1280', width: 1280, height: 800 }
];

async function runAudit() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
  } catch {
    try {
      browser = await chromium.launch({ headless: true, channel: 'msedge' });
    } catch {
      browser = await chromium.launch({ headless: true });
    }
  }
  const results = [];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const docWidth = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth
    }));

    const hasHorizontalScroll = docWidth.scrollWidth > docWidth.clientWidth;

    // Check header and interactive elements bounds
    const elementsCheck = await page.evaluate((vpWidth) => {
      const header = document.querySelector('header');
      const nav = document.querySelector('nav');
      const buttons = Array.from(document.querySelectorAll('header button, header a'));

      const issues = [];
      if (nav) {
        const navRect = nav.getBoundingClientRect();
        if (navRect.right > vpWidth) {
          issues.push(`Nav element overflows viewport: right=${navRect.right.toFixed(1)}px > vpWidth=${vpWidth}px`);
        }
        if (navRect.left < 0) {
          issues.push(`Nav element extends offscreen left: left=${navRect.left.toFixed(1)}px`);
        }
      }

      for (const el of buttons) {
        const rect = el.getBoundingClientRect();
        // check if visible
        if (rect.width > 0 && rect.height > 0) {
          const text = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
          if (rect.right > vpWidth) {
            issues.push(`Button/link "${text}" overflows right: right=${rect.right.toFixed(1)}px > vpWidth=${vpWidth}px`);
          }
          if (rect.left < 0) {
            issues.push(`Button/link "${text}" overflows left: left=${rect.left.toFixed(1)}px < 0`);
          }
        }
      }

      return {
        issues,
        buttonCount: buttons.length
      };
    }, vp.width);

    // Also check scrolled state
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(400);

    const scrolledCheck = await page.evaluate((vpWidth) => {
      const nav = document.querySelector('nav');
      const buttons = Array.from(document.querySelectorAll('header button, header a'));
      const issues = [];
      if (nav) {
        const navRect = nav.getBoundingClientRect();
        if (navRect.right > vpWidth) {
          issues.push(`Scrolled Nav overflows: right=${navRect.right.toFixed(1)}px > vpWidth=${vpWidth}px`);
        }
      }
      for (const el of buttons) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const text = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
          if (rect.right > vpWidth) {
            issues.push(`Scrolled Button "${text}" overflows: right=${rect.right.toFixed(1)}px > vpWidth=${vpWidth}px`);
          }
        }
      }
      return issues;
    }, vp.width);

    results.push({
      viewport: vp.name,
      width: vp.width,
      hasHorizontalScroll,
      docWidth,
      initialIssues: elementsCheck.issues,
      scrolledIssues: scrolledCheck
    });

    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
