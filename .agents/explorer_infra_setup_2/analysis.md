# E2E Testing Infrastructure Analysis and Proposal — LifeOS

## 1. Executive Summary
This report analyzes E2E testing options for the **LifeOS** Next.js App Router web application. It recommends **Playwright** as the E2E framework and proposes integrating it into the root `package.json` with configuration isolated inside `tests/e2e/`. To test the application before it is running or fully seeded, a dedicated test database (using SQLite or local PostgreSQL) is recommended alongside NextAuth session mocking. A comprehensive test inventory of 71 tests across four tiers is defined to verify features, boundary states, cross-feature interactions, and real-world flows.

---

## 2. E2E Testing Framework Recommendation

We recommend **Playwright** over Vitest or Jest for the E2E testing suite.

### Detailed Comparison

| Criterion | Playwright | Vitest / Jest |
|---|---|---|
| **Execution Context** | Real browsers (Chromium, Firefox, WebKit) | Simulated DOM environment (`jsdom` / `happy-dom`) |
| **Next.js 14 App Router Support** | **Excellent**. Runs the fully compiled server; captures server-side rendering, RSC hydration, and Server Actions. | **Poor**. Mocking server components, metadata, and routing in jsdom is highly complex and error-prone. |
| **User Interaction Fidelity** | **Excellent**. Low-level native OS-like interactions (e.g. clicking, typing, dragging). | **Limited**. Simulates events in jsdom, which does not accurately reproduce drag-and-drop or pointer coordinates. |
| **Multi-Viewport Support** | **Native**. Emulates viewports (1440px desktop, 375px mobile) and device profiles. | **Manual**. Requires mocking window sizes and CSS media query evaluation. |
| **Asynchronous Resilience** | **Built-in Auto-Waiting**. Automatically waits for elements to be stable, reducing test flakiness. | **Manual**. Requires wrapping assertions in `waitFor` or adding custom timers. |
| **Network & Mocking Capabilities** | **Direct Browser Interception** (`page.route`). Easily intercepts API requests. | **Service-Worker/MSW based**. Requires manual setup for route intercepts inside a node context. |

### Rationale:
Opaque-box testing requires interacting with LifeOS exactly as a user would. Because LifeOS uses **Next.js App Router, React Server Components**, and features a **drag-and-drop Smart Calendar** (R2) and a **responsive design** (R1), Playwright is the only framework that can execute these tests with high fidelity. Vitest is highly suitable for unit tests (e.g. testing the heuristics in `src/lib/heuristics.ts` and planner logic in `src/lib/planner.ts`), but not for opaque-box E2E testing.

---

## 3. Testing Infrastructure Design

### Dependency Isolation vs. Root Integration
We evaluated two directory configurations for placing E2E dependencies:

#### Option A: Isolated `tests/e2e/package.json`
- **Setup**: `tests/e2e/` contains its own `package.json` listing Playwright and related testing packages.
- **Pros**: complete separation; zero risk of dependency version conflicts with the Next.js app.
- **Cons**: Requires double `npm install`; complicates sharing DB schemas and scripts; makes the test execution command from the root complex.

#### Option B: Root `package.json` with Config Isolation (Recommended)
- **Setup**: DevDependencies are defined in the root `package.json`, but the test files, mocks, and setup files are placed inside `tests/e2e/`. Playwright's config is located at `tests/e2e/playwright.config.ts`.
- **Pros**: Standard Next.js pattern, single `npm install`, simple root scripts (e.g. `npm run test:e2e`), easy access to root Prisma schema and seeding utilities.
- **Cons**: Slightly larger `devDependencies` list at the root.

### Recommendation:
We recommend **Option B: Root `package.json` with Config Isolation**. It provides a frictionless developer experience while keeping the E2E assets cleanly separated inside `/tests/e2e/`.

---

## 4. Test Runner Execution & Mocking Flow

### A. How the Test Runner Executes
1. Run E2E setup command, which points to the isolated config file:
   ```bash
   npx playwright test -c tests/e2e/playwright.config.ts
   ```
