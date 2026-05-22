import { test, expect } from '@playwright/test';

test.describe('JT-ORGA App', () => {
  test('should load the app', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
  });
});
