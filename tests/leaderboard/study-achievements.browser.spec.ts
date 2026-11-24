import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.resolve('package.json'));
const web = createRequire(path.resolve('apps/web/package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
const origin = 'http://study.test';
let script: string;
let css: string;
let font: Buffer;

test.beforeAll(async () => {
  const built = await build({
    stdin: { contents: `
      import {createRoot} from 'react-dom/client';
      import StudyMode from './apps/web/src/components/flashcards/StudyMode';
      import FlashcardDashboard from './apps/web/src/components/flashcards/FlashcardDashboard';
      import TeacherDashboard from './apps/web/src/app/(dashboard)/[institute]/teachers/client';
      import Analytics from './apps/web/src/app/(dashboard)/[institute]/analytics/client';
      import GradebookTable from './apps/web/src/components/gradebook/GradebookTable';
      import BadgeToast from './apps/web/src/components/common/BadgeToast';
      import LevelBadge from './apps/web/src/components/common/LevelBadge';
      import UserAvatar from './apps/web/src/components/common/UserAvatar';
      import Achievements from './apps/web/src/app/(dashboard)/[institute]/achievements/client';
      const earned = ['flashcard_first', 'material-first'].map(badgeRuleId => ({badgeRuleId, earnedAt:'2026-11-23T00:00:00Z'}));
      const route = location.pathname;
      const theme = {colors:{primary:'#F97316'}};
      const decks = [{ id:'review', title:'IAS Reviewer', description:'Review terminology from the course.', courseId:'ics', courseTitle:'Information Assurance', color:'#F97316', tags:['Security','Review'], cardCount:2, correctCount:1 }];
      const gradebook = {students:[{id:'student',name:'Sample Student',email:'student@example.invalid'}], assignments:[{id:'quiz',title:'Quiz 2',type:'QUIZ',maxPoints:2,gradingPeriod:'UNASSIGNED'}], grades:{student:{quiz:{grade:1,status:'SUBMITTED',isReturned:true}}}, gradingPolicy:null, periodsAvailable:true, periodPolicy:{midtermWeightPercentage:40,finalsWeightPercentage:60,categoryWeights:{}}, pagination:{total:1,page:1,pageSize:50,totalPages:1}};
      createRoot(document.getElementById('root')).render(<>
        {route.endsWith('/achievements') ? <Achievements instituteCode='ics' theme={{colors:{primary:'#F97316'}}} exp={520} earnedBadges={earned} currentStreak={2} totalLoginDays={5}/>
          : route.endsWith('/leaderboard') ? <main>
              <div id='top-row' style={{overflow:'hidden',height:36,textAlign:'right'}}><LevelBadge exp={520}/></div>
              <div id='rank-row' style={{overflow:'hidden',height:36,marginTop:160}}><LevelBadge exp={520}/></div>
              <UserAvatar name='Sample Student' avatarUrl='/missing-avatar.png'/>
            </main>
          : route.endsWith('/flashcards') ? <main className='lms-shell mx-auto max-w-6xl p-4'><FlashcardDashboard instituteCode='ics' initialDecks={decks} courseOptions={[{id:'ics',code:'IAS',title:'Information Assurance'}]} theme={theme}/></main>
          : route.endsWith('/faculty') ? <main className='lms-shell max-w-[1050px] p-4'><TeacherDashboard userName='Professor' instituteName='Institute of Computing Studies' instituteCode='ics' theme={theme} initialCourses={[]} calendar={{events:[],schedules:[]}} userId='teacher' today='2026-11-24' initialPendingRequests={[]} totalPendingWorkCount={4} greeting='A quiet moment to learn, Professor.'/></main>
          : route.endsWith('/analytics') ? <main className='lms-shell p-4'><Analytics instituteCode='ics' theme={theme} taughtCourses={[{id:'systems',title:'Systems Administration',code:'SYSADMIN'},{id:'computing',title:'Intro to Computing',code:'CS101'},{id:'writing',title:'Academic Writing',code:'ENG101'}]}/></main>
          : route.endsWith('/gradebook') ? <GradebookTable data={gradebook} courseId='course' courseTitle='Information Assurance' instituteCode='ics' initialPeriod='UNASSIGNED'/>
          : <StudyMode deckId='deck' deckTitle='Review deck' deckColor='#475569' onExit={()=>{}}/>}
        {route.endsWith('/study') && <BadgeToast instituteCode='ics'/>}
      </>);
    `, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, jsx: 'automatic', tsconfig: 'apps/web/tsconfig.json', nodePaths: [path.resolve('apps/web/node_modules')],
    plugins: [{ name: 'route-fixture', setup(b: any) {
      b.onResolve({ filter: /^next\/(link|navigation|image)$|FocusButton$|(?:\/courses|\/people|\/gradebook)\/actions$|\/(StudentCalendar|CourseCardMenu|CustomizeCourseModal|InstructorCreateCourseModal|InstructorEditCourseModal|CourseReorderButtons|InstructorAtRiskWidget|IbeTopGradesWidget|GradeEvaluationModal)$/ }, ({ path: name }: { path: string }) => ({ path: name, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path: name }: { path: string }) => ({ loader: 'tsx', resolveDir: path.resolve('apps/web'), contents:
        name === 'next/link' ? 'export default function Link(props){return <a {...props}/>}' :
        name === 'next/image' ? 'export default function Image({unoptimized,...props}){return <img {...props}/>}' :
        name === 'next/navigation' ? "export const useParams=()=>({institute:'ics'}); export const useRouter=()=>({refresh(){},push(){}}); export const usePathname=()=>location.pathname; export const useSearchParams=()=>new URLSearchParams(location.search);" :
        name.endsWith('/gradebook/actions') ? "export const upsertGrade=async(...args)=>{globalThis.savedGrades=(globalThis.savedGrades||[]).concat([args]);return {success:true}}; export const clearGrade=upsertGrade; export const saveGradebookPeriodPolicy=upsertGrade; export const assignGradebookPeriods=upsertGrade;" :
        name.endsWith('/actions') ? "export const archiveCourse=async()=>{}; export const reorderCourseCards=archiveCourse; export const approveEnrollment=archiveCourse; export const declineEnrollment=archiveCourse; export const approveAllPending=archiveCourse;" :
        'export default function FocusButton(){return null;}' }));
    } }],
  });
  script = built.outputFiles[0].text;
  const globals = path.resolve('apps/web/src/app/globals.css');
  css = (await web('postcss')([web('@tailwindcss/postcss')({ base: path.resolve('apps/web') })]).process(await readFile(globals, 'utf8'), { from: globals })).css;
  css += '@font-face{font-family:Manrope;src:url(/manrope.ttf);font-weight:200 800}:root{--font-cdm-body:Manrope}';
  font = await readFile('apps/web/src/fonts/Manrope.ttf');
});

test('analytics lists each student once and expands every at-risk subject in scope', async ({ page }) => {
  const details = { missedAssignments: [], gradedSubmissions: [], incompleteModules: [], gradeAverage: null, daysInactive: null };
  const student = { studentId: 'alex', studentName: 'Alex Student', email: 'alex@example.invalid', details };
  const rows = [
    { ...student, id: 'alex-systems', courseId: 'systems', courseTitle: 'Systems Administration', courseCode: 'SYSADMIN', riskLevel: 'HIGH', reasons: ['3 missed assignments'] },
    { ...student, id: 'alex-computing', courseId: 'computing', courseTitle: 'Intro to Computing', courseCode: 'CS101', riskLevel: 'MEDIUM', reasons: ['Below-average performance'] },
    { ...student, id: 'alex-writing', courseId: 'writing', courseTitle: 'Academic Writing', courseCode: 'ENG101', riskLevel: 'LOW', reasons: ['Good standing'] },
    { ...student, id: 'other-writing', studentId: 'other', email: 'other@example.invalid', courseId: 'writing', courseTitle: 'Academic Writing', courseCode: 'ENG101', riskLevel: 'LOW', reasons: ['Good standing'] },
  ];
  await page.route('**/api/analytics/at-risk?*', route => {
    const courseId = new URL(route.request().url()).searchParams.get('courseId');
    const atRiskStudents = courseId ? rows.filter(row => row.courseId === courseId) : rows;
    return route.fulfill({ json: { atRiskStudents, pagination: { page: 1, total: new Set(atRiskStudents.map(row => row.studentId)).size, totalPages: 1 } } });
  });
  await page.goto(`${origin}/ics/analytics`);
  await expect(page.getByRole('button', { name: 'Students Needing Attention (1)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'All Enrolled Students (2)' })).toBeVisible();
  const studentRow = page.getByRole('button', { name: /Alex Student.*2 at-risk subjects.*High Risk/ });
  await expect(studentRow).toHaveCount(1);
  await studentRow.focus();
  await page.keyboard.press('Enter');
  await expect(studentRow).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('heading', { name: 'SYSADMIN · Systems Administration' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'CS101 · Intro to Computing' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Academic Writing/ })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search students' }).fill('CS101');
  await expect(studentRow).toBeVisible();
  await page.getByRole('button', { name: 'All Enrolled Students (2)' }).click();
  await page.getByRole('textbox', { name: 'Search students' }).clear();
  await expect(page.getByRole('button', { name: /Alex Student/ })).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Class Scope' }).selectOption('computing');
  const computingRow = page.getByRole('button', { name: /Alex Student.*CS101.*Medium Risk/ });
  await computingRow.click();
  await expect(page.getByRole('heading', { name: 'CS101 · Intro to Computing' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Systems Administration/ })).toHaveCount(0);
});

for (const width of [360, 1280]) {
  test(`flashcard library, editor and study fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    const cards = [
      { id: 'first', front: 'What does C stand for in the CIA triad?', back: 'Confidentiality', hint: '', attachments: [], progress: { status: 'correct' } },
      { id: 'second', front: 'How would you explain this topic?', back: 'A longer answer. '.repeat(25), hint: '', attachments: [], progress: { status: 'incorrect' } },
    ];
    await page.route('**/api/flashcards/cards?*', route => route.fulfill({ json: cards }));
    await page.route('**/api/flashcards/study?*', route => route.fulfill({ json: { cards, stats: null } }));
    await page.goto(`${origin}/ics/flashcards`);
    if (width < 400) await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    const deck = page.getByRole('button', { name: 'IAS Reviewer', exact: true });
    await expect(deck).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Cards mastered' })).toHaveAttribute('aria-valuenow', '50');
    await page.screenshot({ path: testInfo.outputPath('library.png') });
    await deck.press('Enter');
    await expect(page.getByRole('heading', { name: 'IAS Reviewer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit card 1' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('deck.png') });
    await page.getByRole('button', { name: 'Edit card 1' }).click();
    await expect(page.getByRole('textbox', { name: 'Question', exact: true })).toHaveValue(cards[0].front);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Batch Edit' }).click();
    await page.getByRole('checkbox', { name: 'Select card 1' }).check();
    await expect(page.getByRole('button', { name: 'Delete (1)' })).toBeEnabled();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Study Now' }).click();
    await page.getByRole('button', { name: /^Flashcards Classic/ }).click();
    await page.getByRole('button', { name: 'Reveal Answer' }).click();
    await expect(page.getByRole('button', { name: /^Good/ })).toBeVisible();
    await expect(page.getByText(cards[0].back, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath('study.png') });
    await page.getByRole('button', { name: /^Good/ }).click();
    await page.getByRole('button', { name: 'Reveal Answer' }).click();
    await expect(page.getByText(cards[1].back.trim(), { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test.beforeEach(async ({ page }) => {
  await page.route(`${origin}/**`, route => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/fixture.js') return route.fulfill({ contentType: 'text/javascript', body: script });
    if (pathname === '/fixture.css') return route.fulfill({ contentType: 'text/css', body: css });
    if (pathname === '/manrope.ttf') return route.fulfill({ contentType: 'font/ttf', body: font });
    if (pathname === '/missing-avatar.png') return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script>' });
  });
});

async function rate(page: Page, card: string, rating: 'Forgot' | 'Hard' | 'Good' | 'Easy') {
  await expect(page.getByText(`Question ${card}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reveal Answer' }).click();
  await page.getByRole('button', { name: new RegExp(`^${rating}`) }).click();
}

test('the instructor banner wraps stats at smaller laptop widths', async ({ page }) => {
  await page.setViewportSize({ width: 1030, height: 680 });
  await page.goto(`${origin}/ics/faculty`);
  const stats = page.getByRole('group', { name: 'Instructor dashboard statistics' });
  await expect(stats.getByText('4 to Grade')).toBeInViewport();
  expect(await stats.evaluate(el => el.scrollWidth <= el.clientWidth && getComputedStyle(el).flexWrap === 'wrap')).toBe(true);
});

test('gradebook edit actions have borders and keyboard cancel discards the draft', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 680 });
  await page.goto(`${origin}/ics/gradebook`);
  const cell = page.getByRole('cell', { name: /Sample Student, Quiz 2, 1 out of 2/ });
  await cell.click();
  const score = page.getByRole('spinbutton', { name: /Score for Sample Student/ });
  await score.fill('2');
  const save = page.getByRole('button', { name: 'Retry / Save Score', exact: true });
  const cancel = page.getByRole('button', { name: 'Cancel edit' });
  await expect(save).toHaveCSS('border-top-width', '1px');
  await expect(cancel).toHaveCSS('border-top-width', '1px');
  await cancel.focus();
  await cancel.press('Enter');
  await expect(cell).toContainText('1/2');
  expect(await page.evaluate(() => 'savedGrades' in globalThis)).toBe(false);
});

test('flashcards rejoin the end of the queue and need two consecutive confident ratings', async ({ page }, testInfo) => {
  const progress: string[] = [];
  let cardsReviewed = 0;
  await page.route('**/api/flashcards/study?*', route => route.fulfill({ json: { cards: ['A', 'B', 'C'].map(id => ({ id, front: `Question ${id}`, back: `Answer ${id}` })), stats: null } }));
  await page.route('**/api/flashcards/progress', route => {
    const { cardId } = route.request().postDataJSON();
    progress.push(cardId);
    return route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/flashcards/complete-session', route => {
    cardsReviewed = route.request().postDataJSON().cardsReviewed;
    return route.fulfill({ json: { success: true } });
  });
  let badgeReady = false;
  await page.route('**/api/gamification/new-badges', route => {
    if (route.request().method() === 'POST') return route.fulfill({ json: { ok: true } });
    return route.fulfill({ json: badgeReady ? [{ id: 'notification', badgeRuleId: 'flashcard_first', earnedAt: '2026-11-23' }] : [] });
  });

  await page.goto(`${origin}/ics/study`);
  await page.getByRole('button', { name: /^Flashcards Classic/ }).click();
  const strip = page.getByRole('list', { name: 'Flashcard progress' });
  await expect(strip.getByRole('listitem')).toHaveCount(3);
  await expect(strip.locator('[aria-current="step"]')).toHaveText('Card 1: Unseen');
  await rate(page, 'A', 'Forgot');
  await expect(strip.getByText('Card 1: Retry')).toBeAttached();
  await rate(page, 'B', 'Hard');
  await rate(page, 'C', 'Good');
  await expect(strip.getByText('Card 3: Confirm')).toBeAttached();
  await expect(strip.locator('[aria-current="step"]')).toHaveText('Card 1: Retry');
  await rate(page, 'A', 'Easy');
  await rate(page, 'B', 'Good');
  await rate(page, 'C', 'Hard');
  await expect(strip.getByText('Card 3: Retry')).toBeAttached();
  await rate(page, 'A', 'Good');
  await expect(page.getByRole('list', { name: 'Progress totals' })).toContainText('1 Finished');
  await expect(page.getByRole('list', { name: 'Progress totals' })).toContainText('1 Retry');
  await expect(page.getByRole('list', { name: 'Progress totals' })).toContainText('1 Confirm');
  await expect(page.getByText('Question B', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reveal Answer' }).click();
  const easy = page.getByRole('button', { name: /^Easy/ });
  await expect(easy).toContainText('Finish card');
  await page.screenshot({ path: testInfo.outputPath('flashcard-progress.png'), animations: 'disabled' });
  await easy.click();
  await expect(strip.getByText('Card 1: Finished')).toBeAttached();
  await expect(strip.getByText('Card 2: Finished')).toBeAttached();
  await expect(strip.getByRole('listitem')).toHaveCount(3);
  await expect(page.getByText('1 left', { exact: true })).toBeVisible();
  await rate(page, 'C', 'Easy');
  badgeReady = true;
  await rate(page, 'C', 'Good');
  await expect(page.getByRole('heading', { name: 'Session Complete!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry 3 Incorrect' })).toBeVisible();
  await expect.poll(() => cardsReviewed).toBe(3);
  expect(progress).toEqual(['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C', 'C']);

  const link = page.getByRole('link', { name: /View earned badge:/ });
  await expect(link).toHaveAttribute('href', '/ics/achievements?view=earned&badge=flashcard_first');
  await link.click();
  const target = page.locator('#badge-flashcard-first');
  await expect(target).toBeFocused();
  await expect(target).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Earned only' })).toHaveAttribute('aria-pressed', 'true');
});

test('the earned filter combines with search and hides locked badges on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 650 });
  await page.goto(`${origin}/ics/achievements`);
  await expect(page.getByText('Not Earned', { exact: true }).first()).toBeVisible();
  const earnedOnly = page.getByRole('button', { name: 'Earned only' });
  await earnedOnly.click();
  await expect(page.getByText('Not Earned', { exact: true })).toHaveCount(0);
  await expect(page.locator('[id^="badge-"]')).toHaveCount(2);
  await page.getByRole('textbox', { name: 'Search badges' }).fill('no such badge');
  await expect(page.getByText('No badges match these filters')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('level details escape clipped rows and stay within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 400 });
  await page.goto(`${origin}/ics/leaderboard`);
  const rank = page.locator('#rank-row');
  await rank.getByRole('img', { name: /Tier, Level/ }).hover();
  const details = page.getByRole('tooltip');
  await expect(details).toBeVisible();
  const rankBox = (await rank.boundingBox())!;
  const detailsBox = (await details.boundingBox())!;
  expect(detailsBox.y + detailsBox.height).toBeLessThan(rankBox.y);
  await page.keyboard.press('Escape');
  await expect(details).toHaveCount(0);

  const top = page.locator('#top-row').getByRole('img', { name: /Tier, Level/ });
  await top.focus();
  const topBox = (await top.boundingBox())!;
  const flipped = (await details.boundingBox())!;
  expect(flipped.y).toBeGreaterThan(topBox.y + topBox.height);
  expect(flipped.x + flipped.width).toBeLessThan(360);
  await expect(page.getByText('SS', { exact: true })).toBeVisible();
});