2. Playwright reads `tests/e2e/playwright.config.ts`.
3. The `webServer` option in the config runs:
   ```typescript
   webServer: {
     command: 'npm run dev',
     url: 'http://localhost:3000',
     reuseExistingServer: !process.env.CI,
     env: {
       DATABASE_URL: process.env.TEST_DATABASE_URL || "file:./test.db"
     }
   }
   ```
4. Playwright spins up the dev server, waits for `localhost:3000` to be responsive, and runs the tests in parallel.

### B. Compilation
Playwright has native, built-in support for TypeScript and ES Modules (using an internal esbuild runner). We do **not** need to configure custom webpack, vite, or babel compilers for E2E tests. It will compile `tests/e2e/**/*.spec.ts` files automatically.

### C. Mocking the Backend & Database
1. **Database Isolation**: Since React Server Components query Prisma directly on the server, we cannot intercept these calls in the browser. We must run a dedicated test database (configured in `.env.test`). Before launching the test runner, we execute:
   ```bash
   dotenv -e .env.test -- npx prisma db push --force-reset
   dotenv -e .env.test -- npx prisma db seed
   ```
2. **NextAuth Session Mocking**:
   - For tests requiring authentication, we save cookie states using Playwright's `storageState` to log in once globally, then load that state in tests.
   - If authentication is not yet built, we mock the REST endpoint `/api/auth/session` using Playwright's `page.route()` to return a mock session object, forcing the frontend to treat the user as logged in.

---

## 5. Draft of TEST_INFRA.md

Below is the proposed content of `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\TEST_INFRA.md` which will be created in the project root:

```markdown
# Testing Infrastructure Design: LifeOS E2E Test Suite

This document describes the testing infrastructure, framework, execution commands, and comprehensive test inventory for the **LifeOS** web application.

---

## 1. Testing Framework Choice & Rationale

**Playwright** is the recommended end-to-end (E2E) testing framework for LifeOS, rather than Vitest or Jest.

### Why Playwright?
1. **Real Browser Execution (Opaque-Box Testing)**: Next.js App Router applications leverage React Server Components (RSC) and Server Actions. Testing these end-to-end requires a real browser environment that handles full network roundtrips, HTML rendering, and real browser cookies/sessions, rather than a simulated DOM environment (like `jsdom` or `happy-dom` used by Vitest/Jest).
2. **Multi-Viewport Capabilities**: R1 requires the app to be fully responsive on both desktop (1440px) and mobile (375px). Playwright allows native mobile emulation (e.g., iPhone/Pixel viewports and touch events) out-of-the-box.
3. **Complex User Interactions**: R2 requires dragging-and-dropping calendar events. Playwright provides built-in, low-level mouse and pointer API actions that simulate real user drag actions in a headless browser, which is extremely difficult or impossible to test reliably in Vitest.
4. **Resilient Auto-Waiting**: Playwright automatically waits for elements to be actionable (visible, enabled, stable) before performing operations, dramatically reducing test flakiness.
5. **Integrated Dev Server Integration**: Playwright's `webServer` config can automatically boot, build, and tear down the Next.js local server on `localhost:3000` before running the test suites.
6. **Network Interception & Mocking**: Playwright provides `page.route()`, allowing E2E tests to intercept HTTP requests (e.g., mock NextAuth session responses or external API endpoints) without modifying application code.

---

## 2. Codebase Layout & Dependency Isolation Strategy

We recommend incorporating the testing scripts and devDependencies into the **root `package.json`** while isolating the configuration and test cases inside a dedicated **`tests/e2e/`** folder.

### Layout Diagram
```
C:\Users\gupta_ikq631n\teamwork_projects\lifeos
├── prisma/
├── src/
├── tests/
│   ├── e2e/                        # Opaque-box E2E Tests
│   │   ├── specs/                  # Test spec files (Tiers 1-4)
│   │   │   ├── auth.spec.ts
│   │   │   ├── dashboard.spec.ts
│   │   │   ├── calendar.spec.ts
│   │   │   ├── tasks_goals.spec.ts
│   │   │   ├── habits.spec.ts
│   │   │   └── focus_burnout.spec.ts
│   │   ├── mocks/                  # Network and session mocks
│   │   │   ├── auth.mock.ts
│   │   │   └── database.mock.ts
│   │   ├── setup/                  # Global setup/teardown (e.g. auth storage state)
│   │   │   └── global-setup.ts
│   │   └── playwright.config.ts    # Isolated E2E configuration file
│   └── unit/                       # Local logic and API route unit tests
├── package.json                    # Root package.json (includes E2E runner scripts)
├── tsconfig.json
└── .env.test                       # Environment variables for E2E tests
```

### Dependency Isolation vs. Root Integration
- **Root Integration**: Playwright and its TypeScript types are listed under `devDependencies` in the root `package.json`. This simplifies installation (`npm install` handles everything) and allows unified scripts (e.g., `npm run test:e2e`).
- **Config Isolation**: To avoid cluttering the root, the Playwright config is located inside `tests/e2e/playwright.config.ts`. Tests can be run from the root by specifying the config path: `npx playwright test -c tests/e2e/playwright.config.ts`.
- **Alternative (Separate package.json inside `tests/e2e/`)**: Placing a `package.json` inside `tests/e2e/` would completely isolate dependencies but would require developers to run `npm install` in two directories, complicate CI/CD configurations, and make sharing DB seeding utilities and tsconfig setups difficult. Therefore, **Root Integration + Config Isolation** is the preferred setup.

---

## 3. Database & Authentication Mocking Strategy

Since E2E tests are opaque-box, they interact with the fully compiled application on `localhost:3000`. We must manage database and authentication states without breaking Server Components.

### A. Test Database Isolation
To prevent tests from mutating development or production data:
1. We use a dedicated test database (e.g., SQLite `file:./test.db` or a separate PostgreSQL container instance like `postgresql://localhost:5432/lifeos_test`) specified in `.env.test`.
2. Before the test runner boots, we run Prisma migrations and seeds to establish a known state:
   ```bash
   dotenv -e .env.test -- npx prisma db push --force-reset
   dotenv -e .env.test -- npx prisma db seed
   ```
