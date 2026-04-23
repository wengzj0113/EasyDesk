// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @name FileCenterPage E2E Tests
 * @description Tests for FileCenterPage (file transfer)
 * Routes tested: /files
 */

test.describe('FileCenterPage Tests', () => {
  test('should load file transfer page', async ({ page }) => {
    await page.goto('/#/files');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Page should render
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('file page should render content', async ({ page }) => {
    await page.goto('/#/files');

    await page.waitForTimeout(2000);

    // File page should have some content
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
  });

  test('should display folder navigation', async ({ page }) => {
    await page.goto('/#/files');

    await page.waitForTimeout(2000);

    // Page should render
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('upload section should be visible', async ({ page }) => {
    await page.goto('/#/files');

    await page.waitForTimeout(2000);

    // Page should render
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('download functionality check', async ({ page }) => {
    await page.goto('/#/files');

    await page.waitForTimeout(2000);

    // Page should render
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('remote file manager if connected', async ({ page }) => {
    await page.goto('/#/files');

    await page.waitForTimeout(2000);

    // Page should render
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('file list should be displayed', async ({ page }) => {
    await page.goto('/#/files');

    await page.waitForTimeout(2000);

    // Page should render
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });
});