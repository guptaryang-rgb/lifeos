# E2E Testing Infrastructure Analysis and Design Report

**Prepared by**: Explorer Subagent (`explorer_infra_setup_1`)  
**Date**: 2026-06-16T22:43:00Z  
**Milestone**: Infrastructure Setup (M1)

---

## 1. Executive Summary

This report analyzes the requirements, workspace state, and architectural parameters of **LifeOS** to design a robust, opaque-box, requirement-driven End-to-End (E2E) testing framework. 

### Key Recommendations
1. **Framework**: Recommend **Playwright** over Vitest/Jest for E2E testing due to its native browser execution, drag-and-drop simulation, and native viewport scaling (desktop at 1440px and mobile at 375px).
2. **Dependency Isolation**: Recommend placing the testing `package.json` inside `tests/e2e/package.json` to isolate testing dependencies from the main application workspace, avoiding runtime bloat and TypeScript type clashes.
3. **Mocking Strategy**: Provide dual-strategy mocking:
   - *Strategy A (Frontend-Only)*: Intercept all API endpoints (`/api/*`) on the client side using Playwright's native `page.route()` to test UI behavior in isolation.
   - *Strategy B (Local Integration)*: Run the app against a localized test database (SQLite) using pre-packaged setup/seed scripts before starting the test runner.
4. **Test Inventory**: A comprehensive inventory of **71 test cases** has been drafted, covering:
   - Tier 1: Feature Coverage (30 tests)
   - Tier 2: Boundary/Edge Cases (30 tests)
   - Tier 3: Cross-Feature Interactions (6 tests)
   - Tier 4: Real-World Scenarios (5 flows)

---

## 2. Current Workspace Investigation

A read-only investigation of the workspace directory `C:\Users\gupta_ikq631n\teamwork_projects\lifeos` was performed. 

### Observations
1. **Root Files**: The root directory contains only `ORIGINAL_REQUEST.md`, `PROJECT.md`, and the `.agents/` folder.
2. **No Code / Package Structure**: There is currently no `package.json`, `src/` directory, `prisma/` folder, or code files in the root. 
3. **Database Schema**: A parallel subagent in Milestone 1 has proposed a Prisma schema (`.agents/teamwork_preview_explorer_m1_1_3/proposed_schema.prisma`) defining the following models:
   - `User` (email, password)
   - `Task` (title, dueDate, estimatedDuration, priority, energyLevel, status, userId)
   - `Event` (title, startTime, endTime, category, userId)
   - `Goal` (title, progress, userId, milestones)
   - `Milestone` (title, status, goalId, targetDate)
   - `Habit` (title, frequency, userId, logs)
   - `HabitLog` (completedAt, habitId)
   - `FocusSession` (startTime, endTime, duration, taskId, userId)
   - `AnalyticsSnapshot` (workloadDensity, missedTaskCount, streakDeclineRate, focusTimeTrend, burnoutRiskScore)
   - `ScheduleSuggestion` (taskId, startTime, endTime, userId)

These entities map directly to the six primary features of LifeOS and have been used to draft the concrete E2E test inventory.

---

## 3. Framework Evaluation: Playwright vs. Vitest/Jest

To test a Next.js App Router application in an **opaque-box manner**, the testing runner must interact with the application through its public boundaries (UI routes, mouse/keyboard gestures, and API endpoints).

### Evaluation Metrics

1. **True User-Simulation (Browsers)**:
   - *Playwright*: Runs tests in real browser binaries (Chromium, Firefox, WebKit). It simulates actual user clicks, scrolls, typing, and mouse drag actions.
   - *Vitest/Jest*: Runs tests in a simulated Node.js environment (JSDOM/Happy DOM). It does not render actual CSS or execute real browser layout reflow.
   - *Verdict*: **Playwright** is far superior for opaque-box testing because it verifies exactly what the user sees.

2. **Responsive Layouts (R1 Requirement)**:
   - *Playwright*: Supports launching projects with explicit viewport dimensions (1440px desktop, 375px mobile). Tests can assert that elements are visible, hidden, or rearranged.
   - *Vitest/Jest*: Viewport testing is purely synthetic (adjusting `window.innerWidth`) and cannot test CSS Media Queries or Tailwind responsive utilities natively.
   - *Verdict*: **Playwright** is required to satisfy R1 verification.