3. After the test runs, the test database is reset or discarded.

### B. NextAuth Authentication Mocking
There are two strategies to bypass typing credentials in every test:
1. **Playwright Storage State (Recommended for standard flow)**:
   - Perform a login action in a global setup script (`tests/e2e/setup/global-setup.ts`).
   - Save the cookies and localStorage representing the authenticated session to a file (e.g., `tests/e2e/setup/storage-state.json`).
   - Configure Playwright to automatically load this storage state for authenticated test blocks, skipping the login screen entirely.
2. **NextAuth API Mocking (For unstarted/partially built auth)**:
   - When NextAuth is not yet fully functional, mock `/api/auth/session` using Playwright's `page.route()` to return a dummy user session object:
     ```typescript
     await page.route('**/api/auth/session', async (route) => {
       await route.fulfill({
         status: 200,
         contentType: 'application/json',
         body: JSON.stringify({
           user: { name: 'Test User', email: 'test@example.com', id: 'test-user-id' },
           expires: new Date(Date.now() + 2 * 3600000).toISOString(),
         }),
       });
     });
     ```
   - This bypasses client-side auth redirection and lets us test dashboard pages immediately.

---

## 4. Test Runner Execution Flow

```
                     ┌───────────────────────────┐
                     │  1. Read .env.test & CLI  │
                     └─────────────┬─────────────┘
                                   │
                     ┌─────────────▼─────────────┐
                     │ 2. Reset & Seed Test DB   │
                     │  (prisma db push & seed)  │
                     └─────────────┬─────────────┘
                                   │
                     ┌─────────────▼─────────────┐
                     │ 3. Start Next.js Server   │
                     │  (PORT=3000 npm run dev)  │
                     └─────────────┬─────────────┘
                                   │
                     ┌─────────────▼─────────────┐
                     │ 4. Run Playwright Tests   │
                     │ (Desktop & Mobile viewports)│
                     └─────────────┬─────────────┘
                                   │
                     ┌─────────────▼─────────────┐
                     │ 5. Stop Server & Clean DB │
                     └───────────────────────────┘
```

---

## 5. Test Case Inventory

### Tier 1: Feature Coverage (>= 5 tests per feature, >= 30 total)

#### Feature 1: Authentication & Session Management (`tests/e2e/auth.spec.ts`)
1. **T1.AUTH.1: Successful User Registration**
   - *Action*: Navigate to `/auth/register`, enter valid email, password, and confirmation, submit.
   - *Assertion*: Redirect to login page or dashboard with a success toast.
