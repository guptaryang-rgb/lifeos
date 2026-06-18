# Remediation Design: Database Bypass and Authentication Fixes

## 1. Executive Summary
During our read-only analysis of the LifeOS codebase, we identified two major integrity violations:
1. **Database Bypass**: All API endpoints under `src/app/api/` read from and write to a local JSON file (`.mock-db.json`) via a mock database utility (`src/lib/mockDb.ts`), completely bypassing the PostgreSQL database and the Prisma ORM.
2. **Authentication Conflict**: Custom endpoints `/api/auth/login`, `/api/auth/logout`, and `/api/auth/session` conflict with NextAuth's catch-all `api/auth/[...nextauth]` handler. Next.js prioritizes static routes over dynamic catch-all parameters, causing NextAuth to be bypassed entirely on these requests. Furthermore, these endpoints issue custom `'session'` cookies containing raw emails instead of standard, secure NextAuth session tokens.

In addition, we discovered that:
- **No PostgreSQL installation or active service is present on the Windows host**.
- There are critical schema mismatches between the Prisma schema and the data shapes expected by the frontend (e.g. missing `subtasks`, `effort`, `customDays`, `streak`, `frequency`, and `color` fields).

---

## 2. Windows Environment PostgreSQL Findings
A thorough investigation was performed on the Windows system:
1. **Services Check**: Running `Get-Service | Where-Object {$_.Name -like "*postgre*"}` returned no services, confirming PostgreSQL is not registered as a Windows Service.
2. **Registry Check**: Querying `HKLM:\Software\PostgreSQL\*` and `Uninstall` keys yielded no records.
3. **Ports Check**: Checking port `5432` with `Get-NetTCPConnection` confirmed no process is listening on the default PostgreSQL port.
4. **Filesystem Search**: Checked standard directories (`C:\Program Files`, `C:\Program Files (x86)`, `C:\ProgramData\chocolatey\lib`, `APPDATA`, `LOCALAPPDATA`) and found no PostgreSQL installations or executables.

### Action Plan to Start PostgreSQL
Since Chocolatey is installed on the host, the remediation team can quickly provision PostgreSQL:
1. Run PowerShell as Administrator and execute:
   ```powershell
   choco install postgresql -y
   ```
2. Start the PostgreSQL service:
   ```powershell
   Start-Service postgresql-x64-15  # (or the version installed, e.g., postgresql-x64-16)
   ```
3. Verify it is running and listening on port `5432`:
   ```powershell
   Get-NetTCPConnection -LocalPort 5432
   ```
4. Create the target database:
   ```powershell
   # Connect using standard postgres user and create lifeos db
   psql -U postgres -c "CREATE DATABASE lifeos;"
   ```

---

## 3. Database Schema Updates
To support the frontend features without breaking compilation or code execution, the following fields and enums must be added to `prisma/schema.prisma` before migration:

### Schema Modifications
1. **`EventCategory` Enum**:
   - Add `LIFE` to the enum to match the categories used by the calendar frontend and mock database.
2. **`Event` Model**:
   - Add `color String @default("blue")` to store color categories for rendering the calendar.
3. **`Task` Model**:
   - Add `linkedMilestone String?` to associate tasks with goal milestones.
   - Add `subtasks Json @default("[]")` to store the nested array of subtasks: `[{ id: string, title: string, completed: boolean }]`.
   - Add `effort Int @default(0)` to map to the estimated effort.
4. **`Goal` Model**:
   - Add `frequency String @default("WEEKLY")` to support Goal frequency categories (DAILY, WEEKLY, MONTHLY).
5. **`Habit` Model**:
   - Add `customDays String?` to store selected days of the week (e.g. `"2,4"`).
   - Add `streak Int @default(0)` to store current streak count.

---

## 4. Resolving Authentication Conflicts
NextAuth's catch-all route `/api/auth/[...nextauth]` is shadowed by specific static endpoint files in `src/app/api/auth/`. The conflict must be resolved as follows:

### Route Refactoring Design
1. **Delete Custom Routes**:
   - Delete `src/app/api/auth/session/route.ts` so NextAuth natively handles `/api/auth/session` calls.
   - Delete `src/app/api/auth/logout/route.ts` and replace it with a compatibility bridge that expires the `next-auth.session-token` (and `__Secure-next-auth.session-token`) cookie, ensuring the E2E tests' programmatic logouts continue to function.
   - Refactor `src/app/api/auth/login/route.ts` into a compatibility bridge that validates user credentials using Prisma + bcrypt, programmatically generates a NextAuth JWT via `encode` from `next-auth/jwt`, and sets the `next-auth.session-token` cookie. This satisfies programmatic calls in E2E tests while logging the user into the NextAuth session.
