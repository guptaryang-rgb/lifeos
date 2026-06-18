# Scope: E2E Testing Infrastructure and Suite

## Architecture
The E2E testing suite is an opaque-box, requirement-driven testing harness. It will be located in the `tests/e2e` directory.
It must target the LifeOS web application's user-facing routes, API endpoints, and behaviors:
- Port: `http://localhost:3000`
- Tech Stack for testing: Playwright or Vitest + MSW (to be chosen by the Explorer)
- Authentication mocking: Mock credentials / NextAuth session handling

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | infra_setup | Create TEST_INFRA.md, initialize test runner in `tests/e2e`, verify compilation & basic execution | none | PLANNED |
| 2 | test_suite | Implement Tiers 1-4 tests (Feature, Edge, Combinatorial, Workloads), verify execution, create TEST_READY.md | 1 | PLANNED |

## Interface Contracts
### E2E Test Runner ↔ LifeOS Application
- Target URL: `http://localhost:3000`
- API validation routes: `/api/auth/*`, `/api/tasks`, `/api/events`, `/api/goals`, `/api/habits`, `/api/focus`
- Viewports: Desktop (1440px), Mobile (375px)