2. **T1.AUTH.2: Successful Credentials Login**
   - *Action*: Navigate to `/auth/login`, enter valid registered credentials, click "Sign In".
   - *Assertion*: Redirect to `/dashboard`. Cookie `next-auth.session-token` is set.
3. **T1.AUTH.3: Successful User Logout**
   - *Action*: Click the logout button on the navigation panel.
   - *Assertion*: Redirect to `/auth/login`. Session cookie is deleted. Restricting access to `/dashboard`.
4. **T1.AUTH.4: Guest Route Protection Redirect**
   - *Action*: Attempt to navigate directly to `/dashboard` or `/calendar` when not logged in.
   - *Assertion*: User is automatically redirected to `/auth/login` with `callbackUrl`.
5. **T1.AUTH.5: Session Persistence on Reload**
   - *Action*: Log in successfully, reload page.
   - *Assertion*: Dashboard remains loaded, and user is not redirected to login page.

#### Feature 2: Unified Dashboard & Daily Briefing (`tests/e2e/dashboard.spec.ts`)
6. **T1.DASH.1: Responsive Glassmorphism Layout**
   - *Action*: Load `/dashboard` in desktop (1440px) and mobile (375px) viewports.
   - *Assertion*: Visual elements (gradients, glass cards) render. Desktop shows side navigation; mobile displays hamburger button.
7. **T1.DASH.2: Daily Briefing Panel Population**
   - *Action*: Seed database with today's events, tasks, and habits. View dashboard.
   - *Assertion*: Panel lists today's tasks/meetings. AI summary (e.g. "You have 3 tasks...") is visible.
8. **T1.DASH.3: Quick Add Task Form**
   - *Action*: Fill out the "Quick Add Task" widget input with "Review Chemistry Prep" and submit.
   - *Assertion*: Task immediately appears on today's tasks list on the dashboard.
9. **T1.DASH.4: Quick Habit Toggle**
   - *Action*: Click a habit checkbox inside the Daily Briefing habit widget.
   - *Assertion*: Checkbox updates to checked, habit status saves to database, and streak indicator increments.
10. **T1.DASH.5: Quick Focus Timer Launcher**
    - *Action*: Click "Start Focus" on the dashboard widget.
    - *Assertion*: Opens the focus timer, preconfigured to 25 minutes, and starts counting down.

#### Feature 3: AI Planner & Smart Calendar (`tests/e2e/calendar.spec.ts`)
11. **T1.PLAN.1: Calendar Views Toggle**
    - *Action*: Navigate to `/calendar` and click "Day", "Week", and "Month" view headers.
    - *Assertion*: Calendar grid layout adapts. Target dates match active view.
12. **T1.PLAN.2: Event Creation via Modal**
    - *Action*: Click 9:00 AM on the calendar, enter "Biology Lecture", set category to "ACADEMIC", save.
    - *Assertion*: Event block is visible on the calendar at 9:00 AM.
13. **T1.PLAN.3: Drag-and-Drop Rescheduling**
    - *Action*: Drag "Biology Lecture" event block from 9:00 AM to 11:00 AM.
    - *Assertion*: Event block moves to 11:00 AM. Database is updated.
14. **T1.PLAN.4: AI Planner Autogenerated Schedule**
    - *Action*: Open the AI Planner, select tasks to schedule, and click "Generate Schedule".
    - *Assertion*: Recommended time-blocked events appear on the calendar, fitting between existing events and within work hours.
15. **T1.PLAN.5: Event Deletion**
    - *Action*: Click the "Biology Lecture" event, click "Delete", and confirm.
    - *Assertion*: Event block disappears from calendar and is deleted from database.

#### Feature 4: Assignment Tracker & Goal System (`tests/e2e/tasks_goals.spec.ts`)
16. **T1.TASK.1: Create Assignment with Priority and Energy**
    - *Action*: Navigate to `/tasks`, click "New Task", fill form with title, priority (HIGH), energy (MEDIUM), estimated duration (60m), and save.
    - *Assertion*: Task appears in list with correct high-priority badges.
