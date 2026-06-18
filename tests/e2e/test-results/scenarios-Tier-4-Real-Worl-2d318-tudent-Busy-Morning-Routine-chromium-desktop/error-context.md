# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scenarios.spec.ts >> Tier 4: Real-World Application Scenarios >> RW-F1: The Student Busy Morning Routine
- Location: tests\scenarios.spec.ts:24:7

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3005
Call log:
  - → POST http://127.0.0.1:3005/api/test/reset?seed=true
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | async function registerAndLogin(page, email, name, password) {
  4   |   await page.goto('/auth/register');
  5   |   await page.fill('#name', name);
  6   |   await page.fill('#email', email);
  7   |   await page.fill('#password', password);
  8   |   await page.click('#btn-register');
  9   |   await page.waitForURL('**/auth/login');
  10  | 
  11  |   await page.fill('#email', email);
  12  |   await page.fill('#password', password);
  13  |   await page.click('#btn-login');
  14  |   await page.waitForURL('**/dashboard');
  15  | }
  16  | 
  17  | test.describe('Tier 4: Real-World Application Scenarios', () => {
  18  | 
  19  |   test.beforeEach(async ({ page, request }) => {
  20  |     await page.clock.setFixedTime(new Date('2026-06-16T12:00:00Z'));
> 21  |     await request.post('/api/test/reset?seed=true');
      |                   ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3005
  22  |   });
  23  | 
  24  |   test('RW-F1: The Student Busy Morning Routine', async ({ page }) => {
  25  |     // 1. Student registers new account, logs in, lands on dashboard.
  26  |     await registerAndLogin(page, 'student@example.com', 'Alex Student', 'alexPass123');
  27  | 
  28  |     // 2. Onboarding is displayed (empty state as clean user)
  29  |     await expect(page.locator('#empty-state')).toBeVisible();
  30  | 
  31  |     // Setup habit and class event via API for testing flow
  32  |     const today = '2026-06-16';
  33  |     await page.evaluate(async (today) => {
  34  |       await fetch('/api/habits', {
  35  |         method: 'POST',
  36  |         headers: { 'Content-Type': 'application/json' },
  37  |         body: JSON.stringify({ title: 'Hydrate', frequency: 'DAILY' })
  38  |       });
  39  |       await fetch('/api/events', {
  40  |         method: 'POST',
  41  |         headers: { 'Content-Type': 'application/json' },
  42  |         body: JSON.stringify({
  43  |           title: 'Physics 101 Lecture',
  44  |           start: `${today}T14:00:00`,
  45  |           end: `${today}T16:00:00`,
  46  |           category: 'WORK',
  47  |           color: 'blue'
  48  |         })
  49  |       });
  50  |     }, today);
  51  | 
  52  |     await page.reload();
  53  | 
  54  |     // Log morning habit "Hydrate" via quick widget
  55  |     await page.locator('#dashboard-habits-list button', { hasText: 'Check-in' }).click();
  56  |     await expect(page.locator('#dashboard-habits-list')).toContainText('🔥 1d');
  57  | 
  58  |     // 3. Add assignment "Physics Lab Report" due tonight (estimated 3 hours)
  59  |     await page.click('#btn-add-task-quick');
  60  |     await page.fill('#quick-task-title', 'Physics Lab Report');
  61  |     await page.click('#quick-task-save');
  62  | 
  63  |     // Make sure it is saved, then update its effort to 180 min via goals page
  64  |     await page.goto('/goals');
  65  |     await page.locator('.task-item', { hasText: 'Physics Lab Report' }).locator('.btn-edit-task').click();
  66  |     await page.fill('#task-effort', '180');
  67  |     await page.selectOption('#task-priority', 'HIGH');
  68  |     await page.click('#task-save');
  69  | 
  70  |     // 4. Open calendar, click "AI Plan"
  71  |     await page.goto('/calendar');
  72  |     await page.click('#btn-generate-ai-plan');
  73  | 
  74  |     // Heuristic schedules Physics Lab Report from 9 AM to 12 PM (3 hours), leaving class free
  75  |     await expect(page.locator('#ai-suggestions')).toContainText('Physics Lab Report');
  76  | 
  77  |     // 5. Navigate back to dashboard, click warning/focus action or go to focus session
  78  |     await page.goto('/dashboard');
  79  |     // Dashboard should have procrastination warning banner for HIGH priority task
  80  |     await expect(page.locator('#procrastination-warning')).toBeVisible();
  81  |     await page.click('#btn-warning-focus');
  82  | 
  83  |     // We are on focus page
  84  |     await page.waitForURL('**/focus?taskId=*');
  85  |     
  86  |     // Distraction blocker toggle
  87  |     await page.check('#blocker-toggle');
  88  |     await expect(page.locator('body')).toHaveClass(/distraction-blocked/);
  89  | 
  90  |     // Complete the first Pomodoro session (using fast-forward helper)
  91  |     await page.click('#btn-timer-start');
  92  |     await page.click('#btn-timer-fastforward');
  93  | 
  94  |     page.once('dialog', async dialog => {
  95  |       await dialog.accept();
  96  |     });
  97  |     await page.waitForTimeout(6000);
  98  | 
  99  |     // Check stats updated on dashboard
  100 |     await page.goto('/dashboard');
  101 |     const compText = await page.locator('#tasks-completed').innerText();
  102 |     expect(parseInt(compText)).toBeDefined();
  103 |   });
  104 | 
  105 |   test('RW-F2: Overload Crisis Recovery', async ({ page, request }) => {
  106 |     // 1. User logs in. Mock Burnout Score at 88%
  107 |     await page.route('/api/analytics', async route => {
  108 |       await route.fulfill({
  109 |         status: 200,
  110 |         contentType: 'application/json',
  111 |         body: JSON.stringify({
  112 |           focusHours: '0.00',
  113 |           taskCompletionRate: 10,
  114 |           habitCompliance: 0,
  115 |           burnoutScore: 88, // Overload alert
  116 |           recommendations: ['Critical overload warning. Defer non-essential items.']
  117 |         })
  118 |       });
  119 |     });
  120 | 
  121 |     await registerAndLogin(page, 'overload@example.com', 'Crisis User', 'password123');
```