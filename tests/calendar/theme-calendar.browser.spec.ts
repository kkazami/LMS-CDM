import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const requireRoot = createRequire(path.resolve('package.json'));
const { build } = requireRoot(requireRoot.resolve('esbuild', { paths: [path.dirname(requireRoot.resolve('tsx'))] }));
const output = path.resolve('tmp/calendar-theme-review');
let script = '', css = '';
test.beforeAll(async () => {
  const root = process.cwd().replaceAll('\\', '/');
  const bundle = await build({
    stdin: { contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {ThemeProvider,useTheme} from '${root}/apps/web/src/lib/theme-context';
      import Calendar from '${root}/apps/web/src/components/calendar/StudentCalendar';
      import {getInstituteTheme} from '${root}/apps/web/src/lib/get-institute-theme';
      const base={description:'Review the class material.',professorName:'Professor Smith',maxPoints:30,creatorId:'teacher',instituteId:'ics',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',courseId:'course',courseCode:'CS101',courseTitle:'Programming',deepLink:'#'};
      const events=[{...base,id:'quiz',title:'Quiz 1',eventDate:'2026-10-16T05:00:00Z',eventType:'exam',source:'classwork'},{...base,id:'personal',title:'Study group',eventDate:'2026-10-16T07:00:00Z',eventType:'personal',creatorId:'student',source:'personal'},{...base,id:'assignment',title:'Project',eventDate:'2026-10-15T08:00:00Z',eventType:'assignment',source:'classwork'}];
      const schedules=[{id:'course',code:'CS101',title:'Programming',room:'302',instructorName:'Professor Smith',scheduleDays:[2,5],scheduleStart:'09:00',scheduleEnd:'10:30',scheduleStartDate:'2026-10-01',scheduleEndDate:'2026-10-31',createdAt:base.createdAt}];
      function App(){const {themeMode,toggleTheme,setThemeMode}=useTheme();return <><header><strong>CdM LMS · Calendar</strong><button id='theme-toggle' aria-label='Toggle theme' aria-pressed={themeMode==='dark'} onClick={toggleTheme}>{themeMode==='dark'?'Light mode':'Dark mode'}</button><button id='save-light' onClick={()=>setThemeMode('light')}>Save light preference</button></header><main><Calendar events={events} schedules={schedules} userId='student' instituteCode='ics' theme={getInstituteTheme('ics')} today='2026-10-16'/></main></>}
      createRoot(document.getElementById('root')).render(<ThemeProvider><App/></ThemeProvider>);
    `, loader: 'tsx', resolveDir: path.resolve('apps/web') },
    bundle: true, write: false, outdir: 'out', jsx: 'automatic', tsconfig: 'apps/web/tsconfig.json',
    nodePaths: [path.resolve('apps/web/node_modules')], define: { 'process.env.NODE_ENV': '"production"' },
  });
  script = bundle.outputFiles.find((file: { path: string }) => file.path.endsWith('.js')).text;
  // These theme/calendar rules are native CSS; omit only Tailwind's build directives.
  css = (await fs.readFile('apps/web/src/app/globals.css', 'utf8')).replace(/^@import "tailwindcss";\s*/m, '').replace(/^@variant dark.*;\s*/m, '')
    + bundle.outputFiles.find((file: { path: string }) => file.path.endsWith('.css')).text;
  await fs.mkdir(output, { recursive: true });
});

async function openFixture(page: Page) {
  await page.addInitScript(() => {
    const state = window as any;
    state.reveals = [];
    document.addEventListener('click', event => {
      if ((event.target as Element).closest('#theme-toggle')) state.themeClick = { x: event.clientX, y: event.clientY };
    }, true);
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      if (this === document.documentElement && /^::view-transition-(old|new)\(root\)$/.test((options as any)?.pseudoElement ?? '')) {
        state.reveals.push({ frames, options }); state.revealAnimation = animation;
      }
      return animation;
    };
  });
  await page.route('http://calendar-theme.test/**', route => route.fulfill({ contentType: 'text/html', body: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}
    *{box-sizing:border-box}body{margin:0}h2,h3,p{margin:0}button{border:0;background:none;color:inherit;font:inherit}header{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:8px;padding:14px 20px;background:var(--bg-surface);border-bottom:1px solid var(--border-color)}header strong{margin-right:auto;font-size:14px}header button{padding:10px;border:1px solid var(--border-color);border-radius:8px;font-size:12px;min-height:40px}#save-light{display:none}main{max-width:1180px;margin:auto;padding:24px}@media(max-width:767px){main{padding:12px}}
    </style></head><body><div id="root"></div><script>${script}</script></body></html>` }));
  await page.goto('http://calendar-theme.test/');
  await expect(page.getByRole('region', { name: 'Calendar', exact: true })).toBeVisible();
}

async function settled(page: Page, mode: string) {
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('theme-reveal'))).toBe(false);
}

