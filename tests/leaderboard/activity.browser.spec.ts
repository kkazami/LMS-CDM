import { test, expect } from "@playwright/test";
import path from "node:path";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(path.resolve("package.json"));
const { build } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));
const requireWeb = createRequire(path.resolve("apps/web/package.json"));
const postcss = requireWeb("postcss");
const tailwind = requireWeb("@tailwindcss/postcss");
const longName = "Jordan Alexander Santiago";
let script = "";
let css = "";
const board = (id: string) => ({
  item: { title: id === "quiz-a" ? "Midterm quiz" : "Programming activity", maxPoints: id === "quiz-a" ? 20 : 10, course: { code: id === "quiz-a" ? "CS101" : "CS102", title: "Class" } },
  rewards: [],
  rankings: [{ studentId: id === "quiz-a" ? "alice" : "bob", name: id === "quiz-a" ? "Alice" : "Bob", rank: 1,
    score: id === "quiz-a" ? 16 : 7, maxPoints: id === "quiz-a" ? 20 : 10, exp: 9000, level: 1, levelTier: "newcomer",
    streak: 0, badgeCount: 0, department: "ICS", avatarUrl: null, isSelf: id === "quiz-a", isAnonymized: false }],
});

test.beforeAll(async () => {
  const root = process.cwd().replaceAll("\\", "/");
  const stylesheet = path.resolve("apps/web/src/app/globals.css");
  css = (await postcss([tailwind({ base: path.resolve("apps/web") })])
    .process(await readFile(stylesheet, "utf8"), { from: stylesheet })).css;
  const built = await build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import AvatarUploadModal from '${root}/apps/web/src/components/common/AvatarUploadModal';
      import {AvatarProvider} from '${root}/apps/web/src/lib/avatar-context';
      import Leaderboards from '${root}/apps/web/src/app/(dashboard)/[institute]/leaderboards/client';
      import Manage from '${root}/apps/web/src/app/(dashboard)/[institute]/manage-leaderboard/client';
      const courses=[{id:'class-a',code:'CS101',title:'Algorithms'},{id:'class-b',code:'CS102',title:'Programming'}];
      const activities=[{id:'quiz-a',title:'Midterm quiz',courseId:'class-a',type:'QUIZ',maxPoints:20,course:courses[0],leaderboardRewards:[]},
        {id:'quiz-b',title:'Programming activity',courseId:'class-b',type:'ASSIGNMENT',maxPoints:10,course:courses[1],leaderboardRewards:[]}];
      const theme={colors:{primary:'#ff6600'}}; const q=new URLSearchParams(location.search);
      const student={exp:9000,level:1,levelTier:'newcomer',streak:0,badgeCount:0,isSelf:false,isAnonymized:false,department:'ICS',avatarUrl:null};
      const alice={...student,rank:1,studentId:'alice',name:'Alice',isSelf:true,avatarUrl:'/portrait.png?shape='+(q.get('shape')||'square')};
      const podium=[alice,{...student,rank:2,studentId:'bob',name:${JSON.stringify(longName)}},
        {...student,rank:3,studentId:'anonymous-3',name:'Anonymous student',isAnonymized:true,department:''},
        {...student,rank:4,studentId:'drew',name:'Drew'}];
      createRoot(document.getElementById('root')).render(q.has('crop')
        ? <AvatarProvider initialAvatarUrl={null}><AvatarUploadModal open onClose={()=>{}} theme={theme} currentAvatarUrl={null}/></AvatarProvider>
        : location.pathname==='/manage'
        ? <Manage theme={theme} instituteCode='ics' courses={courses} initialActivities={activities.map(a=>({...a,courseCode:a.course.code,courseTitle:a.course.title,leaderboardEnabled:true,participantCount:1,rewards:[]}))} initialRules={[]} students={[]} logs={[]}/>
        : <Leaderboards theme={theme} instituteCode='ics' initialVisibility={q.has('podium') ? 'photo' : 'name'} enrolledCourses={courses} leaderboardActivities={q.has('podium') ? [] : activities}
          initialCourseId={q.get('courseId')||undefined} initialActivityId={q.get('syllabusItemId')||undefined}
          rankings={q.has('podium') ? podium : [{...alice,rank:9,avatarUrl:null}]}/>);
    `, resolveDir: path.resolve("apps/web"), loader: "tsx" },
    bundle: true, write: false, outfile: "leaderboard-fixture.js", jsx: "automatic", tsconfig: "apps/web/tsconfig.json",
    nodePaths: [path.resolve("apps/web/node_modules")],
    plugins: [{ name: "browser-boundaries", setup(b: any) {
      b.onResolve({ filter: /^next\/(link|navigation|image)$|common\/(Toast|Modal|Button|LevelBadge)$|CountUpNumber$/ }, ({ path: name }: { path: string }) => ({ path: name, namespace: "mock" }));
      b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path: name }: { path: string }) => ({ loader: "tsx", resolveDir: path.resolve("apps/web"), contents:
        name === "next/link" ? "export default function Link({children,...props}){return <a {...props}>{children}</a>}" :
        name === "next/navigation" ? "export const useRouter=()=>({refresh(){}});" :
        name === "next/image" ? "export default function Image({fill,unoptimized,...props}){return <img {...props} style={fill ? {position:'absolute',width:'100%',height:'100%',inset:0} : undefined}/>}" :
        name.endsWith("Toast") ? "export const toast={success(){},error(){},warning(){}};" :
        name.endsWith("Button") ? "export default function Button({children,...props}){return <button {...props}>{children}</button>}" :
        name.endsWith("CountUpNumber") ? "export default function Count({value}){return <span>{value}</span>}" :
        "export default function Component(){return null;}" }));
    } }],
  });
  script = built.outputFiles.find((file: { path: string }) => file.path.endsWith(".js")).text;
  css += built.outputFiles.find((file: { path: string }) => file.path.endsWith(".css")).text;
});

test.beforeEach(async ({ page }) => {
  await page.route("http://leaderboards.test/**", route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/leaderboard/activity") return route.fulfill({ json: board(url.searchParams.get("syllabusItemId")!) });
    if (url.pathname.startsWith("/api/users/") && url.searchParams.get("source") === "leaderboard") {
      const id = url.pathname.split("/")[3];
      const name = { alice: "Alice", bob: "Bob", drew: "Drew" }[id];
      const shape = new URL(page.url()).searchParams.get("shape");
      const avatarUrl = id === "alice" && shape ? `/portrait.png?shape=${shape}` : null;
      return route.fulfill({ json: { user: { id, name, role: "STUDENT", avatarUrl, department: "ICS", canViewFullProfile: false } } });
    }
    if (url.pathname === "/portrait.png") {
      const shape = url.searchParams.get("shape");
      const width = shape === "wide" ? 224 : 100;
      const height = shape === "tall" ? 224 : 100;
      return route.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#587080"/></svg>` });
    }
    return route.fulfill({ contentType: "text/html", body: `<meta name="viewport" content="width=device-width"><style>${css}body{font-family:system-ui,sans-serif}</style><main id="root" class="bg-canvas px-4 py-4"></main>` });
  });
});

