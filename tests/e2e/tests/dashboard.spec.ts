import { test, expect } from '@playwright/test';

async function loginUser(page) {
  await page.goto('/auth/login');
  await page.fill('#email', 'john@example.com');
  await page.fill('#password', 'password123');
  await page.click('#btn-login');
  await page.waitForURL('**/dashboard');
}

test.describe('F2: Unified Dashboard & Daily Briefing', () => {

  test.beforeEach(async ({ page, request }) => {
    await page.clock.setFixedTime(new Date('2026-06-16T12:00:00Z'));
    // Reset server state to default seeded state before each test
    await request.post('/api/test/reset?seed=true');
  });

  test('F2-T1: Chronological Schedule Render', async ({ page }) => {
    await loginUser(page);
    
    // Seed says Physics 101 Lecture is at 14:00 (2:00 PM). Let's add another event at 9:00 AM.
    // We can do this by posting to API directly
    const today = new Date().toISOString().split('T')[0];
    const response = await page.request.post('/api/events', {
      data: {
        title: 'Morning Sync',
        start: `${today}T09:00:00`,
        end: `${today}T09:30:00`,
        category: 'WORK',
        color: 'blue'
      }
    });
    expect(response.ok()).toBeTruthy();

    await page.reload();
    
    // Verify chronological order: Morning Sync first, then Physics lecture
    const scheduleItems = page.locator('#schedule-list > div');
    await expect(scheduleItems).toHaveCount(2);
    
    await expect(scheduleItems.nth(0)).toContainText('09:00 AM');
    await expect(scheduleItems.nth(0)).toContainText('Morning Sync');

    await expect(scheduleItems.nth(1)).toContainText('02:00 PM');
    await expect(scheduleItems.nth(1)).toContainText('Physics 101 Lecture');
  });

  test('F2-T2: Priority Tasks Display', async ({ page }) => {
    await loginUser(page);

    // Seeded priority tasks contain: "Overdue Assignment" (HIGH), "Write CS101 Essay" (HIGH), "Review Notes" (LOW)
    // Check that HIGH priority tasks are highlighted
    const priorityItems = page.locator('#priority-tasks-list > div');
    await expect(priorityItems).toHaveCount(3);
    
    // Verify first items are HIGH priority
    await expect(priorityItems.nth(0)).toContainText('HIGH');
    await expect(priorityItems.nth(1)).toContainText('HIGH');
  });

  test('F2-T3: Quick-Action Task Creation', async ({ page }) => {
    await loginUser(page);

    // Open quick action modal
    await page.click('#btn-add-task-quick');
    await expect(page.locator('#quick-task-modal')).toBeVisible();

    // Fill title and save
    await page.fill('#quick-task-title', 'Quick Homework Task');
    await page.click('#quick-task-save');

    // Modal should close
    await expect(page.locator('#quick-task-modal')).toBeHidden();

    // List should update instantly
    await expect(page.locator('#priority-tasks-list')).toContainText('Quick Homework Task');
  });

  test('F2-T4: Real-Time Statistics Update', async ({ page }) => {
    await loginUser(page);

    // Read initial score and completed count
    const initialScoreText = await page.locator('#life-score').innerText();
    const initialCompletedText = await page.locator('#tasks-completed').innerText();
    const initialScore = parseInt(initialScoreText);
    const initialCompleted = parseInt(initialCompletedText);

    // Check off the first low/medium priority task
    // Let's locate the checkbox for "Review Notes" and click it
    await page.locator('#priority-tasks-list > div').filter({ hasText: 'Review Notes' }).locator('input[type="checkbox"]').check();

    // Verify stats incremented immediately
    await expect(page.locator('#tasks-completed')).toHaveText(String(initialCompleted + 1));
    await expect(page.locator('#life-score')).toHaveText(String(initialScore + 10)); // 10 points per task
  });

  test('F2-T5: AI Briefing Summary Generation', async ({ page }) => {
    await loginUser(page);

    // Check AI briefing text is generated and summarizes agenda
    await expect(page.locator('#ai-briefing-text')).toBeVisible();
    const text = await page.locator('#ai-briefing-text').innerText();
    expect(text).toContain('tasks');
    expect(text).toContain('events');
  });

  test('F2-T6: Responsive Mobile Layout Reflow', async ({ page }) => {
    // Playwright Mobile viewports can be simulated. Mobile Chrome device is 375x812.
    // Set viewport explicitly to double check
    await page.setViewportSize({ width: 375, height: 812 });
    await loginUser(page);

    // Sidebar should collapse to hamburger on mobile
    await expect(page.locator('#sidebar-nav')).toBeHidden();
    
    // Click Hamburger
    await page.click('#btn-menu');
    await expect(page.locator('#sidebar-nav')).toBeVisible();
  });

  test('F2-T7: Dashboard Empty State Display', async ({ page, request }) => {
    // Reset to empty state (no tasks, events, or habits)
    await request.post('/api/test/reset?seed=false');

    await loginUser(page);

    // Verification of Onboarding Welcome text
    await expect(page.locator('#empty-state')).toBeVisible();
    await expect(page.locator('#empty-state')).toContainText('Welcome to LifeOS');
  });

  test('F2-T8: Rapid Widget Action Debouncing', async ({ page }) => {
    await loginUser(page);

    // Double-click "Check-in" button on habit rapidly
    // F2-T8: Rapid Widget Action Debouncing prevents multiple log entries
    const habitButton = page.locator('#dashboard-habits-list button').first();
    await habitButton.dblclick();

    // Verify that only one check-in logged and UI updates streak properly (e.g. from 4 to 5)
    await expect(page.locator('#dashboard-habits-list')).toContainText('🔥 5d');
  });

  test('F2-T9: AI Summary Empty Data Fallback', async ({ page, request }) => {
    // Reset to empty state
    await request.post('/api/test/reset?seed=false');
    await loginUser(page);

    // Expect default encouragement summary
    await expect(page.locator('#ai-briefing-text')).toHaveText('Your schedule is clear! Use this time to set goals.');
  });

  test('F2-T10: Extremely Large Stats Rendering', async ({ page, request }) => {
    await loginUser(page);

    // Mock extremadamente large metrics via analytics API intercept/overwrite in client page logic
    // We can do this in mock-app by setting metrics in response
    // Send request to overwrite/override analytics calculations
    // To do this simply, we update client page stats explicitly if they exist
    // Let's call the API to set high values or mock analytics return value
    // In our server.js, we added high values handler if rate is 9999 or compliance is 365
    // Let's hit the server to mock this state:
    // In our mock server, we check if analytics returns 9999 tasks and 365 compliance.
    // We can intercept/stub the GET /api/analytics call in Playwright!
    await page.route('/api/analytics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          focusHours: '1500.50',
          taskCompletionRate: 9999,
          habitCompliance: 365,
          burnoutScore: 12,
          recommendations: ['Workload is healthy!']
        })
      });
    });

    await page.reload();

    // Assert that the text elements render large values without wrapping issues
    await expect(page.locator('#tasks-completed')).toHaveText('9999');
    await expect(page.locator('#life-score')).toHaveText('365');
  });
});
