import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";

const moduleRequire = createRequire(path.resolve("package.json"));
const { build } = moduleRequire(moduleRequire.resolve("esbuild", { paths: [path.dirname(moduleRequire.resolve("tsx"))] }));
let script = "";
let css = "";
const screenshotDir = path.resolve(".impeccable/review/calendar");
test.beforeAll(async () => {
  const root = process.cwd().replaceAll("\\", "/");
  const result = await build({
    stdin: { contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import Calendar from '${root}/apps/web/src/components/calendar/StudentCalendar';
      import ClassScheduleFields from '${root}/apps/web/src/components/courses/ClassScheduleFields';
      import {getInstituteTheme} from '${root}/apps/web/src/lib/get-institute-theme';
      const base = {description:'Review chapter 3 before the quiz.', professorName:'Professor Smith', maxPoints:30, creatorId:'teacher', instituteId:'ics', createdAt:'2026-10-01T00:00:00Z', updatedAt:'2026-10-01T00:00:00Z'};
      const events = [{...base,id:'quiz',title:'QUIZ1',eventDate:'2026-10-16T05:00:00Z',eventType:'exam',deepLink:'/ics/courses/course/classwork/quiz',courseId:'course',courseCode:'ITELECT3',courseTitle:'Advanced Programming',source:'classwork'},
        {...base,id:'personal',title:'Study group',eventDate:'2026-10-16T07:00:00Z',endDate:'2026-10-16T08:30:00Z',eventType:'personal',deepLink:'#',courseId:null,creatorId:'student',source:'personal'}];
      const schedules = [{id:'course',code:'ITELECT3',title:'Advanced Programming',room:'Room 302',instructorName:'Professor Smith',scheduleDays:[2,5],scheduleStart:'12:00',scheduleEnd:'13:30',scheduleStartDate:'2026-10-01',scheduleEndDate:'2026-10-31',createdAt:base.createdAt}];
      const userId = new URL(location.href).searchParams.has('instructor') ? 'teacher' : 'student';
      events[1].creatorId = userId;
      if (userId === 'teacher') events[0] = {...base,id:'meeting',title:'Faculty meeting',description:'Department planning.',eventDate:'2026-10-16T05:00:00Z',eventType:'event',deepLink:'#',courseId:null,creatorId:'admin',source:'institution'};
      if (new URL(location.href).searchParams.has('longEvent')) { events[0].title = 'A long event title with detailed instructions '.repeat(4); events[0].description = 'Long event notes for the activity. '.repeat(100); }
      const formMode = new URL(location.href).searchParams.get('scheduleForm');
      createRoot(document.getElementById('root')).render(formMode
        ? <form onSubmit={e => {e.preventDefault(); document.getElementById('saved').textContent = JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)));}}><ClassScheduleFields schedule={formMode === 'edit' ? schedules[0] : undefined}/><button type='submit'>Save schedule</button><output id='saved'/></form>
        : <Calendar events={events} schedules={schedules} instituteCode='ics' userId={userId} theme={getInstituteTheme('ics')} today='2026-10-16' showClasswork={userId !== 'teacher'}/>);
    `, resolveDir: path.resolve("apps/web"), loader: "tsx" },
    bundle: true, write: false, outdir: "out", jsx: "automatic",
    tsconfig: "apps/web/tsconfig.json", nodePaths: [path.resolve("apps/web/node_modules")],
    define: { "process.env.NODE_ENV": '"production"' },
  });
  script = result.outputFiles.find((file: { path: string }) => file.path.endsWith(".js")).text;
  css = result.outputFiles.find((file: { path: string }) => file.path.endsWith(".css")).text;
  await fs.mkdir(screenshotDir, { recursive: true });
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 667 }, { width: 501, height: 678 }, { width: 667, height: 375 }, { width: 1280, height: 900, instructor: true }, { width: 390, height: 844, instructor: true }]) {
  const isInstructor = "instructor" in viewport && viewport.instructor;
  const actorId = isInstructor ? "teacher" : "student";
  const eventLabel = isInstructor ? "Faculty meeting, 1:00 PM" : "ITELECT3 - QUIZ1, 1:00 PM";
  const capturePrefix = isInstructor ? "instructor-" : "";
  test(`${isInstructor ? "instructor" : "student"} calendar views and personal event lifecycle at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("http://calendar.test/**", async (route) => {
      const request = route.request();
      if (request.method() === "DELETE") return route.fulfill({ json: { ok: true } });
      if (request.method() === "POST" || request.method() === "PATCH") return route.fulfill({ json: { deepLink: "#", professorName: "", ...request.postDataJSON(), id: "saved", creatorId: actorId, instituteId: "ics", course: null, maxPoints: null, createdAt: "", updatedAt: "" } });
      return route.fulfill({ contentType: "text/html", body: `<html><body><main id="root"></main>${viewport.width < 768 ? '<nav data-mobile-bottom-nav style="position:fixed;bottom:0;left:0;right:0;height:64px;background:white;border-top:1px solid #e2e8f0;z-index:90;display:flex;align-items:center;justify-content:space-around;font:12px Arial"><span>Dashboard</span><span>Courses</span><span>Grades</span><span>Alerts</span><span>More</span></nav>' : ''}</body></html>` });
    });
    await page.goto(`http://calendar.test/${isInstructor ? "?instructor=1" : ""}`);
    await page.addStyleTag({ content: `*{box-sizing:border-box}body{margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif}h2,h3,p{margin:0}button{border:0;background:none;color:inherit}svg{vertical-align:middle}button,a,input,textarea{-webkit-tap-highlight-color:transparent}#root{max-width:1150px;margin:auto} @media(max-width:767px){body{padding:12px 12px 84px}} ${css}` });
    await page.addScriptTag({ content: script });
    const calendar = page.getByRole("region", { name: "Calendar" });
    await expect(calendar).toBeVisible();
    if (viewport.width < 768) {
      expect((await calendar.boundingBox())!.height).toBeLessThan(640);
      const scroller = page.getByLabel("month calendar, scroll to explore", { exact: true });
      expect(await scroller.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    }
    await expect(page.getByRole("button", { name: eventLabel })).toBeVisible();
    await page.getByRole("button", { name: eventLabel }).click();
    await expect(page.getByRole("dialog")).toContainText("Professor Smith");
    if (isInstructor) {
      await expect(page.getByText("Tasks & quizzes", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /QUIZ1/ })).toHaveCount(0);
      await expect(page.getByRole("dialog")).toContainText("Department planning.");
    } else {
      await expect(page.getByRole("link", { name: "Go to task" })).toHaveAttribute("href", "/ics/courses/course/classwork/quiz");
    }
    await expect(page.getByRole("button", { name: "Delete event" })).toHaveCount(0);
    const initialPanel = await page.getByRole("dialog").boundingBox();
    expect(initialPanel!.x).toBeGreaterThanOrEqual(0);
    expect(initialPanel!.y).toBeGreaterThanOrEqual(0);
    expect(initialPanel!.x + initialPanel!.width).toBeLessThanOrEqual(viewport.width);
    expect(initialPanel!.y + initialPanel!.height).toBeLessThanOrEqual(viewport.height);
    if (viewport.width < 768) {
      expect(initialPanel!.height).toBeLessThan(280);
      expect(initialPanel!.y + initialPanel!.height).toBeLessThanOrEqual(viewport.height - 64);
      const tile = await page.getByRole("button", { name: eventLabel }).boundingBox();
      const panel = await page.getByRole("dialog").boundingBox();
      expect(panel!.y + panel!.height <= tile!.y || panel!.y >= tile!.y + tile!.height).toBe(true);
    }
    await page.screenshot({ path: path.join(screenshotDir, `${capturePrefix}month-popover-${viewport.width}.png`), fullPage: false });
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.id = "scroll-test-space"; spacer.style.height = "1200px";
      document.body.append(spacer);
      window.scrollBy(0, 160);
    });
    await expect.poll(async () => Math.round((await page.getByRole("dialog").boundingBox())!.y)).toBe(Math.round(initialPanel!.y - 160));
    await page.evaluate(() => { window.scrollTo(0, 0); document.getElementById("scroll-test-space")?.remove(); });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "View October 16, 2026", exact: true }).click();
    await expect(page.getByRole("button", { name: "Day", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("12 AM", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Add event", exact: true }).click();
    await page.getByLabel("Title", { exact: true }).fill("Prepare presentation");
    await page.getByRole("button", { name: "Save event", exact: true }).click();
    await expect(page.getByRole("button", { name: "Prepare presentation, 9:00 AM" })).toHaveCount(1);
    await page.getByRole("button", { name: "Prepare presentation, 9:00 AM" }).click();
    await page.getByRole("button", { name: "Edit event", exact: true }).click();
    await page.getByLabel("Title", { exact: true }).fill("Prepare slides");
    await page.getByRole("button", { name: "Save event", exact: true }).click();
    await page.getByRole("button", { name: "Prepare slides, 9:00 AM" }).click();
    await page.getByRole("button", { name: "Delete event", exact: true }).click();
    await expect(page.getByRole("button", { name: "Prepare slides, 9:00 AM" })).toHaveCount(0);
    await page.getByRole("button", { name: "Week", exact: true }).click();
    await expect(page.getByText("Sun", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: eventLabel }).click();
    const bounds = await page.getByRole("dialog").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    if (viewport.width < 768) {
      const weekScroller = page.getByLabel("week calendar, scroll to explore", { exact: true });
      expect(await weekScroller.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height - 64);
      const tile = await page.getByRole("button", { name: eventLabel }).boundingBox();
      expect(bounds!.y + bounds!.height <= tile!.y || bounds!.y >= tile!.y + tile!.height).toBe(true);
    }
    await page.screenshot({ path: path.join(screenshotDir, `${capturePrefix}week-popover-${viewport.width}.png`), fullPage: false });
    const weekScroller = page.getByLabel("week calendar, scroll to explore", { exact: true });
    await weekScroller.evaluate((element) => { element.scrollTop += 96; });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Day", exact: true }).click();
    await page.getByRole("button", { name: "ITELECT3 - Class, 12:00 PM" }).click();
    await expect(page.getByRole("dialog")).toContainText("Every Tuesday, Friday");
    await expect(page.getByRole("dialog")).toContainText("Room 302");
    await expect(page.getByRole("button", { name: "Delete event" })).toHaveCount(0);
    const dayPanel = await page.getByRole("dialog").boundingBox();
    expect(dayPanel!.y).toBeGreaterThanOrEqual(0);
    expect(dayPanel!.y + dayPanel!.height).toBeLessThanOrEqual(viewport.height - (viewport.width < 768 ? 64 : 0));
    await page.screenshot({ path: path.join(screenshotDir, `${capturePrefix}day-popover-${viewport.width}.png`), fullPage: false });
    const dayScroller = page.getByLabel("day calendar, scroll to explore", { exact: true });
    const dayScrollBefore = await dayScroller.evaluate((element) => element.scrollTop);
    const pageScrollBefore = await page.evaluate(() => scrollY);
    const dayBounds = await dayScroller.boundingBox();
    await page.mouse.move(dayBounds!.x + dayBounds!.width - 5, dayBounds!.y + dayBounds!.height - 6);
    await page.mouse.wheel(0, 96);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect.poll(() => dayScroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(dayScrollBefore);
    expect(await page.evaluate(() => scrollY)).toBe(pageScrollBefore);
    await page.getByRole("button", { name: "ITELECT3 - Class, 12:00 PM" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.screenshot({ path: path.join(screenshotDir, `${capturePrefix}day-${viewport.width}.png`), fullPage: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.goto("http://calendar.test/?scheduleForm=create");
    await page.addScriptTag({ content: script });
    const startDate = page.getByLabel("Class start date *", { exact: true });
    const endDate = page.getByLabel("Class end date *", { exact: true });
    await expect(startDate).toHaveValue("");
    await expect(endDate).toHaveAttribute("required", "");
    await page.getByLabel("Tue", { exact: true }).check();
    await page.getByLabel("Start time (GMT+8)").fill("12:00");
    await page.getByLabel("End time (GMT+8)").fill("13:30");
    await startDate.fill("2026-01-06");
    await expect(endDate).toHaveAttribute("min", "2026-01-06");
    await endDate.fill("2026-01-05");
    expect(await endDate.evaluate((element: HTMLInputElement) => element.validity.rangeUnderflow)).toBe(true);
    await endDate.fill("2026-07-31");
    await page.getByRole("button", { name: "Save schedule" }).click();
    await expect(page.locator("#saved")).toContainText('"scheduleStartDate":"2026-01-06"');
    await expect(page.locator("#saved")).toContainText('"scheduleEndDate":"2026-07-31"');
    await page.goto("http://calendar.test/?scheduleForm=edit");
    await page.addScriptTag({ content: script });
    await expect(page.getByLabel("Class start date *", { exact: true })).toHaveValue("2026-10-01");
    await expect(page.getByLabel("Class end date *", { exact: true })).toHaveValue("2026-10-31");
    await page.goto(`http://calendar.test/?longEvent=1${isInstructor ? "&instructor=1" : ""}`);
    await page.addStyleTag({ content: `*{box-sizing:border-box}body{margin:0;padding:12px;font-family:Arial,sans-serif}h2,h3,p{margin:0}button{border:0;background:none;color:inherit}${css}` });
    await page.addScriptTag({ content: script });
    await page.getByRole("button", { name: /A long event title/ }).click();
    const longBounds = await page.getByRole("dialog").boundingBox();
    expect(longBounds!.x).toBeGreaterThanOrEqual(0);
    expect(longBounds!.y).toBeGreaterThanOrEqual(0);
    expect(longBounds!.x + longBounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(longBounds!.y + longBounds!.height).toBeLessThanOrEqual(viewport.height);
    if (viewport.width < 768) expect(longBounds!.y + longBounds!.height).toBeLessThanOrEqual(viewport.height - 64);
    expect(longBounds!.height).toBeLessThan(310);
    await page.keyboard.press("Escape");
    for (const day of ["2", "30"]) {
      await page.getByRole("button", { name: `View October ${day}, 2026`, exact: true }).scrollIntoViewIfNeeded();
      const cell = page.getByRole("button", { name: `View October ${day}, 2026`, exact: true }).locator("..");
      await cell.getByRole("button", { name: "ITELECT3 - Class, 12:00 PM" }).click();
      const edgeBounds = await page.getByRole("dialog").boundingBox();
      expect(edgeBounds!.x).toBeGreaterThanOrEqual(0);
      expect(edgeBounds!.y).toBeGreaterThanOrEqual(0);
      expect(edgeBounds!.x + edgeBounds!.width).toBeLessThanOrEqual(viewport.width);
      expect(edgeBounds!.y + edgeBounds!.height).toBeLessThanOrEqual(viewport.height);
      if (viewport.width < 768) expect(edgeBounds!.y + edgeBounds!.height).toBeLessThanOrEqual(viewport.height - 64);
      await page.keyboard.press("Escape");
    }
    expect(errors).toEqual([]);
  });
}
