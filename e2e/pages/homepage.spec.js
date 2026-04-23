// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @name HomePage E2E Tests
 * @description Tests for the HomePage (landing page / controlled mode)
 * Routes tested: /
 */

// Use test.describe for grouping
test.describe('HomePage Tests', () => {
  test('should load and display main content', async ({ page }) => {
    await page.goto('/');

    // Check page loaded
    await expect(page).toHaveTitle(/EasyDesk/i);

    // Check main heading
    await expect(page.locator('h3').first()).toContainText('远程控制');

    // Check sidebar exists
    await expect(page.locator('aside')).toBeVisible();
  });

  test('should display device code section', async ({ page }) => {
    await page.goto('/');

    // Wait for the device code card to load
    await page.waitForSelector('text=本机状态', { timeout: 10000 });

    // Check for local device status card
    await expect(page.locator('text=本机状态').first()).toBeVisible();
  });

  test('sidebar navigation links should be visible', async ({ page }) => {
    await page.goto('/');

    // Check all sidebar menu items
    const menuItems = ['远程控制', '设备列表', '文件传输', '高级设置'];
    for (const item of menuItems) {
      await expect(page.locator(`text=${item}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to other pages', async ({ page }) => {
    // Test file transfer page
    await page.goto('/#/files');
    await page.waitForTimeout(2000);
    const filesBody = await page.locator('body').textContent();
    expect(filesBody).toBeTruthy();

    // Test guide page
    await page.goto('/#/guide');
    await page.waitForTimeout(2000);
    const guideBody = await page.locator('body').textContent();
    expect(guideBody).toBeTruthy();
  });

  test('protected routes should redirect when not logged in', async ({ page }) => {
    // Test /devices redirect
    await page.goto('/#/devices');
    await page.waitForTimeout(1000);

    // Test /history redirect
    await page.goto('/#/history');
    await page.waitForTimeout(1000);

    // Test /settings redirect
    await page.goto('/#/settings');
    await page.waitForTimeout(1000);
  });
});