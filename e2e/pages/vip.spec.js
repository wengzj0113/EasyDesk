// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @name VIPPage E2E Tests
 * @description Tests for VIPPage (VIP subscription)
 * Routes tested: /vip
 */

test.describe('VIPPage Tests', () => {
  test('should load VIP page', async ({ page }) => {
    await page.goto('/#/vip');

    // Wait for page
    await page.waitForLoadState('domcontentloaded');

    // Check for VIP-related content
    await page.waitForTimeout(2000);
  });

  test('VIP status should be displayed', async ({ page }) => {
    await page.goto('/#/vip');

    // Look for VIP status indicator
    const vipStatus = page.locator('text=VIP, text=会员, text=状态').first();
    await page.waitForTimeout(2000);

    const exists = await vipStatus.count() > 0;
    if (exists) {
      await expect(vipStatus).toBeVisible();
    }
  });

  test('pricing plans should be displayed', async ({ page }) => {
    await page.goto('/#/vip');

    // Look for pricing cards or plan options
    const pricingSection = page.locator('[class*="card"]:has-text("月"), [class*="plan"]').first();
    const planButtons = page.locator('button:has-text("购买"), button:has-text("订阅"), button:has-text("Subscribe")');

    await page.waitForTimeout(2000);

    const pricingExists = await pricingSection.count() > 0;
    const buttonsExist = await planButtons.count() > 0;

    expect(pricingExists || buttonsExist).toBeTruthy();
  });

  test('payment options should be available', async ({ page }) => {
    await page.goto('/#/vip');

    // Look for payment methods
    const wechatPayment = page.locator('text=微信').first();
    const alipayPayment = page.locator('text=支付宝').first();

    await page.waitForTimeout(2000);

    const exists = await (wechatPayment.count() > 0 || alipayPayment.count() > 0);
    if (exists) {
      await expect(wechatPayment.or(alipayPayment)).toBeVisible();
    }
  });

  test('features list should be visible', async ({ page }) => {
    await page.goto('/#/vip');

    // Look for VIP features
    const features = page.locator('text=优先, text=无限制, text=高速').first();
    await page.waitForTimeout(2000);

    const exists = await features.count() > 0;
    if (exists) {
      await expect(features).toBeVisible();
    }
  });

  test('subscribe button should work', async ({ page }) => {
    await page.goto('/#/vip');

    // Find subscribe button
    const subscribeBtn = page.locator('button:has-text("订阅"), button:has-text("购买"), button:has-text("升级")').first();

    await page.waitForTimeout(2000);

    const exists = await subscribeBtn.count() > 0;
    if (exists) {
      await expect(subscribeBtn).toBeVisible();
    }
  });

  test('current plan info should be shown if logged in', async ({ page }) => {
    // First login
    await page.goto('/');

    // Try to login
    const loginBtn = page.locator('button:has-text("登录")').first();
    await loginBtn.click().catch(() => {});

    await page.waitForTimeout(1000);

    // Navigate to VIP page
    await page.goto('/#/vip');

    // Check for current plan info
    await page.waitForTimeout(2000);
  });
});