17. **T1.TASK.2: Add Subtasks & Check Progress**
    - *Action*: Open task, add subtask "Read Chapter 1" and "Draft Outline". Check "Read Chapter 1".
    - *Assertion*: Task displays progress percentage "50% Completed".
18. **T1.TASK.3: Create Weekly/Monthly Goals**
    - *Action*: Navigate to `/goals`, click "Create Goal", select "Weekly", input milestones, and save.
    - *Assertion*: Goal is shown with 0% progress and listing milestones.
19. **T1.TASK.4: Goal-Task Linking**
    - *Action*: Create a new task and select the created Goal from the "Link Goal" dropdown.
    - *Assertion*: Task details show associated goal name, and completing task updates goal progress.
20. **T1.TASK.5: Task Filtering & Search Query**
    - *Action*: Type "Math" in search bar and select status filter "IN_PROGRESS".
    - *Assertion*: Only tasks matching "Math" and in progress status are displayed.

#### Feature 5: Habit Tracker & Progress Analytics (`tests/e2e/habits.spec.ts`)
21. **T1.HAB.1: Habit Creation with Custom Frequency**
    - *Action*: Navigate to `/habits`, click "New Habit", select Mon/Wed/Fri, and save.
    - *Assertion*: Habit is created. Card appears. Checkbox is active on Monday/Wednesday/Friday.
22. **T1.HAB.2: Logging Habit and Visual Heatmap Update**
    - *Action*: Toggle the habit to completed.
    - *Assertion*: Streak increments to 1. Today's cell in the habit heatmap changes to active color.
23. **T1.HAB.3: Analytics Dashboard Navigation**
    - *Action*: Navigate to `/analytics`.
    - *Assertion*: Charts for "Focus Time Trends", "Task Completion Rate", and "Habit Adherence" render successfully.
24. **T1.HAB.4: Chart View Port Ranges**
    - *Action*: Click "Weekly" then "Monthly" on the Focus Hours chart filter.
    - *Assertion*: Chart X-axis labels and data points refresh to display monthly data.
25. **T1.HAB.5: Habit Card Deletion**
    - *Action*: Click "Delete" on a habit card.
    - *Assertion*: Habit card, logs, and streak metrics are completely removed from database.

#### Feature 6: Focus Mode & Burnout Predictor (`tests/e2e/focus_burnout.spec.ts`)
26. **T1.BURN.1: Start Focus Session & Distraction Blocker**
    - *Action*: Open Focus page, click "Start Pomodoro" (25 minutes).
    - *Assertion*: Timer starts counting down. Distraction Blocker overlay covers main navigation.
27. **T1.BURN.2: Session Completion and Stats Logging**
    - *Action*: Simulate timer expiration (triggering timer completion event).
    - *Assertion*: A log is saved in database, total focus duration increments, and rest alert displays.
28. **T1.BURN.3: Focus Session Timer Controls**
    - *Action*: Click "Pause", wait, click "Resume", then click "Stop".
    - *Assertion*: Timer halts countdown, resumes, and stop resets timer to 25:00 without database log.
29. **T1.BURN.4: Burnout Risk Gauge Render**
    - *Action*: Navigate to `/analytics` and scroll to "Burnout Monitor".
    - *Assertion*: Burnout risk score displays as a numeric percentage (e.g. 45%).
30. **T1.BURN.5: Dynamic Actionable Recommendations**
    - *Action*: View Burnout Monitor when database workload state indicates a high score (>70).
    - *Assertion*: Recommendations card updates to show concrete text (e.g. "Workload is heavy. Trim task list.")

---

### Tier 2: Boundary/Edge Cases (>= 5 tests per feature, >= 30 total)

#### Feature 1: Authentication & Session Management
31. **T2.AUTH.1: Prevent Duplicate Email Registration**
    - *Action*: Register with an email already present in the database.
    - *Assertion*: Error message "Email is already registered" is shown; user remains on registration page.
32. **T2.AUTH.2: Authentication with Weak Password and Invalid Email**
    - *Action*: Submit registration with email "invalidemail" and password "abc".
    - *Assertion*: UI shows validation errors ("Invalid email format", "Password must be at least 8 characters"). Form submission is blocked.
