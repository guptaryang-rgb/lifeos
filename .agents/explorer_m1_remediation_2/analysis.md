# LifeOS Database Bypass and Authentication Remediation Design

This report analyzes the database architecture, API design, and authentication system of **LifeOS**. It identifies critical integrity violations—specifically the database facade bypass via `mockDb.ts` and conflicts in the NextAuth configuration—and presents a step-by-step remediation design to align the codebase with a genuine PostgreSQL database layout using Prisma client, while resolving build and compilation errors.

---

## 1. Executive Summary
- **Current State**: The application bypasses the PostgreSQL database entirely by utilizing a local JSON-based mock database file (`.mock-db.json`) via helper functions in `src/lib/mockDb.ts` across all API endpoints. In addition, the authentication system has a critical structural conflict: custom static routes (`/api/auth/login` and `/api/auth/logout`) collide with the NextAuth catch-all handler (`/api/auth/[...nextauth]`).
- **PostgreSQL Environment**: Forensic diagnostics confirm that **PostgreSQL is not installed** on the host Windows system. No services, registry settings, standard ports, or local Docker containers exist to start a database server.
- **Proposed Solution**: 
  1. Refactor all API routes in `src/app/api/` to execute queries against the genuine Prisma client using PostgreSQL.
  2. Propose minor schema modifications to `prisma/schema.prisma` to support missing fields (e.g., `subtasks`, `linkedMilestone`, `color`, `streak`, `customDays`) to maintain full feature compatibility with the client-side UI.
  3. Delete the custom login, logout, and session endpoints. Refactor the frontend authentication calls to route secure credentials authentication entirely through NextAuth's default catch-all route.
  4. Securely integrate user registration via `bcryptjs` password hashing and Prisma writes.

---

## 2. Analysis of the Database Bypass (`mockDb.ts`)
The project contains a database facade layer in `src/lib/mockDb.ts` that reads and writes data to a local file `.mock-db.json`. 

### Affected Routes
Every data route in `src/app/api/` imports and relies on `readDb()`, `writeDb()`, or `resetDb()`:
- `src/app/api/analytics/route.ts`
- `src/app/api/events/route.ts`
- `src/app/api/focus/route.ts`
- `src/app/api/goals/route.ts`
- `src/app/api/habits/route.ts`
- `src/app/api/tasks/route.ts`
- `src/app/api/test/reset/route.ts`
- `src/app/api/auth/login/route.ts`, `logout/route.ts`, `register/route.ts`, `session/route.ts`

### Schema Mapping and Gaps
The `prisma/schema.prisma` file defines models that correspond to the primary features of the app, but there are several missing fields and type differences compared to the client-side expectations:

| Entity | `mockDb.ts` Interface Field | `prisma/schema.prisma` Field | Required Remediation / Mapping |
| :--- | :--- | :--- | :--- |
| **Task** | `subtasks: { id: string; title: string; completed: boolean }[]` | *None* | Add `subtasks Json? @default("[]")` (or create a relational `Subtask` model). Using `Json` allows direct serialization compatibility with the UI. |
| **Task** | `linkedMilestone?: string` | *None* | Add `linkedMilestone String?` to associate tasks with goal milestones. |
| **Task** | `effort: number` | `estimatedDuration: Int` | Map client-submitted `effort` (in minutes) to `estimatedDuration`. |
| **Task** | `userEmail: string` | `userId: String` (Relation) | Retrieve `userId` from the NextAuth server session to query user-scoped tasks. |
| **Event** | `color: string` | *None* | Add `color String? @default("blue")` to `Event` model. |
| **Event** | `start` / `end` (strings) | `startTime` / `endTime` (DateTime) | Map to `DateTime` via `new Date(start)` / `new Date(end)`. |
| **Goal** | `frequency: 'DAILY'\|'WEEKLY'\|'MONTHLY'` | *None* | Add `frequency String?` or `enum GoalFrequency` to the `Goal` model. |
| **Goal** | `due: string` | `targetDate: DateTime` | Map `due` to `targetDate`. |
| **Goal** | `milestones: { id: string; title: string; due: string; completed: boolean }[]` | `milestones: Milestone[]` | Map `completed` to `MilestoneStatus` (`COMPLETED` or `NOT_STARTED`), and `due` to `targetDate`. |
| **Habit** | `streak: number` | *None* | Add `streak Int @default(0)` to the `Habit` model. |
| **Habit** | `customDays?: string` | *None* | Add `customDays String?` to the `Habit` model. |
| **Habit** | `logs: string[]` (date strings) | `logs: HabitLog[]` | Map completions by creating/querying related `HabitLog` records. |
| **Focus** | `timestamp: string` | `startTime` (DateTime) | Set `startTime = new Date(timestamp)` and compute `endTime = new Date(startTime.getTime() + duration * 60000)`. |

