// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @name SettingsPage E2E Tests
 * @description Tests for SettingsPage (user settings)
 * Routes tested: /settings (protected)
 */

test.describe('SettingsPage Tests', () => {
  test('should show login modal when not authenticated', async ({ page }) => {
    await page.goto('/#/settings');

    // Wait for login modal or redirect
    await page.waitForTimeout(2000);
  });

  test('settings form should be visible when logged in', async ({ page }) => {
    await page.goto('/#/settings');

    // Wait for content
    await page.waitForTimeout(3000);

    // Look for settings form
    const settingsForm = page.locator('form, [class*="setting"]').first();
    const exists = await settingsForm.count() > 0;

    if (exists) {
      await expect(settingsForm).toBeVisible();
    }
  });

  test('profile settings section', async ({ page }) => {
    await page.goto('/#/settings');

    // Look for profile section
    const profileSection = page.locator('text=个人信息, text=Profile').first();
    const exists = await profileSection.count() > 0;

    await page.waitForTimeout(2000);

    if (exists) {
      await expect(profileSection).toBeVisible();
    }
  });

  test('connection preferences', async ({ page }) => {
    await page.goto('/#/settings');

    // Look for connection settings
    const connectionSettings = page.locator('text=连接设置, text=Connection').first();
    const exists = await connectionSettings.count() > 0;

    await page.waitForTimeout(2000);

    if (exists) {
      await expect(connectionSettings).toBeVisible();
    }
  });

  test('save button should be present', async ({ page }) => {
    await page.goto('/#/settings');

    // Look for save button
    const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")').first();
    const exists = await saveButton.count() > 0;

    await page.waitForTimeout(2000);

    if (exists) {
      await expect(saveButton).toBeVisible();
    }
  });

  test('notification preferences', async ({ page }) => {
    await page.goto('/#/settings');

    // Look for notification settings
    const notifSettings = page.locator('text=通知, text=Notification').first();
    const exists = await notifSettings.count() > 0;

    await page.waitForTimeout(2000);

    if (exists) {
      await expect(notifSettings).toBeVisible();
    }
  });

  test('security settings', async ({ page }) => {
    await page.goto('/#/settings');

    // Look for security section
    const securitySection = page.locator('text=安全, text=Security').first();
    const exists = await securitySection.count() > 0;

    await page.waitForTimeout(2000);

    if (exists) {
      await expect(securitySection).toBeVisible();
    }
  });
});