33. **T2.AUTH.3: Redirect Logged-In User from Auth Pages**
    - *Action*: Access `/auth/login` while logged in.
    - *Assertion*: Automatically redirected to `/dashboard`.
34. **T2.AUTH.4: Invalid Password Login Handling**
    - *Action*: Attempt login with registered email and incorrect password.
    - *Assertion*: Display message "Invalid email or password". Inputs are preserved.
35. **T2.AUTH.5: Expired Session Page Load Interception**
    - *Action*: Delete cookie `next-auth.session-token` and click "Planner" in sidebar.
    - *Assertion*: Page transition is halted, and user is redirected to `/auth/login`.

#### Feature 2: Unified Dashboard & Daily Briefing
36. **T2.DASH.1: Empty State UI Safeties**
    - *Action*: Log in as a new user with no tasks, events, goals, or habits. View dashboard.
    - *Assertion*: Dashboard renders cleanly. Briefing displays "Your schedule is clear today."
37. **T2.DASH.2: Ultra-Long Titles Layout Tolerance**
    - *Action*: Quick-add a task with a title of 200 characters.
    - *Assertion*: Dashboard card wraps text safely. No visual layout breaking or overlap.
38. **T2.DASH.3: Double Submit Quick-Add Block**
    - *Action*: Double-click the "Add" button rapidly on the quick task widget.
    - *Assertion*: Only one network call is triggered; only one task is created in the database.
39. **T2.DASH.4: Mobile Hamburger Accessibility**
    - *Action*: Scale viewport to 375px. Click hamburger.
    - *Assertion*: Drawer opens, links are clickable, and clicking background closes the drawer.
40. **T2.DASH.5: Clock Roll-Over Midnight Refresh**
    - *Action*: Set system clock to 11:59:58 PM with dashboard open. Wait 3 seconds.
    - *Assertion*: Dashboard shifts to the next calendar day without manual refresh.

#### Feature 3: AI Planner & Smart Calendar
41. **T2.PLAN.1: Restricting Suggestions to Strict Work Hours**
    - *Action*: Input tasks totaling 8 hours. Set work hours to 9:00 AM - 5:00 PM (8h limit) and add a 1-hour pre-existing meeting. Run AI Planner.
    - *Assertion*: System schedules 7 hours of tasks, flags the remaining task, and shows: "Workday is full. 1 task could not be fit."
42. **T2.PLAN.2: Calendar Overlap Conflict Display**
    - *Action*: Add Event A at 10 AM - 12 PM, and Event B at 11 AM - 1 PM.
    - *Assertion*: Overlapping blocks display red borders and an exclamation conflict icon.
43. **T2.PLAN.3: Zero Work Hours Validation**
    - *Action*: Set workday boundaries to `workStartHour: 9` and `workEndHour: 9` in the planner config.
    - *Assertion*: Warning displays "Work hours must be greater than zero hours."
44. **T2.PLAN.4: Prevent Dragging Event to Past**
    - *Action*: Try to drag a future calendar event block to a time block in the past.
    - *Assertion*: Event block snaps back to original position. Database timestamp does not change.
45. **T2.PLAN.5: Excessive Task Duration Handling**
    - *Action*: Create a task with 24 hours of estimated duration. Run AI Planner.
    - *Assertion*: Planner does not crash; suggests scheduling the task in segments across multiple days or flags it as too large.

#### Feature 4: Assignment Tracker & Goal System
46. **T2.TASK.1: Automatic Status Shift to Overdue**
    - *Action*: Create a task with a deadline 2 hours in the past. Save.
    - *Assertion*: Task immediately displays status badge `OVERDUE` in red.
47. **T2.TASK.2: Adding Subtask to Completed Task**
    - *Action*: Mark a task as completed (100%). Open details, add a new uncompleted subtask.
    - *Assertion*: Task status automatically reverts to `IN_PROGRESS` and progress updates to 50%.
48. **T2.TASK.3: Cascade Clean on Goal Deletion**
    - *Action*: Delete a goal that is currently linked to 3 tasks.
    - *Assertion*: Goal is deleted. The tasks remain, but their `goalId` properties are updated to `null`.
49. **T2.TASK.4: Goal Progress Cap at 100%**
    - *Action*: Complete all milestones of a goal, and complete further linked tasks.
    - *Assertion*: Goal progress percentage is displayed as exactly `100%` and does not exceed it.
