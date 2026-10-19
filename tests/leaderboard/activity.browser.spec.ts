import { test, expect } from "@playwright/test";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("package.json"));
const { build } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));
let script = "";
const board = (id: string) => ({
  item: { title: id === "quiz-a" ? "Midterm quiz" : "Programming activity", maxPoints: id === "quiz-a" ? 20 : 10, course: { code: id === "quiz-a" ? "CS101" : "CS102", title: "Class" } },
  rewards: [],
  rankings: [{ studentId: id === "quiz-a" ? "alice" : "bob", name: id === "quiz-a" ? "Alice" : "Bob", rank: 1,
    score: id === "quiz-a" ? 16 : 7, maxPoints: id === "quiz-a" ? 20 : 10, exp: 9000, level: 1, levelTier: "newcomer",
    streak: 0, badgeCount: 0, department: "ICS", avatarUrl: null, isSelf: id === "quiz-a", isAnonymized: false }],
});

test.beforeAll(async () => {
  const root = process.cwd().replaceAll("\\", "/");
  const built = await build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import Leaderboards from '${root}/apps/web/src/app/(dashboard)/[institute]/leaderboards/client';
      import Manage from '${root}/apps/web/src/app/(dashboard)/[institute]/manage-leaderboard/client';
      const courses=[{id:'class-a',code:'CS101',title:'Algorithms'},{id:'class-b',code:'CS102',title:'Programming'}];
      const activities=[{id:'quiz-a',title:'Midterm quiz',courseId:'class-a',type:'QUIZ',maxPoints:20,course:courses[0],leaderboardRewards:[]},
        {id:'quiz-b',title:'Programming activity',courseId:'class-b',type:'ASSIGNMENT',maxPoints:10,course:courses[1],leaderboardRewards:[]}];
      const theme={colors:{primary:'#ff6600'}}; const q=new URLSearchParams(location.search);
      createRoot(document.getElementById('root')).render(location.pathname==='/manage'
        ? <Manage theme={theme} instituteCode='ics' courses={courses} initialActivities={activities.map(a=>({...a,courseCode:a.course.code,courseTitle:a.course.title,leaderboardEnabled:true,participantCount:1,rewards:[]}))} initialRules={[]} students={[]} logs={[]}/>
        : <Leaderboards theme={theme} instituteCode='ics' currentUserId='alice' initialSelfAnonymized={false} enrolledCourses={courses} leaderboardActivities={activities}
          initialCourseId={q.get('courseId')||undefined} initialActivityId={q.get('syllabusItemId')||undefined}
          rankings={[{rank:9,studentId:'alice',name:'Alice',exp:9000,level:1,levelTier:'newcomer',streak:0,badgeCount:0,isSelf:true,isAnonymized:false,department:'ICS',avatarUrl:null}]}/>);
    `, resolveDir: path.resolve("apps/web"), loader: "tsx" },
    bundle: true, write: false, jsx: "automatic", tsconfig: "apps/web/tsconfig.json",
    nodePaths: [path.resolve("apps/web/node_modules")],
    plugins: [{ name: "browser-boundaries", setup(b: any) {
      b.onResolve({ filter: /^next\/(link|navigation)$|common\/(Toast|Modal|Button|UserAvatar|LevelBadge|StudentProfileModal)$|LeaderboardPodium$|CountUpNumber$/ }, ({ path: name }: { path: string }) => ({ path: name, namespace: "mock" }));
      b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path: name }: { path: string }) => ({ loader: "tsx", resolveDir: path.resolve("apps/web"), contents:
        name === "next/link" ? "export default function Link({children,...props}){return <a {...props}>{children}</a>}" :
        name === "next/navigation" ? "export const useRouter=()=>({refresh(){}});" :
        name.endsWith("Toast") ? "export const toast={success(){},error(){},warning(){}};" :
        name.endsWith("Button") ? "export default function Button({children,...props}){return <button {...props}>{children}</button>}" :
        name.endsWith("CountUpNumber") ? "export default function Count({value}){return <span>{value}</span>}" :
        "export default function Component(){return null;}" }));
    } }],
  });
  script = built.outputFiles[0].text;
});

test.beforeEach(async ({ page }) => {
  await page.route("http://leaderboards.test/**", route => route.request().url().includes("/api/leaderboard/activity")
    ? route.fulfill({ json: board(new URL(route.request().url()).searchParams.get("syllabusItemId")!) })
    : route.fulfill({ contentType: "text/html", body: '<main id="root"></main>' }));
});

test("management links to the exact quiz and class, and its board shows scores instead of global EXP", async ({ page }) => {
  await page.goto("http://leaderboards.test/manage"); await page.addScriptTag({ content: script });
  const link = page.getByRole("link", { name: "View Leaderboard" }).first();
  await expect(link).toHaveAttribute("href", "/ics/leaderboards?courseId=class-a&syllabusItemId=quiz-a");
  await link.click(); await page.addScriptTag({ content: script });
  await expect(page.getByRole("heading", { name: "Midterm quiz", exact: true })).toBeVisible();
  await expect(page.getByText("16 / 20", { exact: true })).toBeVisible();
  await expect(page.getByText("Your Ranking", { exact: true })).toHaveCount(0);
  await expect(page.getByText("9000 EXP", { exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Class" }).selectOption("class-b");
  await expect(page.getByText("16 / 20", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Programming activity/ }).click();
  await expect(page.getByText("7 / 10", { exact: true })).toBeVisible();
  await expect(page.getByText("Bob", { exact: true })).toBeVisible();
});

test("a late response from the previous class cannot replace the current class scores", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route("**/api/leaderboard/activity?syllabusItemId=quiz-a", async route => {
    requested = true; await held;
    await route.fulfill({ json: board("quiz-a") }).catch(() => {});
  });
  await page.goto("http://leaderboards.test/?courseId=class-a&syllabusItemId=quiz-a"); await page.addScriptTag({ content: script });
  await expect.poll(() => requested).toBe(true);
  await page.getByRole("combobox", { name: "Class" }).selectOption("class-b");
  await page.getByRole("button", { name: /Programming activity/ }).click();
  await expect(page.getByText("7 / 10", { exact: true })).toBeVisible();
  release();
  await expect(page.getByText("16 / 20", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Programming activity", exact: true })).toBeVisible();
});

test("failed requests show an error without displaying old scores", async ({ page }) => {
  await page.goto("http://leaderboards.test/"); await page.addScriptTag({ content: script });
  await page.getByRole("button", { name: /Midterm quiz/ }).click();
  await expect(page.getByText("16 / 20", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Back to Activities/ }).click();
  await page.getByRole("combobox", { name: "Class" }).selectOption("class-b");
  await page.route("**/api/leaderboard/activity?syllabusItemId=quiz-b", route => route.fulfill({ status: 404, json: { message: "Leaderboard no longer available." } }));
  await page.getByRole("button", { name: /Programming activity/ }).click();
  await expect(page.getByRole("alert")).toHaveText("Leaderboard no longer available.");
  await expect(page.getByText("16 / 20", { exact: true })).toHaveCount(0);
});
