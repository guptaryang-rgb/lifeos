# E2E Testing Infrastructure Analysis - LifeOS

This analysis establishes the technical design, tooling recommendation, and test case inventory for the opaque-box end-to-end (E2E) testing suite of the LifeOS application.

---

## 1. E2E Testing Framework Recommendation

We recommend **Playwright** as the E2E testing framework for LifeOS.

### Comparison & Rationale:

| Metric / Feature | Playwright | Vitest / Jest + JSDOM | Cypress |
|---|---|---|---|
| **Execution Environment** | Real Browsers (Chromium, WebKit, Firefox) | Node.js (Simulated JSDOM) | Real Browsers (in-browser iframe) |
| **Opaque-Box E2E Suitability** | Excellent | Poor (designed for unit/component tests) | Good |
| **Multi-Viewport & Responsive Design** | Native, concurrent (Desktop 1440px / Mobile 375px) | None (mocked width/height, no layout rendering) | Sequential, single-browser instance |
| **Authentication Mocking** | Native `storageState` sharing (fast, multi-context) | Manual mock variables | Custom commands, slower context reset |
| **Server Components Compatibility** | Interacts with fully rendered SSR/RSC HTML | Hard to mock next/server components | Interacts with fully rendered HTML |
| **Speed & Flakiness** | High speed (parallel), auto-waiting reduces flakiness | High speed (no browser), but doesn't test UI | Slower execution, debuggable |

### Why Playwright?
1. **App Router & RSC Compatibility**: Next.js App Router heavily utilizes React Server Components (RSC). Testing these requires a real browser that receives fully rendered HTML from a running server. Playwright executes tests against the running server at `http://localhost:3000`, matching the opaque-box requirement.
2. **True Responsive Testing**: Playwright allows testing the dark-mode glassmorphic interface at both `1440px` (Desktop) and `375px` (Mobile) in parallel via the browser configuration.
3. **NextAuth Session Optimization**: NextAuth.js credentials provider session handling can be programmatically injected into Playwright's `storageState` to bypass the UI login flow for pages like dashboard, calendar, and analytics, drastically speeding up test execution.
4. **Auto-Waiting**: Next.js client-side navigations and transitions are smoothly handled by Playwright's auto-wait mechanisms, minimizing flakiness.

*Note: Unit testing for local modules (`src/lib/planner.ts` and `src/lib/heuristics.ts`) should use **Vitest** for quick, isolated execution, while E2E verification remains in Playwright.*

---

## 2. Infrastructure Design: Dependency Isolation

We recommend placing an **isolated `package.json` inside `tests/e2e`** rather than bloating the project root `package.json`.

### Architecture:
```
C:\Users\gupta_ikq631n\teamwork_projects\lifeos
├── tests/
│   ├── e2e/
│   │   ├── package.json         # Isolated E2E dependencies & scripts
│   │   ├── playwright.config.ts # Playwright config
│   │   └── specs/               # Test specifications (Tiers 1-4)
│   └── unit/                    # Unit tests
├── package.json                 # Main application package.json
```

### Rationale:
1. **Clean Production Builds**: Production builds do not need Playwright browser binaries, which weigh hundreds of megabytes. Keeping them in `tests/e2e` prevents them from polluting production deployment pipelines.
2. **Independent Dependency Versions**: Avoids dependency conflicts between test utilities (e.g., specific typescript, linting, or helper versions) and the Next.js runtime.
3. **Execution Simplicity**: Running E2E tests is isolated to `cd tests/e2e && npm install && npm test`. This can be automated from the root `package.json` using standard prefixing commands:
   - `"test:e2e": "npm --prefix tests/e2e run test"`

---

## 3. Test Execution, Compilation & Mocking Strategy

### Test Execution & Compilation
- **Zero-config compilation**: Playwright has built-in TypeScript compilation support using an internal esbuild transpiler. We do not need a separate compilation step; the test runner executes `.ts` files directly.
- **Continuous Integration**: The test runner launches the Next.js server, runs the tests, and shuts the server down.

### Backend and Database Mocking (when App is not running / local setup)
To maintain an opaque-box setup while guaranteeing test repeatability, we must solve two challenges: server components accessing the database directly, and API endpoint state.

1. **Dedicated Test Database Schema**:
   - The E2E runner will execute against a local SQLite database file `tests/e2e/test.db` (or a dedicated PostgreSQL test schema) by passing `DATABASE_URL` as an environment variable to the Next.js server.
   - This ensures E2E testing does not mutate production or standard development database data.

