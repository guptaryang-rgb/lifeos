# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tasks-goals.spec.ts >> F4: Assignment Tracker & Goal System >> F4-T1: Task CRUD Operations
- Location: tests\tasks-goals.spec.ts:17:7

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
  11  | test.describe('F4: Assignment Tracker & Goal System', () => {
  12  | 
  13  |   test.beforeEach(async ({ request }) => {
> 14  |     await request.post('/api/test/reset?seed=true');
      |                   ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3005
  15  |   });
  16  | 
  17  |   test('F4-T1: Task CRUD Operations', async ({ page }) => {
  18  |     await loginUser(page);
  19  |     await page.goto('/goals');
  20  | 
  21  |     // Create
  22  |     await page.click('#btn-add-task');
  23  |     await page.fill('#task-title', 'CS101 Homework');
  24  |     const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  25  |     await page.fill('#task-due', tomorrowStr);
  26  |     await page.selectOption('#task-priority', 'HIGH');
  27  |     await page.fill('#task-effort', '60');
  28  |     await page.click('#task-save');
  29  | 
  30  |     // Verify created
  31  |     const taskItem = page.locator('.task-item', { hasText: 'CS101 Homework' });
  32  |     await expect(taskItem).toBeVisible();
  33  | 
  34  |     // Edit
  35  |     await taskItem.locator('.btn-edit-task').click();
  36  |     await page.fill('#task-title', 'CS101 Essay');
  37  |     await page.click('#task-save');
  38  | 
  39  |     // Verify edited
  40  |     await expect(page.locator('.task-item', { hasText: 'CS101 Essay' })).toBeVisible();
  41  |     await expect(page.locator('.task-item', { hasText: 'CS101 Homework' })).toBeHidden();
  42  | 
  43  |     // Delete
  44  |     await page.locator('.task-item', { hasText: 'CS101 Essay' }).locator('.btn-delete-task').click();
  45  | 
  46  |     // Verify deleted
  47  |     await expect(page.locator('.task-item', { hasText: 'CS101 Essay' })).toBeHidden();
  48  |   });
  49  | 
  50  |   test('F4-T2: Subtask Progress Calculation', async ({ page }) => {
  51  |     await loginUser(page);
  52  |     await page.goto('/goals');
  53  | 
  54  |     // Create task with 4 subtasks
  55  |     await page.click('#btn-add-task');
  56  |     await page.fill('#task-title', 'Subtask Calculation Task');
  57  |     await page.fill('#task-due', '2026-06-30');
  58  |     await page.fill('#task-subtasks-input', 'Sub1, Sub2, Sub3, Sub4');
  59  |     await page.click('#task-save');
  60  | 
  61  |     const taskItem = page.locator('.task-item', { hasText: 'Subtask Calculation Task' });
  62  |     await expect(taskItem).toBeVisible();
  63  | 
  64  |     // Toggle 2 subtasks
  65  |     const subtaskChecks = taskItem.locator('.subtask-item input[type="checkbox"]');
  66  |     await expect(subtaskChecks).toHaveCount(4);
  67  |     
  68  |     await subtaskChecks.nth(0).click();
  69  |     await subtaskChecks.nth(1).click();
  70  | 
  71  |     // Progress updates to 50% and status shows IN_PROGRESS
  72  |     await expect(taskItem.locator('.task-progress')).toHaveAttribute('style', 'width: 50%');
  73  |     await expect(taskItem).toContainText('IN_PROGRESS');
  74  |   });
  75  | 
  76  |   test('F4-T3: Goal and Milestone Creation', async ({ page }) => {
  77  |     await loginUser(page);
  78  |     await page.goto('/goals');
  79  | 
  80  |     // Create goal
  81  |     await page.click('#btn-add-goal');
  82  |     await page.fill('#goal-title', 'Learn Rust');
  83  |     await page.selectOption('#goal-frequency', 'WEEKLY');
  84  |     await page.fill('#goal-due', '2026-07-31');
  85  |     
  86  |     // Add 2 milestones
  87  |     await page.fill('#milestone-title-1', 'Read Book Chapter 1');
  88  |     await page.fill('#milestone-due-1', '2026-07-10');
  89  |     await page.fill('#milestone-title-2', 'Build Guessing Game');
  90  |     await page.fill('#milestone-due-2', '2026-07-20');
  91  | 
  92  |     await page.click('#goal-save');
  93  | 
  94  |     // Verify goal renders
  95  |     const goalItem = page.locator('.goal-item', { hasText: 'Learn Rust' });
  96  |     await expect(goalItem).toBeVisible();
  97  |     await expect(goalItem.locator('.goal-progress')).toHaveAttribute('style', 'width: 0%');
  98  | 
  99  |     // Displays milestones
  100 |     await expect(goalItem.locator('.milestone-item')).toHaveCount(2);
  101 |     await expect(goalItem.locator('.milestone-item').nth(0)).toContainText('Read Book Chapter 1');
  102 |   });
  103 | 
  104 |   test('F4-T4: Task-Goal Auto-Update', async ({ page }) => {
  105 |     await loginUser(page);
  106 |     await page.goto('/goals');
  107 | 
  108 |     // Create Goal first
  109 |     await page.click('#btn-add-goal');
  110 |     await page.fill('#goal-title', 'Automate Life');
  111 |     await page.fill('#goal-due', '2026-07-31');
  112 |     await page.fill('#milestone-title-1', 'Write Script');
  113 |     await page.fill('#milestone-due-1', '2026-07-15');
  114 |     await page.fill('#milestone-title-2', 'Deploy Cron');
```