50. **T2.TASK.5: Search Injection Resilience**
    - *Action*: Enter SQL/HTML injection characters in the task search field (e.g., `' OR '1'='1`).
    - *Assertion*: App handles string safely, returns zero search matches, and does not execute queries.

#### Feature 5: Habit Tracker & Progress Analytics
51. **T2.HAB.1: Missing Log Streak Reset**
    - *Action*: Log habit on Day 1. Leave Day 2 unlogged. Log habit on Day 3.
    - *Assertion*: Streak resets to 1 on Day 3.
52. **T2.HAB.2: Checkbox Lock on Unscheduled Days**
    - *Action*: Create a Tue/Thu habit. Attempt to check the habit on Wednesday.
    - *Assertion*: Checkbox is disabled/greyed out on the UI.
53. **T2.HAB.3: Retroactive Log and Streak Re-evaluation**
    - *Action*: Complete habit on Mon (streak=1), miss Tue (streak=0), navigate back to Tuesday in the history calendar and check it.
    - *Assertion*: Streak on Wednesday is recalculated and restored to `3`.
54. **T2.HAB.4: Analytics Rendering with Empty Tables**
    - *Action*: Open `/analytics` when database tables are empty.
    - *Assertion*: Charts render clean axes with a "No statistics recorded yet" message. No Javascript errors.
55. **T2.HAB.5: Streak Badge Width Boundary**
    - *Action*: Set habit streak to 9999 days. View habits page.
    - *Assertion*: Badge expands cleanly to contain "9,999 🔥" without truncating or wrapping.

#### Feature 6: Focus Mode & Burnout Predictor
56. **T2.BURN.1: Ignore Very Short Focus Sessions**
    - *Action*: Start focus session, wait 3 seconds, click "Stop".
    - *Assertion*: Timer resets. No focus log entry is created in database.
57. **T2.BURN.2: Session Crossing Midnight Boundary**
    - *Action*: Start focus session at 11:50 PM. Complete it at 12:15 AM.
    - *Assertion*: The 25-minute duration is accurately logged on the date it was completed, and analytics shows the time correctly.
58. **T2.BURN.3: Burnout Risk Maximum Score Clamp**
    - *Action*: Seed extreme workload density (e.g. 15 hours scheduled in an 8-hour workday). View Burnout score.
    - *Assertion*: Score displays exactly `100` and recommendation severity is set to max.
59. **T2.BURN.4: Negative Input Tolerance in Heuristics**
    - *Action*: Send negative values (e.g., `-3` missed tasks) to the burnout engine.
    - *Assertion*: Values are clamped to 0. Score remains stable and non-negative.
60. **T2.BURN.5: Timer Clock Synchronization**
    - *Action*: Start Pomodoro, switch tabs, wait 60 seconds, return.
    - *Assertion*: Timer reflects that exactly 60 seconds elapsed (using system epoch time diff rather than basic setInterval).

---

### Tier 3: Cross-Feature Interactions (Pairwise, >= 6 total)

61. **T3.INT.1: Auth & Dashboard Personalization**
    - *Action*: User A logs in, views their dashboard, then logs out. User B logs in on the same browser.
    - *Assertion*: User B views only their own daily briefing (e.g., different tasks, events, and AI summary). User A's data is completely absent.
62. **T3.INT.2: Tasks & Goals Automated Progress Link**
    - *Action*: Create a Task "Write Thesis Introduction", link it to Goal "Complete Academic Term", and mark it as `COMPLETED`.
    - *Assertion*: The Goal's milestone progress increments, the Goal's overall progress bar updates (e.g., from 0% to 25%), and the updated progress displays on both the Dashboard goals widget and the Goals page.
63. **T3.INT.3: Calendar Event Auto-Completion via Tasks**
    - *Action*: Generate an AI-scheduled calendar block for a task "Prepare Presentation" on today's calendar. Mark that task as `COMPLETED` on the tasks tracker.
    - *Assertion*: The calendar time block changes color (e.g., to a greyed-out completed state with a checkmark) and the task disappears from the AI Planner sidebar's unscheduled tasks list.