2. **Global Setup and Teardown**:
   - Before tests run, Playwright's `globalSetup` script will run Prisma migrations on the test database: `npx prisma db push --schema=../../prisma/schema.prisma`.
   - Playwright's `webServer` block will launch the application:
     ```ts
     webServer: {
       command: 'npm run dev', // or 'npm run build && npm run start'
       port: 3000,
       env: {
         DATABASE_URL: 'file:./test.db', // Redirect Next.js to the E2E test database
         NODE_ENV: 'test'
       },
       reuseExistingServer: !process.env.CI
     }
     ```

3. **Database Reset & State Injection**:
   - For fast, independent tests, the database must be reset between test runs.
   - We will implement a test-only route `/api/test/reset` inside the main Next.js app, active **only** if `process.env.NODE_ENV === 'test'`.
   - Before each E2E test, Playwright makes a POST request to `http://localhost:3000/api/test/reset` with a payload of seed data specific to that test. This allows dynamic database resetting and seeding from within browser-driven tests.

4. **Authentication Mocking**:
   - Playwright will run a setup script that registers/logs in a test user via the API `/api/auth/callback/credentials`, extracts the session cookies, and saves them to `tests/e2e/.auth/user.json`.
   - All tests that require authentication will load this `user.json` storage state directly, bypassing the login UI except for tests targeting the Auth flow itself.

---

## 4. Proposed Content of TEST_INFRA.md

Below is the proposed markdown content to be written to `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\TEST_INFRA.md`.

