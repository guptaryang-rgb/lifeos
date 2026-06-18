# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> F1: Authentication & Access Control >> F1-T5: Protected API Unauthorized Response
- Location: tests\auth.spec.ts:74:7

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3005
Call log:
  - → POST http://127.0.0.1:3005/api/test/reset?seed=false
    - user-agent: Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('F1: Authentication & Access Control', () => {
  4   |   
  5   |   test.beforeEach(async ({ request }) => {
  6   |     // Reset server state to default clean state before each test
> 7   |     await request.post('/api/test/reset?seed=false');
      |                   ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3005
  8   |   });
  9   | 
  10  |   test('F1-T1: Successful Registration', async ({ page }) => {
  11  |     await page.goto('/auth/register');
  12  |     await page.fill('#name', 'Alice Tester');
  13  |     await page.fill('#email', 'alice@example.com');
  14  |     await page.fill('#password', 'securePass123');
  15  |     await page.click('#btn-register');
  16  |     
  17  |     // Success alert/notification should be visible
  18  |     await expect(page.locator('#register-success')).toBeVisible();
  19  |     await page.waitForURL('**/auth/login');
  20  |   });
  21  | 
  22  |   test('F1-T2: Successful Credentials Login', async ({ page }) => {
  23  |     // Register first
  24  |     await page.goto('/auth/register');
  25  |     await page.fill('#name', 'Bob Tester');
  26  |     await page.fill('#email', 'bob@example.com');
  27  |     await page.fill('#password', 'bobPass123');
  28  |     await page.click('#btn-register');
  29  |     await page.waitForURL('**/auth/login');
  30  | 
  31  |     // Login
  32  |     await page.fill('#email', 'bob@example.com');
  33  |     await page.fill('#password', 'bobPass123');
  34  |     await page.click('#btn-login');
  35  | 
  36  |     await page.waitForURL('**/dashboard');
  37  |     await expect(page.locator('#user-name')).toHaveText('Bob Tester');
  38  |   });
  39  | 
  40  |   test('F1-T3: User Logout', async ({ page }) => {
  41  |     // Register & Login
  42  |     await page.goto('/auth/register');
  43  |     await page.fill('#name', 'Charlie');
  44  |     await page.fill('#email', 'charlie@example.com');
  45  |     await page.fill('#password', 'charliePass');
  46  |     await page.click('#btn-register');
  47  |     await page.waitForURL('**/auth/login');
  48  | 
  49  |     await page.fill('#email', 'charlie@example.com');
  50  |     await page.fill('#password', 'charliePass');
  51  |     await page.click('#btn-login');
  52  |     await page.waitForURL('**/dashboard');
  53  | 
  54  |     // Logout
  55  |     const btnMenu = page.locator('#btn-menu');
  56  |     if (await btnMenu.isVisible()) {
  57  |       await btnMenu.click();
  58  |     }
  59  |     await page.click('#btn-logout');
  60  |     await page.waitForURL('**/auth/login');
  61  | 
  62  |     // Trying to go back should redirect to login
  63  |     await page.goto('/dashboard');
  64  |     await page.waitForURL('**/auth/login*');
  65  |   });
  66  | 
  67  |   test('F1-T4: Protected Route Redirection', async ({ page }) => {
  68  |     // Access protected route without log in
  69  |     await page.goto('/calendar');
  70  |     // Should redirect to login with callbackUrl
  71  |     await page.waitForURL(url => url.pathname === '/auth/login' && url.searchParams.get('callbackUrl') === '/calendar');
  72  |   });
  73  | 
  74  |   test('F1-T5: Protected API Unauthorized Response', async ({ request }) => {
  75  |     const res = await request.get('/api/tasks');
  76  |     expect(res.status()).toBe(401);
  77  |   });
  78  | 
  79  |   test('F1-T6: Duplicate Email Registration', async ({ page }) => {
  80  |     // Register once
  81  |     await page.goto('/auth/register');
  82  |     await page.fill('#name', 'Duplicate User');
  83  |     await page.fill('#email', 'dup@example.com');
  84  |     await page.fill('#password', 'password123');
  85  |     await page.click('#btn-register');
  86  |     await page.waitForURL('**/auth/login');
  87  | 
  88  |     // Try to register again with same email
  89  |     await page.goto('/auth/register');
  90  |     await page.fill('#name', 'Duplicate User 2');
  91  |     await page.fill('#email', 'dup@example.com');
  92  |     await page.fill('#password', 'password456');
  93  |     await page.click('#btn-register');
  94  | 
  95  |     await expect(page.locator('#register-error')).toBeVisible();
  96  |     await expect(page.locator('#register-error')).toContainText('Registration Failed: Email already exists');
  97  |   });
  98  | 
  99  |   test('F1-T7: Invalid Login Credentials', async ({ page }) => {
  100 |     // Register
  101 |     await page.goto('/auth/register');
  102 |     await page.fill('#name', 'Valid User');
  103 |     await page.fill('#email', 'valid@example.com');
  104 |     await page.fill('#password', 'validpass');
  105 |     await page.click('#btn-register');
  106 |     await page.waitForURL('**/auth/login');
  107 | 
```