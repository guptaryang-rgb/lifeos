# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar.spec.ts >> F3: AI Planner & Smart Calendar >> F3-T10: timezone Adjustments
- Location: tests\calendar.spec.ts:304:7

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
  11  | async function simulateHtml5DragAndDrop(page, sourceSelector: string, sourceText: string, targetSelector: string) {
  12  |   await page.evaluate(({ srcSel, srcText, tgtSel }) => {
  13  |     const sources = Array.from(document.querySelectorAll(srcSel));
  14  |     const source = sources.find(el => el.textContent?.includes(srcText));
  15  |     const target = document.querySelector(tgtSel);
  16  |     if (!source) {
  17  |       throw new Error(`Source element matching ${srcSel} with text "${srcText}" not found`);
  18  |     }
  19  |     if (!target) {
  20  |       throw new Error(`Target element matching ${tgtSel} not found`);
  21  |     }
  22  | 
  23  |     const dataTransfer = new DataTransfer();
  24  |     
  25  |     // Trigger dragstart
  26  |     const dragStartEvent = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer });
  27  |     source.dispatchEvent(dragStartEvent);
  28  | 
  29  |     // Trigger dragover
  30  |     const dragOverEvent = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer });
  31  |     target.dispatchEvent(dragOverEvent);
  32  | 
  33  |     // Trigger drop
  34  |     const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
  35  |     target.dispatchEvent(dropEvent);
  36  | 
  37  |     // Trigger dragend
  38  |     const dragEndEvent = new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer });
  39  |     source.dispatchEvent(dragEndEvent);
  40  |   }, { srcSel: sourceSelector, srcText: sourceText, tgtSel: targetSelector });
  41  | }
  42  | 
  43  | test.describe('F3: AI Planner & Smart Calendar', () => {
  44  | 
  45  |   test.beforeEach(async ({ page, request }) => {
  46  |     await page.clock.setFixedTime(new Date('2026-06-16T12:00:00Z'));
> 47  |     await request.post('/api/test/reset?seed=true');
      |                   ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:3005
  48  |   });
  49  | 
  50  |   test('F3-T1: Calendar Views Navigation', async ({ page }) => {
  51  |     await loginUser(page);
  52  |     await page.goto('/calendar');
  53  | 
  54  |     // Default should be Week View
  55  |     await expect(page.locator('#calendar-view-type')).toHaveText('Week View');
  56  | 
  57  |     // Click Day View
  58  |     await page.click('#btn-view-day');
  59  |     await expect(page.locator('#calendar-view-type')).toHaveText('Day View');
  60  | 
  61  |     // Click Month View
  62  |     await page.click('#btn-view-month');
  63  |     await expect(page.locator('#calendar-view-type')).toHaveText('Month View');
  64  |   });
  65  | 
  66  |   test('F3-T2: Calendar Event Creation', async ({ page }) => {
  67  |     await loginUser(page);
  68  |     await page.goto('/calendar');
  69  | 
  70  |     await page.click('#btn-add-event');
  71  |     await expect(page.locator('#event-modal')).toBeVisible();
  72  | 
  73  |     await page.fill('#event-title', 'CS101 Discussion');
  74  |     await page.selectOption('#event-category', 'WORK');
  75  |     
  76  |     // Set times
  77  |     const today = '2026-06-16';
  78  |     await page.fill('#event-start', `${today}T10:00`);
  79  |     await page.fill('#event-end', `${today}T11:00`);
  80  |     await page.click('#event-save');
  81  | 
  82  |     // Modal should close
  83  |     await expect(page.locator('#event-modal')).toBeHidden();
  84  | 
  85  |     // Verify event is rendered and has the WORK category styling (e.g. blue bg)
  86  |     const event = page.locator('.event-block', { hasText: 'CS101 Discussion' });
  87  |     await expect(event).toBeVisible();
  88  |     await expect(event).toHaveClass(/bg-blue-100/);
  89  |   });
  90  | 
  91  |   test('F3-T3: Drag-and-Drop Event Rescheduling', async ({ page }) => {
  92  |     await loginUser(page);
  93  |     await page.goto('/calendar');
  94  | 
  95  |     // Create an event at 10:00 AM first
  96  |     const today = '2026-06-16';
  97  |     await page.evaluate(async (today) => {
  98  |       await fetch('/api/events', {
  99  |         method: 'POST',
  100 |         headers: { 'Content-Type': 'application/json' },
  101 |         body: JSON.stringify({
  102 |           title: 'Meeting to Drag',
  103 |           start: `${today}T10:00:00`,
  104 |           end: `${today}T11:00:00`,
  105 |           category: 'WORK',
  106 |           color: 'blue'
  107 |         })
  108 |       });
  109 |     }, today);
  110 |     await page.reload();
  111 | 
  112 |     // Perform Drag & Drop using HTML5 simulation helper
  113 |     await simulateHtml5DragAndDrop(page, '.event-block', 'Meeting to Drag', '[id="slot-14:00"]');
  114 | 
  115 |     // Refresh and check that the meeting is saved at 14:00 (2:00 PM)
  116 |     await page.reload();
  117 |     await expect(page.locator('[id="container-14:00"]')).toContainText('Meeting to Drag');
  118 |   });
  119 | 
  120 |   test('F3-T4: AI Schedule Generation Heuristic', async ({ page }) => {
  121 |     await loginUser(page);
  122 |     await page.goto('/calendar');
  123 | 
  124 |     // Trigger AI Plan
  125 |     await page.click('#btn-generate-ai-plan');
  126 | 
  127 |     // Verify suggestions list appears
  128 |     await expect(page.locator('#ai-suggestions-panel')).toBeVisible();
  129 |     
  130 |     // Verify that the unscheduled task "Write CS101 Essay" from seed is scheduled
  131 |     await expect(page.locator('#ai-suggestions')).toContainText('Scheduled: "Write CS101 Essay"');
  132 | 
  133 |     // Verify it now renders on the calendar grid
  134 |     await expect(page.locator('.event-block', { hasText: 'Write CS101 Essay' })).toBeVisible();
  135 |   });
  136 | 
  137 |   test('F3-T5: Calendar Overload Conflict Warning', async ({ page }) => {
  138 |     await loginUser(page);
  139 |     await page.goto('/calendar');
  140 | 
  141 |     const today = '2026-06-16';
  142 |     
  143 |     // Create first event 10-11
  144 |     await page.evaluate(async (today) => {
  145 |       await fetch('/api/events', {
  146 |         method: 'POST',
  147 |         headers: { 'Content-Type': 'application/json' },
```