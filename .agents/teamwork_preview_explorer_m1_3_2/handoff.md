# Handoff Report - NextAuth.js Configuration Design

## 1. Observation
- The SQLite database uses a Prisma schema located at `prisma/schema.prisma`. The `User` model is defined as follows:
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
- The Prisma client is initialized in `src/lib/prisma.ts` and exported as a default export:
  ```typescript
  import { PrismaClient } from "@prisma/client";
  ...
  const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
  export default prisma;
  ```
- The `package.json` specifies standard next-auth and bcryptjs versions:
  ```json
  "dependencies": {
    "@prisma/client": "^5.14.0",
    "bcryptjs": "^2.4.3",
    ...
    "next-auth": "^4.24.7",
    ...
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    ...
  }
  ```
- Running the TypeScript compiler `npx tsc --noEmit` on the whole project reveals type errors originating from the isolated Playwright tests inside `tests/e2e` due to the root `tsconfig.json` compiling all files matching `**/*.ts` (including those in `tests/e2e` that have their own tsconfig and package.json configurations). The specific command `npx tsc --noEmit src/lib/prisma.ts` completed successfully without errors.

---

## 2. Logic Chain
1. To implement credentials-based authentication, NextAuth's `CredentialsProvider` must be used inside `src/lib/auth.ts`.
2. The user lookup requires querying the user table in the database by their unique email address. We can achieve this by importing the initialized `prisma` instance from `@/lib/prisma` (resolved via tsconfig path alias to `./src/lib/prisma.ts`) and calling `prisma.user.findUnique({ where: { email } })`.
3. To safely compare the input plaintext password with the hashed password stored in the database, `bcryptjs`'s `compareSync(password, hashedPassword)` must be utilized.
4. NextAuth's default type declarations for the `Session` object contain only `name`, `email`, and `image`. To satisfy TypeScript compilation rules when assigning the database `id` to the session (`session.user.id`), custom type declarations must be written in `src/types/next-auth.d.ts` extending `Session` and `JWT`.
5. NextAuth handlers for App Router require exposing `GET` and `POST` requests in the Next.js API route matching `/api/auth/[...nextauth]`. A catch-all route at `src/app/api/auth/[...nextauth]/route.ts` must export `NextAuth(authOptions)` as both `GET` and `POST`.
6. To check compilation clean of E2E errors, the root `tsconfig.json` should be updated to exclude `tests/e2e` or a selective compile command targeting the `src` folder can be run.

---

## 3. Caveats
- The custom sign-in page is designated as `/auth/login` (in alignment with typical Next.js auth patterns and `PROJECT.md` specifying `src/app/auth/` for login/register views). If the actual path used is `/auth/signin`, the `signIn` configuration page in `authOptions` should be adjusted accordingly.
- No database connection pooling or extra encryption configuration was investigated, as SQLite runs locally and uses direct file locks.

---

## 4. Conclusion
We have designed the NextAuth.js authentication configuration for Milestone 1.3. Below are the proposed files and the step-by-step implementation instructions.

### Proposed Files

#### 1. NextAuth.js Configuration: `src/lib/auth.ts`
```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        const isPasswordValid = bcrypt.compareSync(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Incorrect password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
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
    }
  },
  pages: {
    signIn: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
```

#### 2. NextAuth App Router API Handler: `src/app/api/auth/[...nextauth]/route.ts`
```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

#### 3. TypeScript Declaration File: `src/types/next-auth.d.ts` (Recommended)
```typescript
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
```

---

### Step-by-Step Implementation Instructions

1. **Create the `src/types` directory** and write `src/types/next-auth.d.ts` containing the next-auth module overrides.
2. **Write the auth configuration file** `src/lib/auth.ts`.
3. **Create the nested API directory path** `src/app/api/auth/[...nextauth]`.
4. **Write the route handler file** `src/app/api/auth/[...nextauth]/route.ts`.
5. **(Optional but recommended)** Exclude `tests/e2e` from compilation in the root `tsconfig.json` by adding `"tests/e2e"` to the `"exclude"` array to prevent E2E Playwright test typescript checks from bleeding into root checks.

---

## 5. Verification Method

To verify compilation correctly, run the following steps:
1. Temporarily place the proposed files in their respective locations or verify them using the local TypeScript compiler.
2. Since running `npx tsc --noEmit` globally catches the isolated Playwright tests errors, test compilation specifically for the source/auth files using:
   ```powershell
   npx tsc --noEmit src/lib/prisma.ts src/lib/auth.ts src/types/next-auth.d.ts src/app/api/auth/[...nextauth]/route.ts
   ```
   *Expected outcome:* The command compiles with no errors (exit code 0).
3. If the `tsconfig.json` has excluded `"tests/e2e"`, verification can simply be done via:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected outcome:* The command compiles successfully.
