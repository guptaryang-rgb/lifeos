## 2026-06-16T23:09:53Z
Examine the workspace files and design the remediation plan for the Forensic Auditor's integrity violation verdict.
The Auditor identified the following issues:
1. Mock Express App Facade: The E2E tests target a mock Express server (`tests/e2e/mock-app/server.js`) and static HTML files, completely bypassing the actual Next.js application and authentic NextAuth credentials validation.
2. Build Execution Failure: Next.js lacks actual frontend layouts/pages, causing the production build (`npm run build`) to fail.
3. Database Setup Shortcuts: `prisma/schema.prisma` uses the `sqlite` provider instead of `postgresql`, and enums are commented out and mapped to simple string types.
4. Environment Constraint: There is no running PostgreSQL database server, docker service, or WSL distribution on this Windows machine.

Please design a comprehensive, authentic solution:
1. Restore `prisma/schema.prisma` to use the `postgresql` provider and uncomment all database enums as specified in the original design.
2. Update `.env` to point to a standard PostgreSQL connection URL:
   `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lifeos?schema=public"`
3. Design a basic layout (`src/app/layout.tsx`) and root landing page (`src/app/page.tsx`) so the Next.js compiler runs cleanly and compiles the production build (`npm run build`).
4. Design changes to `tests/e2e/playwright.config.ts` to remove/disable the mock Express webServer command (`node mock-app/server.js`) and target the actual Next.js application (using `npm run dev` or a local port listener), and delete the mock server folder to remove the facade violation.
5. Provide the exact code contents and step-by-step commands to implement these changes.
6. Write your analysis and recommendations to `handoff.md` in your working directory and report completion.
