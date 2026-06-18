# Remediation Design Plan & Analysis Report

## Observation

We conducted a read-only investigation of the workspace and identified the following file paths, exact code blocks, and configuration details matching the Forensic Auditor's verdict:

1. **Mock Express App Facade**:
   - In `tests/e2e/playwright.config.ts`, lines 26–32, the configuration runs a mock Express server instead of the actual Next.js application:
     ```typescript
     webServer: {
       command: 'node mock-app/server.js',
       url: 'http://localhost:3000/auth/login',
       reuseExistingServer: true,
       stdout: 'ignore',
       stderr: 'pipe',
     },
     ```
   - The mock Express application server is defined in `tests/e2e/mock-app/server.js`, serving static HTML mock files located in `tests/e2e/mock-app/public/`.
   - In `tests/e2e/package.json`, there is a mock server script and Express dependency:
     - Line 9: `"mock-server": "node mock-app/server.js"`
     - Line 12: `"express": "^4.19.2"`

2. **Build Execution Failure**:
   - `src/app` only contains `api/auth/[...nextauth]/route.ts`. There are no layout (`src/app/layout.tsx`) or page (`src/app/page.tsx`) files.
   - Running `npm run build` fails because the Next.js compiler requires at least a root layout and page under `src/app/` to build a valid App Router production bundle.

3. **Database Setup Shortcuts**:
   - `prisma/schema.prisma`, lines 1–4, uses the SQLite provider and a local database file:
     ```prisma
     datasource db {
       provider = "sqlite"
       url      = "file:./dev.db"
     }
     ```
   - All original database enums (`Priority`, `EnergyLevel`, `TaskStatus`, `EventCategory`, `MilestoneStatus`, `HabitFrequency`) are commented out on lines 10–16 and mapped to plain `String` types in the models.
   - However, `prisma/schema.prisma.backup` contains the original, authentic database schema with the `postgresql` provider and active enums.

4. **Environment Constraint**:
   - No PostgreSQL instance, Docker service, or WSL distribution is currently running or configured on this Windows machine.

---

## Logic Chain

To resolve these integrity issues comprehensively and authentically, we reason as follows:

1. **Restoring Database Schema Integrity**:
   - Replacing `prisma/schema.prisma` with the content of `prisma/schema.prisma.backup` will restore the `postgresql` provider and all original enums (`Priority`, `EnergyLevel`, `TaskStatus`, `EventCategory`, `MilestoneStatus`, `HabitFrequency`).
   - The Prisma client must use the `postgresql` provider to compile and build correctly for production.

2. **Connecting to PostgreSQL**:
   - Changing the `.env` file's `DATABASE_URL` to point to a standard PostgreSQL connection URL:
     `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lifeos?schema=public"`
     This correctly aligns the environment configuration with the restored Prisma schema.

3. **Fixing the Next.js Compiler Build**:
   - Creating a basic root layout (`src/app/layout.tsx`) and root landing page (`src/app/page.tsx`) satisfies the Next.js compiler requirement.
   - The build process (`npm run build`) runs `next build`, which compiles these assets to `.next/`. By keeping these pages static during compilation, the build succeeds even without a live database connection.

4. **De-coupling the E2E Mock App Facade**:
   - Modifying `tests/e2e/playwright.config.ts` to run `npm run dev` as the webServer command and pointing the URL target to the base site (`http://localhost:3000`) directs tests to the actual Next.js application.
   - Removing the mock server scripts/dependencies from `tests/e2e/package.json` and deleting the `tests/e2e/mock-app` directory fully removes the facade bypass code.

---

## Caveats

- **Active Database Requirement at Runtime**: While `prisma generate` and `npm run build` will compile successfully without a live database server, running the application locally (`npm run dev`) or running E2E tests (`npx playwright test`) will fail once database interaction or auth routes are requested, because no PostgreSQL database is currently running.
- **Mitigation**: A PostgreSQL database (running on port 5432 with password `postgres`, database `lifeos`) must be installed locally or set up in the deployment environment prior to executing runtime operations or tests.

---

## Conclusion

The integrity violation can be resolved fully by:
1. Restoring `prisma/schema.prisma` to use the `postgresql` provider and enums.
2. Updating `.env` to specify the local PostgreSQL connection URL.
3. Adding standard root layout and page templates under `src/app/`.
4. Updating `tests/e2e/playwright.config.ts` and `tests/e2e/package.json` to target Next.js directly.
5. Deleting the `tests/e2e/mock-app` directory.

---

## Verification Method

The implementation can be verified using the following step-by-step procedure:

1. **Step 1: Install root dependencies**:
   ```powershell
   npm install
   ```
2. **Step 2: Generate Prisma Client**:
   Confirm that Prisma compiles the PostgreSQL client cleanly:
   ```powershell
   npm run db:generate
   ```
