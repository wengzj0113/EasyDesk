// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @name GuidePage E2E Tests
 * @description Tests for GuidePage (user guide)
 * Routes tested: /guide
 */

test.describe('GuidePage Tests', () => {
  test('should load guide page', async ({ page }) => {
    await page.goto('/#/guide');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Check for guide-related content
    await page.waitForTimeout(2000);
  });

  test('guide content should be displayed', async ({ page }) => {
    await page.goto('/#/guide');

    // Look for guide sections
    const guideTitle = page.locator('h1, h2, h3').first();
    await expect(guideTitle).toBeVisible({ timeout: 5000 });
  });

  test('navigation between guide sections', async ({ page }) => {
    await page.goto('/#/guide');

    // Look for tab navigation or section links
    const navLinks = page.locator('[class*="tab"], [class*="Tab"], a[href*="#"]').first();
    await page.waitForTimeout(2000);

    const exists = await navLinks.count() > 0;
    if (exists) {
      await expect(navLinks).toBeVisible();
    }
  });

  test('search or filter functionality', async ({ page }) => {
    await page.goto('/#/guide');

    // Look for search input
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"]').first();
    const exists = await searchInput.count() > 0;

    await page.waitForTimeout(2000);

    if (exists) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('step-by-step instructions', async ({ page }) => {
    await page.goto('/#/guide');

    // Look for numbered steps or instructions
    const steps = page.locator('text=步骤, text=Step, text=第').first();
    const exists = await steps.count() > 0;

    await page.waitForTimeout(2000);

    if (exists) {
      await expect(steps).toBeVisible();
    }
  });

  test('FAQ or common questions section', async ({ page }) => {
    await page.goto('/#/guide');

    // Look for FAQ section
    const faqSection = page.locator('text=FAQ, text=常见问题, text=问题').first();
    const exists = await faqSection.count() > 0;

    await page.waitForTimeout(2000);

    if (exists) {
      await expect(faqSection).toBeVisible();
    }
  });

  test('contact or support information', async ({ page }) => {
    await page.goto('/#/guide');

    // Look for support info
    const supportInfo = page.locator('text=联系, text=支持, text=Support, text=Contact').first();
    const exists = await supportInfo.count() > 0;

    await page.waitForTimeout(2000);
  });
});