---

## 3. Refactoring Plan for API Routes (mockDb to Prisma)

To replace all `mockDb` references with genuine Prisma calls, we will:
1. Initialize the global `PrismaClient` instance from `@/lib/prisma`.
2. Retrieve the active user ID using `getServerSession(authOptions)` in place of reading `session` cookie strings.
3. Perform standard Prisma query methods (`findMany`, `create`, `update`, `delete`) scoped by `userId`.

### Target Code Snippet Replacements

#### 1. Tasks API (`src/app/api/tasks/route.ts`)
- **GET**:
  ```typescript
  import { getServerSession } from "next-auth/next";
  import { authOptions } from "@/lib/auth";
  import prisma from "@/lib/prisma";

  export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      where: { userId: session.user.id }
    });
    // Map effort back to client representation
    const mappedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate.toISOString().split('T')[0],
      priority: t.priority,
      effort: t.estimatedDuration,
      status: t.status,
      subtasks: t.subtasks || [],
      linkedMilestone: t.linkedMilestone
    }));
    return NextResponse.json(mappedTasks);
  }
  ```

- **POST**:
  ```typescript
  export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const data = await req.json();
      if (!data.dueDate) {
        return NextResponse.json({ error: 'Missing dueDate' }, { status: 400 });
      }
      if (data.effort !== undefined && data.effort < 0) {
        return NextResponse.json({ error: 'Negative effort' }, { status: 400 });
      }

      const userId = session.user.id;

      // Handle Update
      if (data.id) {
        const existing = await prisma.task.findFirst({ where: { id: data.id, userId } });
        if (existing) {
          const updated = await prisma.task.update({
            where: { id: data.id },
            data: {
              title: data.title,
              dueDate: new Date(data.dueDate),
              priority: data.priority,
              estimatedDuration: data.effort,
              status: data.status,
              subtasks: data.subtasks,
              linkedMilestone: data.linkedMilestone
            }
          });
          return NextResponse.json(updated);
        }
      }

      // Handle Create
      const newTask = await prisma.task.create({
        data: {
          id: data.id,
          title: data.title || '',
          dueDate: new Date(data.dueDate),
          priority: data.priority || 'MEDIUM',
          estimatedDuration: data.effort || 0,
          energyLevel: 'MEDIUM', // Required field
          status: data.status || 'NOT_STARTED',
          subtasks: data.subtasks || [],
          linkedMilestone: data.linkedMilestone || null,
          userId
        }
      });
      return NextResponse.json(newTask, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }
  }
  ```

Apply similar patterns to `events`, `goals`, `habits`, and `focus` API routes.

---

## 4. Authentication Conflict Analysis
The LifeOS codebase contains two competing authentication mechanisms:
1. **NextAuth catch-all handler**: `src/app/api/auth/[...nextauth]/route.ts` configured with the credentials provider.
2. **Custom static API routes**: `/api/auth/login` and `/api/auth/logout`.

### Why They Conflict
- **Next.js Route Precedence**: In the App Router, specific static segments (like `/api/auth/login`) take routing priority over catch-all dynamic parameters (like `/api/auth/[...nextauth]`).
- **Build Errors**: When Next.js builds the app (`npm run build`), it attempts to optimize routes. Having specific files nested alongside catch-all dynamics in the same subfolder can trigger page-collection crashes or duplicate route handler errors.
- **Security Bypass**: Custom endpoints write an unencrypted plain-text cookie (`session`) holding the user's email. estándar NextAuth middleware, session hooks (`useSession()`), and server helpers (`getServerSession`) check for JWT-based session tokens. They fail to detect the custom cookie, leading to inconsistencies and bypass vulnerabilities where a user could fake any email in the `session` cookie.

---

## 5. Authentication Remediation Design

