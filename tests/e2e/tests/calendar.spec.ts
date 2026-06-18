import { test, expect } from '@playwright/test';

async function loginUser(page) {
  await page.goto('/auth/login');
  await page.fill('#email', 'john@example.com');
  await page.fill('#password', 'password123');
  await page.click('#btn-login');
  await page.waitForURL('**/dashboard');
}

async function simulateHtml5DragAndDrop(page, sourceSelector: string, sourceText: string, targetSelector: string) {
  await page.evaluate(({ srcSel, srcText, tgtSel }) => {
    const sources = Array.from(document.querySelectorAll(srcSel));
    const source = sources.find(el => el.textContent?.includes(srcText));
    const target = document.querySelector(tgtSel);
    if (!source) {
      throw new Error(`Source element matching ${srcSel} with text "${srcText}" not found`);
    }
    if (!target) {
      throw new Error(`Target element matching ${tgtSel} not found`);
    }

    const dataTransfer = new DataTransfer();
    
    // Trigger dragstart
    const dragStartEvent = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer });
    source.dispatchEvent(dragStartEvent);

    // Trigger dragover
    const dragOverEvent = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer });
    target.dispatchEvent(dragOverEvent);

    // Trigger drop
    const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
    target.dispatchEvent(dropEvent);

    // Trigger dragend
    const dragEndEvent = new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer });
    source.dispatchEvent(dragEndEvent);
  }, { srcSel: sourceSelector, srcText: sourceText, tgtSel: targetSelector });
}

