import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
const state = JSON.parse(fs.readFileSync(process.env.LAB_E2E_STATE!, 'utf8'));
async function login(page: Page, account = 'teacher') {
  await page.goto('/login?institute=ics');
  await page.getByLabel('Email or student ID', { exact: true }).fill(state.accounts[account].email);
  await page.getByLabel('Password', { exact: true }).fill(state.password);
  await page.getByRole('checkbox', { name: /I agree to the Terms and Conditions/ }).check();
  await page.getByRole('button', { name: /sign in/i }).click(); await expect(page).toHaveURL(/\/ics(?:\/|$)/);
}
test('instructors organize periods, edit scores, customize 40/60, export and switch class in the wide workspace', async ({ page, browser }) => {
  await login(page);
  await page.goto('/ics/gradebooks?course=grade-course');
  await expect(page.getByRole('main').getByRole('heading', { name: 'Gradebooks', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Gradebooks', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('option', { name: /Forbidden Gradebook/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Assign periods', exact: true }).click();
  const organize = page.getByRole('dialog', { name: 'Assign classwork to grading periods' });
  for (let index = 1; index <= 7; index++) await organize.getByLabel('Select Database quiz ' + index, { exact: true }).check();
  await organize.getByLabel('Move selected classwork to period').selectOption('MIDTERM');
  await organize.getByRole('button', { name: 'Save period assignments', exact: true }).click();
  await expect(organize).toHaveCount(0);
  await expect(page.getByText(/7 classwork items need/)).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Final database exam', exact: false })).toHaveCount(0);
  const scroll = page.getByLabel('Gradebook table scroll area');
  const assertNoOverlap = async () => {
    const bounds = await page.locator('thead tr').evaluate(row => { const cells = [...row.children]; const result = cells.at(-1)!.getBoundingClientRect(); const previous = cells.at(-2)!.getBoundingClientRect(); return { resultLeft: result.left, activityRight: previous.right }; });
    expect(bounds.resultLeft).toBeGreaterThanOrEqual(bounds.activityRight - 1);
  };
  await assertNoOverlap(); await scroll.evaluate(element => { element.scrollLeft = element.scrollWidth; }); await assertNoOverlap();
  await scroll.evaluate(element => { element.scrollLeft = 0; });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: path.join(state.output, 'gradebook-dark-wide.png'), fullPage: true });
  const otherMid = page.locator('#grade-cell-other-grade-mid'); await otherMid.click();
  const input = page.getByRole('spinbutton', { name: 'Score for Synthetic Other Student in Midterm database exam', exact: true });
  await input.fill('70'); await input.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Score saved.' })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Score for Synthetic Student in Midterm database exam', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel edit', exact: true }).click();
  let rejectNextSave = true;
  await page.route('**/ics/gradebooks**', async route => { if (rejectNextSave && route.request().method() === 'POST' && route.request().headers()['next-action']) { rejectNextSave = false; await route.abort('failed'); } else await route.continue(); });
  await otherMid.click(); await input.fill('72'); await input.press('Enter');
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(input).toHaveValue('72');
  const unchanged = await (await page.request.get('/api/courses/grade-course/gradebook')).json();
  expect(unchanged.grades.other['grade-mid'].grade).toBe(70);
  await page.unroute('**/ics/gradebooks**');
  await page.getByRole('button', { name: 'Retry / save score', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Score saved.' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Final Grades', exact: true }).click();
  const row = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: /Synthetic Student.*student@example.invalid/ }) });
  await expect(row.getByText('80.00%', { exact: true })).toBeVisible(); await expect(row.getByText('90.00%', { exact: true })).toBeVisible(); await expect(row.getByText('86.00%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Grading policy', exact: true }).click();
  const policy = page.getByRole('dialog', { name: 'Grading policy', exact: true });
  await policy.getByLabel('Midterm weight (%)', { exact: true }).fill('30');
  await expect(policy.getByRole('button', { name: 'Save grading policy', exact: true })).toBeDisabled();
  await policy.getByLabel('Finals weight (%)', { exact: true }).fill('70');
  await policy.getByRole('button', { name: 'Save grading policy', exact: true }).click();
  await expect(policy).toHaveCount(0); await expect(row.getByText('87.00%', { exact: true })).toBeVisible();
  await page.reload(); await expect(row.getByText('87.00%', { exact: true })).toBeVisible();
  const csv = await page.request.get('/api/courses/grade-course/gradebook/export'); expect(csv.ok()).toBe(true);
  const content = await csv.text(); expect(content).toContain('87.00'); expect(content).toContain('Database quiz 7'); expect(content).toContain('Final database exam');
  await page.getByRole('button', { name: 'Expand gradebook', exact: true }).click(); await expect(page.getByRole('button', { name: 'Exit expanded view', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Exit expanded view', exact: true }).click();
  await page.getByRole('combobox', { name: 'Class', exact: true }).selectOption('grade-second'); await expect(page.getByRole('heading', { name: 'Second Gradebook Class', exact: true })).toBeVisible();
  expect((await page.request.get('/api/courses/grade-foreign/gradebook')).status()).toBe(403);
  const context = await browser.newContext({ ignoreHTTPSErrors: true, baseURL: state.origin });
  try { const student = await context.newPage(); await login(student, 'student'); await student.goto('/ics/gradebooks?course=grade-course'); await expect(student).not.toHaveURL(/\/gradebooks/); }
  finally { await context.close(); }
});


test('professor grades an unsubmitted lab in Gradebook and allows late work without losing its grade history', async ({ page, browser }) => {
  await login(page);
  async function post(url: string, data: unknown) { const response = await page.request.post(url, { data }); expect(response.ok(), await response.text()).toBe(true); return (await response.json()).data; }
  const template = await post('/api/labs/templates', { title: 'Missed lab workflow', category: 'Database', description: 'A short practical task.', objective: 'Demonstrate an instructed task.', prerequisites: '', requiredTools: 'Your own lab computer', estimatedMinutes: 5, steps: [{ key: 'complete', title: 'Complete the task', type: 'INSTRUCTIONS', required: true, config: { body: 'Perform the instructor-approved task, then confirm completion.' } }] });
  const published = await post(`/api/labs/templates/${template.id}/publish`, { expectedRevision: template.versions[0].revision });
  const assignment = await post('/api/courses/course/labs', { versionId: published.versions[0].id, title: 'Missed Midterm Practical', category: 'MIDTERM_EXAM', maxPoints: 10, dueDate: new Date(Date.now() - 60000).toISOString() });
  expect((await page.request.patch(`/api/courses/course/labs/${assignment.id}`, { data: { published: true } })).ok()).toBe(true);
  await page.goto('/ics/courses/course/gradebook?period=MIDTERM');
  const gradeButton = page.getByRole('button', { name: 'Grade practical lab for Synthetic Other Student in Missed Midterm Practical', exact: true });
  await expect(gradeButton).toContainText('Not submitted'); await gradeButton.click();
  const dialog = page.getByRole('dialog', { name: 'Practical-lab grade', exact: true });
  await dialog.getByRole('button', { name: 'Save lab grade', exact: true }).click(); await expect(dialog.getByRole('alert')).toContainText('Add a reason');
  await dialog.getByLabel('Awarded points (out of 10)', { exact: true }).fill('0');
  await dialog.getByLabel('Reason for the student', { exact: true }).fill('Missed the practical lab without a submission.');
  // A lost response after commit must replay the same grade, audit event and notification.
  let lost = true;
  await page.route(`**/api/courses/course/labs/${assignment.id}/gradebook`, async route => {
    if (lost) { lost = false; await route.fetch(); await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'The grade response was lost. Retry the same decision.' }) }); }
    else await route.continue();
  });
  await dialog.getByRole('button', { name: 'Save lab grade', exact: true }).click(); await expect(dialog.getByRole('alert')).toContainText('response was lost');
  await dialog.getByRole('button', { name: 'Save lab grade', exact: true }).click(); await expect(dialog).toHaveCount(0); await expect(gradeButton).toContainText('0/10');
  await page.unroute(`**/api/courses/course/labs/${assignment.id}/gradebook`);
  await page.reload(); await expect(gradeButton).toContainText('0/10');
  await page.screenshot({ path: path.join(state.output, 'gradebook-missed-lab-zero.png'), fullPage: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, baseURL: state.origin });
  try {
    const student = await context.newPage(); await login(student, 'other');
    await student.goto(`/ics/courses/course/labs/${assignment.id}`); await expect(student.getByRole('status').filter({ hasText: 'without a lab submission' })).toBeVisible();
    await expect(student.getByRole('heading', { name: 'Gradebook decisions', exact: true })).toBeVisible();
    await expect(student.getByText('Grade recorded: 0/10', { exact: true })).toBeVisible();
    await gradeButton.click(); await dialog.getByLabel('Decision', { exact: true }).selectOption('REOPEN');
    await dialog.getByLabel('Reason for the student', { exact: true }).fill('Approved makeup practical lab.');
    await dialog.getByRole('button', { name: 'Allow late submission', exact: true }).click(); await expect(dialog).toHaveCount(0);
    await student.reload(); await expect(student.getByRole('status').filter({ hasText: 'allowed a late submission' })).toBeVisible();
    await student.getByRole('checkbox', { name: 'I completed this step.', exact: true }).check();
    await student.getByRole('button', { name: 'Submit for review', exact: true }).click();
    await student.getByRole('dialog', { name: 'Submit this work for review?', exact: true }).getByRole('button', { name: 'Submit for review', exact: true }).click();
    await expect(student.getByText('Awaiting review', { exact: true }).first()).toBeVisible();
    await expect(student.getByText('Grade recorded: 0/10', { exact: true })).toBeVisible();
    const detail = (await (await context.request.get(`/api/courses/course/labs/${assignment.id}`)).json()).data;
    const attempt = (await (await context.request.get(`/api/courses/course/labs/${assignment.id}/attempts/${detail.attempts[0].id}`)).json()).data;
    expect(attempt.submissions).toHaveLength(1); expect(attempt.submissions[0].round).toBe(1); expect(attempt.gradebookHistory).toHaveLength(2);
  } finally { await context.close(); }
});