64. **T3.INT.4: Habits & Burnout Score Feedback Loop**
    - *Action*: Fail to complete any habits for 5 days, and accumulate 3 overdue tasks. Navigate to Analytics.
    - *Assertion*: Burnout risk score displays a significant increase (e.g., +40 points) with a warning recommendation mentioning: "Your habit streaks are declining. Try scheduling smaller blocks."
65. **T3.INT.5: Focus Session Logs & Analytics Charts Integration**
    - *Action*: Start and complete a 25-minute Pomodoro focus session. Navigate to the Analytics page.
    - *Assertion*: The "Focus Hours" chart bar for today increments by 0.42 hours (25 minutes) instantly.
66. **T3.INT.6: AI Planner Conflict warnings & Dashboard Alert**
    - *Action*: Create a new task due today with an estimated duration of 5 hours, while the calendar already has a 4-hour meeting scheduled. Trigger AI Planner.
    - *Assertion*: A conflict is identified. A warning banner "Schedule conflict: 9 hours scheduled for an 8-hour workday" appears on the top of the Unified Dashboard.

---

### Tier 4: Real-World Application Scenarios (>= 5 flows)

67. **T4.FLOW.1: Student Weekly Planning Flow**
    - *Flow*:
      1. Register a new user and log in.
      2. Set a weekly goal: "Prep for Midterms" with milestones "Submit Physics HW", "Review Bio Lecture Notes", "2 Focus Sessions".
      3. Create tasks: "Physics Homework" (3 hours, high priority) and "Bio Review" (2 hours, medium priority). Link both to the goal.
      4. Navigate to the Calendar page. View classes. Trigger the AI Planner.
      5. Accept the suggested time blocks for the two tasks around classes.
      6. Complete "Physics Homework" and verify that the goal progress updates to 50% on the Dashboard.
68. **T4.FLOW.2: Daily Habit Streak Maintenance and Analytics Check**
    - *Flow*:
      1. Check the Dashboard's Daily Briefing panel. Review AI summary: "Keep your 4-day workout habit streak alive today."
      2. Navigate to the Habit page.
      3. Log today's "Gym Workout" habit.
      4. Verify the streak updates to 5 days, and the heatmap adds today's colored block.
      5. Navigate to the Analytics page and verify that the "Habit Adherence Rate" chart displays a positive trend over the last 7 days.
      6. Log out.
69. **T4.FLOW.3: High-Workload Focus Session & Burnout Recovery Flow**
    - *Flow*:
      1. Log in. Database seed states 4 overdue tasks, rendering a Burnout Risk score of 80% (Red - High).
      2. Launch a Pomodoro focus session (25 mins) from the dashboard widget.
      3. During the session, verify the Distraction Blocker UI covers navigation.
      4. Complete the session. Mark the target task as complete.
      5. Create a "Rest Break" event on the calendar and delete another low-priority task.
      6. View the Analytics page. Verify the Burnout Risk score drops to 55% (Yellow - Moderate).
70. **T4.FLOW.4: Calendar Overlap Resolution and AI Replanning Flow**
    - *Flow*:
      1. Add calendar event "Dentist Appointment" at 2:00 PM - 3:00 PM.
      2. Add a new task "Emergency Group Call" (60 mins, High Priority) due at 3:00 PM.
      3. Verify conflict warning badge appears on the calendar.
      4. Click "Auto-Replan" in the AI Planner sidebar.
      5. Planner proposes moving "Dentist Appointment" to 4:00 PM (first open slot) and placing "Emergency Group Call" at 2:00 PM.
      6. Click "Apply Replan", and verify that the calendar grid updates, resolving the conflict.
71. **T4.FLOW.5: Multi-User Data Isolation and Session Expiry Flow**
    - *Flow*:
      1. User A logs in, creates a goal "Save for Car" and a task "Research Models".
      2. User A logs out.
      3. User B logs in. They check the Dashboard, Goals page, and Tasks page. They verify that they see only their own data (User A's car goal is hidden).
      4. User B creates a habit "Meditation".
      5. The test runner simulates a session token expiry.
      6. User B clicks the Dashboard. The application immediately intercepts the request and redirects User B to the login page.
      7. User A logs in again. They verify that "Save for Car" is present, and "Meditation" is not.
```
