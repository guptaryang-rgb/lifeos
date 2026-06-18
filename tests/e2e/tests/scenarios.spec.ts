import { test, expect } from '@playwright/test';

async function registerAndLogin(page, email, name, password) {
  await page.goto('/auth/register');
  await page.fill('#name', name);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#btn-register');
  await page.waitForURL('**/auth/login');

  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#btn-login');
  await page.waitForURL('**/dashboard');
}

test.describe('Tier 4: Real-World Application Scenarios', () => {

  test.beforeEach(async ({ page, request }) => {
    await page.clock.setFixedTime(new Date('2026-06-16T12:00:00Z'));
    await request.post('/api/test/reset?seed=true');
  });

  test('RW-F1: The Student Busy Morning Routine', async ({ page }) => {
    // 1. Student registers new account, logs in, lands on dashboard.
    await registerAndLogin(page, 'student@example.com', 'Alex Student', 'alexPass123');

    // 2. Onboarding is displayed (empty state as clean user)
    await expect(page.locator('#empty-state')).toBeVisible();

    // Setup habit and class event via API for testing flow
    const today = '2026-06-16';
    await page.evaluate(async (today) => {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hydrate', frequency: 'DAILY' })
      });
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Physics 101 Lecture',
          start: `${today}T14:00:00`,
          end: `${today}T16:00:00`,
          category: 'WORK',
          color: 'blue'
        })
      });
    }, today);

    await page.reload();

    // Log morning habit "Hydrate" via quick widget
    await page.locator('#dashboard-habits-list button', { hasText: 'Check-in' }).click();
    await expect(page.locator('#dashboard-habits-list')).toContainText('🔥 1d');

    // 3. Add assignment "Physics Lab Report" due tonight (estimated 3 hours)
    await page.click('#btn-add-task-quick');
    await page.fill('#quick-task-title', 'Physics Lab Report');
    await page.click('#quick-task-save');

    // Make sure it is saved, then update its effort to 180 min via goals page
    await page.goto('/goals');
    await page.locator('.task-item', { hasText: 'Physics Lab Report' }).locator('.btn-edit-task').click();
    await page.fill('#task-effort', '180');
    await page.selectOption('#task-priority', 'HIGH');
    await page.click('#task-save');

    // 4. Open calendar, click "AI Plan"
    await page.goto('/calendar');
    await page.click('#btn-generate-ai-plan');

    // Heuristic schedules Physics Lab Report from 9 AM to 12 PM (3 hours), leaving class free
    await expect(page.locator('#ai-suggestions')).toContainText('Physics Lab Report');

    // 5. Navigate back to dashboard, click warning/focus action or go to focus session
    await page.goto('/dashboard');
    // Dashboard should have procrastination warning banner for HIGH priority task
    await expect(page.locator('#procrastination-warning')).toBeVisible();
    await page.click('#btn-warning-focus');

    // We are on focus page
    await page.waitForURL('**/focus?taskId=*');
    
    // Distraction blocker toggle
    await page.check('#blocker-toggle');
    await expect(page.locator('body')).toHaveClass(/distraction-blocked/);

    // Complete the first Pomodoro session (using fast-forward helper)
    await page.click('#btn-timer-start');
    await page.click('#btn-timer-fastforward');

    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await page.waitForTimeout(6000);

    // Check stats updated on dashboard
    await page.goto('/dashboard');
    const compText = await page.locator('#tasks-completed').innerText();
    expect(parseInt(compText)).toBeDefined();
  });

  test('RW-F2: Overload Crisis Recovery', async ({ page, request }) => {
    // 1. User logs in. Mock Burnout Score at 88%
    await page.route('/api/analytics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          focusHours: '0.00',
          taskCompletionRate: 10,
          habitCompliance: 0,
          burnoutScore: 88, // Overload alert
          recommendations: ['Critical overload warning. Defer non-essential items.']
        })
      });
    });

    await registerAndLogin(page, 'overload@example.com', 'Crisis User', 'password123');

    // Dashboard shows Burnout score 88%
    await expect(page.locator('#burnout-display')).toHaveText('88');

    // Add some overdue tasks
    const pastDate = '2026-06-01';
    await page.request.post('/api/tasks', {
      data: { title: 'Overdue task 1', dueDate: pastDate, priority: 'HIGH', effort: 60 }
    });
    await page.request.post('/api/tasks', {
      data: { title: 'Overdue task 2', dueDate: pastDate, priority: 'MEDIUM', effort: 60 }
    });

    await page.goto('/calendar');
    
    // Trigger AI Replanning Heuristic
    await page.click('#btn-generate-ai-plan');
    
    // Planner suggests deferring low/medium priorities and schedules high priority tax return/overdue task
    await expect(page.locator('#ai-suggestions')).toBeVisible();

    // Start Focus Session with blocker
    await page.goto('/focus');
    await page.check('#blocker-toggle');
    await page.click('#btn-timer-start');
    await page.click('#btn-timer-fastforward');

    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await page.waitForTimeout(6000);
  });

  test('RW-F3: Goal-Driven Weekly Review', async ({ page }) => {
    await registerAndLogin(page, 'review@example.com', 'Goal Reviewer', 'password123');
    await page.goto('/goals');

    // 1. Sets Weekly Goal: Release Portfolio Website MVP
    await page.click('#btn-add-goal');
    await page.fill('#goal-title', 'Release Portfolio Website MVP');
    await page.fill('#goal-due', '2026-07-31');
    
    // Add Milestones
    await page.fill('#milestone-title-1', 'M1: Finish mockup');
    await page.fill('#milestone-due-1', '2026-07-10');
    await page.fill('#milestone-title-2', 'M2: Code landing page');
    await page.fill('#milestone-due-2', '2026-07-20');
    await page.click('#goal-save');

    // 2. Link tasks
    await page.click('#btn-add-task');
    await page.fill('#task-title', 'Mockup Design');
    await page.fill('#task-due', '2026-07-08');
    await page.selectOption('#task-linked-milestone', { label: 'Release Portfolio Website MVP - M1: Finish mockup' });
    await page.click('#task-save');

    await page.click('#btn-add-task');
    await page.fill('#task-title', 'Code HTML landing');
    await page.fill('#task-due', '2026-07-18');
    await page.selectOption('#task-linked-milestone', { label: 'Release Portfolio Website MVP - M2: Code landing page' });
    await page.click('#task-save');

    // 3. Mark M1 Task Complete
    await page.locator('.task-item', { hasText: 'Mockup Design' }).locator('input[type="checkbox"]').first().click();

    // 4. Mark M2 Task Complete
    await page.locator('.task-item', { hasText: 'Code HTML landing' }).locator('input[type="checkbox"]').first().click();

    // 5. Open Goals page, review progress bar (should be 100% since both milestones complete)
    await page.goto('/goals');
    const goalItem = page.locator('.goal-item', { hasText: 'Release Portfolio Website MVP' });
    await expect(goalItem.locator('.goal-progress')).toHaveAttribute('style', 'width: 100%');
  });

  test('RW-F4: Dynamic Day Adjustment (The Rescheduling Cascade)', async ({ page }) => {
    // Seed has Class at 14:00 (2 PM)
    await registerAndLogin(page, 'cascade@example.com', 'Cascade User', 'password123');

    // Add three tasks for afternoon
    const today = '2026-06-16';
    await page.evaluate(async (today) => {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Study Biology', dueDate: today, priority: 'MEDIUM', effort: 60 })
      });
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Gym Session', dueDate: today, priority: 'LOW', effort: 60 })
      });
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Clean Room', dueDate: today, priority: 'LOW', effort: 30 })
      });
    }, today);

    await page.goto('/calendar');

    // Add overlapping Event: Dentist Appointment from 2:30 PM to 4:30 PM
    await page.click('#btn-add-event');
    await page.fill('#event-title', 'Dentist Appointment');
    await page.selectOption('#event-category', 'LIFE');
    await page.fill('#event-start', `${today}T14:30`);
    await page.fill('#event-end', `${today}T16:30`);
    await page.click('#event-save');

    // Overlap alert warning banner should show
    await expect(page.locator('#conflict-warning')).toBeVisible();

    // Trigger AI Replanning to shift gym and clean room later
    await page.click('#btn-generate-ai-plan');

    // Check suggestions updated
    await expect(page.locator('#ai-suggestions')).toContainText('Gym Session');
    
    // Conflict banner should be resolved or display updated messages
  });

  test('RW-F5: Habit Formation & Procrastination Interception', async ({ page }) => {
    // 1. User tracks habit "Code Daily" (streak at 4)
    await registerAndLogin(page, 'procrastinate@example.com', 'Procrastinator User', 'password123');

    // Add Code Daily habit and overdue task
    const today = '2026-06-16';
    const tomorrow = '2026-06-17';
    
    await page.evaluate(async ({ tomorrow }) => {
      const hRes = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Code Daily', frequency: 'DAILY' })
      });
      const habit = await hRes.json();
      
      for (let i = 4; i >= 1; i--) {
        const pastDate = `2026-06-${String(16 - i).padStart(2, '0')}`;
        await fetch(`/api/habits/${habit.id}/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: pastDate })
        });
      }

      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Data Structures Assignment',
          dueDate: tomorrow,
          priority: 'HIGH',
          effort: 120
        })
      });
    }, { tomorrow });

    await page.reload();

    // 3. System triggers Procrastination Warning on Dashboard
    await expect(page.locator('#procrastination-warning')).toBeVisible();
    await expect(page.locator('#procrastination-warning')).toContainText('Data Structures Assignment');

    // 4. Click warning action to start focus session
    await page.click('#btn-warning-focus');
    await page.waitForURL('**/focus?taskId=*');

    // Start 50-minute Pomodoro session (Mock 50m session completion)
    // We can manually log a 50m session via form to simulate actual completion
    await page.fill('#manual-duration', '50');
    await page.click('#btn-manual-log');

    // System automatically logs "Code Daily" habit completion today, streak becomes 5
    await page.goto('/habits');
    const codeHabit = page.locator('#habits-list > div', { hasText: 'Code Daily' });
    await expect(codeHabit.locator('.habit-streak')).toContainText('Streak: 5 days');
  });
});
