# Database and Authentication Remediation Analysis

## 1. Local PostgreSQL Environment Assessment
- **Current Status**: PostgreSQL is **NOT** installed or running on the Windows host system.
- **Verification Findings**:
  - **Services**: A query of Windows services using `Get-Service` matching `*postgres*` or `*sql*` returned zero results.
  - **Executable Search**: Search of `C:\Program Files` and `C:\Program Files (x86)` for `postgres.exe` or `pg_ctl.exe` returned zero results.
  - **Ports**: A check of port `5432` showed no process listening on TCP. The only references were UDP connections hosted by `svchost.exe` under process ID `5432`.
  - **WSL**: Windows Subsystem for Linux (WSL) is present but has no installed distributions (`wsl.exe -l -v` returned "no installed distributions").
  - **Chocolatey Cache**: A cached package definition for `postgresql16` (version 16.14.0) exists in `C:\Users\gupta_ikq631n\.chocolatey\http-cache` and `AppData\Local\Temp\chocolatey`, indicating that Chocolatey can be used to install it.

## 2. API Routes and Database Bypass Analysis
- **Current Implementation**:
  - The API routes under `src/app/api/` (tasks, events, goals, habits, focus, analytics, and reset) import and use `prisma` from `@/lib/prisma`.
  - However, `src/lib/prisma.ts` is implemented as a **Proxy client** around `realPrisma` (the genuine PrismaClient).
  - This proxy performs a connection check (`realPrisma.$queryRaw`SELECT 1``). If it fails, it sets `isDbOnline = false` and diverts all database queries to a local JSON file (`.mock-db.json`) via `handleMockDbQuery()`.
  - The proxy translates Prisma queries (such as `findMany`, `create`, `update`, `delete`) to operations on the mock database arrays and converts the models back and forth.
- **Security and Integrity Violations**:
  - **Bypass of Verification**: All API routes support authentication via a plaintext `session` cookie containing the user's email:
    ```typescript
    const session = await getServerSession(authOptions);
    let email = session?.user?.email;
    if (!email) {
      email = req.cookies.get('session')?.value;
    }
    ```
    If NextAuth session is not found, it falls back to the `session` cookie. This allows complete authorization bypass: any user can set a cookie `session=john@example.com` in their browser and access/modify all of John's data without any password verification!
  - **Split Session States**: NextAuth uses a signed/encrypted JWT cookie (`next-auth.session-token`), whereas the custom login/logout endpoints use a plaintext cookie `session`. This leads to inconsistent authentication states.

## 3. Custom Authentication Routes Conflict
- **Endpoints**:
  - `/api/login/route.ts` (custom login)
  - `/api/logout/route.ts` (custom logout)
  - `/api/register/route.ts` (custom registration)
- **Conflicts**:
  - NextAuth catch-all route `src/app/api/auth/[...nextauth]/route.ts` handles all native authentication operations (session checking, credentials auth, and sign-out) under `/api/auth/*`.
  - The custom authentication endpoints are located directly under `/api/login`, `/api/logout`, and `/api/register`. This doesn't trigger Next.js route compilation errors, but it bypasses the NextAuth lifecycle.
  - The frontend `Navbar.tsx` calls `fetch('/api/auth/session')` (handled natively by NextAuth) to get the user's session, but calls `fetch('/api/auth/logout', { method: 'POST' })` which fails/conflicts because NextAuth handles logout via `/api/auth/signout`.
  - The custom endpoints use the `session` cookie for state management, which violates NextAuth's centralized security model.

---

## 4. Step-by-Step Remediation Plan

### Step 1: Install and Start PostgreSQL
1. Run PowerShell as Administrator and install PostgreSQL 16 via Chocolatey:
   ```powershell
   choco install postgresql16 -y
   ```
2. Start the PostgreSQL service:
   ```powershell
   Start-Service -Name "postgresql-x64-16"
   ```
3. Set the service to start automatically:
   ```powershell
   Set-Service -Name "postgresql-x64-16" -StartupType Automatic
   ```
4. Verify that the PostgreSQL database engine is listening on port 5432:
   ```powershell
   netstat -ano | findstr 5432
   ```

