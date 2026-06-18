# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: habits.spec.ts >> F5: Habit Tracker & Progress Analytics >> F5-T7: Custom Days Frequency Streak Calculation
- Location: tests\habits.spec.ts:145:7

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
  11  | test.describe('F5: Habit Tracker & Progress Analytics', () => {
  12  | 
  13  |   test.beforeEach(async ({ page, request }) => {
  14  |     await page.clock.setFixedTime(new Date('2026-06-16T12:00:00Z'));
> 15  |     await request.post('/api/test/reset?seed=true');
      |                   ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3005
  16  |   });
  17  | 
  18  |   test('F5-T1: Habit Creation', async ({ page }) => {
  19  |     await loginUser(page);
  20  |     await page.goto('/habits');
  21  | 
  22  |     await page.click('#btn-add-habit');
  23  |     await page.fill('#habit-title', 'Read 10 Pages');
  24  |     await page.selectOption('#habit-frequency', 'DAILY');
  25  |     await page.click('#habit-save');
  26  | 
  27  |     // Verify in list with 0 streak
  28  |     const item = page.locator('#habits-list > div', { hasText: 'Read 10 Pages' });
  29  |     await expect(item).toBeVisible();
  30  |     await expect(item.locator('.habit-streak')).toContainText('Streak: 0 days');
  31  |   });
  32  | 
  33  |   test('F5-T2: Habit Logging & Streak Increment', async ({ page }) => {
  34  |     await loginUser(page);
  35  |     await page.goto('/habits');
  36  | 
  37  |     // Create a clean habit
  38  |     await page.click('#btn-add-habit');
  39  |     await page.fill('#habit-title', 'Log Streak Habit');
  40  |     await page.selectOption('#habit-frequency', 'DAILY');
  41  |     await page.click('#habit-save');
  42  | 
  43  |     const item = page.locator('#habits-list > div', { hasText: 'Log Streak Habit' });
  44  |     
  45  |     // Toggle checkmark (log today)
  46  |     await item.locator('.habit-checkbox').click();
  47  | 
  48  |     // Streak increments to 1
  49  |     await expect(item.locator('.habit-streak')).toContainText('Streak: 1 days');
  50  | 
  51  |     // Heatmap cell for today should be colored green (active/logged)
  52  |     const todayStr = new Date().toISOString().split('T')[0];
  53  |     const cell = page.locator(`#habit-heatmap > div[title*="${todayStr.slice(0, 7)}"]`).first();
  54  |     // Since today is June, the heatmap default view is February (mocked for simplicity).
  55  |     // Let's verify that a logged cell is colored green
  56  |     const greenCell = page.locator('#habit-heatmap > div.bg-green-500');
  57  |     await expect(greenCell).toBeVisible();
  58  |   });
  59  | 
  60  |   test('F5-T3: Habit Completion Toggle', async ({ page }) => {
  61  |     await loginUser(page);
  62  |     await page.goto('/habits');
  63  | 
  64  |     const item = page.locator('#habits-list > div', { hasText: 'Log Streak Habit' });
  65  |     
  66  |     // Double click to log then unlog
  67  |     await page.click('#btn-add-habit');
  68  |     await page.fill('#habit-title', 'Toggle Habit');
  69  |     await page.click('#habit-save');
  70  | 
  71  |     const toggleItem = page.locator('#habits-list > div', { hasText: 'Toggle Habit' });
  72  |     
  73  |     // Check
  74  |     await toggleItem.locator('.habit-checkbox').click();
  75  |     await expect(toggleItem.locator('.habit-streak')).toContainText('Streak: 1 days');
  76  | 
  77  |     // Uncheck
  78  |     await toggleItem.locator('.habit-checkbox').click();
  79  |     
  80  |     // Decrement back to 0
  81  |     await expect(toggleItem.locator('.habit-streak')).toContainText('Streak: 0 days');
  82  |   });
  83  | 
  84  |   test('F5-T4: Progress Analytics Charts Rendering', async ({ page }) => {
  85  |     await loginUser(page);
  86  |     
  87  |     // Navigate to /analytics
  88  |     await page.goto('/analytics');
  89  | 
  90  |     // Verify interactive charts are present
  91  |     await expect(page.locator('#focus-hours-chart')).toBeVisible();
  92  |     await expect(page.locator('#task-completion-chart')).toBeVisible();
  93  |     await expect(page.locator('#habit-compliance-chart')).toBeVisible();
  94  | 
  95  |     // Verify SVG paths or texts in charts render rates
  96  |     await expect(page.locator('#task-rate-text')).toBeVisible();
  97  |     await expect(page.locator('#habit-rate-text')).toBeVisible();
  98  |   });
  99  | 
  100 |   test('F5-T5: Streak Reset Logic', async ({ page }) => {
  101 |     await loginUser(page);
  102 |     await page.goto('/habits');
  103 | 
  104 |     // Seeded "Hydrate" habit has no log for yesterday/today. Streak should be 0.
  105 |     const hydrate = page.locator('#habits-list > div', { hasText: 'Hydrate' });
  106 |     await expect(hydrate.locator('.habit-streak')).toContainText('Streak: 0 days');
  107 |   });
  108 | 
  109 |   test('F5-T6: Duplicate Daily Log Prevention', async ({ page }) => {
  110 |     await loginUser(page);
  111 |     await page.goto('/habits');
  112 | 
  113 |     // Create a new habit
  114 |     await page.click('#btn-add-habit');
  115 |     await page.fill('#habit-title', 'Duplicate Prevention');
```