3. **Drag and Drop Calendar Events (R2 Requirement)**:
   - *Playwright*: Provides high-level mouse utilities (`mouse.move`, `mouse.down`, `mouse.up`) that natively trigger drag events on the calendar grid.
   - *Vitest/Jest*: Simulating drag and drop in JSDOM requires manual triggering of synthetic event handlers, which often misses bugs in the actual drag library interface.
   - *Verdict*: **Playwright** is highly recommended for R2 verification.

4. ** R14+ App Router & React Server Components (RSC)**:
   - *Playwright*: Operates purely over HTTP (`http://localhost:3000`). It is fully decoupled from Next.js server/client boundaries.
   - *Vitest/Jest*: Component testing of Next.js 14 App Router pages requires complex mocks of Next.js navigation routers, server actions, and React Server Component contexts, leading to fragile tests.
   - *Verdict*: **Playwright** is the only reliable choice for end-to-end routing.

---

## 4. Dependency Isolation Strategy

We propose placing the E2E testing framework and its utilities in `tests/e2e/package.json` rather than the project root.

### Rationale
- **Isolation of Types**: Next.js uses type declarations that can conflict with Playwright's test assertion types. Keeping them in separate folders with local `tsconfig.json` files eliminates compilation clashes.
- **Production Bundle Size**: The main application deployment pipeline only needs to run `npm install` at the root, completely skipping the download of browser binaries and heavy testing packages.
- **Workflow Clarity**: Developers working on frontend UI code are not distracted by testing framework configurations, and the E2E testing suite can be run or updated independently.

---

## 5. Compilation & Execution Plan

### Test Runner Execution Flow
1. **Compilation**: Playwright compiles TypeScript files natively on-the-fly using `esbuild`. No separate build/compile step is needed.
2. **Local Execution**:
   - Install dependencies: `npm --prefix tests/e2e install`
   - Run in headless mode: `npm --prefix tests/e2e run test`
   - Run in UI mode: `npm --prefix tests/e2e run test:ui`
3. **CI Execution**: Playwright will run tests in headless mode against a built version of the Next.js app running at `http://localhost:3000`.

---

## 6. Backend & Database Mocking Strategy

If the Next.js app is not running or the database is not seeded, tests can be executed using two methods:

### Strategy A: Playwright API Interception (Mock Network Layer)
Inside the Playwright setup hook (`beforeEach`), we intercept all outgoing fetch requests using `page.route()`:
```typescript
test.beforeEach(async ({ page }) => {
  // Mock NextAuth session
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      json: { user: { name: 'Test User', email: 'test@lifeos.com' }, expires: '2026-12-31' }
    });
  });

  // Mock Tasks API
  await page.route('**/api/tasks', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, json: mockTasksList });
    } else if (request.method() === 'POST') {
      const newTask = JSON.parse(request.postData() || '{}');
      mockTasksList.push(newTask);
      await route.fulfill({ status: 201, json: newTask });
    }
  });
});
```
This strategy allows E2E tests to run against a standard static frontend build or dev server, verifying UI layout and state transitions without an active database.

### Strategy B: Lightweight Test Database (Prisma Integration)
Run the real Next.js application using a local SQLite database file dedicated to testing. A custom command runs migrations and seeds data before starting the server:
```powershell
# In the project root
cross-env DATABASE_URL=file:./test.db npx prisma db push
cross-env DATABASE_URL=file:./test.db npx prisma db seed
cross-env DATABASE_URL=file:./test.db npm run dev
```
Playwright then runs its tests, occasionally executing seed resets via test-only API hooks. This provides full coverage of the API routes, Prisma schemas, and data validation rules.

---

## 7. Proposed Content of `TEST_INFRA.md`

The drafted content of `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\TEST_INFRA.md` has been successfully written to the workspace root. Below is a copy of its contents for reference:

```markdown
# LifeOS E2E Testing Infrastructure and Strategy

This document outlines the architecture, setup, execution guidelines, and detailed test case inventory for the LifeOS End-to-End (E2E) testing suite.

... [Full content of TEST_INFRA.md is detailed inside the actual TEST_INFRA.md file in the root] ...
```
*(Please refer directly to the root `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\TEST_INFRA.md` for the full 71-test inventory and setup instructions).*