for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
  test(`dark calendar and native circular reveal at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await openFixture(page);
    const toggle = page.getByRole('button', { name: 'Toggle theme', exact: true });
    await toggle.click({ position: { x: 8, y: 11 } });
    await expect.poll(() => page.evaluate(() => (window as any).reveals.length)).toBe(1);
    const reveal = await page.evaluate(() => (window as any).reveals[0]);
    const origin = await page.evaluate(() => (window as any).themeClick);
    expect(reveal.frames.clipPath[1]).toBe(`circle(0px at ${origin.x}px ${origin.y}px)`);
    expect(reveal.options.pseudoElement).toBe('::view-transition-old(root)');
    expect(reveal.options.fill).toBe('forwards');
    expect(reveal.options.duration).toBe(600);
    const radius = parseFloat(reveal.frames.clipPath[0].slice(7));
    expect(radius).toBeGreaterThanOrEqual(Math.hypot(Math.max(origin.x, viewport.width - origin.x), Math.max(origin.y, viewport.height - origin.y)));
    await page.evaluate(() => { const a = (window as any).revealAnimation; a.pause(); a.currentTime = 130; });
    await page.screenshot({ path: path.join(output, `reveal-${viewport.width}.png`), animations: 'allow' });
    await page.evaluate(() => (window as any).revealAnimation.finish());
    await settled(page, 'dark');
    expect(await page.evaluate(() => (window as any).revealAnimation.playState)).toBe('idle');

    for (const view of ['Month', 'Week', 'Day']) {
      await page.getByRole('button', { name: view, exact: true }).click();
      for (const kind of view === 'Day' ? ['class', 'exam', 'personal'] : ['class', 'exam', 'personal', 'assignment']) {
        const tile = page.locator(`button[data-kind="${kind}"]`).first();
        await expect(tile).toBeAttached();
        const contrast = await tile.evaluate(element => {
          const style = getComputedStyle(element);
          const luminance = (color: string) => {
            const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
            return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
          };
          const bg = luminance(style.backgroundColor), fg = luminance(style.color);
          return { background: bg, contrast: (Math.max(bg, fg) + .05) / (Math.min(bg, fg) + .05) };
        });
        expect(contrast.background).toBeLessThan(.08);
        expect(contrast.contrast).toBeGreaterThanOrEqual(4.5);
      }
      if (view === 'Month') await page.screenshot({ path: path.join(output, `dark-calendar-${viewport.width}.png`), fullPage: true });
    }
    await toggle.focus();
    const center = (await toggle.boundingBox())!;
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).reveals.length)).toBe(2);
    const keyboardReveal = await page.evaluate(() => (window as any).reveals[1]);
    expect(keyboardReveal.frames.clipPath[0]).toBe(`circle(0px at ${center.x + center.width / 2}px ${center.y + center.height / 2}px)`);
    expect(keyboardReveal.options.pseudoElement).toBe('::view-transition-new(root)');
    expect(parseFloat(keyboardReveal.frames.clipPath[1].slice(7))).toBeGreaterThan(0);
    await page.evaluate(() => { const a = (window as any).revealAnimation; a.pause(); a.currentTime = 130; });
    await page.screenshot({ path: path.join(output, `light-reveal-${viewport.width}.png`), animations: 'allow' });
    await page.evaluate(() => (window as any).revealAnimation.finish());
    await settled(page, 'light');
    expect(await page.evaluate(() => (window as any).revealAnimation.playState)).toBe('idle');
    await page.evaluate(() => { const button = document.getElementById('theme-toggle')!; for (let i = 0; i < 5; i++) button.click(); });
    await settled(page, 'dark');
    expect(await page.evaluate(() => localStorage.getItem('cdm-theme-mode'))).toBe('dark');
    await page.reload(); await settled(page, 'dark');
    expect(await page.evaluate(() => (window as any).reveals.length)).toBe(0);
    expect(errors).toEqual([]);
  });
}

for (const fallback of ['reduced motion', 'unsupported API', 'capture failure']) {
  test(`theme switching remains usable with ${fallback}`, async ({ page }) => {
    if (fallback === 'reduced motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    await openFixture(page);
    if (fallback === 'unsupported API') await page.evaluate(() => Object.defineProperty(document, 'startViewTransition', { value: undefined }));
    if (fallback === 'capture failure') await page.evaluate(() => Object.defineProperty(document, 'startViewTransition', { value: () => { throw new Error('Synthetic capture failure'); } }));
    await page.getByRole('button', { name: 'Toggle theme' }).click(); await settled(page, 'dark');
    expect(await page.evaluate(() => (window as any).reveals.length)).toBe(0);
    await page.getByRole('button', { name: 'Toggle theme' }).click(); await settled(page, 'light');
  });
}