### 1. Delete Custom Endpoints
Delete the following files entirely:
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/session/route.ts`

### 2. Client-Side Login and Logout Adjustments
Update the components to call NextAuth helpers instead of custom endpoints:

- **Login Component (`src/app/auth/login/page.tsx`)**:
  Import `signIn` from `next-auth/react` and update `handleLogin`:
  ```typescript
  import { signIn } from 'next-auth/react';
  // ...
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false
    });

    if (res?.error) {
      setError(res.error || 'Invalid credentials');
    } else {
      router.push(callbackUrl);
    }
  };
  ```

- **Navbar Component (`src/components/shared/Navbar.tsx`)**:
  Use `signOut` from `next-auth/react` to handle sign-out. The session check can directly query NextAuth's native session route `/api/auth/session` (which will now be handled automatically by NextAuth's catch-all handler).
  ```typescript
  import { signOut } from 'next-auth/react';
  // ...
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserName(data.user.name || data.user.email);
        } else {
          const path = window.location.pathname;
          if (path !== '/auth/login' && path !== '/auth/register') {
            router.push(`/auth/login?callbackUrl=${encodeURIComponent(path)}`);
          }
        }
      });
  }, [router]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };
  ```

### 3. Register Endpoint (`src/app/api/auth/register/route.ts`)
Refactor the custom register route to use `bcryptjs` and Prisma, keeping it outside the dynamic catch-all (since NextAuth does not natively support registration):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (!email || !email.includes('@') || !email.split('@')[1]?.includes('.')) {
      return NextResponse.json({ error: 'Malformed email' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json({ error: 'Registration Failed: Email already exists' }, { status: 400 });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword
      }
    });

    return NextResponse.json({ success: true, user: { email: user.email, name: user.name } });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
```

---

## 6. PostgreSQL Installation Verification
Local diagnostics on the Windows system confirm the following status:
- **Windows Services**: No active or stopped services match the pattern `*postgres*` or `*sql*`.
- **System PATH**: The executable commands `postgres` and `psql` are not registered in the system environment variables path.
- **Program Files**: Scans of both `C:\Program Files` and `C:\Program Files (x86)` confirm that no PostgreSQL installation directories are present.
- **Port Listener**: Execution of network diagnostic listeners on port `5432` confirms that no service is actively listening on this port.
- **Docker/WSL**: Scans of uninstallation logs show that Docker Desktop was uninstalled on June 9th, 2026. WSL 2 is installed but contains no active Linux distributions.
- **Conclusion**: There is no PostgreSQL instance running, and it is impossible to start one locally without installing the software.

---

## 7. Step-by-Step Remediation Plan

To successfully execute this remediation and compile/test without errors, follow this sequence:

### Step 1: Update the Prisma Schema
Integrate missing fields and enums in `prisma/schema.prisma` to cover frontend feature parity:
- Modify `schema.prisma` to include the `subtasks` Json field and `linkedMilestone` on the `Task` model.
- Add `color` to the `Event` model.
- Add `frequency` String or `GoalFrequency` enum and field to the `Goal` model.
- Add `streak` and `customDays` to the `Habit` model.
- Add `MONTHLY` to `HabitFrequency` (if needed) or support monthly tracking.

### Step 2: Configure Environment Connection
Provide the `DATABASE_URL` in `.env` referencing a reachable PostgreSQL instance:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lifeos?schema=public"
```
*(If a local server cannot be run due to constraints, developers can point this string to a remote PostgreSQL DB or utilize SQLite as a temporary local fallback by renaming the provider and URL).*

### Step 3: Run Database Migrations and Generate Client
Apply migrations and compile types:
```powershell
npx prisma db push
npx prisma generate
```

### Step 4: Delete Custom Auth Endpoints and Refactor Registration
Delete `/api/auth/login`, `/api/auth/logout`, and `/api/auth/session` route handlers. Refactor `/api/auth/register` to use `bcryptjs` and `prisma.user.create`.

### Step 5: Refactor Frontend Authentication Callers
Modify the login page (`src/app/auth/login/page.tsx`) to call the NextAuth `signIn('credentials')` utility and the Navbar (`src/components/shared/Navbar.tsx`) to use the `signOut()` utility.

### Step 6: Refactor All REST API Routes to Prisma
Replace all custom `mockDb` file-system references in all routes under `src/app/api/` with Prisma client methods scoped by the active session's `userId`.

### Step 7: Update and Run the Database Seed
Update `prisma/seed.ts` to reflect the schema model updates. Run the database seed:
```powershell
npm run db:seed
```

### Step 8: Build and Verify
Compile the Next.js application to verify the resolution of routing conflicts and type errors:
```powershell
npm run build
```

Run Playwright E2E tests:
```powershell
npm --prefix tests/e2e run test
```
