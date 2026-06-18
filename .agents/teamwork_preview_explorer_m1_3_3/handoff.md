# NextAuth.js Configuration Design Report

This report outlines the proposed design, directory structure, file contents, and verification steps for configuring NextAuth.js in Milestone 1.3.

---

## 1. Observation

During the exploration of the workspace directory, the following configurations and specifications were observed:

### A. Database Model (`prisma/schema.prisma` lines 18-32)
```prisma
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
```
- The `User` model uses a `String` type UUID as its primary key (`id`), and has unique `email` and hashed `password` fields.

### B. Dependency Versions (`package.json`)
- `"next-auth"` is installed at version `^4.24.7` (under `dependencies`).
- `"bcryptjs"` is installed at version `^2.4.3` (under `dependencies`).
- `"@types/bcryptjs"` is installed at version `^2.4.6` (under `devDependencies`).

### C. TypeScript Target and Path Aliases (`tsconfig.json`)
- Path alias mappings are defined as:
```json
"paths": {
  "@/*": ["./src/*"]
}
```
This confirms `@/lib/prisma` is the standard alias path for accessing `src/lib/prisma.ts`.

### D. Session & Login Routes (`tests/e2e/tests/auth.spec.ts`)
- In `auth.spec.ts`, registration redirections and protected route checks target `/auth/login`:
```typescript
// Line 19 & 29:
await page.waitForURL('**/auth/login');
// Line 71:
await page.waitForURL(url => url.pathname === '/auth/login' && url.searchParams.get('callbackUrl') === '/calendar');
```
This establishes `/auth/login` as the custom sign-in page.

### E. Environment Variables (`.env`)
```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="next_auth_secret_development_key_12345"
NEXTAUTH_URL="http://localhost:3000"
```
The secret `NEXTAUTH_SECRET` and base URL `NEXTAUTH_URL` are already configured for session security.

---

## 2. Logic Chain

The configuration design is derived through the following logic steps:

1. **User Querying**: NextAuth must lookup users by `email` using the database client. Since `src/lib/prisma.ts` exports `prisma` as default, the auth configuration should import `prisma` from `@/lib/prisma` and call `prisma.user.findUnique({ where: { email } })` inside `authorize`.
2. **Password Verification**: The `User.password` stored in the SQLite database is hashed. We must verify it by invoking `compareSync` from `bcryptjs` against the credentials payload.
3. **Session Strategy**: We configure `session.strategy` as `"jwt"` to store session state in a JSON Web Token on the client side, avoiding database-bound session querying.
4. **User ID Propagation**: By default, NextAuth JWT and Session tokens do not expose the custom database `id`. We map this by:
   - Capturing `user.id` in the `jwt` callback and saving it as `token.id`.
   - Transferring `token.id` to `session.user.id` in the `session` callback.
5. **Type Augmentation**: TypeScript will reject custom properties like `session.user.id` because they are missing from the default NextAuth types. We merge `Session` and `JWT` module definitions inline in `src/lib/auth.ts` to satisfy compiler checks.
6. **NextAuth Handler Route**: The Next.js App Router expects the catch-all dynamic route `src/app/api/auth/[...nextauth]/route.ts` to export standard HTTP methods (`GET` and `POST`) created using `NextAuth(authOptions)`.

---

## 3. Caveats

- **Network Constraints**: Operating in `CODE_ONLY` network mode; external API references or packages outside of local npm node_modules are not analyzed.
- **Bcrypt Hash compatibility**: The design assumes the seeding script/registration system utilizes standard bcrypt hashes that are verifiable via `compareSync`.
- **Implementation Status**: This investigation is strictly read-only. We did not write or modify workspace files directly.

---

## 4. Conclusion

We propose creating two files in the workspace:

### 1. `src/lib/auth.ts`
This contains the core NextAuth configuration options and type augmentations.

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compareSync } from "bcryptjs";
import { DefaultSession } from "next-auth";

// Module augmentation to extend NextAuth Session type-safety
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = compareSync(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
```

### 2. `src/app/api/auth/[...nextauth]/route.ts`
This sets up the catch-all App Router handler for NextAuth.

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

---

## 5. Instructions & Verification Method

### Step-by-Step Creation Instructions
1. Navigate to the project root directory: `C:\Users\gupta_ikq631n\teamwork_projects\lifeos`.
2. Locate the folder `src/lib/`. Ensure it exists, then write the first proposed file to `src/lib/auth.ts`.
3. Create the nested directories for the API route: `src/app/api/auth/[...nextauth]/`.
   - On Windows PowerShell, this can be done via:
     ```powershell
     New-Item -ItemType Directory -Path "src/app/api/auth/[...nextauth]" -Force
     ```
4. Write the second proposed file to `src/app/api/auth/[...nextauth]/route.ts`.

### Compilation Verification Method
To ensure these configurations compile correctly and don't introduce type mismatches, execute the following commands in the workspace root:

1. **Verify TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   This will run type checking on the Next.js files (including the newly added auth and route files). Ensure it completes with zero type errors.

2. **Verify Production Build Integration**:
   ```powershell
   npm run build
   ```
   This compiles the entire Next.js application. It runs the full Webpack/Turbo compilation and lint checks. Success confirms that imports, routes, and NextAuth endpoints are fully integrated.