2. **Update Register Endpoint**:
   - Refactor `src/app/api/auth/register/route.ts` to use Prisma.
   - Use `bcryptjs`'s `hashSync(password, 10)` to hash the user's password before creating the record in the database.
   - Handle unique constraints on email (Prisma error code `P2002`) and return a `400 Bad Request` with `{ error: "Registration Failed: Email already exists" }`.
3. **Frontend Changes**:
   - In `src/app/auth/login/page.tsx`, replace the custom login fetch to `/api/auth/login` with standard NextAuth `signIn("credentials", { email, password, callbackUrl })`.
   - In `src/components/shared/Navbar.tsx`, replace the fetch to `/api/auth/logout` with NextAuth's `signOut({ callbackUrl: '/auth/login' })` from `next-auth/react`.

---

## 5. API Route Migration to Prisma
Below is the mapping design to replace all mock database operations with real Prisma client transactions in `src/app/api/`:

### A. `/api/tasks`
- **Session Resolution**: Use `getServerSession(authOptions)` to retrieve the authenticated user's ID/email.
- **GET**: Query tasks where `userId = session.user.id`.
- **POST**:
  - Perform schema validations (F1-T10): Reject if `dueDate` is missing (status 400), or if `effort` < 0 (status 400).
  - Create the task in Prisma mapping `data.effort` to `effort` and JSON subtasks to `subtasks`.
- **PUT**: Update the task fields in database by matching `id` and `userId`.
- **DELETE**: Delete the task matching `id` and `userId`.

### B. `/api/events`
- **GET**: Query events where `userId = session.user.id`.
- **POST/PUT**: Create or update the event mapping `start` -> `startTime` (Date), `end` -> `endTime` (Date), `category`, `color`, and `userId = session.user.id`.
- **DELETE**: Delete the event matching `id` and `userId`.

### C. `/api/goals`
- **GET**: Query goals where `userId = session.user.id` including `milestones`. Map the date fields and structure to match the frontend expectations.
- **POST/PUT**:
  - Validate milestone target dates (F4-T10) against parent goal's `targetDate`.
  - Upsert the Goal, then delete old milestones and upsert the updated milestones in a transaction block.
- **DELETE**: Delete the goal matching `id` and `userId`.

### D. `/api/habits`
- **GET**: Query habits where `userId = session.user.id` including `logs`. Map the logs array of `HabitLog` objects to simple string arrays of date strings (`YYYY-MM-DD`).
- **POST**: Create or update the habit. If it is checked in, insert a `HabitLog` entry.
- **DELETE**: Delete the habit matching `id` and `userId`.

### E. `/api/focus`
- **GET**: Query focus sessions where `userId = session.user.id`.
- **POST**:
  - Reject if `duration <= 0` (F6-T10).
  - Map `timestamp` to `endTime` and calculate `startTime = endTime - duration`. Write the record to the database.

### F. `/api/analytics`
- **GET**: Query tasks, focus sessions, and habits for the user. Perform the aggregations using native JS array methods on the database results to calculate workload density, completion rates, habit compliance, and burnout scores (burnout risk > 0 if overdue tasks exist, F6-T3).

### G. `/api/test/reset` (Testing Route)
- **POST**:
  - Clean up all tables in a dependency-safe order (`scheduleSuggestion`, `focusSession`, `habitLog`, `habit`, `milestone`, `goal`, `event`, `task`, `analyticsSnapshot`, `user`).
  - If `seed=true`, create `john@example.com` (hashed password `password123`) and seed the default tasks, events, and habits expected by the E2E test suite.
  - Clear NextAuth session cookies.

---

## 6. Execution & Verification Steps
To safely apply these changes and verify their correctness:
1. **Database Setup**: Install PostgreSQL and verify service status. Set `DATABASE_URL` in `.env`.
2. **Schema Migration**:
   ```powershell
   npx prisma db push
   ```
3. **Compile Code**: Check Next.js server compilation:
   ```powershell
   npm run build
   ```
4. **Run Database Seed**:
   ```powershell
   npm run db:seed
   ```
5. **Install E2E Dependencies**:
   ```powershell
   cd tests/e2e
   npm install
   npx playwright install
   ```
6. **Execute E2E Tests**:
   - Start the Next.js app in dev mode (`npm run dev`).
   - Run the E2E tests:
     ```powershell
     npm run test
     ```
   - Ensure all tests in `tests/e2e/tests/` (Tiers 1-4) pass successfully.