test.describe('F3: AI Planner & Smart Calendar', () => {

  test.beforeEach(async ({ page, request }) => {
    await page.clock.setFixedTime(new Date('2026-06-16T12:00:00Z'));
    await request.post('/api/test/reset?seed=true');
  });

  test('F3-T1: Calendar Views Navigation', async ({ page }) => {
    await loginUser(page);
    await page.goto('/calendar');

    // Default should be Week View
    await expect(page.locator('#calendar-view-type')).toHaveText('Week View');

    // Click Day View
    await page.click('#btn-view-day');
    await expect(page.locator('#calendar-view-type')).toHaveText('Day View');

    // Click Month View
    await page.click('#btn-view-month');
    await expect(page.locator('#calendar-view-type')).toHaveText('Month View');
  });

  test('F3-T2: Calendar Event Creation', async ({ page }) => {
    await loginUser(page);
    await page.goto('/calendar');

    await page.click('#btn-add-event');
    await expect(page.locator('#event-modal')).toBeVisible();

    await page.fill('#event-title', 'CS101 Discussion');
    await page.selectOption('#event-category', 'WORK');
    
    // Set times
    const today = '2026-06-16';
    await page.fill('#event-start', `${today}T10:00`);
    await page.fill('#event-end', `${today}T11:00`);
    await page.click('#event-save');

    // Modal should close
    await expect(page.locator('#event-modal')).toBeHidden();

    // Verify event is rendered and has the WORK category styling (e.g. blue bg)
    const event = page.locator('.event-block', { hasText: 'CS101 Discussion' });
    await expect(event).toBeVisible();
    await expect(event).toHaveClass(/bg-blue-100/);
  });

  test('F3-T3: Drag-and-Drop Event Rescheduling', async ({ page }) => {
    await loginUser(page);
    await page.goto('/calendar');

    // Create an event at 10:00 AM first
    const today = '2026-06-16';
    await page.evaluate(async (today) => {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Meeting to Drag',
          start: `${today}T10:00:00`,
          end: `${today}T11:00:00`,
          category: 'WORK',
          color: 'blue'
        })
      });
    }, today);
    await page.reload();

    // Perform Drag & Drop using HTML5 simulation helper
    await simulateHtml5DragAndDrop(page, '.event-block', 'Meeting to Drag', '[id="slot-14:00"]');

    // Refresh and check that the meeting is saved at 14:00 (2:00 PM)
    await page.reload();
    await expect(page.locator('[id="container-14:00"]')).toContainText('Meeting to Drag');
  });

  test('F3-T4: AI Schedule Generation Heuristic', async ({ page }) => {
    await loginUser(page);
    await page.goto('/calendar');

    // Trigger AI Plan
    await page.click('#btn-generate-ai-plan');

    // Verify suggestions list appears
    await expect(page.locator('#ai-suggestions-panel')).toBeVisible();
    
    // Verify that the unscheduled task "Write CS101 Essay" from seed is scheduled
    await expect(page.locator('#ai-suggestions')).toContainText('Scheduled: "Write CS101 Essay"');

    // Verify it now renders on the calendar grid
    await expect(page.locator('.event-block', { hasText: 'Write CS101 Essay' })).toBeVisible();
  });

  test('F3-T5: Calendar Overload Conflict Warning', async ({ page }) => {
    await loginUser(page);
    await page.goto('/calendar');

    const today = '2026-06-16';
    
    // Create first event 10-11
    await page.evaluate(async (today) => {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Event A',
          start: `${today}T10:00:00`,
          end: `${today}T11:00:00`,
          category: 'WORK',
          color: 'blue'
        })
      });
    }, today);

    // Create second overlapping event 10:30-11:30
    await page.evaluate(async (today) => {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Event B',
          start: `${today}T10:30:00`,
          end: `${today}T11:30:00`,
          category: 'LIFE',
          color: 'green'
        })
      });
    }, today);

    await page.reload();

    // Verify overlap conflict warning banner is displayed
    await expect(page.locator('#conflict-warning')).toBeVisible();
    await expect(page.locator('#conflict-warning')).toContainText('conflict');
  });

  test('F3-T6: Midnight Span Event Rendering', async ({ page }) => {
    await loginUser(page);
    await page.goto('/calendar');

    // Create event running from 10 PM to 2 AM next day
    const today = '2026-06-16';
    const tomorrow = '2026-06-17';

    await page.evaluate(async ({ today, tomorrow }) => {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Midnight Party',
          start: `${today}T22:00:00`,
          end: `${tomorrow}T02:00:00`,
          category: 'LIFE',
          color: 'green'
        })
      });
    }, { today, tomorrow });

    await page.reload();

    // Verify visual indicator/text for midnight span exists
    const event = page.locator('.event-block', { hasText: 'Midnight Party' });
    await expect(event).toBeVisible();
    await expect(event).toContainText('Midnight Span');

    // Switch view to Month and confirm it appears on tomorrow's date block as well
    await page.click('#btn-view-month');
    await expect(page.locator('#month-container-2')).toBeVisible(); // tomorrow is +1 day
  });

  test('F3-T7: Overbooked Work Window Heuristic', async ({ page }) => {
    await loginUser(page);
    await page.goto('/calendar');

    // Add a huge task exceeding 10 hours work window (e.g. 15 hours / 900 mins)
    const today = '2026-06-16';
    await page.evaluate(async (today) => {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Giant Research Project',
          dueDate: today,
          priority: 'HIGH',
          effort: 900
        })
      });
    }, today);

    await page.reload();

    // Click generate AI plan
    await page.click('#btn-generate-ai-plan');

    // Verification: Planner flags part of tasks as deferred and alerts
    await expect(page.locator('#ai-suggestions')).toContainText('Deferred');
    await expect(page.locator('#conflict-warning')).toBeVisible();
    await expect(page.locator('#conflict-warning')).toContainText('Overbooked work window');
  });

  test('F3-T8: Schedule Event in Past Protection', async ({ page }) => {
    await loginUser(page);
    await page.goto('/calendar');

    // Setup dialog alert listener
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Cannot schedule');
      await dialog.accept();
    });

    // Create event at 10:00 AM
    const today = '2026-06-16';
    await page.evaluate(async (today) => {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Past Event Test',
          start: `${today}T10:00:00`,
          end: `${today}T11:00:00`,
          category: 'WORK',
          color: 'blue'
        })
      });
    }, today);
    await page.reload();

    // Perform Drag using HTML5 simulation helper
    await simulateHtml5DragAndDrop(page, '.event-block', 'Past Event Test', '[id="slot-08:00"]');
  });

  test('F3-T9: Associated Calendar Event Deletion', async ({ page }) => {
    await loginUser(page);
    await page.goto('/calendar');

    // Create a calendar event
    const today = '2026-06-16';
    const ev = await page.evaluate(async (today) => {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Delete Blocking Event',
          start: `${today}T10:00:00`,
          end: `${today}T11:00:00`,
          category: 'WORK',
          color: 'blue'
        })
      });
      return res.json();
    }, today);
    await page.reload();

    // Delete the event
    await page.locator(`.event-block[id="event-${ev.id}"]`).locator('.btn-delete-event').click();

    // Event should be gone
    await expect(page.locator(`.event-block[id="event-${ev.id}"]`)).toBeHidden();
  });

  test('F3-T10: timezone Adjustments', async ({ page }) => {
    await loginUser(page);
    await page.goto('/calendar');

    // Check timezone displays browser/environment timezone
    const tzDisplay = page.locator('#timezone-display');
    await expect(tzDisplay).not.toBeEmpty();
  });
});
