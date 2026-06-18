# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: focus-burnout.spec.ts >> F6: Deep Work Focus Session & Burnout Heuristics >> F6-T2: Distraction Blocker UI Activation
- Location: tests\focus-burnout.spec.ts:43:7

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3005
Call log:
  - → POST http://127.0.0.1:3005/api/test/reset?seed=true
    - user-agent: Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | async function loginUser(page) {
  4   |   await page.goto('/auth/login');
  5   |   await page.fill('#email', 'john@example.com');
  6   |   await page.fill('#password', 'password123');
  7   |   await page.click('#btn-login');
  8   |   await page.waitForURL('**/dashboard');
  9   | }
  10  | 
  11  | test.describe('F6: Deep Work Focus Session & Burnout Heuristics', () => {
  12  | 
  13  |   test.beforeEach(async ({ page, request }) => {
  14  |     await page.clock.setFixedTime(new Date('2026-06-16T12:00:00Z'));
> 15  |     await request.post('/api/test/reset?seed=true');
      |                   ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3005
  16  |   });
  17  | 
  18  |   test('F6-T1: Pomodoro Focus Timer Control', async ({ page }) => {
  19  |     await loginUser(page);
  20  |     await page.goto('/focus');
  21  | 
  22  |     // Click Start
  23  |     await page.click('#btn-timer-start');
  24  |     await expect(page.locator('#btn-timer-pause')).toBeVisible();
  25  | 
  26  |     // Fast Forward (custom testing button triggers 5s remaining)
  27  |     await page.click('#btn-timer-fastforward');
  28  |     await expect(page.locator('#timer-display')).toHaveText('00:05');
  29  | 
  30  |     // Setup dialog click for alert completed
  31  |     page.once('dialog', async dialog => {
  32  |       expect(dialog.message()).toContain('Completed');
  33  |       await dialog.accept();
  34  |     });
  35  | 
  36  |     // Wait for timer to finish (5 seconds)
  37  |     await page.waitForTimeout(6000);
  38  | 
  39  |     // Verify timer resets and log is written to DB (we can check by listing focus logs)
  40  |     await expect(page.locator('#timer-display')).toHaveText('25:00');
  41  |   });
  42  | 
  43  |   test('F6-T2: Distraction Blocker UI Activation', async ({ page }) => {
  44  |     await loginUser(page);
  45  |     await page.goto('/focus');
  46  | 
  47  |     // Check distraction blocker toggle
  48  |     await page.check('#blocker-toggle');
  49  | 
  50  |     // Page body should have class
  51  |     await expect(page.locator('body')).toHaveClass(/distraction-blocked/);
  52  | 
  53  |     // Uncheck
  54  |     await page.uncheck('#blocker-toggle');
  55  |     await expect(page.locator('body')).not.toHaveClass(/distraction-blocked/);
  56  |   });
  57  | 
  58  |   test('F6-T3: Burnout Score Display', async ({ page }) => {
  59  |     await loginUser(page);
  60  |     await page.goto('/analytics');
  61  | 
  62  |     // Burnout score from seed has some overdue tasks, let's verify score exists
  63  |     const score = page.locator('#burnout-score');
  64  |     await expect(score).toBeVisible();
  65  |     const val = parseInt(await score.innerText());
  66  |     expect(val).toBeGreaterThan(0);
  67  | 
  68  |     // Recommendations list should be populated
  69  |     const recs = page.locator('#burnout-recommendations > li');
  70  |     await expect(recs.first()).toBeVisible();
  71  |   });
  72  | 
  73  |   test('F6-T4: Procrastination Warning Indicator', async ({ page }) => {
  74  |     await loginUser(page);
  75  | 
  76  |     // Seeded has HIGH priority task Write CS101 Essay due today (incomplete)
  77  |     // Verify procrastination warning is visible
  78  |     await expect(page.locator('#procrastination-warning')).toBeVisible();
  79  |     await expect(page.locator('#procrastination-warning')).toContainText('CS101 Essay');
  80  | 
  81  |     // Click warning action button to start focus session
  82  |     await page.click('#btn-warning-focus');
  83  |     await page.waitForURL('**/focus?taskId=*');
  84  |   });
  85  | 
  86  |   test('F6-T5: Task Duration Auto-Estimation', async ({ page }) => {
  87  |     await loginUser(page);
  88  |     await page.goto('/goals');
  89  | 
  90  |     // Open Task Creation
  91  |     await page.click('#btn-add-task');
  92  |     
  93  |     // Type similar title to past task e.g. "Review Notes" (effort was 30 mins)
  94  |     await page.fill('#task-title', 'Review Notes');
  95  |     // Blur input to trigger estimation event
  96  |     await page.locator('#task-title').blur();
  97  | 
  98  |     // Check estimated effort field is pre-filled with 30 mins automatically
  99  |     await expect(page.locator('#task-effort')).toHaveValue('30');
  100 |   });
  101 | 
  102 |   test('F6-T6: Inactive Tab Timer Accuracy', async ({ page }) => {
  103 |     await loginUser(page);
  104 |     await page.goto('/focus');
  105 | 
  106 |     // Start timer
  107 |     await page.click('#btn-timer-start');
  108 |     
  109 |     // Check initial timer display e.g. 25:00
  110 |     await expect(page.locator('#timer-display')).toHaveText('25:00');
  111 | 
  112 |     // Wait a brief moment, then simulate switching tabs or tab inactivity by waiting
  113 |     // Playwright evaluates timestamp difference calculation
  114 |     await page.waitForTimeout(3000);
  115 |     
```