### Step 2: Configure PostgreSQL Database and User
1. Open the PostgreSQL command-line tool `psql` (usually located at `C:\Program Files\PostgreSQL\16\bin\psql.exe`):
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
   ```
2. Set the password for the `postgres` user to match the `.env` connection string (`postgres`):
   ```sql
   ALTER USER postgres PASSWORD 'postgres';
   ```
3. Create the `lifeos` database:
   ```sql
   CREATE DATABASE lifeos;
   ```
4. Exit `psql`:
   ```sql
   \q
   ```

### Step 3: Remove the Database Bypass Proxy
1. Delete the mock database file `.mock-db.json` from the project root.
2. Completely rewrite `src/lib/prisma.ts` to export a clean, standard PrismaClient instance, removing all proxy checks, mock database helpers, and file system logic:
   ```typescript
   import { PrismaClient } from "@prisma/client";

   const prismaClientSingleton = () => {
     return new PrismaClient();
   };

   declare global {
     var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
   }

   const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

   export default prisma;

   if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
   ```

### Step 4: Secure all API Routes and Enforce NextAuth
1. Clean up `src/app/api/` route files (tasks, events, goals, habits, focus, analytics) to remove all cookie-based authentication fallbacks and rely strictly on `getServerSession(authOptions)`:
   - Example revision for `src/app/api/tasks/route.ts` (and similarly for others):
     ```typescript
     import { NextRequest, NextResponse } from 'next/server';
     import prisma from '@/lib/prisma';
     import { getServerSession } from "next-auth/next";
     import { authOptions } from "@/lib/auth";

     export async function GET(req: NextRequest) {
       const session = await getServerSession(authOptions);
       if (!session || !session.user?.id) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
       }
       const userId = session.user.id;

       const tasks = await prisma.task.findMany({
         where: { userId }
       });
       // ... format and return tasks
     }
     ```
2. In all Prisma queries inside routes, query by `userId` (referencing `session.user.id` which is the UUID) instead of mapping by `user: { email }`, aligning strictly with the database schema relations.

### Step 5: Resolve Custom Auth Endpoints Conflict
1. Remove custom files:
   - `src/app/api/login/route.ts`
   - `src/app/api/logout/route.ts`
2. Keep `src/app/api/register/route.ts` but rewrite it to create a real user in the PostgreSQL database using Prisma (making sure to hash the password):
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import prisma from '@/lib/prisma';
   import { hashSync } from 'bcryptjs';

   export async function POST(req: NextRequest) {
     try {
       const { name, email, password } = await req.json();

       if (!password || password.length < 6) {
         return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
       }
       if (!email || !email.includes('@') || !email.split('@')[1]?.includes('.')) {
         return NextResponse.json({ error: 'Malformed email' }, { status: 400 });
       }

       const existing = await prisma.user.findUnique({
         where: { email }
       });
       if (existing) {
         return NextResponse.json({ error: 'Registration Failed: Email already exists' }, { status: 400 });
       }

       const hashedPassword = hashSync(password, 10);
       const newUser = await prisma.user.create({
         data: {
           email,
           name,
           password: hashedPassword
         }
       });

       return NextResponse.json({ success: true, user: { email, name } });
     } catch (e) {
       return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
     }
   }
   ```
3. Update `Navbar.tsx` logout callback to use NextAuth's `signOut` helper:
   ```typescript
   import { signOut } from 'next-auth/react';
   
   const handleLogout = async () => {
     await signOut({ callbackUrl: '/auth/login' });
   };
   ```

### Step 6: Database Initialization & Migration
1. Generate the Prisma Client:
   ```powershell
   npm run db:generate
   ```
2. Push the database schema to the PostgreSQL server:
   ```powershell
   npm run db:push
   ```
3. Seed the PostgreSQL database:
   ```powershell
   npm run db:seed
   ```

### Step 7: Verification & Build
1. Delete the Next.js cache folder to prevent compilation conflicts:
   ```powershell
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   ```
2. Compile and build the application:
   ```powershell
   npm run build
   ```
3. Start the application and run the Playwright E2E tests:
   ```powershell
   npm run dev
   # in another terminal inside tests/e2e:
   npx playwright test
   ```
