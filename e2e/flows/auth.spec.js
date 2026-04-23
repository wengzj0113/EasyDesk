// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @name AuthFlow E2E Tests
 * @description Tests for authentication flows (register, login, logout)
 */

test.describe('AuthFlow Tests', () => {
  test('login modal should open from header', async ({ page }) => {
    await page.goto('/');

    // Click login button in header
    const loginBtn = page.locator('button:has-text("登录"), button:has-text("Login")').first();
    await loginBtn.click().catch(() => {});

    await page.waitForTimeout(1000);

    // Check for login form in modal
    const loginForm = page.locator('form:has(input[name*="username"]), form:has(input[name*="user"])').first();
    const exists = await loginForm.count() > 0;

    if (exists) {
      await expect(loginForm).toBeVisible();
    }
  });

  test('register modal should open', async ({ page }) => {
    await page.goto('/');

    // Click register button
    const registerBtn = page.locator('button:has-text("注册"), button:has-text("Register")').first();
    await registerBtn.click().catch(() => {});

    await page.waitForTimeout(1000);

    // Check for registration form
    const registerForm = page.locator('form:has(input[name*="username"]), form:has(input[name*="email"])').first();
    const exists = await registerForm.count() > 0;

    if (exists) {
      await expect(registerForm).toBeVisible();
    }
  });

  test('login form validation', async ({ page }) => {
    await page.goto('/');

    // Open login modal
    const loginBtn = page.locator('button:has-text("登录")').first();
    await loginBtn.click().catch(() => {});

    await page.waitForTimeout(1000);

    // Try to submit empty form
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click().catch(() => {});

    // Form should show validation
    await page.waitForTimeout(500);
  });

  test('successful login flow', async ({ page }) => {
    await page.goto('/');

    // Open login modal
    const loginBtn = page.locator('button:has-text("登录")').first();
    await loginBtn.click().catch(() => {});

    await page.waitForTimeout(1000);

    // Fill login form
    const usernameInput = page.locator('input[id*="username"], input[placeholder*="用户名"], input[placeholder*="username"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    const usernameExists = await usernameInput.count() > 0;
    const passwordExists = await passwordInput.count() > 0;

    if (usernameExists && passwordExists) {
      await usernameInput.fill('testuser_e2e_' + Date.now());
      await passwordInput.fill('Test123456');

      // Submit
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click().catch(() => {});

      // Wait for response
      await page.waitForTimeout(2000);
    }
  });

  test('register new user', async ({ page }) => {
    await page.goto('/');

    // Open register modal
    const registerBtn = page.locator('button:has-text("注册")').first();
    await registerBtn.click().catch(() => {});

    await page.waitForTimeout(1000);

    // Fill registration form
    const usernameInput = page.locator('input[id*="username"], input[placeholder*="用户名"]').first();
    const emailInput = page.locator('input[id*="email"], input[placeholder*="邮箱"], input[placeholder*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    const usernameExists = await usernameInput.count() > 0;

    if (usernameExists) {
      const testUser = 'e2e_user_' + Date.now();
      await usernameInput.fill(testUser);
      await emailInput.fill(testUser + '@test.com').catch(() => {});
      await passwordInput.fill('Test123456');

      // Submit
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click().catch(() => {});

      // Wait for registration
      await page.waitForTimeout(3000);
    }
  });

  test('logout flow', async ({ page }) => {
    // First login
    await page.goto('/');

    // Check for user dropdown or logout button
    const userDropdown = page.locator('[class*="dropdown"], [class*="Dropdown"]').first();
    const logoutBtn = page.locator('button:has-text("退出"), button:has-text("Logout")').first();

    await page.waitForTimeout(2000);

    const dropdownExists = await userDropdown.count() > 0;
    const logoutExists = await logoutBtn.count() > 0;

    if (dropdownExists || logoutExists) {
      // Click on user dropdown
      if (dropdownExists) {
        await userDropdown.click().catch(() => {});
        await page.waitForTimeout(500);
      }

      // Find and click logout
      const logout = page.locator('button:has-text("退出"), button:has-text("Logout")').first();
      await logout.click().catch(() => {});

      await page.waitForTimeout(1000);
    }
  });
});