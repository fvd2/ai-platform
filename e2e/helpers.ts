import { type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SCREENSHOT_DIR = join(__dirname, 'screenshots');

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

export async function clearAppStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}
