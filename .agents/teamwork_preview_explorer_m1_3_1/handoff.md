# Handoff Report — NextAuth.js Design for Milestone 1.3

## 1. Observation
- **Prisma Schema (`prisma/schema.prisma` lines 18-32)**:
  ```prisma
  model User {
    id                  String               @id @default(uuid())
    email               String               @unique
    password            String // hashed
    name                String?
    createdAt           DateTime             @default(now())
    updatedAt           DateTime             @updatedAt
    ...
  }
  ```
  The user model uses a UUID for `id`, has a unique `email`, a hashed `password`, and an optional `name`.
- **Workspace Dependencies (`package.json` lines 14-27 & 28-40)**:
  - `"next-auth": "^4.24.7"`
  - `"@prisma/client": "^5.14.0"`
  - `"bcryptjs": "^2.4.3"`
  - `"@types/bcryptjs": "^2.4.6"`
- **Environment Variables (`.env` lines 2-3)**:
  - `NEXTAUTH_SECRET="next_auth_secret_development_key_12345"`
  - `NEXTAUTH_URL="http://localhost:3000"`
- **Alias configuration (`tsconfig.json` lines 21-23)**:
  - Path alias `@/*` points to `./src/*`.
- **E2E Auth Test Spec (`tests/e2e/tests/auth.spec.ts` line 71, 115)**:
  - Expects custom login URL at `/auth/login` (not `/auth/signin`).
  - Expects callback redirection using query param `?callbackUrl=/calendar`.
- **TypeScript Check Command Failure (`npx tsc --noEmit`)**:
  - The type checker runs on all files including the tests since `tests` is not in the root `tsconfig.json` `"exclude"` array.
  - Verbatim errors returned:
    ```
    tests/e2e/tests/calendar.spec.ts(3,26): error TS7006: Parameter 'page' implicitly has an 'any' type.
    tests/e2e/tests/dashboard.spec.ts(3,26): error TS7006: Parameter 'page' implicitly has an 'any' type.
    ...
    ```

---

## 2. Logic Chain
1. **Database Querying**: Since `prisma` client is already configured and exported from `@/lib/prisma` (via `src/lib/prisma.ts`), we can import it in the NextAuth configuration to query the `User` model by email.
2. **Password Verification**: We will use `compareSync` from `bcryptjs` to securely verify the plain text password against the hashed password stored in the database.
3. **Session Custom Page mapping**: Based on `tests/e2e/tests/auth.spec.ts` lines 71 and 115, the custom sign-in page must be mapped to `/auth/login` rather than NextAuth's default `/api/auth/signin` or standard custom `/auth/signin`.
4. **ID Mapping (Callbacks)**:
   - NextAuth's JWT strategy does not attach user ID to the session object by default.
   - We must use the `jwt` callback to extract the database `id` from the `user` object (available on initial sign in) and store it in the token (`token.id = user.id`).
   - We then use the `session` callback to map that ID from the token onto the session's user object (`session.user.id = token.id`).
5. **Type Safety & Augmentation**:
   - Because TypeScript will raise errors when trying to access `session.user.id` or `token.id` (as they are not defined in NextAuth's default type declarations), we must design a type augmentation file `src/types/next-auth.d.ts` to extend the `Session` and `JWT` interfaces.
6. **Next.js Router Handlers**:
   - For Next.js 14+ App Router, the API handlers are defined under `src/app/api/auth/[...nextauth]/route.ts`.
   - The route handler must import the configuration from `src/lib/auth.ts` and export the GET and POST handlers.

---

## 3. Caveats
- **Root tsconfig exclusion**: The root `tsconfig.json` does not exclude the `tests` directory. As a result, compiling the project at the root checks E2E tests, which fail compilation due to implicit `any` errors (they are meant to be compiled under their own `tests/e2e/tsconfig.json`). It is highly recommended that the implementer updates the root `tsconfig.json` to exclude the `"tests"` folder.
- **Secure secret fallback**: While the development environment specifies `NEXTAUTH_SECRET` in `.env`, in production this must be set securely.

---

## 4. Conclusion & Proposed Designs

### A. Directory Creation Plan
To implement this design, the following directory structure must be created/verified:
1. `src/lib/`: Existing directory. Propose creating `src/lib/auth.ts`.
2. `src/app/api/auth/[...nextauth]/`: New directory structure. Propose creating `src/app/api/auth/[...nextauth]/route.ts`.
3. `src/types/`: New directory. Propose creating `src/types/next-auth.d.ts` for type safety.

---

### B. Proposed File Contents

#### 1. `src/lib/auth.ts`
```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compareSync } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Query user from SQLite database via Prisma
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user || !user.password) {
          return null;
        }

        // Verify password using bcryptjs compareSync
        const isValid = compareSync(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        // Return user details to establish session
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    })
  ],
  callbacks: {
    // Save database user id into JWT token on login
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Attach database user id to NextAuth session object
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
```

#### 2. `src/app/api/auth/[...nextauth]/route.ts`
```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

#### 3. `src/types/next-auth.d.ts`
```typescript
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
```

---

## 5. Verification Method
1. **TypeScript Type Compilation Verification**:
   - To check that NextAuth configurations and types compile cleanly without errors, the root `tsconfig.json` should be modified to exclude the `tests` directory.
   - Run:
     ```powershell
     npx tsc --noEmit
     ```
     This will run type-checking across the `src` folder. It should compile without errors.
2. **Next.js Project Build Verification**:
   - Run the production build command to verify that NextAuth resolves and compiles correctly within the Next.js App Router:
     ```powershell
     npm run build
     ```
     The build output should output `/api/auth/[...nextauth]` as a dynamic server-rendered API endpoint.
