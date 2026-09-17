import { chromium } from 'playwright';

async function testCutoffs() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  const devices = [
    { name: 'iPhone SE (320px)', width: 320, height: 568 },
    { name: 'Galaxy S8 (360px)', width: 360, height: 740 },
    { name: 'iPhone SE 3 (375px)', width: 375, height: 667 },
    { name: 'iPhone 14 (390px)', width: 390, height: 844 },
    { name: 'Pixel 7 (412px)', width: 412, height: 915 },
    { name: 'iPad Portrait (768px)', width: 768, height: 1024 },
    { name: 'Tablet (800px)', width: 800, height: 1280 },
    { name: 'iPad Air (820px)', width: 820, height: 1180 },
    { name: 'iPad Landscape (1024px)', width: 1024, height: 768 }
  ];

  for (const dev of devices) {
    const page = await browser.newPage({ viewport: { width: dev.width, height: dev.height } });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Initial check
    const initialCheck = await page.evaluate((vpWidth) => {
      const burger = document.querySelector('header button[aria-label*="menu"]');
      const signInBtns = Array.from(document.querySelectorAll('header a')).filter(a => a.textContent?.includes('Sign In'));
      
      const res = {
        burgerRect: burger ? {
          x: burger.getBoundingClientRect().x,
          width: burger.getBoundingClientRect().width,
          right: burger.getBoundingClientRect().right,
          isCutOff: burger.getBoundingClientRect().right > vpWidth
        } : null,
        signInRects: signInBtns.map(b => ({
          text: b.textContent?.trim(),
          x: b.getBoundingClientRect().x,
          width: b.getBoundingClientRect().width,
          right: b.getBoundingClientRect().right,
          isCutOff: b.getBoundingClientRect().right > vpWidth
        })),
        docScrollWidth: document.documentElement.scrollWidth,
        docClientWidth: document.documentElement.clientWidth
      };
      return res;
    }, dev.width);

    // Scroll check
    await page.evaluate(() => window.scrollTo(0, 150));
    await page.waitForTimeout(400);

    const scrolledCheck = await page.evaluate((vpWidth) => {
      const burger = document.querySelector('header button[aria-label*="menu"]');
      const signInBtns = Array.from(document.querySelectorAll('header a')).filter(a => a.textContent?.includes('Sign In'));
      
      const res = {
        burgerRect: burger ? {
          x: burger.getBoundingClientRect().x,
          width: burger.getBoundingClientRect().width,
          right: burger.getBoundingClientRect().right,
          isCutOff: burger.getBoundingClientRect().right > vpWidth
        } : null,
        signInRects: signInBtns.map(b => ({
          text: b.textContent?.trim(),
          x: b.getBoundingClientRect().x,
          width: b.getBoundingClientRect().width,
          right: b.getBoundingClientRect().right,
          isCutOff: b.getBoundingClientRect().right > vpWidth
        }))
      };
      return res;
    }, dev.width);

    console.log(`\n=== ${dev.name} (width: ${dev.width}px) ===`);
    console.log(`Doc scrollWidth: ${initialCheck.docScrollWidth}, clientWidth: ${initialCheck.docClientWidth}`);
    if (initialCheck.burgerRect) {
      console.log(`Burger button right: ${initialCheck.burgerRect.right.toFixed(1)}px (cutoff: ${initialCheck.burgerRect.isCutOff})`);
    }
    if (initialCheck.signInRects.length > 0) {
      for (const s of initialCheck.signInRects) {
        console.log(`Sign In button "${s.text}" right: ${s.right.toFixed(1)}px (cutoff: ${s.isCutOff})`);
      }
    }
    if (scrolledCheck.burgerRect) {
      console.log(`[Scrolled] Burger button right: ${scrolledCheck.burgerRect.right.toFixed(1)}px (cutoff: ${scrolledCheck.burgerRect.isCutOff})`);
    }
    if (scrolledCheck.signInRects.length > 0) {
      for (const s of scrolledCheck.signInRects) {
        console.log(`[Scrolled] Sign In button "${s.text}" right: ${s.right.toFixed(1)}px (cutoff: ${s.isCutOff})`);
      }
    }

    await page.close();
  }

  await browser.close();
}

testCutoffs().catch(console.error);
