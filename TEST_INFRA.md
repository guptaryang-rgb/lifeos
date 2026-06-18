# LifeOS E2E Testing Infrastructure and Strategy

This document outlines the architecture, setup, execution guidelines, and detailed test case inventory for the LifeOS End-to-End (E2E) testing suite.

---

## 1. Architecture & Framework Selection

We recommend **Playwright** as the E2E testing framework for LifeOS.

### Comparison & Rationale

| Feature | Playwright | Vitest + MSW / Jest + JSDOM | Recommendation |
|---|---|---|---|
| **Execution Environment** | Real browsers (Chromium, Firefox, WebKit) | Virtual DOM (JSDOM / Happy DOM) | **Playwright**: Essential for testing CSS layouts, animations, and responsive breakpoints. |
| **Viewport Testing** | Native support for viewport resizing (desktop at 1440px, mobile at 375px) | Emulated viewport size only | **Playwright**: Required for verifying R1 (responsive views). |
| **Drag & Drop** | Native mouse/pointer simulation | Simulated events (often unreliable for complex libraries) | **Playwright**: Necessary for verifying R2 (calendar drag-and-drop). |
| **Network Interception** | Native API routing (`page.route`) | Service Worker (MSW) | **Playwright**: Native routing is robust, operates out-of-process, and intercepts all fetch/XHR. |
| **Tracing & Debugging** | Rich trace viewer, screenshots, video capture, headless/headed runs | Terminal-based logs, DOM snapshot prints | **Playwright**: Drastically reduces debugging time for failed E2E flows. |
| **Execution Speed** | Fast, runs in parallel, supports sharding | Fast for units, but slow/flaky when simulating complex client page actions | **Playwright**: Highly optimized for asynchronous operations. |

### Decision
**Playwright** is selected as the exclusive framework for the LifeOS E2E testing suite. Since E2E tests are designed to be **opaque-box** and requirement-driven, Playwright will target the live HTTP server (`http://localhost:3000`) without relying on application internal state, other than mock API boundaries.

---

## 2. Dependency Isolation Plan

To maintain clean boundaries between the application runtime and the testing suite, we will isolate E2E testing dependencies inside the `tests/e2e` subdirectory.

```
C:\Users\gupta_ikq631n\teamwork_projects\lifeos
├── tests/
│   ├── e2e/
│   │   ├── package.json          # Isolated dependencies (Playwright, TS, MSW, etc.)
│   │   ├── playwright.config.ts   # E2E test runner configuration
│   │   ├── tsconfig.json         # TypeScript configuration for tests
│   │   ├── tests/                # Test specifications
│   │   │   ├── auth.spec.ts
│   │   │   ├── dashboard.spec.ts
│   │   │   ├── calendar.spec.ts
│   │   │   ├── tasks-goals.spec.ts
│   │   │   ├── habits.spec.ts
│   │   │   ├── focus-burnout.spec.ts
│   │   │   ├── interactions.spec.ts
│   │   │   └── scenarios.spec.ts
│   │   └── utils/                # E2E utility helpers
│   │       ├── auth-mock.ts
│   │       └── test-data.ts
│   └── unit/
└── package.json                  # Main app dependencies (Next.js, Prisma, NextAuth)
```

### Benefits of Isolation
1. **Zero Runtime Bloat**: Playwright browser binaries, runner packages, and test types are not included in the main application's `dependencies` or `devDependencies`, keeping production build times and sizes minimal.
2. **Type Safety Separation**: Prevents conflicts between the Next.js/React DOM type declarations and Playwright's specific runner types.
3. **Modular Scripts**: Enables executing testing-related package commands (e.g. updating Playwright browsers) without affecting root package constraints.

---

## 3. Execution & Compilation Workflow

### Installation
Dependencies inside `tests/e2e` must be installed separately:
```powershell
cd tests/e2e
npm install
npx playwright install chromium firefox webkit
```
For developer convenience, we can configure a root-level script in the main `package.json`:
```json
"scripts": {
  "test:e2e:install": "npm --prefix tests/e2e install && npm --prefix tests/e2e run postinstall",
  "test:e2e": "npm --prefix tests/e2e run test",
  "test:e2e:ui": "npm --prefix tests/e2e run test:ui"
}
```