test("management links to the exact quiz and class, and its board shows scores instead of global EXP", async ({ page }) => {
  await page.goto("http://leaderboards.test/manage"); await page.addScriptTag({ content: script });
  const link = page.getByRole("link", { name: "View Leaderboard" }).first();
  await expect(link).toHaveAttribute("href", "/ics/leaderboards?courseId=class-a&syllabusItemId=quiz-a");
  await link.click(); await page.addScriptTag({ content: script });
  await expect(page.getByRole("heading", { name: "Midterm quiz", exact: true })).toBeVisible();
  await expect(page.getByText("16 / 20", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View Alice's profile" }).click();
  const miniProfile = page.getByRole("dialog", { name: "Alice mini profile" });
  await expect(miniProfile).toBeVisible();
  await miniProfile.getByRole("button", { name: "Close profile card" }).click();
  await expect(page.getByText("Your Ranking", { exact: true })).toHaveCount(0);
  await expect(page.getByText("9000 EXP", { exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Class" }).selectOption("class-b");
  await expect(page.getByText("16 / 20", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Programming activity/ }).click();
  await expect(page.getByText("7 / 10", { exact: true })).toBeVisible();
  await expect(page.getByText("Bob", { exact: true })).toBeVisible();
});

test("podium frames leave room for names and open the standard mini profile at desktop and phone widths", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://leaderboards.test/?podium");
  await page.addScriptTag({ content: script });
  const topThree = page.getByRole("region", { name: "Top 3" });
  const portrait = topThree.getByRole("button", { name: "View Alice's profile" });
  const privateCard = topThree.getByRole("listitem").filter({ hasText: "Anonymous student" });
  await expect(privateCard.getByRole("button")).toHaveCount(0);
  await expect(privateCard.locator("img")).toHaveCount(0);
  const cards = topThree.getByRole("listitem");
  await expect(cards.getByRole("heading")).toHaveText([longName, "Alice", "Anonymous student"]);
  await expect(topThree.locator(".lucide-trophy")).toHaveCount(0);
  expect(await cards.evaluateAll(items => items.map(item => Number(item.getAttribute("value"))))).toEqual([2, 1, 3]);
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 850 });
    await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), width === 360);
    const box = await portrait.boundingBox();
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);
    expect(await topThree.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(cards.nth(1)).toHaveCSS("border-bottom-left-radius", "24px");
    const [second, first, third] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox(), cards.nth(2).boundingBox()]);
    expect(first!.y).toBeLessThan(second!.y);
    expect(second!.y).toBeLessThan(third!.y);
    const nameBox = (await cards.first().getByRole("heading").boundingBox())!;
    const scoreBox = (await cards.first().getByText("9,000 EXP", { exact: true }).boundingBox())!;
    expect(scoreBox.y - (nameBox.y + nameBox.height)).toBeGreaterThanOrEqual(8);
    const lastLine = width === 1280 ? (await cards.first().getByText("0 badges", { exact: true }).boundingBox())! : scoreBox;
    expect(second!.y + second!.height - lastLine.y - lastLine.height).toBeGreaterThanOrEqual(24);
    expect(await portrait.evaluate(element => getComputedStyle(element.firstElementChild!, "::before").clipPath)).toContain("polygon");
    await expect(portrait.locator("img")).toHaveCSS("object-fit", "cover");
    await expect(portrait.locator("img")).toHaveCSS("filter", /^(?=.*saturate\(0\.85\))(?=.*contrast\(1\.03\))/);
    await topThree.screenshot({ path: testInfo.outputPath(`capsules-${width}.png`), animations: "disabled" });
    await portrait.click();
    const profile = page.getByRole("dialog", { name: "Alice mini profile" });
    await expect(profile).toBeVisible();
    await profile.getByRole("button", { name: "Close profile card" }).click();
    await expect(profile).toHaveCount(0);
  }
  await page.getByRole("button", { name: "View Drew's profile" }).click();
  await expect(page.getByRole("dialog", { name: "Drew mini profile" })).toBeVisible();
});

