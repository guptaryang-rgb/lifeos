# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> F2: Unified Dashboard & Daily Briefing >> F2-T2: Priority Tasks Display
- Location: tests\dashboard.spec.ts:49:7

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
  3   | async function loginUser(page) {
  4   |   await page.goto('/auth/login');
  5   |   await page.fill('#email', 'john@example.com');
  6   |   await page.fill('#password', 'password123');
  7   |   await page.click('#btn-login');
  8   |   await page.waitForURL('**/dashboard');
  9   | }
  10  | 
  11  | test.describe('F2: Unified Dashboard & Daily Briefing', () => {
  12  | 
  13  |   test.beforeEach(async ({ page, request }) => {
  14  |     await page.clock.setFixedTime(new Date('2026-06-16T12:00:00Z'));
  15  |     // Reset server state to default seeded state before each test
> 16  |     await request.post('/api/test/reset?seed=true');
      |                   ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3005
  17  |   });
  18  | 
  19  |   test('F2-T1: Chronological Schedule Render', async ({ page }) => {
  20  |     await loginUser(page);
  21  |     
  22  |     // Seed says Physics 101 Lecture is at 14:00 (2:00 PM). Let's add another event at 9:00 AM.
  23  |     // We can do this by posting to API directly
  24  |     const today = new Date().toISOString().split('T')[0];
  25  |     const response = await page.request.post('/api/events', {
  26  |       data: {
  27  |         title: 'Morning Sync',
  28  |         start: `${today}T09:00:00`,
  29  |         end: `${today}T09:30:00`,
  30  |         category: 'WORK',
  31  |         color: 'blue'
  32  |       }
  33  |     });
  34  |     expect(response.ok()).toBeTruthy();
  35  | 
  36  |     await page.reload();
  37  |     
  38  |     // Verify chronological order: Morning Sync first, then Physics lecture
  39  |     const scheduleItems = page.locator('#schedule-list > div');
  40  |     await expect(scheduleItems).toHaveCount(2);
  41  |     
  42  |     await expect(scheduleItems.nth(0)).toContainText('09:00 AM');
  43  |     await expect(scheduleItems.nth(0)).toContainText('Morning Sync');
  44  | 
  45  |     await expect(scheduleItems.nth(1)).toContainText('02:00 PM');
  46  |     await expect(scheduleItems.nth(1)).toContainText('Physics 101 Lecture');
  47  |   });
  48  | 
  49  |   test('F2-T2: Priority Tasks Display', async ({ page }) => {
  50  |     await loginUser(page);
  51  | 
  52  |     // Seeded priority tasks contain: "Overdue Assignment" (HIGH), "Write CS101 Essay" (HIGH), "Review Notes" (LOW)
  53  |     // Check that HIGH priority tasks are highlighted
  54  |     const priorityItems = page.locator('#priority-tasks-list > div');
  55  |     await expect(priorityItems).toHaveCount(3);
  56  |     
  57  |     // Verify first items are HIGH priority
  58  |     await expect(priorityItems.nth(0)).toContainText('HIGH');
  59  |     await expect(priorityItems.nth(1)).toContainText('HIGH');
  60  |   });
  61  | 
  62  |   test('F2-T3: Quick-Action Task Creation', async ({ page }) => {
  63  |     await loginUser(page);
  64  | 
  65  |     // Open quick action modal
  66  |     await page.click('#btn-add-task-quick');
  67  |     await expect(page.locator('#quick-task-modal')).toBeVisible();
  68  | 
  69  |     // Fill title and save
  70  |     await page.fill('#quick-task-title', 'Quick Homework Task');
  71  |     await page.click('#quick-task-save');
  72  | 
  73  |     // Modal should close
  74  |     await expect(page.locator('#quick-task-modal')).toBeHidden();
  75  | 
  76  |     // List should update instantly
  77  |     await expect(page.locator('#priority-tasks-list')).toContainText('Quick Homework Task');
  78  |   });
  79  | 
  80  |   test('F2-T4: Real-Time Statistics Update', async ({ page }) => {
  81  |     await loginUser(page);
  82  | 
  83  |     // Read initial score and completed count
  84  |     const initialScoreText = await page.locator('#life-score').innerText();
  85  |     const initialCompletedText = await page.locator('#tasks-completed').innerText();
  86  |     const initialScore = parseInt(initialScoreText);
  87  |     const initialCompleted = parseInt(initialCompletedText);
  88  | 
  89  |     // Check off the first low/medium priority task
  90  |     // Let's locate the checkbox for "Review Notes" and click it
  91  |     await page.locator('#priority-tasks-list > div').filter({ hasText: 'Review Notes' }).locator('input[type="checkbox"]').check();
  92  | 
  93  |     // Verify stats incremented immediately
  94  |     await expect(page.locator('#tasks-completed')).toHaveText(String(initialCompleted + 1));
  95  |     await expect(page.locator('#life-score')).toHaveText(String(initialScore + 10)); // 10 points per task
  96  |   });
  97  | 
  98  |   test('F2-T5: AI Briefing Summary Generation', async ({ page }) => {
  99  |     await loginUser(page);
  100 | 
  101 |     // Check AI briefing text is generated and summarizes agenda
  102 |     await expect(page.locator('#ai-briefing-text')).toBeVisible();
  103 |     const text = await page.locator('#ai-briefing-text').innerText();
  104 |     expect(text).toContain('tasks');
  105 |     expect(text).toContain('events');
  106 |   });
  107 | 
  108 |   test('F2-T6: Responsive Mobile Layout Reflow', async ({ page }) => {
  109 |     // Playwright Mobile viewports can be simulated. Mobile Chrome device is 375x812.
  110 |     // Set viewport explicitly to double check
  111 |     await page.setViewportSize({ width: 375, height: 812 });
  112 |     await loginUser(page);
  113 | 
  114 |     // Sidebar should collapse to hamburger on mobile
  115 |     await expect(page.locator('#sidebar-nav')).toBeHidden();
  116 |     
```