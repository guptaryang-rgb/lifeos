# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: interactions.spec.ts >> Tier 3: Cross-Feature Interactions >> XF-T1: Authentication ↔ Task Data Scoping (Multi-User Isolation)
- Location: tests\interactions.spec.ts:17:7

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
  3   | async function loginWithCredentials(page, email, password) {
  4   |   await page.goto('/auth/login');
  5   |   await page.fill('#email', email);
  6   |   await page.fill('#password', password);
  7   |   await page.click('#btn-login');
  8   |   await page.waitForURL('**/dashboard');
  9   | }
  10  | 
  11  | test.describe('Tier 3: Cross-Feature Interactions', () => {
  12  | 
  13  |   test.beforeEach(async ({ request }) => {
> 14  |     await request.post('/api/test/reset?seed=true');
      |                   ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3005
  15  |   });
  16  | 
  17  |   test('XF-T1: Authentication ↔ Task Data Scoping (Multi-User Isolation)', async ({ page }) => {
  18  |     // 1. User A logs in
  19  |     await page.goto('/auth/register');
  20  |     await page.fill('#name', 'User A');
  21  |     await page.fill('#email', 'usera@example.com');
  22  |     await page.fill('#password', 'password123');
  23  |     await page.click('#btn-register');
  24  |     await page.waitForURL('**/auth/login');
  25  | 
  26  |     await loginWithCredentials(page, 'usera@example.com', 'password123');
  27  | 
  28  |     // User A creates private task
  29  |     await page.goto('/goals');
  30  |     await page.click('#btn-add-task');
  31  |     await page.fill('#task-title', 'User A Private Task');
  32  |     await page.fill('#task-due', '2026-06-30');
  33  |     await page.click('#task-save');
  34  |     await expect(page.locator('.task-item', { hasText: 'User A Private Task' })).toBeVisible();
  35  | 
  36  |     // User A logs out
  37  |     const btnMenu = page.locator('#btn-menu');
  38  |     if (await btnMenu.isVisible()) {
  39  |       await btnMenu.click();
  40  |     }
  41  |     await page.click('#btn-logout');
  42  |     await page.waitForURL('**/auth/login');
  43  | 
  44  |     // 2. User B logs in
  45  |     await page.goto('/auth/register');
  46  |     await page.fill('#name', 'User B');
  47  |     await page.fill('#email', 'userb@example.com');
  48  |     await page.fill('#password', 'password123');
  49  |     await page.click('#btn-register');
  50  |     await page.waitForURL('**/auth/login');
  51  | 
  52  |     await loginWithCredentials(page, 'userb@example.com', 'password123');
  53  | 
  54  |     // User B searches for task
  55  |     await page.goto('/goals');
  56  |     await page.fill('#search-input', 'Private Task');
  57  |     
  58  |     // User B should not see User A's task
  59  |     await expect(page.locator('.task-item')).toHaveCount(0);
  60  |   });
  61  | 
  62  |   test('XF-T2: Task Completion ↔ Goal Milestone ↔ Dashboard Stats Cascade', async ({ page }) => {
  63  |     await loginWithCredentials(page, 'john@example.com', 'password123');
  64  |     await page.goto('/goals');
  65  | 
  66  |     // 1. Create Milestone under Goal
  67  |     await page.click('#btn-add-goal');
  68  |     await page.fill('#goal-title', 'Cascade Goal G1');
  69  |     await page.fill('#goal-due', '2026-07-31');
  70  |     await page.fill('#milestone-title-1', 'Milestone M1');
  71  |     await page.fill('#milestone-due-1', '2026-07-15');
  72  |     await page.click('#goal-save');
  73  | 
  74  |     // 2. Create Task linked to Milestone
  75  |     await page.click('#btn-add-task');
  76  |     await page.fill('#task-title', 'Task T1');
  77  |     await page.fill('#task-due', '2026-07-10');
  78  |     await page.selectOption('#task-linked-milestone', { label: 'Cascade Goal G1 - Milestone M1' });
  79  |     await page.click('#task-save');
  80  | 
  81  |     // 3. Toggle Task to Completed
  82  |     await page.locator('.task-item', { hasText: 'Task T1' }).locator('input[type="checkbox"]').first().click();
  83  | 
  84  |     // Verify milestone progress updates in Goals UI
  85  |     const goalItem = page.locator('.goal-item', { hasText: 'Cascade Goal G1' });
  86  |     await expect(goalItem.locator('.goal-progress')).toHaveAttribute('style', 'width: 100%');
  87  |     await expect(goalItem.locator('.milestone-item', { hasText: 'Milestone M1' })).toContainText('COMPLETED');
  88  | 
  89  |     // 4. Load Dashboard and check stats updated
  90  |     await page.goto('/dashboard');
  91  |     // completed task count is updated
  92  |     const completedText = await page.locator('#tasks-completed').innerText();
  93  |     expect(parseInt(completedText)).toBeGreaterThan(0);
  94  |   });
  95  | 
  96  |   test('XF-T3: Calendar Event Modification ↔ AI Planner Reschedule cascade', async ({ page }) => {
  97  |     await loginWithCredentials(page, 'john@example.com', 'password123');
  98  |     await page.goto('/calendar');
  99  | 
  100 |     // Create a conflict: All-Day Seminar (9 AM - 5 PM)
  101 |     const today = new Date().toISOString().split('T')[0];
  102 |     await page.request.post('/api/events', {
  103 |       data: {
  104 |         title: 'All-Day Seminar',
  105 |         start: `${today}T09:00:00`,
  106 |         end: `${today}T17:00:00`,
  107 |         category: 'WORK',
  108 |         color: 'blue'
  109 |       }
  110 |     });
  111 | 
  112 |     // Run AI Planner
  113 |     await page.click('#btn-generate-ai-plan');
  114 | 
```