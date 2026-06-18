# Handoff Report - LifeOS Database & Auth Remediation Design

## 1. Observation
- **Database Bypass**: All API endpoints under `src/app/api/` (including `tasks/route.ts`, `events/route.ts`, `goals/route.ts`, `habits/route.ts`, `focus/route.ts`, `analytics/route.ts`, `test/reset/route.ts`) bypass standard database queries. Instead, they read and write to a static JSON file `.mock-db.json` using utility functions `readDb()`, `writeDb()`, and `resetDb()` in `src/lib/mockDb.ts`.
- **Database Schema**: The `prisma/schema.prisma` defines models like `User`, `Task`, `Event`, `Goal`, `Milestone`, `Habit`, `HabitLog`, and `FocusSession` targeting PostgreSQL, but is missing fields that the client UI expects. In `src/app/goals/page.tsx`, the client expects `subtasks` (lines 13, 518) and `linkedMilestone` (lines 14, 147) on the `Task` model. In `src/app/habits/page.tsx`, the client expects `streak` (lines 10, 125) and `customDays` (line 42 of `habits/route.ts` and line 41 of `mockDb.ts`). In `src/app/api/events/route.ts`, the code expects `color` (line 44) on the `Event` model.
- **Authentication Routes**: We observed specific custom auth endpoints at `/api/auth/login`, `/api/auth/logout`, `/api/auth/register`, and `/api/auth/session`. In `src/app/auth/login/page.tsx:19`, it calls:
  ```typescript
  const res = await fetch('/api/auth/login', {
  ```
  In `src/components/shared/Navbar.tsx:29`, it calls:
  ```typescript
  await fetch('/api/auth/logout', { method: 'POST' });
  ```
  These routes conflict with NextAuth's catch-all route at `src/app/api/auth/[...nextauth]/route.ts`.
- **PostgreSQL Local Services & Installations**: 
  - Checked Windows Services: `Get-Service | Where-Object {$_.Name -like "*postgres*" -or $_.DisplayName -like "*postgres*"}` returned nothing.
  - Checked PATH: `where.exe postgres` and `where.exe psql` failed (not in path).
  - Checked Program Files: `C:\Program Files\PostgreSQL` and `C:\Program Files (x86)\PostgreSQL` do not exist.
  - Checked Port: `Get-NetTCPConnection -LocalPort 5432` failed (no active listener).
  - Checked Docker: Docker Desktop was uninstalled on June 9, 2026, and no `docker` CLI exists.
  - Checked WSL: WSL 2 is installed but has no active Linux distributions, so PostgreSQL cannot be run inside WSL.
- **Test Infrastructure**: Playwright E2E tests are located under `tests/e2e/tests/` and verify authentication, tasks, events, habits, focus, and analytics.

---

## 2. Logic Chain
1. The custom authentication endpoints (`/api/auth/login`, `/api/auth/logout`) are static paths. Under Next.js App Router rules, static routes take precedence over dynamic catch-all folders (`/api/auth/[...nextauth]/route.ts`).
2. Therefore, when the client attempts to authenticate, Next.js routes the request to the custom handlers instead of NextAuth.
3. Because the custom handlers set a plain-text cookie `session` containing the email address rather than an encrypted NextAuth JWT token, NextAuth hooks (`useSession`) and server sessions (`getServerSession`) cannot detect the authenticated session.
4. Furthermore, because these custom endpoints are co-located in the same directory as the catch-all dynamic handler, Next.js encounters compilation conflicts during `npm run build`, causing page-collection crashes.
5. In parallel, all API endpoints read and write to `.mock-db.json` via `mockDb.ts` instead of using the generated Prisma Client, violating data integrity rules.
6. The `prisma/schema.prisma` is currently configured for a PostgreSQL datasource, but the local Windows system lacks any PostgreSQL server service, installer, or Docker engine.
7. Consequently, to use a genuine PostgreSQL database, the app needs schema additions to support client UI properties (such as `subtasks` as a `Json` column and `linkedMilestone`, `color`, `streak`, `customDays` as standard table columns) and a refactoring of the API endpoints to use the global `prisma` client.

---

## 3. Caveats
- Since no local PostgreSQL database is active or can be installed on this host due to user permissions and network restrictions (`CODE_ONLY`), testing the genuine PostgreSQL setup locally will fail with connectivity errors (`P1001`) unless a remote PostgreSQL database URL is supplied in `.env` or a local SQLite fallback is temporary utilized for E2E validation.
- We assume that subtasks are best stored as a `Json` field in the `Task` table for ease of migration and serialization. If strict relational normalization is desired, a separate `Subtask` model must be defined with database migrations.

---

## 4. Conclusion
The database bypass and authentication issues are caused by the facade `mockDb.ts` layers and the existence of static auth endpoint files colliding with the dynamic catch-all route. To remediate:
1. Delete `login/route.ts`, `logout/route.ts`, and `session/route.ts` under `src/app/api/auth/`.
2. Update the frontend UI to use standard NextAuth helpers (`signIn`, `signOut`, and `useSession`/`/api/auth/session` GET endpoint).
3. Hash credentials with `bcryptjs` and register new users directly in the database.
4. Modify `schema.prisma` to include missing fields (`subtasks`, `linkedMilestone`, `color`, `streak`, `customDays`).
5. Replace mockDb helper invocations in all API routes with Prisma Client calls.

---

## 5. Verification Method
- **Verification Commands**:
  - Run `npx prisma generate` to check that Prisma client compiles without errors after schema changes.
  - Run `npm run build` to verify that Next.js successfully compiles and resolves the dynamic route conflict.
  - Run E2E tests using `npm --prefix tests/e2e run test` to verify that authentication flows, task creations, habit logs, focus sessions, and analytics continue to pass when using the new NextAuth and Prisma client integration.
