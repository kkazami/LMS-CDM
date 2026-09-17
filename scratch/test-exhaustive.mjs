import { chromium } from 'playwright';

const widths = [
  { name: 'Fold Outer (280px)', width: 280, height: 653 },
  { name: 'iPhone SE1 (320px)', width: 320, height: 568 },
  { name: 'Fold 4 Outer (344px)', width: 344, height: 882 },
  { name: 'Galaxy S8 (360px)', width: 360, height: 740 },
  { name: 'iPhone SE 2/3 (375px)', width: 375, height: 667 },
  { name: 'Pixel 4 (384px)', width: 384, height: 854 },
  { name: 'iPhone 14 (390px)', width: 390, height: 844 },
  { name: 'Pixel 7/8 (393px)', width: 393, height: 851 },
  { name: 'Pixel 7 Pro (412px)', width: 412, height: 915 },
  { name: 'iPhone 14 Plus (428px)', width: 428, height: 926 },
  { name: 'iPhone 15 Pro Max (430px)', width: 430, height: 932 },
  { name: 'Small Tablet (600px)', width: 600, height: 960 },
  { name: 'iPad Portrait (768px)', width: 768, height: 1024 },
  { name: 'Tablet 800 (800px)', width: 800, height: 1280 },
  { name: 'iPad Air (820px)', width: 820, height: 1180 },
  { name: 'iPad Pro 11 (834px)', width: 834, height: 1194 },
  { name: 'Surface Pro (912px)', width: 912, height: 1368 },
  { name: 'iPad Landscape (1024px)', width: 1024, height: 768 },
  { name: 'Desktop HD (1280px)', width: 1280, height: 800 },
  { name: 'Desktop WXGA (1366px)', width: 1366, height: 768 },
  { name: 'Desktop FHD (1920px)', width: 1920, height: 1080 }
];

async function runExhaustive() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  let failed = 0;

  for (const dev of widths) {
    const page = await browser.newPage({ viewport: { width: dev.width, height: dev.height } });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const check = async (stage) => {
      return await page.evaluate((vpW) => {
        const docScrollW = document.documentElement.scrollWidth;
        const docClientW = document.documentElement.clientWidth;
        const bodyScrollW = document.body.scrollWidth;
        const bodyClientW = document.body.clientWidth;

        const burger = document.querySelector('header button[aria-label*="menu"]');
        const signInBtns = Array.from(document.querySelectorAll('header a')).filter(a => a.textContent?.includes('Sign In'));

        let burgerCut = false;
        let burgerRect = null;
        if (burger) {
          const r = burger.getBoundingClientRect();
          burgerRect = { x: r.x, right: r.right, width: r.width };
          if (r.right > vpW || r.left < 0) burgerCut = true;
        }

        const signInResults = [];
        let signInCut = false;
        for (const btn of signInBtns) {
          const r = btn.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            signInResults.push({ text: btn.textContent?.trim(), right: r.right });
            if (r.right > vpW || r.left < 0) signInCut = true;
          }
        }

        return {
          docScrollW,
          docClientW,
          bodyScrollW,
          bodyClientW,
          burgerCut,
          burgerRect,
          signInCut,
          signInResults,
          hasOverflow: docScrollW > docClientW || bodyScrollW > bodyClientW
        };
      }, dev.width);
    };

    const initial = await check('initial');
    await page.evaluate(() => window.scrollTo(0, 180));
    await page.waitForTimeout(300);
    const scrolled = await check('scrolled');

    const devFailed = initial.burgerCut || initial.signInCut || initial.hasOverflow ||
                      scrolled.burgerCut || scrolled.signInCut || scrolled.hasOverflow;

    if (devFailed) {
      console.log(`❌ FAILED: ${dev.name}`);
      console.log('  Initial:', initial);
      console.log('  Scrolled:', scrolled);
      failed++;
    } else {
      console.log(`✅ PASSED: ${dev.name} [scrollW=${initial.docScrollW}, burgerCut=${initial.burgerCut}, signInCut=${initial.signInCut}]`);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\n========================================`);
  console.log(`RESULT: ${widths.length - failed}/${widths.length} viewports PASSED`);
  console.log(`========================================`);
  if (failed > 0) process.exit(1);
}

runExhaustive().catch(err => {
  console.error(err);
  process.exit(1);
});
