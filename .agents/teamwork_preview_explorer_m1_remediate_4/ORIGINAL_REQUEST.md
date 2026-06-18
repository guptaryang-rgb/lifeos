## 2026-06-16T23:27:32Z
You are Milestone 1 Remediation Explorer. Your working directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_remediate_4. Your workspace directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos.

Please analyze the codebase and design a comprehensive plan to:
1. Replace all mock JSON database (`src/lib/mockDb.ts`) references in all API endpoints under `src/app/api/` (including tasks, events, goals, habits, focus, analytics) with genuine Prisma client queries.
2. Resolve the NextAuth directory conflicts under `src/app/api/auth/` by:
   - Deleting the mock login/logout/session endpoints (`src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/session/route.ts`).
   - Moving the user registration endpoint from `src/app/api/auth/register/route.ts` to `src/app/api/register/route.ts` (using Prisma Client to create the user, hash password with bcryptjs, and prevent duplicate registration).
   - Refactoring the frontend components (`src/app/auth/login/page.tsx` and `src/app/auth/register/page.tsx`) to perform authentic sign-in via NextAuth's `signIn` helper and POST to `/api/register` respectively.
3. Keep the custom `src/lib/prisma.ts` smart fallback client intact so that the system executes smoothly in-memory when the physical database is offline, but ensure all queries are structurally correct Prisma commands.
4. Update `src/app/api/test/reset/route.ts` if needed to clean and seed the mock database store in-memory (or physical PostgreSQL if online).
5. Document all proposed file changes and path modifications in `handoff.md` in your working directory and report back.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
