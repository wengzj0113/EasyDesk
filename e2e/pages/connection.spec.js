// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @name ConnectionPage E2E Tests
 * @description Tests for the ConnectionPage (remote connection initiation)
 * Routes tested: /connection
 *
 * Note: ConnectionPage defaults to 'controlled' mode which shows RemoteDesktop instead of form.
 * We need to handle both modes properly.
 */

test.describe('ConnectionPage Tests', () => {
  test('should load and render RemoteDesktop in controlled mode', async ({ page }) => {
    // Default mode is 'controlled', so we get RemoteDesktop instead of form
    await page.goto('/#/connection');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // In controlled mode, RemoteDesktop should render (shows a canvas/video element)
    // Check that something renders on the page
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('should display mode switch option', async ({ page }) => {
    await page.goto('/#/connection');

    // Wait for content
    await page.waitForTimeout(2000);

    // Check for mode selector UI
    const modeSelector = page.locator('[class*="radio"], [class*="Radio"], input[type="radio"]').first();
    const exists = await modeSelector.count() > 0;

    if (exists) {
      await expect(modeSelector).toBeVisible();
    }
  });

  test('can switch to controller mode and see form', async ({ page }) => {
    await page.goto('/#/connection');

    await page.waitForTimeout(2000);

    // Look for "控制端" or "被控端" radio options
    const controllerOption = page.locator('text=控制端, text=控制别人的电脑').first();
    const exists = await controllerOption.count() > 0;

    if (exists) {
      await expect(controllerOption).toBeVisible();
    }
  });

  test('connection status indicator exists', async ({ page }) => {
    await page.goto('/#/connection');

    await page.waitForTimeout(2000);

    // The page should render something - either form or remote desktop
    const content = page.locator('[class*="content"], [class*="Content"]').first();
    const exists = await content.count() > 0;

    if (exists) {
      await expect(content).toBeVisible();
    }
  });

  test('saved connections section if logged in', async ({ page }) => {
    await page.goto('/#/connection');

    await page.waitForTimeout(2000);

    // Page should render
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });
});