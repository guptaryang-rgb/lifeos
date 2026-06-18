import { test, expect } from '@playwright/test';

async function loginUser(page) {
  await page.goto('/auth/login');
  await page.fill('#email', 'john@example.com');
  await page.fill('#password', 'password123');
  await page.click('#btn-login');
  await page.waitForURL('**/dashboard');
}

test.describe('F4: Assignment Tracker & Goal System', () => {

  test.beforeEach(async ({ request }) => {
    await request.post('/api/test/reset?seed=true');
  });

  test('F4-T1: Task CRUD Operations', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');

    // Create
    await page.click('#btn-add-task');
    await page.fill('#task-title', 'CS101 Homework');
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    await page.fill('#task-due', tomorrowStr);
    await page.selectOption('#task-priority', 'HIGH');
    await page.fill('#task-effort', '60');
    await page.click('#task-save');

    // Verify created
    const taskItem = page.locator('.task-item', { hasText: 'CS101 Homework' });
    await expect(taskItem).toBeVisible();

    // Edit
    await taskItem.locator('.btn-edit-task').click();
    await page.fill('#task-title', 'CS101 Essay');
    await page.click('#task-save');

    // Verify edited
    await expect(page.locator('.task-item', { hasText: 'CS101 Essay' })).toBeVisible();
    await expect(page.locator('.task-item', { hasText: 'CS101 Homework' })).toBeHidden();

    // Delete
    await page.locator('.task-item', { hasText: 'CS101 Essay' }).locator('.btn-delete-task').click();

    // Verify deleted
    await expect(page.locator('.task-item', { hasText: 'CS101 Essay' })).toBeHidden();
  });

  test('F4-T2: Subtask Progress Calculation', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');

    // Create task with 4 subtasks
    await page.click('#btn-add-task');
    await page.fill('#task-title', 'Subtask Calculation Task');
    await page.fill('#task-due', '2026-06-30');
    await page.fill('#task-subtasks-input', 'Sub1, Sub2, Sub3, Sub4');
    await page.click('#task-save');

    const taskItem = page.locator('.task-item', { hasText: 'Subtask Calculation Task' });
    await expect(taskItem).toBeVisible();

    // Toggle 2 subtasks
    const subtaskChecks = taskItem.locator('.subtask-item input[type="checkbox"]');
    await expect(subtaskChecks).toHaveCount(4);
    
    await subtaskChecks.nth(0).click();
    await subtaskChecks.nth(1).click();

    // Progress updates to 50% and status shows IN_PROGRESS
    await expect(taskItem.locator('.task-progress')).toHaveAttribute('style', 'width: 50%');
    await expect(taskItem).toContainText('IN_PROGRESS');
  });

  test('F4-T3: Goal and Milestone Creation', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');

    // Create goal
    await page.click('#btn-add-goal');
    await page.fill('#goal-title', 'Learn Rust');
    await page.selectOption('#goal-frequency', 'WEEKLY');
    await page.fill('#goal-due', '2026-07-31');
    
    // Add 2 milestones
    await page.fill('#milestone-title-1', 'Read Book Chapter 1');
    await page.fill('#milestone-due-1', '2026-07-10');
    await page.fill('#milestone-title-2', 'Build Guessing Game');
    await page.fill('#milestone-due-2', '2026-07-20');

    await page.click('#goal-save');

    // Verify goal renders
    const goalItem = page.locator('.goal-item', { hasText: 'Learn Rust' });
    await expect(goalItem).toBeVisible();
    await expect(goalItem.locator('.goal-progress')).toHaveAttribute('style', 'width: 0%');

    // Displays milestones
    await expect(goalItem.locator('.milestone-item')).toHaveCount(2);
    await expect(goalItem.locator('.milestone-item').nth(0)).toContainText('Read Book Chapter 1');
  });

  test('F4-T4: Task-Goal Auto-Update', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');

    // Create Goal first
    await page.click('#btn-add-goal');
    await page.fill('#goal-title', 'Automate Life');
    await page.fill('#goal-due', '2026-07-31');
    await page.fill('#milestone-title-1', 'Write Script');
    await page.fill('#milestone-due-1', '2026-07-15');
    await page.fill('#milestone-title-2', 'Deploy Cron');
    await page.fill('#milestone-due-2', '2026-07-25');
    await page.click('#goal-save');

    // Wait for Goal to appear in UI and ensure dropdown options populate
    await expect(page.locator('.goal-item', { hasText: 'Automate Life' })).toBeVisible();

    // Create Task linked to Milestone 1
    await page.click('#btn-add-task');
    await page.fill('#task-title', 'Write Python script for automation');
    await page.fill('#task-due', '2026-07-10');
    
    // Select linked milestone in dropdown
    await page.selectOption('#task-linked-milestone', { label: 'Automate Life - Write Script' });
    await page.click('#task-save');

    // Toggle task to completed
    const taskItem = page.locator('.task-item', { hasText: 'Write Python script for automation' });
    await taskItem.locator('input[type="checkbox"]').first().check();

    // Verify Goal progress is now 50%
    const goalItem = page.locator('.goal-item', { hasText: 'Automate Life' });
    await expect(goalItem.locator('.goal-progress')).toHaveAttribute('style', 'width: 50%');

    // Milestone 1 shows completed
    await expect(goalItem.locator('.milestone-item', { hasText: 'Write Script' })).toContainText('COMPLETED');
  });

  test('F4-T5: Task Filtering, Sorting, and Search', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');

    // Seed has tasks: CS101 Essay (HIGH), Overdue Assignment (HIGH), Review Notes (LOW)
    // Add "Math Homework" (HIGH) and "Chemistry Quiz" (LOW)
    const today = '2026-06-16';
    await page.evaluate(async (today) => {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Math Homework', dueDate: today, priority: 'HIGH', effort: 60 })
      });
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Chemistry Quiz', dueDate: today, priority: 'LOW', effort: 30 })
      });
    }, today);

    await page.reload();

    // Search for "Math"
    await page.fill('#search-input', 'Math');
    
    // Should display only Math Homework
    const taskItems = page.locator('#tasks-list > .task-item');
    await expect(taskItems).toHaveCount(1);
    await expect(taskItems.first()).toContainText('Math Homework');

    // Clear search
    await page.fill('#search-input', '');

    // Filter by HIGH priority
    await page.selectOption('#filter-priority', 'HIGH');
    // Seed has 2 HIGH + Math Homework = 3
    await expect(page.locator('#tasks-list > .task-item')).toHaveCount(3);
    
    // Sort by Due Date
    await page.selectOption('#sort-by', 'dueDate');
    // Ensure chronological order
    // Overdue is earliest
    await expect(page.locator('#tasks-list > .task-item').first()).toContainText('Overdue Assignment');
  });

  test('F4-T6: Task Created with Past Due Date', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');

    await page.click('#btn-add-task');
    await page.fill('#task-title', 'Late Task Entry');
    await page.fill('#task-due', '2026-06-01'); // Past date
    await page.click('#task-save');

    // Task is created and marked OVERDUE
    const taskItem = page.locator('.task-item', { hasText: 'Late Task Entry' });
    await expect(taskItem).toBeVisible();
    await expect(taskItem).toContainText('OVERDUE');
  });

  test('F4-T7: Subtask Completion Cascading', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');

    // Create task with subtasks
    await page.click('#btn-add-task');
    await page.fill('#task-title', 'Cascade Task');
    await page.fill('#task-due', '2026-06-30');
    await page.fill('#task-subtasks-input', 'S1, S2, S3, S4');
    await page.click('#task-save');

    const taskItem = page.locator('.task-item', { hasText: 'Cascade Task' });

    // Check all subtasks
    const subtaskChecks = taskItem.locator('.subtask-item input[type="checkbox"]');
    await subtaskChecks.nth(0).check();
    await subtaskChecks.nth(1).check();
    await subtaskChecks.nth(2).check();
    await subtaskChecks.nth(3).check();

    // Status shifts to COMPLETED
    await expect(taskItem).toContainText('COMPLETED');

    // Uncheck one
    await subtaskChecks.nth(3).uncheck();
    // Status returns to IN_PROGRESS
    await expect(taskItem).toContainText('IN_PROGRESS');
  });

  test('F4-T8: Goal Deletion Integrity', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');

    // Create Goal
    await page.click('#btn-add-goal');
    await page.fill('#goal-title', 'Goal to Delete');
    await page.fill('#goal-due', '2026-07-31');
    await page.fill('#milestone-title-1', 'Milestone M1');
    await page.fill('#milestone-due-1', '2026-07-15');
    await page.click('#goal-save');

    // Create Task linked to M1
    await page.click('#btn-add-task');
    await page.fill('#task-title', 'Task linked to deleted goal');
    await page.fill('#task-due', '2026-07-10');
    await page.selectOption('#task-linked-milestone', { label: 'Goal to Delete - Milestone M1' });
    await page.click('#task-save');

    // Delete Goal
    const goalItem = page.locator('.goal-item', { hasText: 'Goal to Delete' });
    await goalItem.locator('.btn-delete-goal').click();

    // Goal is deleted
    await expect(goalItem).toBeHidden();

    // Task is preserved, and displays normally
    const taskItem = page.locator('.task-item', { hasText: 'Task linked to deleted goal' });
    await expect(taskItem).toBeVisible();
  });

  test('F4-T9: Special Characters Search Safety', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');

    // Type regex symbols in search
    await page.fill('#search-input', '%_.*[a-z]');
    
    // Verification: Search does not crash
    await expect(page.locator('#tasks-list')).toBeVisible();
  });

  test('F4-T10: Milestone Boundary Values', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');

    // Create goal with milestone due date exceeding goal target date
    await page.click('#btn-add-goal');
    await page.fill('#goal-title', 'Goal Limit Test');
    await page.fill('#goal-due', '2026-07-10'); // goal target date
    
    await page.fill('#milestone-title-1', 'M1 Out of bounds');
    await page.fill('#milestone-due-1', '2026-07-20'); // milestone target date is after goal
    await page.click('#goal-save');

    // Rejected with error
    await expect(page.locator('#goal-error')).toBeVisible();
    await expect(page.locator('#goal-error')).toContainText('Milestone target date cannot exceed parent goal target date');
  });
});
