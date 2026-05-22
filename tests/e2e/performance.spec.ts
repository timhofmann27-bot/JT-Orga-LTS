import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('should load within 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    expect(Date.now() - start).toBeLessThan(5000);
  });
});