### Compilation
Playwright compiles TypeScript test files natively on-the-fly using `esbuild`. No external compiler configuration or build step is required. The E2E tests are configured via `tests/e2e/tsconfig.json` to target Node.js execution and include Playwright types.

### Test Runner Configuration (`tests/e2e/playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } },
    },
  ],
});
```

---

## 4. Backend & Database Mocking Strategies

When E2E tests are run before the backend database is active, or if we want to run tests in complete isolation, we have two primary strategies:

### Strategy A: Frontend-Only (Opaque-Box Network Interception)
Using Playwright's `page.route()`, we can intercept all REST API traffic heading to `/api/*` and mock the responses.
- **NextAuth Session Mocking**: Intercept `/api/auth/session` to return a mock user profile.
- **REST CRUD Mocking**: Mock data stores are maintained in-memory inside the test runner scripts (e.g. `tests/e2e/utils/test-data.ts`). Intercept GET/POST/PUT/DELETE requests on `/api/tasks`, `/api/events`, `/api/goals`, `/api/habits`, and `/api/focus` to read and write to this in-memory list, updating the UI accordingly.
- **Pros**: Blazing fast, requires no active database or Next.js server build, and tests only UI behavior and requirements.

### Strategy B: Local Integration Testing (SQLite / Test Postgres DB)
We can run the actual Next.js application but configured with a lightweight local database (SQLite file or local PostgreSQL container).
- **Setup script**: Before tests run, we execute:
  1. `cross-env DATABASE_URL=file:./test.db npx prisma db push`
  2. `cross-env DATABASE_URL=file:./test.db npx prisma db seed`
  3. Start application server: `cross-env DATABASE_URL=file:./test.db PORT=3000 npm run dev`
- **Execution**: Playwright runs against the live local app. It clears/reseeds the database before runs using API hooks or database client scripts.
- **Pros**: Verifies the actual API routes, validations, NextAuth login database checks, and Prisma database queries.

---

## 5. Test Case Inventory

This inventory defines the E2E verification test suite divided into 4 key tiers.

### Tier 1: Feature Coverage (>=5 tests per feature, >=30 total)

#### F1: Authentication & Access Control (Auth)
1. **F1-T1: Successful Registration**
   - **Steps**: Navigate to `/auth/register`, enter valid name, email, and password. Click "Sign Up".
   - **Expectation**: Redirected to `/auth/login` with a success notification.
2. **F1-T2: Successful Credentials Login**
   - **Steps**: Navigate to `/auth/login`, enter registered credentials, click "Login".
   - **Expectation**: Redirected to `/dashboard`. Session cookie is established, and user's name is displayed in the dashboard header.
3. **F1-T3: User Logout**
   - **Steps**: Click "Logout" button on dashboard navigation sidebar.
   - **Expectation**: Redirected to `/auth/login`. Session cookie is deleted, and attempting to go back to `/dashboard` redirects back to `/auth/login`.
4. **F1-T4: Protected Route Redirection**
   - **Steps**: Attempt to access `/calendar` directly without a session.
   - **Expectation**: Redirected to `/auth/login` with redirect query param `?callbackUrl=/calendar`.
5. **F1-T5: Protected API Unauthorized Response**
   - **Steps**: Make a direct `GET` request to `/api/tasks` without session headers.
   - **Expectation**: Returns HTTP status code `401 Unauthorized`.

#### F2: Unified Dashboard & Daily Briefing
6. **F2-T1: Chronological Schedule Render**
   - **Steps**: Navigate to `/dashboard`. Verify Daily Briefing schedule panel.
   - **Expectation**: Displays today's events sorted chronologically (earliest first).
7. **F2-T2: Priority Tasks Display**
   - **Steps**: Add high-priority and low-priority tasks via API. Refresh `/dashboard`.
   - **Expectation**: High-priority tasks are highlighted at the top of the Briefing's "Priority Tasks" list.
8. **F2-T3: Quick-Action Task Creation**
   - **Steps**: Click "Add Task" quick-action widget on Dashboard. Fill in title and click "Save".
   - **Expectation**: Task is successfully saved, modal closes, and the task list updates immediately to display the new task.
9. **F2-T4: Real-Time Statistics Update**
   - **Steps**: Log a habit or check off a task via quick widget on the Dashboard.
   - **Expectation**: "Tasks Completed" and "Life Score" stats increment immediately on the dashboard UI.
10. **F2-T5: AI Briefing Summary Generation**
    - **Steps**: Navigate to `/dashboard` with seeded task/event data.
    - **Expectation**: AI Briefing panel displays a generated daily narrative summarizing the user's workload and agenda.

#### F3: AI Planner & Smart Calendar
11. **F3-T1: Calendar Views Navigation**
    - **Steps**: Navigate to `/calendar`. Toggle between "Day", "Week", and "Month" view buttons.
    - **Expectation**: Active calendar grid adjusts dates and columns to match the selected view.
12. **F3-T2: Calendar Event Creation**
    - **Steps**: Double-click a timeslot on the week view, fill title, select category "WORK", save.
    - **Expectation**: Event box appears in that timeslot colored with work category theme (e.g. blue).
13. **F3-T3: Drag-and-Drop Event Rescheduling**
    - **Steps**: Drag an event from 10:00 AM to 2:00 PM on the calendar grid.
    - **Expectation**: Event position updates, and reloading the page confirms the new time is saved.
14. **F3-T4: AI Schedule Generation Heuristic**
    - **Steps**: Click "Generate AI Plan" button on calendar view.
    - **Expectation**: AI Planner schedules unscheduled tasks into open calendar slots based on deadline, priority, and energy level. Displays suggestions list.
15. **F3-T5: Calendar Overload Conflict Warning**
    - **Steps**: Schedule two events overlapping at the same hour, or schedule tasks exceeding available hours.
    - **Expectation**: Red warning indicator/toast alerts user of overloaded day conflict.

#### F4: Assignment Tracker & Goal System
16. **F4-T1: Task CRUD Operations**
    - **Steps**: Create a task "CS101 Homework" (due tomorrow, Priority: HIGH, Effort: 60 mins). Edit its title to "CS101 Essay". Delete it.
    - **Expectation**: Creation saves task, edit updates title, deletion removes task from UI lists.
17. **F4-T2: Subtask Progress Calculation**
    - **Steps**: Create task. Add 4 subtasks. Toggle 2 subtasks as completed.
    - **Expectation**: Task progress percentage updates to 50%, and status shows "IN_PROGRESS".
18. **F4-T3: Goal and Milestone Creation**
    - **Steps**: Navigate to `/goals`. Create a Goal "Learn Rust" (Weekly) with 2 milestones.
    - **Expectation**: Goal renders with 0% progress and displays both milestones.
19. **F4-T4: Task-Goal Auto-Update**
    - **Steps**: Create a task linked to "Milestone 1". Toggle task to "COMPLETED".
    - **Expectation**: Goal progress updates automatically, and Milestone 1 shows "COMPLETED".
20. **F4-T5: Task Filtering, Sorting, and Search**
    - **Steps**: Search for "Math", filter by "HIGH" priority, sort by "Due Date".
    - **Expectation**: Display matches search terms and respects the active filters and sort order.

#### F5: Habit Tracker & Progress Analytics
21. **F5-T1: Habit Creation**
    - **Steps**: Navigate to `/habits`. Create a habit "Read 10 Pages" with DAILY frequency.
    - **Expectation**: Habit appears in list with 0-day streak.
22. **F5-T2: Habit Logging & Streak Increment**
    - **Steps**: Click completion checkmark on "Read 10 Pages".
    - **Expectation**: Streak counter increments to 1, and today's cell on the heat map lights up.
23. **F5-T3: Habit Completion Toggle**
    - **Steps**: Toggle logged habit off.
    - **Expectation**: Streak count decrements back, and heat map cell returns to empty.
24. **F5-T4: Progress Analytics Charts Rendering**
    - **Steps**: Navigate to `/analytics`. Verify presence of charts.
    - **Expectation**: Renders interactive charts showing focus hours, task completion rate, and habit compliance.
25. **F5-T5: Streak Reset Logic**
    - **Steps**: Access a habit with no log for yesterday.
    - **Expectation**: Displays streak count as 0.

#### F6: Deep Work Focus Session & Burnout Heuristics
26. **F6-T1: Pomodoro Focus Timer Control**
    - **Steps**: Navigate to `/focus`. Click "Start" on 25-minute Pomodoro timer. Wait/mock elapsed time, click "Pause", click "Resume", click "Stop".
    - **Expectation**: Timer responds to controls, and completing the session writes a log to the database.
27. **F6-T2: Distraction Blocker UI Activation**
    - **Steps**: Start focus session and toggle "Distraction Blocker" mode.
    - **Expectation**: Main navigation and other widgets fade out/become disabled, leaving only the timer and active task visible.
28. **F6-T3: Burnout Score Display**
    - **Steps**: Navigate to `/analytics` or Dashboard. Look at burnout risk panel.
    - **Expectation**: Displays computed burnout risk score (0-100) and list of actionable recommendations.
29. **F6-T4: Procrastination Warning Indicator**
    - **Steps**: Seed a high-priority task due today with 0% progress. Refresh dashboard.
    - **Expectation**: Dashboard displays a "Procrastination Warning" banner pointing to the task.
30. **F6-T5: Task Duration Auto-Estimation**
    - **Steps**: Create a task with a title similar to past tasks.
    - **Expectation**: The estimated effort field is pre-filled based on historical actual durations.

---

### Tier 2: Boundary/Edge Cases (>=5 tests per feature, >=30 total)

#### F1: Authentication Edge Cases
31: **F1-T6: Duplicate Email Registration**
    - **Steps**: Attempt to register with an email address already present in the database.
    - **Expectation**: Displays a "Registration Failed: Email already exists" error message.
32: **F1-T7: Invalid Login Credentials**
    - **Steps**: Log in with valid email but incorrect password.
    - **Expectation**: Stays on login page, shows "Invalid credentials" error banner.
33: **F1-T8: Form Fields Validation Constraints**
    - **Steps**: Leave fields empty or enter malformed email (e.g. `user@com`) and short password (<6 chars). Click register.
    - **Expectation**: HTML5 validation or application errors block submission and highlight fields.
34: **F1-T9: Expired Session Token Re-authentication**
    - **Steps**: Mock an expired NextAuth session token, then click a page link.
    - **Expectation**: Application forces user back to `/auth/login`.
35: **F1-T10: API Schema Validation Rejection**
    - **Steps**: Send POST to `/api/tasks` with missing `dueDate` or negative `estimatedDuration`.
    - **Expectation**: Returns HTTP status code `400 Bad Request` with validation error messages.

#### F2: Dashboard Edge Cases
36: **F2-T6: Responsive Mobile Layout Reflow**
    - **Steps**: Set viewport size to 375x812 (mobile). Load dashboard.
    - **Expectation**: Grid panels stack vertically in a single column without overlapping text or clipping widgets. Navigation collapses to hamburger.
37: **F2-T7: Dashboard Empty State Display**
    - **Steps**: Log in with a clean, newly-created user account (0 tasks, events, habits, goals).
    - **Expectation**: Renders welcome onboarding widget, helpful blank-state illustrations, and setup actions. No broken layouts or null exceptions.
38: **F2-T8: Rapid Widget Action Debouncing**
    - **Steps**: Double-click "Check-in" button on a habit very quickly.
    - **Expectation**: Only one habit log is written to the database (no duplicate records).
39: **F2-T9: AI Summary Empty Data Fallback**
    - **Steps**: Access dashboard of a user with no tasks or events scheduled today.
    - **Expectation**: AI panel displays a default encouragement summary (e.g. "Your schedule is clear! Use this time to set goals.").
40: **F2-T10: Extremely Large Stats Rendering**
    - **Steps**: Mock completed tasks count as 9999 and habit streak as 365.
    - **Expectation**: Dashboard UI layout adapts without text wrapping errors or layout breaks.

#### F3: AI Planner & Smart Calendar Edge Cases
41: **F3-T6: Midnight Span Event Rendering**
    - **Steps**: Create an event running from 10:00 PM to 2:00 AM.
    - **Expectation**: Calendar shows the event on both days, block starts at 10 PM on day 1 and terminates at 2 AM on day 2.
42: **F3-T7: Overbooked Work Window Heuristic**
    - **Steps**: Add 15 hours of high-priority tasks for a 10-hour work window. Click "Generate AI Plan".
    - **Expectation**: Planner fills all 10 hours, flags remaining 5 hours as deferred, and displays a red "Overload Warning".
43: **F3-T8: Schedule Event in Past Protection**
    - **Steps**: Attempt to drag an event to a past date/time on the calendar.
    - **Expectation**: Displays warning toast or fails with validation message.
44: **F3-T9: Associated Calendar Event Deletion**
    - **Steps**: Delete a fixed calendar event that was blocking a task schedule.
    - **Expectation**: The blocked task is automatically rescheduled, and the time slot is freed.
45: **F3-T10: timezone Adjustments**
    - **Steps**: Change test environment timezone, open calendar.
    - **Expectation**: Calendar events shift display times correctly to align with browser local timezone.

#### F4: Assignment Tracker & Goal System Edge Cases
46: **F4-T6: Task Created with Past Due Date**
    - **Steps**: Create a task with due date set to yesterday.
    - **Expectation**: Task is successfully created and immediately marked with status "OVERDUE".
47: **F4-T7: Subtask Completion Cascading**
    - **Steps**: Check off all 4 subtasks on a task. Uncheck 1 subtask.
    - **Expectation**: Parent task changes from "NOT_STARTED" -> "COMPLETED" (when all 4 checked) -> "IN_PROGRESS" (when 1 unchecked).
48: **F4-T8: Goal Deletion Integrity**
    - **Steps**: Link a task to a Goal's Milestone. Delete the Goal.
    - **Expectation**: Goal and Milestone are deleted. The task is preserved, and its linked goal/milestone IDs are set to null.
49: **F4-T9: Special Characters Search Safety**
    - **Steps**: Type regex symbols (`%`, `_`, `.*`, `[a-z]`) in task search input.
    - **Expectation**: Search completes without crashing, returns 0 matches or matches literal characters.
50: **F4-T10: Milestone Boundary Values**
    - **Steps**: Attempt to set a milestone target date past the parent goal's target date.
    - **Expectation**: Rejected with a validation error.

#### F5: Habit Tracker Edge Cases
51: **F5-T6: Duplicate Daily Log Prevention**
    - **Steps**: Log an already completed habit for today via API post.
    - **Expectation**: Rejected with 400 or has no effect, preserving streak count.
52: **F5-T7: Custom Days Frequency Streak Calculation**
    - **Steps**: Create a habit scheduled for Tues/Thurs. Log Tuesday. Skip Wednesday. Log Thursday.
    - **Expectation**: Streak increments to 2 on Thursday. Skipping Wednesday (a non-active day) does not break streak.
53: **F5-T8: Daylight Savings Time (DST) Transition**
    - **Steps**: Simulate habit logs around DST clock change (+1/-1 hour transition).
    - **Expectation**: Streak logic correctly recognizes the logs as consecutive days.
54: **F5-T9: Retroactive Logging**
    - **Steps**: Log a habit check-in for yesterday.
    - **Expectation**: Database updates, and if yesterday was the missing link, the streak is restored.
55: **F5-T10: Leap Year Heatmap Rendering**
    - **Steps**: Load the habit tracker dashboard in a leap year (e.g. 2028).
    - **Expectation**: Heatmap displays February 29 grid block correctly.

#### F6: Focus Session & Burnout Edge Cases
56: **F6-T6: Inactive Tab Timer Accuracy**
    - **Steps**: Start 25-minute Pomodoro timer, switch browser tab, wait 5 minutes, return to tab.
    - **Expectation**: Timer shows remaining time calculated by epoch timestamp difference (approx. 20 minutes), not throttled browser ticks.
57: **F6-T7: Burnout Heuristic Boundary Scores**
    - **Steps**: Mock workload density as 0, missed tasks as 0, streak decline as 0. Refresh. Mock workload density as 1.5, missed tasks as 15, streak decline as 1.0. Refresh.
    - **Expectation**: First scenario displays a Burnout Score of exactly 0. Second scenario displays a Burnout Score capped at 100.
58: **F6-T8: Sudden Session Interrupt Recovery**
    - **Steps**: Start a focus session. Reload page or close/reopen browser.
    - **Expectation**: Timer UI restores active focus state, or prompts to resume/save partial session logs.
59: **F6-T9: Concurrent Session Prevention**
    - **Steps**: Attempt to start a focus session while one is already active.
    - **Expectation**: Second session request fails or automatically pauses/ends the previous session.
60: **F6-T10: Zero/Negative Focus Session Duration**
    - **Steps**: Submit a completed focus session log with duration 0 or -5 minutes.
    - **Expectation**: API returns `400 Bad Request` validation error.

---

### Tier 3: Cross-Feature Interactions (pairwise, >=6 total)

61. **XF-T1: Authentication ↔ Task Data Scoping (Multi-User Isolation)**
    - **Features**: Auth (F1) + Task Tracker (F4)
    - **Steps**: User A logs in, creates high-priority task "User A Private Task". User A logs out. User B logs in, performs task searches and accesses `/api/tasks`.
    - **Expectation**: User B's dashboard and API responses do not display "User A Private Task". Data isolation is fully maintained.
62. **XF-T2: Task Completion ↔ Goal Milestone ↔ Dashboard Stats Cascade**
    - **Features**: Tasks (F4) + Goals (F4) + Dashboard (F2)
    - **Steps**: Create a Milestone under Goal G1. Create Task T1 linked to this Milestone. Toggle T1 to COMPLETED. Load Dashboard.
    - **Expectation**: Task is completed, Milestone progress updates, Goal progress increments, and the Dashboard "Life Score" widget updates to reflect the accomplishments.
63. **XF-T3: Calendar Event Modification ↔ AI Planner Reschedule cascade**
    - **Features**: Calendar (F3) + AI Planner (F3) + Dashboard Daily Briefing (F2)
    - **Steps**: Create calendar event "All-Day Seminar" (9 AM - 5 PM). Click "AI Plan". View Dashboard Daily Briefing.
    - **Expectation**: Planner detects collision with previously scheduled tasks, pushes task suggestions to evening (after 5 PM), and the Dashboard briefing updates to show this revised agenda.
64. **XF-T4: Focus Session Completion ↔ Analytics Updates ↔ Burnout Score Mitigation**
    - **Features**: Focus Session (F6) + Analytics Charts (F5) + Burnout Score (F6)
    - **Steps**: Complete a 50-minute Pomodoro focus session. Navigate to `/analytics`.
    - **Expectation**: Analytics "Focus Hours" chart increments by 50 minutes. Burnout Risk Score decreases slightly on the next run due to increased focus hours.
65. **XF-T5: Habit Streak Failure ↔ Burnout Score Increase ↔ Dashboard Alert**
    - **Features**: Habits (F5) + Burnout score (F6) + Dashboard (F2)
    - **Steps**: Simulate 4 consecutive missed habit days, causing streak to drop. Recalculate heuristics. Load Dashboard.
    - **Expectation**: Burnout Risk Score rises due to declining habit streaks. An alert banner appears on the dashboard warning of high burnout risk with habit recovery tips.
66. **XF-T6: Focus Session Time-Block ↔ Calendar Slot Reservation**
    - **Features**: Focus Session (F6) + Calendar (F3) + AI Planner (F3)
    - **Steps**: Start a focus session linked to Task T1. View Calendar. Trigger AI Planner.
    - **Expectation**: Focus session time-block appears on the calendar as a busy "WORK" block. AI Planner will not schedule other tasks during this active session.

---

### Tier 4: Real-World Application Scenarios (at least 5 flows)

67. **RW-F1: "The Student's Busy Morning Routine"**
    - **Flow**:
      1. Student registers new account, logs in, and lands on dashboard.
      2. Displays onboarding instructions; logs a morning habit "Hydrate" via quick widget.
      3. Uses quick-action widget to add assignment "Physics Lab Report" due tonight at 11:59 PM (Estimated effort: 3 hours).
      4. Dashboard alerts of a schedule conflict: they have a fixed class lecture "Physics 101" from 2:00 PM to 4:00 PM.
      5. User opens calendar, clicks "AI Plan". Heuristic schedules "Physics Lab Report" prep from 9 AM to 12 PM, leaving afternoon open for class.
      6. Student clicks "Start Focus Session" linked to "Physics Lab Report", activating the Distraction Blocker UI.
      7. Completes the first 25-minute Pomodoro session.
    - **Verification**: Database contains 1 registered user, 1 task, 1 event, 1 habit log, 1 completed focus session. Dashboard shows updated stats.

68. **RW-F2: "Overload Crisis Recovery"**
    - **Flow**:
      1. User logs in. Dashboard displays a warning banner: Burnout Risk Score is at 88% ("High Risk").
      2. User reviews lists: 5 tasks are past their due dates (marked OVERDUE), and habit streaks have plummeted.
      3. User goes to Planner, clicks "Dynamic Replanning". Heuristic recalculates: it suggests deferring 3 low-priority tasks, splitting 1 large task into subtasks, and scheduling only the highest priority task "Prepare Tax return" for today.
      4. User accepts suggestions. Calendar updates.
      5. User starts Focus Session with distraction blocker active.
      6. Completes task. Burnout score recalculates and drops to 76% with recommendations.
    - **Verification**: Overdue tasks status shifts, new scheduled blocks are stored, and Burnout Score drops with updated recommendations.

69. **RW-F3: "Goal-Driven Weekly Review"**
    - **Flow**:
      1. User navigates to Goals page. Sets a weekly goal: "Release Portfolio Website MVP" with 3 milestones:
         - M1: Finish mockup (Target: Wed)
         - M2: Code landing page (Target: Fri)
         - M3: Deploy to Vercel (Target: Sun)
      2. User creates 3 tasks, linking each to the respective milestones.
      3. User logs in on Wednesday, marks M1 task as complete.
      4. User logs in on Friday, starts Focus Session on M2 task, completes it, marks it complete.
      5. Opens Goals page to review.
    - **Verification**: M1 and M2 milestones are marked "COMPLETED". Goal progress bar displays 66%. Analytics page shows focus hours peak on Friday.

70. **RW-F4: "Dynamic Day Adjustment (The Rescheduling Cascade)"**
    - **Flow**:
      1. User has 3 tasks scheduled for this afternoon: "Study Biology" (1 PM), "Gym Session" (3 PM), "Clean Room" (4:30 PM).
      2. Sudden personal conflict: user adds event "Dentist Appointment" from 2:30 PM to 4:30 PM.
      3. Calendar flags overlap conflict: Gym Session (3 PM) overlaps Dentist.
      4. User clicks "Dynamic Replanning".
      5. Heuristic shifts "Gym Session" to 5 PM and "Clean Room" to 6:30 PM. Recalculates evening workload.
      6. User confirms the new plan.
    - **Verification**: Event added successfully. Task slots in database updated to new times. Conflict banner clears.

71. **RW-F5: "Habit Formation & Procrastination Interception"**
    - **Flow**:
      1. User tracks a habit "Code Daily" (streak at 4 days).
      2. User has an assignment "Data Structures Assignment" due tomorrow morning, but has logged 0 focus hours on it.
      3. System detects proximity to deadline with 0% progress and triggers a "Procrastination Warning" on Dashboard.
      4. User clicks warning action "Start Focus Session".
      5. Timer starts. User completes 50-minute session.
      6. Marks assignment as complete.
      7. System automatically logs the "Code Daily" habit completion for today.
    - **Verification**: Habit streak increments to 5, heatmap updates, task is marked COMPLETED, and procrastination warning is cleared.
