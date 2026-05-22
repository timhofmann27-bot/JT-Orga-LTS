import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
