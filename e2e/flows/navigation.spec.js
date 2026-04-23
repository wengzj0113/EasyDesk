// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @name NavigationFlow E2E Tests
 * @description Tests for navigation flows between pages
 */

test.describe('NavigationFlow Tests', () => {
  test('should navigate to all pages via direct URL access', async ({ page }) => {
    // Test direct navigation to all pages
    const pages = [
      { path: '/', name: 'Home' },
      { path: '/#/connection', name: 'Connection' },
      { path: '/#/files', name: 'Files' },
      { path: '/#/vip', name: 'VIP' },
      { path: '/#/guide', name: 'Guide' },
    ];

    for (const p of pages) {
      await page.goto(p.path);
      await page.waitForTimeout(2000);

      // Page should load without crash
      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    }
  });

  test('page title verification', async ({ page }) => {
    await page.goto('/');

    // Check page title
    const title = await page.title();
    expect(title).toBeTruthy();

    // Navigate and check title changes
    await page.goto('/#/guide');
    await page.waitForTimeout(2000);

    const guideTitle = await page.title();
    expect(guideTitle).toBeTruthy();
  });
});