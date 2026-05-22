import { test, expect } from '@playwright/test';

test.describe('Offline', () => {
  test('should show offline banner', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);
    const banner = page.locator('text=Keine Verbindung');
    await expect(banner).toBeVisible({ timeout: 5000 });
  });
});
