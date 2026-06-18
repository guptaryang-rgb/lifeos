# Handoff Report — explorer_infra_setup_2

## 1. Observation
- Verified that the workspace currently contains no code or `package.json` except for:
  - `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\ORIGINAL_REQUEST.md`
  - `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\PROJECT.md`
  - `.agents/` folder and subagent directories.
- Observed the following key interface contracts and constraints from the project files:
  - `PROJECT.md` (lines 42-45):
    ```
    tests/                  # Unit and E2E Tests
    ├── e2e/                # Opaque-box E2E Tests (Tiers 1-4)
    └── unit/               # Local logic and API route unit tests
    ```
  - `SCOPE.md` (lines 17-20):
    ```
    ### E2E Test Runner ↔ LifeOS Application
    - Target URL: http://localhost:3000
    - API validation routes: /api/auth/*, /api/tasks, /api/events, /api/goals, /api/habits, /api/focus
    - Viewports: Desktop (1440px), Mobile (375px)
    ```
  - `ORIGINAL_REQUEST.md` (line 18):
    `- Responsive layout that works beautifully on both desktop (1440px+) and mobile (375px+) viewports.`
  - `ORIGINAL_REQUEST.md` (line 25):
    `- Dynamic Replanning: when a task is missed, added, or rescheduled, the planner automatically suggests a revised schedule.`
  - `ORIGINAL_REQUEST.md` (line 68):
    `- Events can be created, edited, deleted, and dragged to reschedule`
  - `ORIGINAL_REQUEST.md` (lines 43-48):
    `Full-stack architecture: Next.js 14+ with App Router... database schema via Prisma... NextAuth.js with credential-based login... seed script...`

---

## 2. Logic Chain
1. **Viewport & Device Emulation**: R1 and SCOPE.md mandate testing on both `1440px` and `375px` viewports. Playwright provides native browser viewport emulation out-of-the-box, unlike Vitest/Jest which run in headless node-jsdom environments where CSS layout rendering is simulated.
2. **Interaction Fidelity**: R2 requires dragging-and-dropping calendar events. Playwright provides robust pointer/mouse action APIs (`page.mouse.move`, `page.mouse.down/up`) to test drag behavior, whereas Vitest/Jest cannot test canvas or complex visual grid mouse manipulations.
3. **App Router & RSC Compatibility**: Next.js App Router utilizes React Server Components (RSCs) and Server Actions (R5). Testing these requires launching the compiled Next.js dev or build server and interacting with it using a real browser. Playwright's `webServer` option automates this.
4. **Backend Mocking & Data Isolation**: Because the Next.js server directly accesses PostgreSQL via Prisma, client-side HTTP interception alone is insufficient for E2E testing (it cannot intercept server-to-database communication). Therefore, we need to spin up a dedicated test database (e.g. SQLite `file:./test.db` or PostgreSQL test container via `.env.test`) and run prisma seeds before executing tests.
5. **Ergonomic Layout**: Storing test dependencies in the root `package.json` devDependencies allows standard scripts (`npm run test:e2e`), but isolating the config (`tests/e2e/playwright.config.ts`) keeps the root folder clean and ensures test components are localized.

---

## 3. Caveats
- **NextAuth Integration**: If credential auth is not yet fully configured in the codebase, the developer must temporarily mock the auth session REST endpoint `/api/auth/session` using Playwright's `page.route` to intercept browser requests.
- **SQLite vs. PostgreSQL**: If using SQLite for the E2E test runs, the developer must verify that the Prisma schema and custom SQL calls (if any) are compatible with SQLite. If PostgreSQL-specific types or features are used, a local PostgreSQL Docker database should be run for tests instead.

---

## 4. Conclusion
We recommend setting up **Playwright** as the E2E testing framework, placing dependencies in the root `package.json`, and isolating configurations in `tests/e2e/`. We proposed a detailed database isolation and NextAuth session caching strategy to enable testing before the application is fully running. We created a draft of `TEST_INFRA.md` which inventories **71 test cases** categorized across 4 Tiers (Feature, Edge, Pairwise Interaction, and Real-world Flow) ensuring full requirement coverage.

---

## 5. Verification Method
To verify that this infrastructure design has been set up successfully in the future:
1. Ensure `proposed_TEST_INFRA.md` and `analysis.md` exist in the working directory `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\explorer_infra_setup_2\`.
2. Inspect the test cases in `proposed_TEST_INFRA.md` to verify there are at least 5 tests per feature (total 30) for Tier 1 and Tier 2, at least 6 cross-feature tests in Tier 3, and at least 5 scenarios in Tier 4.
3. Once the Implementer creates the actual project layout:
   - Verify that Playwright is installed via `package.json`.
   - Verify that `npx playwright test -c tests/e2e/playwright.config.ts` runs without errors (running a test placeholder like `auth.spec.ts`).
