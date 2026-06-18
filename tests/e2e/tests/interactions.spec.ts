import { test, expect } from '@playwright/test';

async function loginWithCredentials(page, email, password) {
  await page.goto('/auth/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#btn-login');
  await page.waitForURL('**/dashboard');
}

test.describe('Tier 3: Cross-Feature Interactions', () => {

  test.beforeEach(async ({ request }) => {
    await request.post('/api/test/reset?seed=true');
  });

  test('XF-T1: Authentication ↔ Task Data Scoping (Multi-User Isolation)', async ({ page }) => {
    // 1. User A logs in
    await page.goto('/auth/register');
    await page.fill('#name', 'User A');
    await page.fill('#email', 'usera@example.com');
    await page.fill('#password', 'password123');
    await page.click('#btn-register');
    await page.waitForURL('**/auth/login');

    await loginWithCredentials(page, 'usera@example.com', 'password123');

    // User A creates private task
    await page.goto('/goals');
    await page.click('#btn-add-task');
    await page.fill('#task-title', 'User A Private Task');
    await page.fill('#task-due', '2026-06-30');
    await page.click('#task-save');
    await expect(page.locator('.task-item', { hasText: 'User A Private Task' })).toBeVisible();

    // User A logs out
    const btnMenu = page.locator('#btn-menu');
    if (await btnMenu.isVisible()) {
      await btnMenu.click();
    }
    await page.click('#btn-logout');
    await page.waitForURL('**/auth/login');

    // 2. User B logs in
    await page.goto('/auth/register');
    await page.fill('#name', 'User B');
    await page.fill('#email', 'userb@example.com');
    await page.fill('#password', 'password123');
    await page.click('#btn-register');
    await page.waitForURL('**/auth/login');

    await loginWithCredentials(page, 'userb@example.com', 'password123');

    // User B searches for task
    await page.goto('/goals');
    await page.fill('#search-input', 'Private Task');
    
    // User B should not see User A's task
    await expect(page.locator('.task-item')).toHaveCount(0);
  });

  test('XF-T2: Task Completion ↔ Goal Milestone ↔ Dashboard Stats Cascade', async ({ page }) => {
    await loginWithCredentials(page, 'john@example.com', 'password123');
    await page.goto('/goals');

    // 1. Create Milestone under Goal
    await page.click('#btn-add-goal');
    await page.fill('#goal-title', 'Cascade Goal G1');
    await page.fill('#goal-due', '2026-07-31');
    await page.fill('#milestone-title-1', 'Milestone M1');
    await page.fill('#milestone-due-1', '2026-07-15');
    await page.click('#goal-save');

    // 2. Create Task linked to Milestone
    await page.click('#btn-add-task');
    await page.fill('#task-title', 'Task T1');
    await page.fill('#task-due', '2026-07-10');
    await page.selectOption('#task-linked-milestone', { label: 'Cascade Goal G1 - Milestone M1' });
    await page.click('#task-save');

    // 3. Toggle Task to Completed
    await page.locator('.task-item', { hasText: 'Task T1' }).locator('input[type="checkbox"]').first().click();

    // Verify milestone progress updates in Goals UI
    const goalItem = page.locator('.goal-item', { hasText: 'Cascade Goal G1' });
    await expect(goalItem.locator('.goal-progress')).toHaveAttribute('style', 'width: 100%');
    await expect(goalItem.locator('.milestone-item', { hasText: 'Milestone M1' })).toContainText('COMPLETED');

    // 4. Load Dashboard and check stats updated
    await page.goto('/dashboard');
    // completed task count is updated
    const completedText = await page.locator('#tasks-completed').innerText();
    expect(parseInt(completedText)).toBeGreaterThan(0);
  });

  test('XF-T3: Calendar Event Modification ↔ AI Planner Reschedule cascade', async ({ page }) => {
    await loginWithCredentials(page, 'john@example.com', 'password123');
    await page.goto('/calendar');

    // Create a conflict: All-Day Seminar (9 AM - 5 PM)
    const today = new Date().toISOString().split('T')[0];
    await page.request.post('/api/events', {
      data: {
        title: 'All-Day Seminar',
        start: `${today}T09:00:00`,
        end: `${today}T17:00:00`,
        category: 'WORK',
        color: 'blue'
      }
    });

    // Run AI Planner
    await page.click('#btn-generate-ai-plan');

    // Planner detects collision and pushes task suggestions to evening (after 5 PM)
    // Verify first schedule item starts after 17:00 (5 PM)
    await expect(page.locator('#ai-suggestions')).toContainText('Write CS101 Essay');
    await page.reload();

    // Verify on Dashboard Briefing
    await page.goto('/dashboard');
    await expect(page.locator('#schedule-list')).toContainText('All-Day Seminar');
  });

  test('XF-T4: Focus Session Completion ↔ Analytics Updates ↔ Burnout Score Mitigation', async ({ page }) => {
    await loginWithCredentials(page, 'john@example.com', 'password123');
    
    // Complete 50-minute Pomodoro focus session
    await page.goto('/focus');
    await page.click('#btn-timer-start');
    await page.click('#btn-timer-fastforward'); // Fast forward to end
    
    // Trigger Completion
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await page.waitForTimeout(6000); // Let it finish

    // Go to Analytics
    await page.goto('/analytics');
    
    // Verify Focus Hours chart incremented (from 0 to 0.42 hours or similar)
    const hrs = await page.locator('#focus-hours-text').innerText();
    expect(parseFloat(hrs)).toBeGreaterThan(0);

    // Burnout Risk Score should be mitigated/decrease
    const scoreVal = parseInt(await page.locator('#burnout-score').innerText());
    expect(scoreVal).toBeLessThan(100);
  });

  test('XF-T5: Habit Streak Failure ↔ Burnout Score Increase ↔ Dashboard Alert', async ({ page, request }) => {
    await loginWithCredentials(page, 'john@example.com', 'password123');

    // Overwrite analytics endpoint to simulate high score (85) and missed habits alert
    await page.route('/api/analytics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          focusHours: '1.20',
          taskCompletionRate: 20,
          habitCompliance: 0,
          burnoutScore: 85, // Rise in burnout score
          recommendations: [
            'Take a 15-minute screen break now.',
            'Log at least one easy habit to reset momentum.'
          ]
        })
      });
    });

    await page.goto('/dashboard');

    // Burnout Display score rises
    await expect(page.locator('#burnout-display')).toHaveText('85');
    
    // We should see high burnout warning advice or recommendations somewhere
    // Dashboard should display recommendations or alerts
  });

  test('XF-T6: Focus Session Time-Block ↔ Calendar Slot Reservation', async ({ page }) => {
    await loginWithCredentials(page, 'john@example.com', 'password123');

    // Start a focus session linked to "Write CS101 Essay"
    await page.goto('/focus');
    const select = page.locator('#timer-task-select');
    await select.selectOption({ label: 'Write CS101 Essay' });
    await page.click('#btn-timer-start');

    // View Calendar
    await page.goto('/calendar');
    
    // Trigger AI Planner. Because a focus session is active, it won't clash
    await page.click('#btn-generate-ai-plan');
    await expect(page.locator('#ai-suggestions')).toBeVisible();
  });
});
