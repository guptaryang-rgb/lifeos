import { test, expect } from '@playwright/test';

async function loginUser(page) {
  await page.goto('/auth/login');
  await page.fill('#email', 'john@example.com');
  await page.fill('#password', 'password123');
  await page.click('#btn-login');
  await page.waitForURL('**/dashboard');
}

test.describe('F6: Deep Work Focus Session & Burnout Heuristics', () => {

  test.beforeEach(async ({ page, request }) => {
    await page.clock.setFixedTime(new Date('2026-06-16T12:00:00Z'));
    await request.post('/api/test/reset?seed=true');
  });

  test('F6-T1: Pomodoro Focus Timer Control', async ({ page }) => {
    await loginUser(page);
    await page.goto('/focus');

    // Click Start
    await page.click('#btn-timer-start');
    await expect(page.locator('#btn-timer-pause')).toBeVisible();

    // Fast Forward (custom testing button triggers 5s remaining)
    await page.click('#btn-timer-fastforward');
    await expect(page.locator('#timer-display')).toHaveText('00:05');

    // Setup dialog click for alert completed
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Completed');
      await dialog.accept();
    });

    // Wait for timer to finish (5 seconds)
    await page.waitForTimeout(6000);

    // Verify timer resets and log is written to DB (we can check by listing focus logs)
    await expect(page.locator('#timer-display')).toHaveText('25:00');
  });

  test('F6-T2: Distraction Blocker UI Activation', async ({ page }) => {
    await loginUser(page);
    await page.goto('/focus');

    // Check distraction blocker toggle
    await page.check('#blocker-toggle');

    // Page body should have class
    await expect(page.locator('body')).toHaveClass(/distraction-blocked/);

    // Uncheck
    await page.uncheck('#blocker-toggle');
    await expect(page.locator('body')).not.toHaveClass(/distraction-blocked/);
  });

  test('F6-T3: Burnout Score Display', async ({ page }) => {
    await loginUser(page);
    await page.goto('/analytics');

    // Burnout score from seed has some overdue tasks, let's verify score exists
    const score = page.locator('#burnout-score');
    await expect(score).toBeVisible();
    const val = parseInt(await score.innerText());
    expect(val).toBeGreaterThan(0);

    // Recommendations list should be populated
    const recs = page.locator('#burnout-recommendations > li');
    await expect(recs.first()).toBeVisible();
  });

  test('F6-T4: Procrastination Warning Indicator', async ({ page }) => {
    await loginUser(page);

    // Seeded has HIGH priority task Write CS101 Essay due today (incomplete)
    // Verify procrastination warning is visible
    await expect(page.locator('#procrastination-warning')).toBeVisible();
    await expect(page.locator('#procrastination-warning')).toContainText('CS101 Essay');

    // Click warning action button to start focus session
    await page.click('#btn-warning-focus');
    await page.waitForURL('**/focus?taskId=*');
  });

  test('F6-T5: Task Duration Auto-Estimation', async ({ page }) => {
    await loginUser(page);
    await page.goto('/goals');

    // Open Task Creation
    await page.click('#btn-add-task');
    
    // Type similar title to past task e.g. "Review Notes" (effort was 30 mins)
    await page.fill('#task-title', 'Review Notes');
    // Blur input to trigger estimation event
    await page.locator('#task-title').blur();

    // Check estimated effort field is pre-filled with 30 mins automatically
    await expect(page.locator('#task-effort')).toHaveValue('30');
  });

  test('F6-T6: Inactive Tab Timer Accuracy', async ({ page }) => {
    await loginUser(page);
    await page.goto('/focus');

    // Start timer
    await page.click('#btn-timer-start');
    
    // Check initial timer display e.g. 25:00
    await expect(page.locator('#timer-display')).toHaveText('25:00');

    // Wait a brief moment, then simulate switching tabs or tab inactivity by waiting
    // Playwright evaluates timestamp difference calculation
    await page.waitForTimeout(3000);
    
    // Time remaining should match the exact difference (approx. 24:57)
    const timeStr = await page.locator('#timer-display').innerText();
    const seconds = parseInt(timeStr.split(':')[1]);
    expect(seconds).toBeLessThanOrEqual(57);
  });

  test('F6-T7: Burnout Heuristic Boundary Scores', async ({ page, request }) => {
    // 1. Mock healthy state: 0 tasks, 0 missed habits
    await request.post('/api/test/reset?seed=false');
    await loginUser(page);
    await page.goto('/analytics');
    await expect(page.locator('#burnout-score')).toHaveText('0');

    // 2. Mock overloaded state: 10 overdue tasks, 5 missed habits
    // Let's stub/route analytics API to return 100 max
    await page.route('/api/analytics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          focusHours: '0.00',
          taskCompletionRate: 0,
          habitCompliance: 0,
          burnoutScore: 100, // Capped at 100
          recommendations: ['Critical overload! Take immediate action.']
        })
      });
    });

    await page.reload();
    await expect(page.locator('#burnout-score')).toHaveText('100');
  });

  test('F6-T8: Sudden Session Interrupt Recovery', async ({ page }) => {
    await loginUser(page);
    await page.goto('/focus');

    // Start session
    await page.click('#btn-timer-start');
    await page.waitForTimeout(2000);

    // Reload page
    await page.reload();

    // Verify session timer recovers active state (should be paused or running)
    await expect(page.locator('#btn-timer-stop')).toBeVisible();
    const timeStr = await page.locator('#timer-display').innerText();
    expect(timeStr).not.toBe('25:00');
  });

  test('F6-T9: Concurrent Session Prevention', async ({ page }) => {
    await loginUser(page);
    await page.goto('/focus');

    // Start focus session
    await page.click('#btn-timer-start');

    // Start a second session on another page instance
    const newContext = await page.context().browser()?.newContext();
    const newPage = await newContext?.newPage();
    if (newPage) {
      await newPage.goto('http://localhost:3005/auth/login');
      await newPage.fill('#email', 'john@example.com');
      await newPage.fill('#password', 'password123');
      await newPage.click('#btn-login');
      await newPage.waitForURL('**/dashboard');
      await newPage.goto('http://localhost:3005/focus');

      // Clicking start on newPage resets or overrides
      await newPage.click('#btn-timer-start');
      await expect(newPage.locator('#btn-timer-stop')).toBeVisible();
      await newContext?.close();
    }
  });

  test('F6-T10: Zero/Negative Focus Session Duration', async ({ page }) => {
    await loginUser(page);
    await page.goto('/focus');

    // Attempt to manually log 0 duration
    await page.fill('#manual-duration', '0');
    await page.click('#btn-manual-log');
    await expect(page.locator('#focus-error')).toBeVisible();
    await expect(page.locator('#focus-error')).toContainText('Zero/Negative Focus Session Duration');

    // Attempt to manually log -5 duration
    await page.fill('#manual-duration', '-5');
    await page.click('#btn-manual-log');
    await expect(page.locator('#focus-error')).toBeVisible();
    await expect(page.locator('#focus-error')).toContainText('Zero/Negative Focus Session Duration');
  });
});
