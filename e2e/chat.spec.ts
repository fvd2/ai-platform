import { test, expect } from '@playwright/test';
import { takeScreenshot } from './helpers';

test.describe('Chat', () => {
  test('should show empty state with new chat button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('AI Platform')).toBeVisible();
    await expect(page.getByText('Select a conversation or start a new one.')).toBeVisible();

    await takeScreenshot(page, 'chat-empty-state');
  });

  test('should navigate to chat via sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const chatLink = page.getByRole('link', { name: 'Chat' });
    await expect(chatLink).toBeVisible();
    await expect(chatLink).toHaveAttribute('aria-current', 'page');
  });

  test('should show sidebar navigation items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: 'Chat' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tasks' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Triggers' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

    await takeScreenshot(page, 'sidebar-navigation');
  });
});
