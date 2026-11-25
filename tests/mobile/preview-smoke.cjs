// Run after `expo export --platform all --output-dir ../../tmp/mobile-ics-release`.
// This exercises Expo Web with synthetic API responses; it is not a device test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

async function main() {
  const v2 = process.env.MOBILE_PREVIEW_V2 === 'true';
  const studentGreeting = /^Good (morning|afternoon|evening), Jamie\.$/;
  const root = path.resolve(process.env.MOBILE_PREVIEW_ROOT || 'tmp/mobile-ics-release');
  const output = path.resolve(process.env.MOBILE_PREVIEW_OUTPUT || 'tmp/mobile-ics-review');
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : file.endsWith('.ttf') ? 'font/ttf' : 'text/html');
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
  const fixture = require('./fixtures/ics-fixture.cjs').createMobileFixture();
  const { user, course, secondCourse, deadline, items } = fixture;
  async function checkReferenceCourseCard() {
    const open = page.getByRole('button', { name: `Open course ${course.title}`, exact: true });
    assert.equal(await open.evaluate(element => getComputedStyle(element.parentElement).borderRadius), '22px');
    await open.locator('img').first().evaluate(img => img.decode());
    const image = await open.locator('img').first().boundingBox();
    const title = await open.getByText(course.title, { exact: true }).boundingBox();
    assert.ok(image && title && Math.abs(image.width - 58) < 0.1 && Math.abs(image.height - 64) < 0.1, 'Course image must stay in the original small thumbnail');
    assert.ok(title.x >= image.x + image.width + 10, 'Course title must stay to the right of its image');
  }
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (/^\/course-banners\/[a-z]+\.svg$/.test(url.pathname)) return route.fulfill({ contentType: 'image/svg+xml', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.resolve('apps/web/public', '.' + url.pathname)) });
    if (/^\/api\/assets\/fixture-cover-/.test(url.pathname)) return route.fulfill({ contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.resolve('apps/mobile/assets/cdm-logo.png')) });
    if (!url.pathname.startsWith('/api/')) return url.origin === origin ? route.continue() : route.abort();
    requests.push(`${request.method()} ${url.pathname}`);
    const body = url.pathname === '/api/upload' && /multipart\/form-data/.test(request.headers()['content-type'] || '') ? { kind: 'cover-image' } : request.postData() ? request.postDataJSON() : {};
    return route.fulfill(fixture.handle(request.method(), url.pathname + url.search, body));
  });
  try {
    await page.goto(origin);
    await page.getByLabel('Email or Student ID').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('SyntheticPassword1');
    await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
    await page.getByText('Agree to the Terms and Conditions and acknowledge the Privacy Policy to continue with Google.', { exact: true }).waitFor();
    await page.getByRole('checkbox').click();
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByText('Your next chapter', { exact: true }).scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Login overflows at ${width}`);
      await page.screenshot({ path: path.join(output, `login-${width}.png`) });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.mouse.move(0, 0);
    await page.getByText(studentGreeting, { exact: true }).waitFor();
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
    assert.equal(await page.getByRole('button', { name: 'Switch account', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Ohmward', exact: true }).last().click();
    await page.getByRole('button', { name: 'Open Ohmward', exact: true }).waitFor();
    assert.ok(page.url().includes('/student/ohmward'));
    await page.goto(origin + '/student/dashboard');
    await page.getByRole('tab', { name: 'More tab', exact: true }).click();
    await page.screenshot({ path: path.join(output, 'student-more-390.png') });
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await page.getByLabel('Full Name *', { exact: true }).fill('Unsaved profile edit');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByLabel('Full Name *', { exact: true }).waitFor({ state: 'hidden' });
    if (v2) await page.getByRole('button', { name: 'Close tools menu', exact: true }).click();
    await page.getByRole('tab', { name: 'Dashboard tab', exact: true }).click();
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByText(studentGreeting, { exact: true }).scrollIntoViewIfNeeded();
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
    await page.getByRole('button', { name: 'Join Class', exact: true }).first().click();
    await page.getByLabel('Class code', { exact: true }).fill('SYNTHETIC');
    await page.getByRole('button', { name: 'Join Class', exact: true }).last().click();
    await page.getByLabel('Class code', { exact: true }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Assignments', exact: true }).click();
    await page.getByRole('button', { name: `Open assignment ${deadline.title}`, exact: true }).waitFor();
    await page.goBack();
    await page.getByText(studentGreeting, { exact: true }).waitFor();
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
    await page.getByText('Synthetic saved deck', { exact: true }).click();
    const reveal = page.getByRole('button', { name: 'Show answer', exact: true });
    await reveal.waitFor();
    const studyBounds = await reveal.boundingBox();
    assert.ok(studyBounds && studyBounds.height > 400, 'Study card must fill the available screen');
    assert.ok(await page.getByRole('button', { name: 'Mark correct and confident', exact: true }).isDisabled(), 'Reveal the answer before rating');
    await page.screenshot({ path: path.join(output, 'study-question-390.png') });
    await reveal.click();
    await page.getByRole('button', { name: 'Show question', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'study-answer-390.png') });
    await page.getByRole('button', { name: 'Mark correct and confident', exact: true }).click();
    // Durable review storage is native-only; the browser must not silently advance.
    await page.getByText('This review could not save on this device. Reconnect to verify your sign-in, then tap your answer again.', { exact: true }).waitFor();
    await page.getByText('Card 1 of 2', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close flashcard session', exact: true }).click();
    await page.goBack();
    await page.getByRole('tab', { name: 'More tab', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Study tasks', exact: true }).click();
    await page.getByRole('button', { name: 'Open task Reading practice', exact: true }).click();
    await page.getByLabel('Task Title', { exact: true }).fill('Updated study plan');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await page.getByRole('button', { name: 'Open task Updated study plan', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Open task Updated study plan', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'planner-edited-390.png') });
    await page.goBack();
    await page.getByRole('button', { name: 'Use dark appearance', exact: true }).click();
    await page.getByRole('tab', { name: 'Dashboard tab', exact: true }).click();
    await page.screenshot({ path: path.join(output, 'home-dark-390.png') });
    await page.getByRole('tab', { name: 'More tab', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Flashcards', exact: true }).click();
    await page.getByText('Synthetic saved deck', { exact: true }).click();
    await page.getByRole('button', { name: 'Show answer', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'study-question-dark-390.png') });
    await page.getByRole('button', { name: 'Show answer', exact: true }).click();
    await page.getByRole('button', { name: 'Show question', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'study-answer-dark-390.png') });
    await page.getByRole('button', { name: 'Close flashcard session', exact: true }).click();
    await page.goBack();
    await page.getByRole('tab', { name: 'Courses tab', exact: true }).click();
    await page.goto(origin + '/student/courses');
    await checkReferenceCourseCard();
    const moveDown = page.getByRole('button', { name: `Move ${course.title} down`, exact: true });
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/mobile/dashboard') && response.request().method() === 'PATCH'),
      moveDown.click({ timeout: 10000 }),
    ]);
    assert.equal(fixture.courses[1].id, course.id);
    await page.screenshot({ path: path.join(output, 'student-courses-390.png') });
    await page.getByRole('button', { name: `Open course ${course.title}`, exact: true }).click();
    await page.getByRole('button', { name: 'Join Google Meet', exact: true }).waitFor();
    await page.getByRole('tab', { name: 'Classwork tab', exact: true }).click();
    await page.getByRole('button', { name: 'Classwork item Practice 1, QUIZ', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: /^Classwork item / }).count(), 20);
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: /^Classwork item / }).count(), 20);
    await page.getByRole('button', { name: 'Previous page', exact: true }).click();
    // Capture an actual initial viewport; scrolling the horizontal tab into view
    // can scroll the browser document away from the native screen's heading.
    await page.goto(origin + '/student/courses/course-1?tab=CLASSWORK');
    await page.getByRole('button', { name: 'Classwork item Practice 1, QUIZ', exact: true }).waitFor();
    await page.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach(element => { if (element.scrollTop) element.scrollTop = 0; }); });
    const firstClasswork = await page.getByRole('button', { name: 'Classwork item Practice 1, QUIZ', exact: true }).boundingBox();
    assert.ok(firstClasswork && firstClasswork.y >= 0 && firstClasswork.y < 800, 'Original course navigation must leave classwork visible in the initial viewport');
    await page.screenshot({ path: path.join(output, 'course-390.png') });
    await page.goto(origin + '/student/courses/course-1?tab=STREAM');
    const meet = page.getByRole('button', { name: 'Join Google Meet', exact: true });
    await meet.waitFor();
    assert.equal(await meet.count(), 1, 'Plain announcements must not invent meeting actions');
    assert.equal(await page.getByRole('button', { name: 'Practical Labs', exact: true }).count(), 0);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => localStorage.setItem('lumina_theme_pref', value), theme);
      await page.reload(); await meet.waitFor();
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach(element => { if (element.scrollTop) element.scrollTop = 0; }); });
        const header = await page.getByTestId('course-page-header').boundingBox();
        assert.ok(header && header.height < 245, `Course header is too tall at ${width}`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: path.join(output, `course-stream-${theme}-${width}.png`) });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { window.__openedMeeting = ''; window.open = url => { window.__openedMeeting = String(url); return null; }; });
    await meet.click();
    await page.waitForFunction(() => window.__openedMeeting === 'https://meet.google.com/abc-defg-hij');
    await page.goto(origin + '/student/courses/course-1?tab=CLASSWORK');
    await page.getByRole('button', { name: 'Classwork item Practice 1, QUIZ', exact: true }).waitFor();
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
    await page.mouse.move(0, 0);
    await page.getByText(/^Signed in as /).waitFor({ state: 'hidden' });
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
    await page.getByRole('button', { name: 'To Grade', exact: true }).first().click();
    await page.getByRole('button', { name: `Open gradebook for ${course.title}`, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close modal', exact: true }).click();
    await page.getByRole('button', { name: 'Requests', exact: true }).first().click();
    await page.getByRole('button', { name: `Open enrollment requests for ${course.title}`, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close modal', exact: true }).click();
    await page.getByRole('tab', { name: 'Classes tab', exact: true }).click();
    await page.goto(origin + '/teacher/courses');
    await checkReferenceCourseCard();
    await page.screenshot({ path: path.join(output, 'teacher-courses-390.png') });
    const editCover = page.getByRole('button', { name: `Customize cover for ${course.title}`, exact: true });
    await editCover.scrollIntoViewIfNeeded(); await editCover.click();
    await page.getByRole('tab', { name: 'Mobile thumbnail', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Save changes', exact: true }).isDisabled(), true);
    await page.screenshot({ path: path.join(output, 'teacher-mobile-image-editor-390.png') });
    for (const [id, label] of [['programming', 'Programming'], ['database', 'Database'], ['networking', 'Networking'], ['webdev', 'Web development'], ['cybersecurity', 'Cybersecurity']]) {
      const banner = page.getByRole('button', { name: `${label} mobile banner`, exact: true });
      await banner.scrollIntoViewIfNeeded(); await banner.click();
      await page.waitForFunction(() => { const img = document.querySelector('[data-testid="course-mobile-image-preview"] img'); return img && img.complete && img.naturalWidth > 0; }, undefined, { timeout: 15000 });
      assert.ok(await page.getByTestId('course-mobile-image-preview').locator('img').evaluate(img => img.complete && img.naturalWidth > 0), `${label} mobile artwork must decode`);
    }
    await page.getByRole('button', { name: 'Programming mobile banner', exact: true }).click();
    await page.getByTestId('course-mobile-image-preview').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'teacher-mobile-banner-selected-390.png') });
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.getByText('Class images', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(course.mobileCoverImage, '/course-banners/mobile/programming.svg');
    assert.equal(course.coverImage, '/course-banners/programming.svg');
    await checkReferenceCourseCard();
    await editCover.click();
    await page.getByRole('button', { name: 'Programming mobile banner', exact: true }).locator('img').evaluate(img => img.decode());
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Choose mobile photo', exact: true }).click();
    await (await chooser).setFiles(path.resolve('apps/mobile/assets/cdm-logo.png'));
    await page.getByRole('button', { name: 'Save changes', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.getByText('Class images', { exact: true }).waitFor({ state: 'hidden' });
    const mobileImage = course.mobileCoverImage;
    assert.match(mobileImage, /^\/api\/assets\/fixture-cover-upload-/);
    assert.equal(course.coverImage, '/course-banners/programming.svg', 'Mobile changes must preserve the wide web cover');
    await page.screenshot({ path: path.join(output, 'teacher-mobile-image-saved-390.png') });
    await editCover.click();
    await page.getByRole('tab', { name: 'Web cover', exact: true }).click();
    await page.getByRole('button', { name: 'Cybersecurity banner', exact: true }).click();
    await page.waitForFunction(() => Array.from(document.images).some(img => /\/course-banners\/cybersecurity\.[a-f0-9]+\.webp$/.test(img.src) && img.naturalWidth > 0));
    await page.screenshot({ path: path.join(output, 'teacher-cover-editor-390.png') });
    await page.getByRole('tab', { name: 'Mobile thumbnail', exact: true }).click();
    await page.getByTestId('course-mobile-image-preview').waitFor();
    await page.screenshot({ path: path.join(output, 'teacher-independent-images-390.png') });
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.getByText('Class images', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(course.coverImage, '/course-banners/cybersecurity.svg');
    assert.equal(course.mobileCoverImage, mobileImage, 'Web edits must preserve the mobile photo');
    await page.screenshot({ path: path.join(output, 'teacher-cover-saved-390.png') });
    await editCover.click();
    await page.getByRole('tab', { name: 'Web cover', exact: true }).click();
    await page.getByRole('button', { name: 'Remove web cover', exact: true }).click();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.getByText('Class images', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(course.coverImage, '');
    assert.equal(course.mobileCoverImage, mobileImage);
    await editCover.click();
    await page.getByRole('button', { name: 'Use web cover on mobile', exact: true }).click();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.getByText('Class images', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(course.mobileCoverImage, null, 'Resetting mobile restores inheritance without changing the web field');
    assert.equal(course.coverImage, '');
    await editCover.click();
    assert.equal(await page.getByRole('button', { name: 'Save changes', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    for (const mode of ['light', 'dark']) {
      await page.evaluate(value => localStorage.setItem('lumina_theme_pref', value), mode);
      await page.reload();
      await editCover.waitFor(); await editCover.click();
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        for (const target of ['Mobile thumbnail', 'Web cover']) {
          await page.getByRole('tab', { name: target, exact: true }).click();
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          const save = await page.getByRole('button', { name: 'Save changes', exact: true }).boundingBox();
          assert.ok(save && save.y >= 0 && save.y + save.height <= 844, 'Editor actions stay reachable');
          const title = await page.getByText('Class images', { exact: true }).boundingBox();
          assert.ok(title && title.y >= 0 && title.y + title.height <= 844, 'Editor heading stays visible');
          await page.screenshot({ path: path.join(output, `teacher-image-${target.startsWith('Mobile') ? 'mobile' : 'web'}-${mode}-${width}.png`) });
        }
      }
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
    await page.evaluate(() => localStorage.setItem('lumina_theme_pref', 'light'));
    await page.reload(); await editCover.waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: `Open course ${course.title}`, exact: true }).click();
    await page.getByText(course.title, { exact: true }).last().waitFor();
    await page.getByRole('button', { name: 'Join Google Meet', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Practical Labs', exact: true }).count(), 0);
    await page.screenshot({ path: path.join(output, 'teacher-course-restored-390.png') });
    await page.getByRole('tab', { name: 'Classwork tab', exact: true }).click();
    for (const name of ['Create Form Assessment', 'Add Task', 'Practical Labs']) await page.getByRole('button', { name, exact: true }).waitFor();
    await page.getByRole('button', { name: /^Quizzes/ }).click();
    assert.equal(await page.getByRole('button', { name: 'Open Practice 1', exact: true }).count(), 0);
    await page.getByRole('button', { name: /^Quizzes/ }).click();
    await page.getByRole('button', { name: 'Manage Practice 1', exact: true }).click();
    await page.getByRole('button', { name: 'Edit Classwork Item', exact: true }).click();
    await page.waitForURL(/action=edit/);
    await page.getByRole('button', { name: 'Open Classwork', exact: true }).waitFor();
    await page.goBack();
    await page.getByRole('button', { name: 'Create Form Assessment', exact: true }).click();
    await page.waitForURL(/action=form/);
    await page.goBack();
    await page.screenshot({ path: path.join(output, 'teacher-classwork-390.png') });
    await page.getByRole('tab', { name: 'Classes tab', exact: true }).click();
    await editCover.waitFor();
    await page.getByRole('tab', { name: 'More tab', exact: true }).click();
    await page.getByText('Instructor tools', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'teacher-more-390.png') });
    await page.getByRole('button', { name: 'CodeLab Analytics', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close tools menu', exact: true }).click();
    await page.getByRole('tab', { name: 'Dashboard tab', exact: true }).click();
    await facultyGreeting.scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Add Class', exact: true }).last().click();
    await page.getByRole('button', { name: 'Open Add Class', exact: true }).waitFor();
    assert.ok(page.url().includes('tool=create-class'));
    if (v2) {
      // Mounted transition: same browser session, actual ICS sign-out UI, then IBE.
      await page.goto(origin + '/teacher/dashboard');
      await page.getByTestId('ics-dashboard-v2').waitFor();
      await page.getByRole('tab', { name: 'More tab', exact: true }).click();
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await page.getByText('Welcome back.', { exact: true }).waitFor();
      assert.equal(await page.getByTestId('ics-tools-sheet-v2').count(), 0);
      assert.equal(await page.getByTestId('ics-dashboard-v2').count(), 0);
      assert.ok(!(await page.getByText('Welcome back.', { exact: true }).evaluate(element => getComputedStyle(element).fontFamily)).includes('Manrope'));
      await page.getByRole('tab', { name: 'Institute of Business and Entrepreneurship', exact: true }).click();
      await page.getByLabel('Email or Student ID').fill('student@example.invalid');
      await page.getByLabel('Password', { exact: true }).fill('SyntheticPassword1');
      await page.getByRole('checkbox').click();
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await page.getByRole('tab', { name: 'Dashboard tab', exact: true }).waitFor();
      assert.equal(await page.getByTestId('ics-dashboard-v2').count(), 0);
      assert.equal(await page.getByTestId('ics-tab-bar-v2').count(), 0);
    }
    assert.equal(errors.length, 0, JSON.stringify(errors));
    process.stdout.write(JSON.stringify({ result: 'passed', platform: 'Expo Web fixtures', roles: ['STUDENT', 'PROFESSOR'], viewports: [320, 390, 768], visibleTabs: 5, boundedCourseRows: 20, requests, screenshots: output }) + '\n');
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    process.stderr.write(JSON.stringify({ errors, url: page.url() }) + '\n');
    throw error;
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
