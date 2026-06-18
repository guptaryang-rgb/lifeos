import { test, expect } from '@playwright/test';

test.describe('F1: Authentication & Access Control', () => {
  
  test.beforeEach(async ({ request }) => {
    // Reset server state to default clean state before each test
    await request.post('/api/test/reset?seed=false');
  });

  test('F1-T1: Successful Registration', async ({ page }) => {
    await page.goto('/auth/register');
    await page.fill('#name', 'Alice Tester');
    await page.fill('#email', 'alice@example.com');
    await page.fill('#password', 'securePass123');
    await page.click('#btn-register');
    
    // Success alert/notification should be visible
    await expect(page.locator('#register-success')).toBeVisible();
    await page.waitForURL('**/auth/login');
  });

  test('F1-T2: Successful Credentials Login', async ({ page }) => {
    // Register first
    await page.goto('/auth/register');
    await page.fill('#name', 'Bob Tester');
    await page.fill('#email', 'bob@example.com');
    await page.fill('#password', 'bobPass123');
    await page.click('#btn-register');
    await page.waitForURL('**/auth/login');

    // Login
    await page.fill('#email', 'bob@example.com');
    await page.fill('#password', 'bobPass123');
    await page.click('#btn-login');

    await page.waitForURL('**/dashboard');
    await expect(page.locator('#user-name')).toHaveText('Bob Tester');
  });

  test('F1-T3: User Logout', async ({ page }) => {
    // Register & Login
    await page.goto('/auth/register');
    await page.fill('#name', 'Charlie');
    await page.fill('#email', 'charlie@example.com');
    await page.fill('#password', 'charliePass');
    await page.click('#btn-register');
    await page.waitForURL('**/auth/login');

    await page.fill('#email', 'charlie@example.com');
    await page.fill('#password', 'charliePass');
    await page.click('#btn-login');
    await page.waitForURL('**/dashboard');

    // Logout
    const btnMenu = page.locator('#btn-menu');
    if (await btnMenu.isVisible()) {
      await btnMenu.click();
    }
    await page.click('#btn-logout');
    await page.waitForURL('**/auth/login');

    // Trying to go back should redirect to login
    await page.goto('/dashboard');
    await page.waitForURL('**/auth/login*');
  });

  test('F1-T4: Protected Route Redirection', async ({ page }) => {
    // Access protected route without log in
    await page.goto('/calendar');
    // Should redirect to login with callbackUrl
    await page.waitForURL(url => url.pathname === '/auth/login' && url.searchParams.get('callbackUrl') === '/calendar');
  });

  test('F1-T5: Protected API Unauthorized Response', async ({ request }) => {
    const res = await request.get('/api/tasks');
    expect(res.status()).toBe(401);
  });

  test('F1-T6: Duplicate Email Registration', async ({ page }) => {
    // Register once
    await page.goto('/auth/register');
    await page.fill('#name', 'Duplicate User');
    await page.fill('#email', 'dup@example.com');
    await page.fill('#password', 'password123');
    await page.click('#btn-register');
    await page.waitForURL('**/auth/login');

    // Try to register again with same email
    await page.goto('/auth/register');
    await page.fill('#name', 'Duplicate User 2');
    await page.fill('#email', 'dup@example.com');
    await page.fill('#password', 'password456');
    await page.click('#btn-register');

    await expect(page.locator('#register-error')).toBeVisible();
    await expect(page.locator('#register-error')).toContainText('Registration Failed: Email already exists');
  });

  test('F1-T7: Invalid Login Credentials', async ({ page }) => {
    // Register
    await page.goto('/auth/register');
    await page.fill('#name', 'Valid User');
    await page.fill('#email', 'valid@example.com');
    await page.fill('#password', 'validpass');
    await page.click('#btn-register');
    await page.waitForURL('**/auth/login');

    // Incorrect password login
    await page.fill('#email', 'valid@example.com');
    await page.fill('#password', 'wrongpass');
    await page.click('#btn-login');

    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page.locator('#login-error')).toContainText('Invalid credentials');
    expect(page.url()).toContain('/auth/login');
  });

  test('F1-T8: Form Fields Validation Constraints', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Short password constraint validation (less than 6 chars)
    await page.fill('#name', 'Short Password User');
    await page.fill('#email', 'short@example.com');
    await page.fill('#password', '12345');
    await page.click('#btn-register');
    await expect(page.locator('#register-error')).toContainText('Password must be at least 6 characters');

    // Malformed email constraint validation (missing domain dot or @)
    await page.fill('#email', 'malformed@com');
    await page.fill('#password', '123456');
    await page.click('#btn-register');
    await expect(page.locator('#register-error')).toContainText('Malformed email');
  });

  test('F1-T9: Expired Session Token Re-authentication', async ({ page }) => {
    // Log in
    await page.goto('/auth/register');
    await page.fill('#name', 'Session User');
    await page.fill('#email', 'session@example.com');
    await page.fill('#password', 'sessionpass');
    await page.click('#btn-register');
    await page.waitForURL('**/auth/login');

    await page.fill('#email', 'session@example.com');
    await page.fill('#password', 'sessionpass');
    await page.click('#btn-login');
    await page.waitForURL('**/dashboard');

    // Mock expired token by calling API logout directly (wiping session server side)
    await page.request.post('/api/logout');

    // Refresh page / click link
    await page.reload();
    await page.waitForURL('**/auth/login*');
  });

  test('F1-T10: API Schema Validation Rejection', async ({ request }) => {
    // Log in to get session
    const loginRes = await request.post('/api/login', {
      data: { email: 'john@example.com', password: 'password123' }
    });
    expect(loginRes.ok()).toBeTruthy();

    // 1. Missing dueDate validation rejection
    const resNoDue = await request.post('/api/tasks', {
      data: { title: 'No due date task', priority: 'MEDIUM' }
    });
    expect(resNoDue.status()).toBe(400);

    // 2. Negative effort validation rejection
    const resNegEffort = await request.post('/api/tasks', {
      data: { title: 'Neg effort task', dueDate: '2026-06-30', effort: -10 }
    });
    expect(resNegEffort.status()).toBe(400);
  });
});