test("the podium floats farther and its photo glint follows the motion controls", async ({ page }) => {
  await page.goto("http://leaderboards.test/?podium");
  await page.addScriptTag({ content: script });
  const topThree = page.getByRole("region", { name: "Top 3" });
  const cards = topThree.getByRole("listitem");
  const winner = cards.nth(1);
  const portrait = winner.getByRole("button");
  const glint = () => portrait.evaluate(element => getComputedStyle(element, "::after").animationPlayState);
  await topThree.scrollIntoViewIfNeeded();
  await expect(winner).toHaveCSS("animation-play-state", "running");
  await expect.poll(glint).toBe("running");
  expect(await winner.evaluate(element => {
    const [float] = element.getAnimations();
    const time = float.currentTime;
    const { delay, duration } = float.effect!.getTiming();
    float.currentTime = delay + Number(duration) / 2;
    const travel = new DOMMatrix(getComputedStyle(element).transform).m42;
    float.currentTime = time;
    return travel;
  })).toBeLessThan(-20);
  await expect.poll(() => cards.evaluateAll(items => new Set(items.map(item => getComputedStyle(item).animationDelay)).size)).toBe(3);

  await topThree.getByRole("button", { name: "Pause motion" }).click();
  await expect(winner).toHaveCSS("animation-play-state", "paused");
  await expect.poll(glint).toBe("paused");
  await topThree.getByRole("button", { name: "Play motion" }).click();
  await expect(winner).toHaveCSS("animation-play-state", "running");
  const position = (await portrait.boundingBox())!;
  await page.mouse.move(position.x + position.width / 2, position.y + position.height / 2);
  await expect(winner).toHaveCSS("animation-play-state", "paused");
  await portrait.click();
  await expect(page.getByRole("dialog", { name: "Alice mini profile" })).toBeVisible();
  await expect(cards.first()).toHaveCSS("animation-play-state", "paused");
  await page.getByRole("button", { name: "Close profile card" }).click();

  await page.evaluate(() => {
    document.body.style.paddingBottom = "100vh";
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect(topThree.getByRole("list")).toHaveAttribute("data-floating", "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(winner).toHaveCSS("animation-name", "none");
  expect(await portrait.evaluate(element => getComputedStyle(element, "::after").animationName)).toBe("none");
  await expect(topThree.getByRole("button", { name: "Pause motion" })).toHaveCount(0);
});

test("square, wide and tall photos sit in the middle of both avatar frames", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const shape of ["square", "wide", "tall"]) {
    await page.goto(`http://leaderboards.test/?podium&shape=${shape}`);
    await page.addStyleTag({ content: "body { line-height: 2 }" });
    await page.addScriptTag({ content: script });
    const portrait = page.getByRole("button", { name: "View Alice's profile" });
    await portrait.click();
    const miniPhoto = page.getByRole("dialog", { name: "Alice mini profile" }).getByAltText("Alice's avatar");
    for (const [photo, frameSelector] of [[portrait.locator("img"), "button"], [miniPhoto, ".ring-2"]] as const) {
      await expect.poll(() => photo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      const geometry = await photo.evaluate((image, selector) => {
        const frame = image.closest(selector)!.getBoundingClientRect();
        const picture = image.getBoundingClientRect();
        return {
          frameDifference: Math.abs(frame.width - frame.height),
          centerOffsetX: Math.abs(frame.left + frame.width / 2 - picture.left - picture.width / 2),
          centerOffsetY: Math.abs(frame.top + frame.height / 2 - picture.top - picture.height / 2),
        };
      }, frameSelector);
      expect(geometry.frameDifference).toBeLessThan(0.5);
      expect(geometry.centerOffsetX).toBeLessThan(0.5);
      expect(geometry.centerOffsetY).toBeLessThan(0.5);
      await expect(photo).toHaveCSS("object-fit", "cover");
      await expect(photo).toHaveCSS("object-position", "50% 50%");
    }
  }
});

test("the avatar crop preview and saved photo stay filled after dragging and zooming out", async ({ page }) => {
  let uploaded = "";
  await page.route("**/api/upload", async route => {
    const request = route.request();
    const form = await new Response(request.postDataBuffer(), { headers: { "Content-Type": request.headers()["content-type"] } }).formData();
    const file = form.get("file");
    if (file instanceof Blob) uploaded = Buffer.from(await file.arrayBuffer()).toString("base64");
    await route.fulfill({ json: { url: "/api/assets/cropped-avatar" } });
  });
  await page.route("**/api/profile/avatar", route => route.fulfill({ json: { ok: true } }));
  await page.goto("http://leaderboards.test/?crop");
  await page.addScriptTag({ content: script });
  const source = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 120;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#587080";
    ctx.fillRect(0, 0, 240, 120);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("input[type=file]").setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: Buffer.from(source, "base64") });
  const preview = page.locator("canvas");
  const previewAlphas = () => preview.evaluate(element => {
    const ctx = (element as HTMLCanvasElement).getContext("2d")!;
    return [[150, 150], [12, 150], [150, 288]].map(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3]);
  });
  await expect.poll(previewAlphas).toEqual([255, 255, 255]);
  const zoom = page.getByRole("slider", { name: "Photo zoom" });
  await zoom.press("End");
  const box = (await preview.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 300, box.y + box.height + 150);
  await page.mouse.up();
  await expect.poll(previewAlphas).toEqual([255, 255, 255]);
  await zoom.press("Home");
  await expect.poll(previewAlphas).toEqual([255, 255, 255]);
  await page.getByRole("button", { name: "Save Photo" }).click();
  await expect.poll(() => uploaded.length).toBeGreaterThan(0);
  expect(await page.evaluate(async data => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    return [canvas.width, canvas.height, ...[[20, 200], [200, 380], [0, 0]].map(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3])];
  }, uploaded)).toEqual([400, 400, 255, 255, 0]);
});

