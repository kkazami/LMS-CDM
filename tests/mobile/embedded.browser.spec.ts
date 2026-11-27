import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';

const require = createRequire(path.resolve('package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
const web = createRequire(path.resolve('apps/web/package.json'));
const output = path.resolve('tmp/mobile-embedded-review');
let script = '', css = '';
const author = { id: null, name: 'Anonymous Student', role: 'STUDENT', isAnonymous: true, isSelf: true };
const post = { id: 'post-1', title: 'How should we organize a capstone project with a long course title?', body: '<p>A detailed question with a long URL: https://example.invalid/very/long/path/that/should/wrap/inside/the/content.</p>', postType: 'QUESTION', status: 'OPEN', isAnonymous: true, authorId: 'student', instituteId: 'ics', viewCount: 3, voteCount: 0, answerCount: 0, isPinned: false, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', author, tags: [{ id: 'tag', name: 'Academic Advice', slug: 'academic-advice', description: '', category: 'General', postCount: 1 }], answers: [], comments: [{ id: 'comment-1', postId: 'post-1', authorId: 'student', body: 'Keep the milestones and responsibilities clear for everyone.', createdAt: '2026-11-01T00:00:00Z', author: { ...author, id: 'student', name: 'Jamie Rivera', isAnonymous: false } }] };

test.beforeAll(async () => {
  const result = await build({ stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import Feed from './apps/web/src/features/knowledge-exchange/components/KxFeedPage';
    import Detail from './apps/web/src/features/knowledge-exchange/components/KxPostDetail';
    import {Primer} from './apps/web/src/features/interactive-activities/ohmward/components/Primer';
    import {Banner} from './apps/web/src/features/interactive-activities/ohmward/components/Shared';
    const mode = new URL(location.href).searchParams.get('mode');
    createRoot(document.getElementById('root')).render(mode==='ohmward' ? <div className="ohmward"><Banner/><Primer/></div> : <div data-knowledge-exchange>{mode==='detail' ? <Detail post={window.fixturePost} instituteCode="ics" currentUserId="student" currentUserRole="STUDENT" currentUserName="Jamie Rivera"/> : <Feed instituteCode="ics" currentUserId="student"/>}</div>);
  `, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, define: { 'process.env': JSON.stringify({ NODE_ENV: 'development' }) }, logLevel: 'silent', loader: { '.woff2': 'dataurl', '.woff': 'dataurl', '.ttf': 'dataurl' }, outdir: 'tmp/embedded-bundle', jsx: 'automatic', tsconfig: 'apps/web/tsconfig.json', nodePaths: [path.resolve('apps/web/node_modules')],
    plugins: [{ name: 'next-browser-adapters', setup(b: any) {
      b.onResolve({ filter: /^next\/(link|navigation|dynamic)$|^@\/lib\/theme-context$/ }, ({ path: name }: any) => ({ path: name, namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }: any) => ({ loader: 'tsx', resolveDir: path.resolve('apps/web'), contents:
        name === 'next/link' ? 'export default function Link({children,...props}){return <a {...props}>{children}</a>}' :
        name === 'next/navigation' ? 'export const useParams=()=>({institute:"ics"});export const useRouter=()=>({push:path=>window.destination=path,refresh(){}});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);' :
        name === 'next/dynamic' ? 'export default function dynamic(){return function LazyEditor(){return null}}' :
        'export const useTheme=()=>({themeMode:document.documentElement.dataset.theme||"light"});' }));
    } }],
  });
  script = result.outputFiles.find((file: any) => file.path.endsWith('.js')).text;
  const compiled = await web('postcss')([web('@tailwindcss/postcss')({ base: path.resolve('apps/web') })]).process(await fs.readFile('apps/web/src/app/globals.css', 'utf8'), { from: path.resolve('apps/web/src/app/globals.css') });
  css = compiled.css + '\n' + await fs.readFile('apps/web/src/features/interactive-activities/ohmward/components/ohmward.css', 'utf8') + '\n' + result.outputFiles.filter((file: any) => file.path.endsWith('.css')).map((file: any) => file.text).join('\n');
  await fs.mkdir(output, { recursive: true });
  const nativeFixture = path.resolve('tmp/native-embedded-fixtures');
  await fs.mkdir(nativeFixture, { recursive: true });
  await fs.writeFile(path.join(nativeFixture, 'embedded.js'), script);
  await fs.writeFile(path.join(nativeFixture, 'embedded.css'), css);
  await fs.writeFile(path.join(nativeFixture, 'post.json'), JSON.stringify(post));
});

test('Knowledge Exchange images load in the feed, thread and full-size preview', async ({ page }) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTMkAAAAASUVORK5CYII=', 'base64');
  const fixture = {
    ...post,
    body: 'Here is the diagram.\n\n![Question diagram](/api/assets/question-picture)',
    answers: [{ id: 'answer-1', postId: post.id, authorId: 'peer', body: '<p><img src="/api/assets/answer-picture" alt="Answer diagram"></p>', author, voteCount: 0, isAccepted: false, isVerified: false, createdAt: post.createdAt, comments: [] }],
    comments: [{ ...post.comments[0], body: 'Here is my screenshot.\n\n![Comment screenshot](/api/assets/comment-picture)' }],
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('http://localhost/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/assets/')) {
      return url.searchParams.get('inline') === '1'
        ? route.fulfill({ contentType: 'image/png', headers: { 'Content-Disposition': 'inline' }, body: png })
        : route.fulfill({ status: 404 });
    }
    if (url.pathname.startsWith('/api/knowledge-exchange/posts')) return route.fulfill({ json: { posts: [fixture], pagination: { totalPages: 1 } } });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: [] });
    return route.fulfill({ contentType: 'text/html', body: '<meta name="viewport" content="width=device-width"><main id="root"></main>' });
  });

  for (const mode of ['feed', 'detail']) {
    await page.goto(`http://localhost/ics/workspace?mode=${mode}`);
    await page.addStyleTag({ content: css });
    await page.evaluate(data => {
      document.documentElement.dataset.nativeFeature = 'true';
      (window as any).fixturePost = data;
    }, fixture);
    await page.addScriptTag({ content: script });
    const labels = mode === 'feed' ? ['Question diagram'] : ['Question diagram', 'Answer diagram', 'Comment screenshot'];
    for (const label of labels) {
      const picture = page.getByRole('img', { name: label });
      await picture.scrollIntoViewIfNeeded();
      await expect.poll(() => picture.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(1);
    }
  }

  for (const label of ['Question diagram', 'Answer diagram', 'Comment screenshot']) {
    await page.getByRole('img', { name: label }).click();
    const preview = page.getByRole('dialog');
    await expect(preview.getByRole('img', { name: label })).toBeVisible();
    await expect(preview.getByRole('link')).toHaveAttribute('href', /\/api\/assets\/[^?]+\?inline=1$/);
    await page.keyboard.press('Escape');
    await expect(preview).toHaveCount(0);
  }
});

for (const width of [320, 390, 768]) for (const dark of [false, true]) test(`embedded workspaces fit ${width}px in ${dark ? 'dark' : 'light'} mode`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => { errors.push(error.message); process.stderr.write('Workspace runtime: ' + error.message + '\n'); });
  await page.setViewportSize({ width, height: 844 });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://localhost') return route.abort();
    if (url.pathname.startsWith('/api/knowledge-exchange/posts')) return route.fulfill({ json: { posts: [post], pagination: { totalPages: 1 } } });
    if (url.pathname === '/api/github/repos/link') return route.fulfill({ json: [] });
    if (url.pathname === '/api/ohmward/primer/complete') return route.fulfill({ json: { success: true } });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: {} });
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="root" style="padding:16px"></main></body></html>' });
  });
  for (const mode of ['feed', 'detail', 'ohmward']) {
    await page.goto(`http://localhost/ics/workspace?mode=${mode}`);
    await page.addStyleTag({ content: css + 'body{font-family:Arial,sans-serif;--font-cdm-body:Arial}html,body{margin:0}' });
    await page.evaluate(({ dark, post }) => { document.body.dataset.institute = 'ics'; document.documentElement.dataset.nativeFeature = 'true'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.classList.toggle('dark', dark); (window as any).fixturePost = post; }, { dark, post });
    await page.addScriptTag({ content: script });
    if (mode === 'feed') {
      await expect(page.getByRole('link', { name: post.title })).toBeVisible();
      const links = page.getByRole('navigation', { name: 'Knowledge Exchange sections' }).locator('div').first().locator('a');
      const boxes = await links.evaluateAll(nodes => nodes.map(node => ({ y: node.getBoundingClientRect().y, height: node.getBoundingClientRect().height })));
      expect(new Set(boxes.map(box => box.y)).size).toBe(1);
      expect(boxes.every(box => box.height >= 48)).toBe(true);
      expect((await page.getByRole('combobox', { name: 'Sort questions' }).boundingBox())!.height).toBeGreaterThanOrEqual(48);
      await page.getByRole('button', { name: 'Answered', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Answered', exact: true })).toHaveAttribute('aria-pressed', 'true');
    } else if (mode === 'detail') {
      await expect(page.getByRole('heading', { name: post.title })).toBeVisible();
      await expect(page.getByText(post.comments[0].body, { exact: true })).toBeVisible();
      if (width < 640) expect(await page.locator('[data-kx-post-body] > [data-kx-vote]').evaluate(node => getComputedStyle(node).flexDirection)).toBe('row');
    } else {
      await page.screenshot({ path: path.join(output, `ohmward-entry-${width}-${dark ? 'dark' : 'light'}.png`) });
      await page.getByLabel('Ambient light', { exact: true }).fill('20');
      await expect(page.getByRole('status').filter({ hasText: 'ON' })).toBeVisible();
      await page.getByRole('button', { name: 'Switch closed' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'OFF' })).toBeVisible();
      for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: 'Start my journey' }).click();
      await expect.poll(() => page.evaluate(() => (window as any).destination)).toBe('/ics/activities/ohmward/modules/circuitry');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (mode === 'ohmward') await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `${mode}-${width}-${dark ? 'dark' : 'light'}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});
