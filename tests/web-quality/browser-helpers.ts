import fs from 'node:fs';
import { expect, type Page, type TestInfo } from '@playwright/test';
export const state = JSON.parse(fs.readFileSync(process.env.WEB_QUALITY_STATE!, 'utf8'));
export function account(role: 'student' | 'teacher' | 'admin', info: TestInfo) { return state.accounts[info.project.name][role]; }
export async function login(page: Page, role: 'student' | 'teacher' | 'admin', info: TestInfo) {
  info.annotations.push({ type: 'browser-version', description: page.context().browser()?.version() || 'unknown' });
  const user = account(role, info);
  await page.goto('/login?institute=ics');
  await page.getByLabel('Email or student ID', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(state.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/ics\/(students|teachers|admin)/);
  return user;
}