test("saved leaderboard visibility hides the student's own portrait and closes profile access", async ({ page }) => {
  const saved: string[] = [];
  await page.route("**/api/gamification/privacy", async route => {
    const { visibility } = route.request().postDataJSON();
    saved.push(visibility);
    await route.fulfill({ json: { visibility } });
  });
  await page.goto("http://leaderboards.test/?podium");
  await page.addScriptTag({ content: script });
  const settings = page.getByRole("combobox", { name: "Leaderboard visibility" });
  const portrait = page.getByRole("region", { name: "Top 3" }).getByRole("button", { name: "View Alice's profile" });
  await expect(portrait.locator("img")).toHaveCount(1);
  await settings.selectOption("name");
  await expect(portrait.locator("img")).toHaveCount(0);
  await expect(portrait).not.toHaveAttribute("data-photo", "true");
  await settings.selectOption("anonymous");
  await expect(settings).toHaveValue("anonymous");
  await expect(portrait).toHaveCount(0);
  expect(saved).toEqual(["name", "anonymous"]);
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
  await expect(page.getByText("Your Ranking", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Class" })).toHaveCount(0);
  await page.getByRole("button", { name: "Course", exact: true }).click();
  await page.getByRole("button", { name: /Midterm quiz/ }).click();
  await expect(page.getByText("16 / 20", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Back to Activities/ }).click();
  await page.getByRole("combobox", { name: "Class" }).selectOption("class-b");
  await page.route("**/api/leaderboard/activity?syllabusItemId=quiz-b", route => route.fulfill({ status: 404, json: { message: "Leaderboard no longer available." } }));
  await page.getByRole("button", { name: /Programming activity/ }).click();
  await expect(page.getByRole("alert")).toHaveText("Leaderboard no longer available.");
  await expect(page.getByText("16 / 20", { exact: true })).toHaveCount(0);
});
