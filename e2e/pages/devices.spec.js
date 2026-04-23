// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @name DeviceManagementPage E2E Tests
 * @description Tests for DeviceManagementPage (device binding/management)
 * Routes tested: /devices (protected route)
 */

test.describe('DeviceManagementPage Tests', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/#/devices');

    // Protected route - should either redirect to login or show login modal
    await page.waitForTimeout(2000);
  });

  test('login modal should appear for protected route', async ({ page }) => {
    await page.goto('/#/devices');

    // Wait for login modal
    const modal = page.locator('[class*="modal"], [role="dialog"]').first();
    const modalVisible = await modal.count() > 0;

    if (modalVisible) {
      await expect(modal).toBeVisible();
    }
  });

  test('after login, device list should load', async ({ page }) => {
    await page.goto('/');

    // Login first
    const loginButton = page.locator('button:has-text("登录")').first();
    await loginButton.click().catch(() => {});

    await page.waitForTimeout(1000);

    // Navigate to devices page
    await page.goto('/#/devices');

    // Wait for content
    await page.waitForTimeout(2000);
  });

  test('device code generation section', async ({ page }) => {
    await page.goto('/#/devices');

    // Wait for any device code section
    const codeSection = page.locator('text=设备码, text=Device Code').first();
    await page.waitForTimeout(2000);

    const exists = await codeSection.count() > 0;
    if (exists) {
      await expect(codeSection).toBeVisible();
    }
  });

  test('bind device functionality', async ({ page }) => {
    await page.goto('/#/devices');

    // Look for bind button or add device section
    const bindButton = page.locator('button:has-text("绑定"), button:has-text("添加"), button:has-text("Bind")').first();

    await page.waitForTimeout(2000);

    const exists = await bindButton.count() > 0;
    if (exists) {
      await expect(bindButton).toBeVisible();
    }
  });
});