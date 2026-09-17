import { chromium } from 'playwright';

async function findOverflows() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  
  for (const width of [360, 768]) {
    console.log(`\n=================== TESTING VIEWPORT ${width}px ===================`);
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const overflowingElements = await page.evaluate((vpWidth) => {
      const all = Array.from(document.querySelectorAll('*'));
      const culprits = [];

      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > vpWidth + 1) {
          culprits.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: (el.className && typeof el.className === 'string' ? el.className.split(' ').slice(0, 4).join(' ') : ''),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            overflowAmount: Math.round(rect.right - vpWidth),
            textSnippet: (el.innerText || '').slice(0, 50).replace(/\n/g, ' ')
          });
        }
      }

      return culprits;
    }, width);

    console.log(`Found ${overflowingElements.length} overflowing elements at ${width}px:`);
    // Print unique or top ancestors
    const topAncestors = overflowingElements.filter(c => c.overflowAmount > 5).slice(0, 15);
    console.log(JSON.stringify(topAncestors, null, 2));

    await page.close();
  }

  await browser.close();
}

findOverflows().catch(console.error);