```markdown
# LifeOS - Testing Infrastructure & Test Suite Plan

This document outlines the testing infrastructure and comprehensive test suite specification for **LifeOS**, a production-ready, full-stack AI Chief of Staff web application.

---

## 1. Testing Infrastructure Design

### 1.1 Core Testing Framework
- **Framework**: [Playwright](https://playwright.dev/)
- **Reasoning**:
  - **Browser-driven E2E validation**: Tests run in real browsers (Chromium, Firefox, WebKit) matching the user experience.
  - **Next.js App Router support**: Seamlessly renders and tests React Server Components (RSC) by executing tests against the running server.
  - **Responsive testing**: Built-in viewport profiling for Desktop (1440px) and Mobile (375px).
  - **Authentication state persistence**: Bypasses the UI login process for subsequent tests via `storageState` cache.
  - **Auto-wait capabilities**: Minimizes flakiness caused by asynchronous rendering, network calls, and dashboard micro-animations.

### 1.2 Layout & Dependency Isolation
To prevent E2E-related devDependencies and browser binaries from bloating the main Next.js production build, all E2E configuration and dependencies are isolated inside `tests/e2e`.

```
C:\Users\gupta_ikq631n\teamwork_projects\lifeos
├── tests/
│   ├── e2e/                     # Isolated E2E Package
│   │   ├── package.json         # Playwright-only dependencies
│   │   ├── playwright.config.ts # Playwright settings and browser profiles
│   │   ├── global-setup.ts      # Database migrations and authentication setup
│   │   ├── global-teardown.ts   # Test database cleanup
│   │   └── specs/               # Test cases
│   │       ├── auth.spec.ts
│   │       ├── dashboard.spec.ts
│   │       ├── planner.spec.ts
│   │       ├── tasks_goals.spec.ts
│   │       ├── habits_analytics.spec.ts
│   │       └── focus.spec.ts
│   └── unit/                    # Unit tests for core helpers
├── package.json                 # Main Next.js application package
```

To run E2E tests from the workspace root:
- Install dependencies: `npm install --prefix tests/e2e`
- Run test execution: `npm --prefix tests/e2e run test`

---

## 2. Test Execution & Database Mocking Strategy

### 2.1 Compilation
Playwright compiles TypeScript files on-the-fly using its internal transpiler. No manual typescript compilation step is required before running the test suite.

### 2.2 Dedicated Test Database (Isolated State)
- During E2E testing, the application is started with the `DATABASE_URL` environment variable redirected to a dedicated test database (e.g. `file:./test.db` for SQLite, or a dedicated PostgreSQL test schema).
- This protects local development data and ensures test runs are completely isolated.

### 2.3 Resetting State Between Tests
- A hidden API endpoint `/api/test/reset` is added to the Next.js application, active **only** when `process.env.NODE_ENV === 'test'`.
- Before each test, the Playwright runner sends a POST request to this endpoint with a seed payload representing the desired state for that test (e.g., specific tasks, completed focus sessions, habit history). The API handler truncates all tables and seeds the database.

### 2.4 Authentication Mocking
- Playwright handles credentials login programmatically by hitting the authentication API directly or signing in via the UI once in `global-setup.ts`.
- The authenticated browser state is stored in `tests/e2e/.auth/user.json`.
- Specific tests load this state in their `use` options to start in an authenticated state instantly.

---

## 3. Feature Inventory

LifeOS is tested across 6 primary feature modules:
1. **F1: Authentication (Auth)** - Registration, login, session guards, logout, and data isolation.
2. **F2: Unified Dashboard & Daily Briefing** - Responsive glassmorphic layout, daily briefing aggregates, quick widgets, and metrics calculation.
3. **F3: AI Planner & Smart Calendar** - Drag-and-drop calendar views, AI-driven scheduling heuristics, dynamic replanning, and conflict warnings.
4. **F4: Assignment Tracker & Goal System** - Task CRUD, progress estimation, subtask aggregation, goal/milestone link tracking.
5. **F5: Habit Tracker & Progress Analytics** - Habit frequency logging, streak calculations, heatmaps, analytics charts, and burnout risk calculations.
6. **F6: Deep Work Mode (Focus Session)** - Pomodoro timer mechanics, distraction blocker overlay, and focus statistics logs.

---

## 4. Test Suite Specification (Tiers 1-4)

### Tier 1: Feature Coverage (>=5 tests per feature, >=30 total)

This tier ensures that every critical requirement of the application works correctly under normal operating conditions.

#### F1: Authentication (Auth)
- **T1.1_Auth_RegisterSuccess**: A new user can register successfully with valid credentials and is redirected to the login page.
- **T1.2_Auth_RegisterDuplicate**: Registering with an already existing email fails and displays a clear validation error.
- **T1.3_Auth_LoginSuccess**: Logging in with correct credentials establishes a session and redirects to the dashboard.
- **T1.4_Auth_LoginIncorrectPassword**: Logging in with an incorrect password fails and displays an invalid credentials error.
- **T1.5_Auth_SessionGuard**: Accessing private paths (`/dashboard`, `/calendar`, `/tasks`, `/goals`, `/habits`, `/analytics`) as an unauthenticated user redirects to `/auth/login`.
- **T1.6_Auth_Logout**: Clicking logout revokes the session and redirects the user back to the login screen.
- **T1.7_Auth_DataIsolation**: Logged-in User A cannot view User B's tasks or calendar events via direct URL manipulation or API requests.

#### F2: Unified Dashboard & Daily Briefing
- **T1.8_Dash_LayoutRender**: Verify the dashboard loads with a dark glassmorphic UI, responsive sidebar navigation, and header widgets on a Desktop (1440px) screen.
- **T1.9_Dash_ResponsiveMobile**: Verify the dashboard sidebar collapses and elements stack vertically without overlapping on a Mobile (375px) screen.
- **T1.10_Dash_BriefingAggregation**: Verify the Daily Briefing panel aggregates today's scheduled tasks, calendar events, active habits, and displays the AI briefing text.
- **T1.11_Dash_QuickActionAddTask**: Clicking the dashboard "Add Task" quick-action widget opens a modal, and submitting a new task adds it to today's briefing panel.
- **T1.12_Dash_QuickActionHabit**: Toggling a habit completion checkbox in the dashboard briefing panel updates today's habit status and increments the streak counter.
- **T1.13_Dash_MetricsRendering**: Verify today's stats widgets (Completed Tasks count, total Focus Hours, Habit streaks, and Life Score) render with correct calculations.

#### F3: AI Planner & Smart Calendar
- **T1.14_Plan_CalendarViews**: Verify calendar renders and supports switching between Day, Week, and Month views correctly.
- **T1.15_Plan_DragReschedule**: Verify a calendar event's time changes when dragged to a different time slot, sending an API PATCH request.
- **T1.16_Plan_HeuristicGeneration**: Verify that clicking "Generate AI Schedule" calls the heuristic planner and displays scheduled task time blocks around existing calendar events.
- **T1.17_Plan_DynamicReplanning**: Verify that completing or adding a task triggers the planner to suggest a revised calendar layout.
- **T1.18_Plan_ConflictWarning**: Verify that a conflict warning alert banner is displayed when two calendar events overlap or when scheduled hours exceed the work day boundary.

#### F4: Assignment Tracker & Goal System
- **T1.19_Task_CRUD**: Create, edit, and delete a task with a title, description, due date, estimated effort, and priority. Verify it updates in the list.
- **T1.20_Task_SubtasksPercentage**: Create a task with 4 subtasks. Checking off 2 subtasks calculates and displays a task progress of 50%.
- **T1.21_Goal_CreateMilestones**: Create a medium-term goal with 3 milestones and verify it is successfully saved and listed with 0% progress.
- **T1.22_Goal_LinkTaskCompletion**: Link a task to a goal milestone. Complete the task and verify the milestone is updated and the overall goal progress increases.
- **T1.23_Task_FiltersSearch**: Verify filtering by status (OVERDUE, COMPLETED), sorting by priority, and searching by keyword properly filters the task list.

#### F5: Habit Tracker & Progress Analytics
- **T1.24_Habit_CRUD**: Create a new habit with custom frequency (e.g., Mon, Wed, Fri) and category. Verify it is successfully added to the tracker.
- **T1.25_Habit_LogIncrement**: Log a habit completion for today. Verify the completion is saved and the current streak increments.
- **T1.26_Habit_HeatmapVisual**: Verify the habit heatmap renders correctly with colored nodes representing historical completions.
- **T1.27_Anal_ChartsRender**: Verify the Analytics page displays interactive charts for Focus hours, task completion rate, and habit adherence.
- **T1.28_Anal_BurnoutScore**: Verify the Burnout Risk card calculates and renders a burnout score (0-100) and displays actionable recommendations.

#### F6: Deep Work Mode (Focus Session)
- **T1.29_Focus_TimerControls**: Start, pause, resume, and cancel a Pomodoro focus timer. Verify that the countdown timer updates dynamically.
- **T1.30_Focus_TimerCompletion**: Let the Pomodoro timer run to completion. Verify that the session is automatically logged to the database.
- **T1.31_Focus_DistractionBlocker**: Verify that starting a focus session locks out other dashboard widgets, showing an overlay that blocks distraction.
- **T1.32_Focus_SessionLogging**: Verify that logged focus sessions update the total focus time metrics on the Dashboard.
- **T1.33_Focus_StatsGrid**: Verify the focus mode statistics grid renders correct values for total focus sessions completed and average focus time.

---

### Tier 2: Boundary/Edge Cases (>=5 tests per feature, >=30 total)

This tier ensures the application is resilient against extreme inputs, empty states, and validation limits.

#### F1: Authentication (Auth)
- **T2.1_Auth_InvalidFormat**: Submit registration with malformed emails, or passwords shorter than the required minimum (should fail validation).
- **T2.2_Auth_CaseInsensitiveEmail**: Verify that logging in with cased variations of the registered email (e.g. USER@domain.com vs user@domain.com) works successfully.
- **T2.3_Auth_ExpiredSession**: Intercept requests and simulate an expired session token; verify the app redirects to `/auth/login` gracefully.
- **T2.4_Auth_SqlInjectionInputs**: Attempt registration with SQL injection payloads (e.g. `' OR '1'='1`) in inputs to verify validation sanitizes fields.
- **T2.5_Auth_RapidLoginClick**: Double-click or spam the login button to verify the auth handler prevents race conditions or multiple session creations.

#### F2: Unified Dashboard & Daily Briefing
- **T2.6_Dash_ExtremeTasksLoad**: Load the dashboard for a user with 100+ tasks scheduled for today. Verify the briefing panel paginates or scrolls cleanly without layout break.
- **T2.7_Dash_EmptyState**: Verify layout looks clean, showing friendly empty-state illustrations and placeholders when a user has no habits, events, or tasks.
- **T2.8_Dash_DynamicResize**: Resize viewport rapidly from 1920px to 320px while a focus timer is running. Verify no text overlapping or button clipping occurs.
- **T2.9_Dash_ZeroMetrics**: Check dashboard calculations when all values are zero (e.g. 0 focus time, 0 habits completed) to verify it does not show `NaN%`.
- **T2.10_Dash_WidgetDebounce**: Double-tap the habit toggle checkbox rapidly. Verify UI debounce prevents duplicate API calls and keeps state synchronized.

#### F3: AI Planner & Smart Calendar
- **T2.11_Plan_ScheduleOverload**: Request AI planner to schedule 24 hours worth of tasks in a single day. Verify conflict warning triggers and task blocks are packed up to the work end hour, listing remaining tasks as unscheduled.
- **T2.12_Plan_PastScheduling**: Attempt to drag a task or event to a past time slot. Verify UI displays warning or blocks the action.
- **T2.13_Plan_ZeroWorkHours**: Set work start hour and work end hour to the same value (e.g. 9 to 9) or reverse them (e.g. 22 to 9). Verify the planner handles this configuration without entering infinite loops.
- **T2.14_Plan_ExtremeTitleLength**: Create a calendar event with a title exceeding 255 characters. Verify UI truncates it gracefully without breaking the layout grid.
- **T2.15_Plan_ZeroDurationTask**: Schedule a task with an estimated duration of 0 minutes. Verify the planner defaults it to a minimal schedule block (e.g. 15 minutes) or rejects it with validation.

#### F4: Assignment Tracker & Goal System
- **T2.16_Task_ExtremeSubtasks**: Create a task with 50 subtasks. Verify the subtask section expands or scrolls correctly, and checking subtasks recalculates progress without floating-point errors.
- **T2.17_Goal_FractionalProgress**: Link three tasks to a single goal milestone. Complete one task and verify that progress updates to 33% (correctly rounded, avoiding infinite decimal strings).
- **T2.18_Task_LeapYearDeadline**: Set a task deadline to February 29 on a leap year, and verifying the date is parsed, saved, and displays correctly.
- **T2.19_Task_SpecialCharSearch**: Perform a search on the task list using special regex characters (e.g. `[.*+?^${}()|[]\\]`). Verify search query escapes characters and returns accurate results without errors.
- **T2.20_Goal_ZeroMilestones**: Create a goal with no milestones. Verify that the goal lists successfully, and progress calculations default to 0% rather than throwing division-by-zero errors.

#### F5: Habit Tracker & Progress Analytics
- **T2.21_Habit_StreakOverflow**: Seed the database with a habit streak of 1000+ days. Verify that the streak counter displays correctly without styling overflow.
- **T2.22_Habit_FutureLogging**: Attempt to log a habit for tomorrow or future dates via API. Verify the API rejects future logs.
- **T2.23_Anal_NoDataAnalytics**: Load the analytics page with a brand-new user account. Verify that charts display friendly "No data recorded yet" placeholders.
- **T2.24_Anal_ExtremeBurnoutInputs**: Set workload density to 300%, missed tasks to 500, and streak decline to 100%. Verify the Burnout Risk score caps at 100 and shows maximum alert indicators.
- **T2.25_Habit_WeeklyCompletionBoundaries**: Create a weekly habit. Log it on Sunday at 23:59. Verify that the habit is marked completed for the current week, and resets correctly on Monday at 00:00.

#### F6: Deep Work Mode (Focus Session)
- **T2.26_Focus_ExtremeDuration**: Set custom Pomodoro duration to 0 minutes, or a very high value (e.g. 1440 minutes). Verify UI validation caps the duration.
- **T2.27_Focus_SessionRecovery**: Simulate a browser tab crash or refresh while a focus timer has 10 minutes remaining. Verify that reloading the dashboard recovers the timer state.
- **T2.28_Focus_MidnightSpan**: Start a 30-minute focus session at 23:45. Let it complete at 00:15. Verify that the session is split or logged such that analytics attribute focus minutes accurately to the correct dates.
- **T2.29_Focus_ConcurrentSessions**: Try to open a second tab and start a focus session while one is active. Verify the second session is blocked, prompting that a focus session is already active.
- **T2.30_Focus_BurntOutRestriction**: Start a focus session when the Burnout Score is > 85. Verify that a warning recommends taking a break instead of starting focus.

---

### Tier 3: Cross-Feature Interactions (pairwise, >=6 total)

This tier validates interactions between multiple independent modules of the application.

- **T3.1_Auth_Dashboard_Flow**: Log in, verify redirection to Dashboard, check user-specific briefing data. Log out, attempt navigating back via browser history, and verify redirection to login.
- **T3.2_Task_Goal_Dashboard_Sync**: Create a task linked to a goal milestone. Complete the task. Verify that the Goal page progress increments and the Dashboard "Completed Tasks" and "Life Score" widgets update in real-time.
- **T3.3_Planner_Task_Calendar_Integration**: Create a new assignment. Open AI Planner, generate schedule suggestions, and accept. Verify that a new scheduled event appears on the Calendar, and the task status changes to IN_PROGRESS.
- **T3.4_Habit_Dashboard_Analytics_Sync**: Log today's habit completion on the Dashboard quick-action widget. Verify the habit streak on the dashboard increases, and check that the Analytics habit heatmap shows a completion dot for today.
- **T3.5_Focus_Analytics_Burnout_Loop**: Complete a Pomodoro session. Verify that Analytics charts record the new focus minutes, the weekly trend updates, and the Burnout Risk score decreases due to improved focus trends.
- **T3.6_Planner_Calendar_Burnout_Spike**: Create 15 high-priority, long-duration tasks. Generate AI schedule, overloading the calendar. Verify that the conflict warning triggers and the Burnout Risk Card displays a high score (>75) warning the user of overload.

---

### Tier 4: Real-World Application Scenarios (at least 5 flows)

This tier tests end-to-end user journeys modeled after typical user behavior.

#### T4.1_Scenario_CrammingStudent
- **Persona**: A student who has procrastinated and is facing multiple deadlines tomorrow.
- **Flow**:
  1. User logs in.
  2. User creates 5 academic tasks (assignments) all due tomorrow, with estimated efforts of 2-3 hours each.
  3. User views Calendar: conflict warning banner overlays showing overloaded schedule.
  4. User views Dashboard: Burnout Card displays "High Risk (Score: 88)" with recommendation to replan and defer tasks.
  5. User clicks "AI Replanner".
  6. The replanner heuristic recommends rescheduling 2 lowest-priority tasks to the next day.
  7. User clicks "Accept Suggestion". Calendar update succeeds, conflicts disappear, and Burnout score drops.

#### T4.2_Scenario_HabitBuilder
- **Persona**: A young professional focused on establishing consistent daily habits.
- **Flow**:
  1. User logs in on Monday morning.
  2. User creates a new habit: "LeetCode Daily" (frequency: daily, category: work).
  3. User launches a 30-minute focus session from the Dashboard quick widget to work on coding.
  4. Focus mode launches, distraction blocker hides all other page widgets.
  5. Timer runs to completion; focus session is logged.
  6. User goes to Dashboard, checks off the "LeetCode Daily" habit.
  7. User verifies Dashboard metrics: completed tasks = 1, focus time = 30m, habit streak = 1, and the Analytics heatmap shows Monday logged.

#### T4.3_Scenario_GoalAchievement
- **Persona**: An academic aiming to track a long-term goal with milestones.
- **Flow**:
  1. User creates a yearly goal "Submit Thesis Paper".
  2. User creates 3 Milestones: "Drafting Chapter 1", "Drafting Chapter 2", and "Review".
  3. User creates a task "Write section 1.1", links it to "Drafting Chapter 1" milestone.
  4. User runs a 60-minute focus session to complete the task.
  5. User marks the task completed.
  6. User verifies:
     - Milestone "Drafting Chapter 1" progress is updated.
     - Goal "Submit Thesis Paper" progress bar updates to 15%.
     - Analytics charts record the +60m focus session.

#### T4.4_Scenario_ProcrastinatorMitigation
- **Persona**: A user with tasks approaching deadlines that have not been started.
- **Flow**:
  1. Seed script initializes a high-priority task "Physics Project" due in 18 hours (untouched for 6 days).
  2. User logs in.
  3. Dashboard daily briefing highlights "Physics Project" with a "Procrastination Alert: Task untouched near deadline".
  4. AI Planner widget suggests scheduling a 2-hour study event in the next empty calendar slot.
  5. User accepts the recommendation.
  6. The event is successfully created on the Calendar.
  7. User completes the task, clearing the procrastination alert from the dashboard.

#### T4.5_Scenario_WeeklyResetReview
- **Persona**: A user reviewing their productivity achievements at the end of the week.
- **Flow**:
  1. Seed script loads database with a week of focus logs (10 hours total), task completions (12 tasks), and 90% habit adherence.
  2. User logs in on Sunday evening.
  3. User navigates to the Analytics page.
  4. User verifies focus hours chart displays daily bar columns totaling 10 hours.
  5. User checks Burnout Risk score showing "Low (Score: 12)".
  6. User creates 2 goals for the upcoming week and schedules 4 tasks on the calendar.
  7. User runs AI Planner to optimize the calendar blocks around existing events for the next week.
```