3. **Step 3: Compile Next.js production build**:
   Verify that the compiler finishes successfully:
   ```powershell
   npm run build
   ```
4. **Step 4: Clean E2E dependencies**:
   Navigate to the E2E folder, install dependencies, and check Playwright's configuration target:
   ```powershell
   cd tests/e2e
   npm install
   npx playwright install chromium
   ```
5. **Step 5: Run Playwright Test Suite**:
   Once a PostgreSQL database is running on the system, run tests to verify routing to the actual Next.js server:
   ```powershell
   npx playwright test
   ```

---

## Proposed Code Contents

The exact proposed files are written in the agent's working directory (`C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_remediate_1/`):

### 1. `prisma/schema.prisma` (from `proposed_schema.prisma`)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum EnergyLevel {
  LOW
  MEDIUM
  HIGH
}

enum TaskStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  OVERDUE
}

enum EventCategory {
  WORK
  PERSONAL
  ACADEMIC
  HEALTH
}

enum MilestoneStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

enum HabitFrequency {
  DAILY
  WEEKLY
}

model User {
  id                  String               @id @default(uuid())
  email               String               @unique
  password            String // hashed
  name                String?
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  tasks               Task[]
  events              Event[]
  goals               Goal[]
  habits              Habit[]
  focusSessions       FocusSession[]
  analyticsSnapshots  AnalyticsSnapshot[]
  scheduleSuggestions ScheduleSuggestion[]
}

model Task {
  id                 String              @id @default(uuid())
  title              String
  description        String?
  dueDate            DateTime
  estimatedDuration  Int // in minutes
  priority           Priority
  energyLevel        EnergyLevel
  status             TaskStatus          @default(NOT_STARTED)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  userId             String
  user               User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  focusSessions      FocusSession[]
  scheduleSuggestion ScheduleSuggestion?
}

model Event {
  id        String        @id @default(uuid())
  title     String
  startTime DateTime
  endTime   DateTime
  category  EventCategory
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  userId    String
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Goal {
  id          String      @id @default(uuid())
  title       String
  description String?
  targetDate  DateTime
  progress    Int         @default(0) // 0 to 100
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  milestones  Milestone[]
}

model Milestone {
  id         String          @id @default(uuid())
  title      String
  status     MilestoneStatus @default(NOT_STARTED)
  targetDate DateTime
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
  goalId     String
  goal       Goal            @relation(fields: [goalId], references: [id], onDelete: Cascade)
}

model Habit {
  id        String         @id @default(uuid())
  title     String
  frequency HabitFrequency @default(DAILY)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  userId    String
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs      HabitLog[]
}

model HabitLog {
  id          String   @id @default(uuid())
  completedAt DateTime @default(now())
  habitId     String
  habit       Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)
}

model FocusSession {
  id        String   @id @default(uuid())
  startTime DateTime
  endTime   DateTime
  duration  Int // in minutes
  createdAt DateTime @default(now())
  taskId    String?
  task      Task?    @relation(fields: [taskId], references: [id], onDelete: SetNull)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AnalyticsSnapshot {
  id                String   @id @default(uuid())
  date              DateTime @default(now())
  workloadDensity   Float // scheduled focus hours / available hours
  missedTaskCount   Int
  streakDeclineRate Float // relative decline in habits (0 to 1)
  focusTimeTrend    Float // relative change in focus hours (-1 to 1)
  burnoutRiskScore  Float // 0 to 100
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
}

model ScheduleSuggestion {
  id        String   @id @default(uuid())
  taskId    String   @unique
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  startTime DateTime
  endTime   DateTime
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 2. `.env` (from `proposed_.env`)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lifeos?schema=public"
NEXTAUTH_SECRET="next_auth_secret_development_key_12345"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. `src/app/layout.tsx` (from `proposed_layout.tsx`)
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LifeOS",
  description: "Authentic LifeOS Application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### 4. `src/app/page.tsx` (from `proposed_page.tsx`)
```tsx
export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>LifeOS</h1>
      <p>Welcome to LifeOS - Your personal productivity workspace.</p>
    </main>
  );
}
```

### 5. `tests/e2e/playwright.config.ts` (from `proposed_playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially to avoid in-memory state conflicts between tests
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Run sequentially for predictable database state
  reporter: 'list',
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
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
```

### 6. `tests/e2e/package.json` (from `proposed_e2e_package.json`)
```json
{
  "name": "lifeos-e2e",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "postinstall": "playwright install chromium",
    "test": "playwright test",
    "test:ui": "playwright test --ui"
  },
  "devDependencies": {
    "@playwright/test": "^1.44.1",
    "@types/node": "^20.12.12",
    "typescript": "^5.4.5"
  }
}
```
