// Run after `expo export --platform all --output-dir ../../tmp/mobile-ics-release`.
// This exercises Expo Web with synthetic API responses; it is not a device test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

async function main() {
  const root = path.resolve('tmp/mobile-ics-release');
  const output = path.resolve('tmp/mobile-ics-review');
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.png') ? 'image/png' : file.endsWith('.ttf') ? 'font/ttf' : 'text/html');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try { browser = await chromium.launch({ channel: 'msedge', headless: true }); }
  catch (error) { await new Promise(resolve => server.close(resolve)); throw error; }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  const user = { id: 'fixture-student', instituteId: 'fixture-ics', name: 'Jamie Student', email: 'student@example.invalid', role: 'STUDENT', requiresEnrollment: false, institute: { code: 'ics', name: 'Institute of Computing Studies' } };
  const course = { id: 'course-1', code: 'ICS101', courseCode: 'ICS101', title: 'Programming Fundamentals and Problem Solving', section: 'A', subject: 'Programming', room: 'Lab', isArchived: false, instructorName: 'Sample Instructor', description: 'Synthetic course', enrolledCount: 9, pendingWorkCount: 5, pendingCount: 2 };
  const secondCourse = { ...course, id: 'course-2', title: 'Introduction to System Administration', code: 'SYSADMIN', courseCode: 'SYSADMIN', pendingWorkCount: 0, pendingCount: 0 };
  let courses = [course, secondCourse];
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const deadline = { id: 'syllabus_work-1', title: 'Programming practice due', description: 'Synthetic assignment', eventDate: new Date(Date.now() - 86400000).toISOString(), source: 'classwork', courseId: course.id, courseTitle: course.title, courseCode: course.code, deepLink: '/ics/courses/course-1/classwork/work-1' };
  const calendar = { events: [], schedules: [{ ...course, scheduleDays: [0, 1, 2, 3, 4, 5, 6], scheduleStart: '09:00', scheduleEnd: '10:30', scheduleStartDate: `${today.slice(0, 7)}-01`, scheduleEndDate: `${today.slice(0, 4)}-12-31`, createdAt: '2026-01-01T00:00:00Z' }] };
  const items = Array.from({ length: 45 }, (_, index) => ({ id: `work-${index}`, title: `Practice ${index + 1}`, type: index === 0 ? 'QUIZ' : 'ASSIGNMENT', formId: index === 0 ? 'form-1' : null, description: 'Synthetic instructions for this activity.', orderIndex: index, attachments: [], submission: null }));
  const decks = [];
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      requests.push(`${request.method()} ${url.pathname}`);
      let body = {};
      if (url.pathname.endsWith('/auth/login')) body = { token: 'synthetic_session_token_1234567890', user, mobileCapabilities: { studentReceipts: 1, hybridDrafts: 1, agenda: 1 } };
      else if (url.pathname.endsWith('/auth/me')) body = { user, mobileCapabilities: { studentReceipts: 1, hybridDrafts: 1, agenda: 1 } };
      else if (url.pathname === '/api/mobile/dashboard') {
        if (request.method() === 'PATCH') {
          courses = request.postDataJSON().courseIds.map(id => courses.find(course => course.id === id));
          body = { success: true };
        } else body = { courses, calendar, overdue: 1, dueSoon: 0, pendingAssignments: user.role === 'STUDENT' ? [deadline] : [] };
      }
      else if (url.pathname === '/api/student/join-class') body = { courseId: course.id, redirectTo: '/ics/students' };
      else if (url.pathname === '/api/flashcards/decks') {
        if (request.method() === 'POST') {
          body = { ...request.postDataJSON(), id: 'fixture-deck', courseId: null, courseTitle: null, creatorId: user.id, instituteId: user.instituteId, isArchived: false, cardCount: 0, correctCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          decks.unshift(body);
        } else body = decks;
      }
      else if (url.pathname === '/api/courses') body = { courses: [course] };
      else if (url.pathname === '/api/courses/course-1') body = { course };
      else if (url.pathname.endsWith('/classwork')) body = { items, categories: [] };
      else if (url.pathname.includes('/workspace/events')) body = { events: [{ id: 'event-1', title: 'Programming practice due', eventDate: '2026-12-01T08:00:00Z', source: 'classwork', courseId: 'course-1', courseTitle: course.title, deepLink: '/ics/courses/course-1/classwork/work-1' }] };
      else if (url.pathname === '/api/notifications') body = { notifications: [], unreadCount: 87 };
      else if (url.pathname.includes('/knowledge-exchange/posts')) body = { posts: [] };
      else if (url.pathname.endsWith('/profile')) body = { user, mobileCapabilities: { studentReceipts: 1, hybridDrafts: 1, agenda: 1 } };
      else return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'No synthetic fixture for this route' }) });
      return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: JSON.stringify(body) });
    }
    if (url.origin === origin) return route.continue();
    return route.abort(); // No production or third-party network access.
  });
  try {
    await page.goto(origin);
    await page.getByLabel('Email or Student ID').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('SyntheticPassword1');
    await page.getByRole('checkbox').click();
    await page.screenshot({ path: path.join(output, 'login-390.png') });
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.getByText('A fresh day, a fresh idea, Jamie.', { exact: true }).waitFor();
    await page.getByText(course.title, { exact: true }).first().waitFor();
    await page.getByText('Signed in as Jamie Student', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('tab').count(), 5);
    for (const label of ['Dashboard', 'Courses', 'Grades', 'Alerts', 'More']) assert.equal(await page.getByRole('tab', { name: `${label} tab`, exact: true }).count(), 1);
    const calendarClass = page.getByRole('button', { name: 'ICS101 Class', exact: true }).first();
    await calendarClass.scrollIntoViewIfNeeded(); await calendarClass.click();
    await page.getByText('Event details', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close event details', exact: true }).click();
    for (const mode of ['Day', 'Week', 'Month']) { const button = page.getByRole('button', { name: `${mode} view`, exact: true }); await button.scrollIntoViewIfNeeded(); await button.click(); }
    await page.getByRole('tab', { name: 'More tab', exact: true }).click();
    await page.getByRole('button', { name: 'Knowledge Exchange', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'student-more-390.png') });
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await page.getByLabel('Full Name *', { exact: true }).fill('Unsaved profile edit');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByLabel('Full Name *', { exact: true }).waitFor({ state: 'hidden' });
    await page.getByRole('tab', { name: 'Dashboard tab', exact: true }).click();
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByText('A fresh day, a fresh idea, Jamie.', { exact: true }).scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Home overflows at ${width}`);
      const tab = await page.getByRole('tab', { name: 'More tab', exact: true }).boundingBox();
      assert.ok(tab && tab.y >= 0 && tab.y + tab.height <= 844, 'Bottom navigation must be reachable');
      for (const target of await page.getByRole('tab').all()) {
        const bounds = await target.boundingBox();
        assert.ok(bounds && bounds.width >= 48 && bounds.height >= 48, 'Each tab needs a 48 px touch target');
      }
      await page.screenshot({ path: path.join(output, `home-${width}.png`) });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Join Class', exact: true }).click();
    await page.getByLabel('Class code', { exact: true }).fill('SYNTHETIC');
    await page.getByRole('button', { name: 'Join Class', exact: true }).last().click();
    await page.getByLabel('Class code', { exact: true }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Assignments', exact: true }).click();
    await page.getByRole('button', { name: `Open assignment ${deadline.title}`, exact: true }).waitFor();
    await page.goBack();
    await page.getByText('A fresh day, a fresh idea, Jamie.', { exact: true }).waitFor();
    await page.getByRole('tab', { name: 'More tab', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Flashcards', exact: true }).click();
    await page.getByRole('button', { name: 'Create flashcard deck', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Select accent color #FF7517', exact: true }).count(), 1);
    await page.getByLabel('Deck Title', { exact: true }).fill('Synthetic saved deck');
    await page.getByRole('button', { name: 'Create Study Deck', exact: true }).click();
    await page.getByText('Synthetic saved deck', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Synthetic saved deck', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'flashcards-created-390.png') });
    await page.goBack();
    await page.getByRole('button', { name: 'Use dark appearance', exact: true }).click();
    await page.getByRole('tab', { name: 'Dashboard tab', exact: true }).click();
    await page.screenshot({ path: path.join(output, 'home-dark-390.png') });
    await page.getByRole('tab', { name: 'Courses tab', exact: true }).click();
    const moved = page.waitForResponse(response => response.url().includes('/api/mobile/dashboard') && response.request().method() === 'PATCH');
    await page.getByRole('button', { name: `Move ${course.title} down`, exact: true }).click();
    await moved; assert.equal(courses[1].id, course.id);
    await page.screenshot({ path: path.join(output, 'student-courses-390.png') });
    await page.getByRole('button', { name: `Open course ${course.title}`, exact: true }).click();
    await page.getByRole('button', { name: 'Classwork item Practice 1, QUIZ', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: /^Classwork item / }).count(), 20);
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: /^Classwork item / }).count(), 20);
    await page.getByRole('button', { name: 'Previous page', exact: true }).click();
    await page.screenshot({ path: path.join(output, 'course-390.png') });
    await page.getByRole('button', { name: 'Classwork item Practice 1, QUIZ', exact: true }).click();
    await page.getByRole('button', { name: 'Open Assessment', exact: true }).waitFor();
    assert.ok(page.url().includes('assessment'));
    await page.evaluate(() => localStorage.clear());
    Object.assign(user, { id: 'fixture-teacher', name: 'Professor Smith', role: 'PROFESSOR', email: 'professor@example.invalid' });
    await page.goto(origin);
    await page.getByLabel('Email or Student ID').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('SyntheticPassword1');
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    const facultyGreeting = page.getByText(/^Good (morning|afternoon|evening), Professor\.$/);
    await facultyGreeting.waitFor();
    await page.getByRole('button', { name: `Open course ${course.title}`, exact: true }).waitFor();
    assert.equal(await page.getByRole('tab').count(), 5);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 }); await facultyGreeting.scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, `teacher-home-${width}.png`) });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'To Grade', exact: true }).click();
    await page.getByRole('button', { name: `Open gradebook for ${course.title}`, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close modal', exact: true }).click();
    await page.getByRole('button', { name: 'Requests', exact: true }).click();
    await page.getByRole('button', { name: `Open enrollment requests for ${course.title}`, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close modal', exact: true }).click();
    await page.getByRole('tab', { name: 'Classes tab', exact: true }).click();
    await page.screenshot({ path: path.join(output, 'teacher-courses-390.png') });
    await page.getByRole('tab', { name: 'More tab', exact: true }).click();
    await page.getByText('Instructor tools', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'teacher-more-390.png') });
    await page.getByRole('button', { name: 'CodeLab Analytics', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close tools menu', exact: true }).click();
    await page.getByRole('tab', { name: 'Dashboard tab', exact: true }).click();
    await facultyGreeting.scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Add Class', exact: true }).click();
    await page.getByRole('button', { name: 'Open Add Class', exact: true }).waitFor();
    assert.ok(page.url().includes('tool=create-class'));
    assert.equal(errors.length, 0, JSON.stringify(errors));
    process.stdout.write(JSON.stringify({ result: 'passed', platform: 'Expo Web fixtures', roles: ['STUDENT', 'PROFESSOR'], viewports: [320, 390, 768], visibleTabs: 5, boundedCourseRows: 20, requests, screenshots: output }) + '\n');
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    process.stderr.write(JSON.stringify({ errors, url: page.url() }) + '\n');
    throw error;
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
