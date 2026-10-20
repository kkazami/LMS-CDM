import { test, expect } from '@playwright/test';
import { login, account, state } from './browser-helpers';
import fs from 'node:fs';

test('student turns in work; instructor returns a grade; student sees the academic result', async ({ page, browser }, info) => {
  const student = await login(page, 'student', info);
  const path = `/ics/courses/${student.courseId}/classwork/${student.itemId}`;
  await page.goto(path);
  await expect(page.getByRole('button', { name: 'Turn in', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Turn in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unsubmit', exact: true })).toBeVisible();
  const context = await browser.newContext({ baseURL: state.origin, ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
  try {
    const instructor = await context.newPage(); await login(instructor, 'teacher', info);
    await instructor.goto(path + '/submissions');
    await instructor.getByRole('button', { name: 'Grade', exact: true }).first().click();
    await instructor.getByRole('spinbutton', { name: 'Grade', exact: true }).fill('90');
    await instructor.getByRole('button', { name: 'Return grade', exact: true }).click();
    await expect(instructor.getByRole('spinbutton', { name: 'Grade', exact: true })).toBeHidden();
    await page.reload(); await expect(page.getByText('90/100', { exact: true })).toBeVisible();
    await page.goto('/ics/grades'); await expect(page.getByText('Synthetic assignment', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await instructor.goto(`/ics/courses/${student.courseId}/gradebook`);
    await expect(instructor.getByRole('navigation', { name: 'Gradebook pages' })).toContainText('of 1');
    await expect(instructor.getByRole('row').filter({ hasText: student.name })).toContainText('90');
    const gradebook = await instructor.request.get(`/api/courses/${student.courseId}/gradebook?page=1`);
    expect(gradebook.status()).toBe(200); const matrix = await gradebook.json();
    expect(matrix.pagination.total).toBe(1); expect(matrix.grades[student.id][student.itemId].grade).toBe(90);
    const csv = await instructor.request.get(`/api/courses/${student.courseId}/gradebook/export`);
    expect(csv.status()).toBe(200); expect(await csv.text()).toContain(student.name);
  } finally { await context.close(); }
});

test('private upload, submission attachment access and foreign-origin mutation are enforced over real HTTP', async ({ page, playwright }, info) => {
  const student = account('student', info);
  await login(page, 'student', info);
  const upload = await page.request.post('/api/upload', { multipart: { file: { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic notes, safe content') } } });
  expect(upload.status(), await upload.text()).toBe(200); const file = await upload.json(); expect(file.url).toMatch(/^\/api\/assets\//);
  expect((await page.request.get(file.url)).status()).toBe(200);
  const anonymous = await playwright.request.newContext({ baseURL: state.origin, ignoreHTTPSErrors: true });
  try { expect((await anonymous.get(file.url)).status()).toBe(401); } finally { await anonymous.dispose(); }
  const csrf = await page.request.post('/api/workspace/notes', { headers: { Origin: 'https://foreign.invalid' }, data: { title: 'blocked', content: 'blocked' } });
  expect(csrf.status()).toBe(403);
  const note = await page.request.post('/api/workspace/notes', { data: { title: 'Safe note', content: '<p><strong>Study</strong><img src=x onerror=alert(1)><script>alert(1)</script></p>' } });
  expect(note.status(), await note.text()).toBe(201); expect((await note.json()).content).toBe('<p><strong>Study</strong></p>');
  const foreign = await page.request.get('/api/assets/not-owned'); expect(foreign.status()).toBe(404);
  const image = await page.request.post('/api/upload', { multipart: { file: { name: 'avatar.png', mimeType: 'image/png', buffer: fs.readFileSync('apps/web/public/images/cdm-logo.png') } } });
  expect(image.status(), await image.text()).toBe(200); const avatarFile = await image.json();
  expect((await page.request.put('/api/profile/avatar', { data: { avatarUrl: avatarFile.url } })).status()).toBe(200);
  await page.goto('/ics/students');
  const avatar = page.getByRole('img', { name: `${student.name}'s avatar`, exact: true }).first();
  await expect(avatar).toBeVisible();
  await expect.poll(() => avatar.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await avatar.getAttribute('src')).toBe(avatarFile.url);
  const publicRanks = await page.request.get('/api/public/leaderboard');
  const publicEntry = (await publicRanks.json()).entries.find((entry: any) => entry.id === student.id);
  expect(publicEntry).toBeDefined(); expect(publicEntry.avatar).toBeNull();
});

test('administrator can preview a student import and open invitation management without sending email', async ({ page }, info) => {
  await login(page, 'admin', info); await page.goto('/ics/accounts');
  await page.getByRole('button', { name: 'Bulk Import', exact: true }).click();
  await page.getByLabel('Or paste CSV').fill(`student_Id,last_name,first_name,email,program,section\nTEST-${info.project.name},Browser,Synthetic,import-${info.project.name}@example.invalid,BSIT,TEST-A`);
  await page.getByRole('button', { name: 'Review import', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /1 new/ })).toBeVisible();
  await page.goto('/ics/admin/onboarding?tab=invitations');
  await expect(page.getByRole('heading', { name: 'Account Invitations', exact: true })).toBeVisible();
});
