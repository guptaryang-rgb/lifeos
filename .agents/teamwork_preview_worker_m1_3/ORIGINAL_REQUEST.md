## 2026-06-16T23:01:32Z
You are Milestone 1.3 Worker. Your working directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_worker_m1_3. Your workspace directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos.

Your task is to set up NextAuth.js credentials provider configuration and endpoints for Milestone 1.3.

1. Ensure `src/lib/` exists and write the NextAuth configuration options to `src/lib/auth.ts`:
   ```typescript
   import { NextAuthOptions } from "next-auth";
   import CredentialsProvider from "next-auth/providers/credentials";
   import prisma from "@/lib/prisma";
   import { compareSync } from "bcryptjs";
   import { DefaultSession } from "next-auth";

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

2. Create the directory `src/app/api/auth/[...nextauth]` using:
   `New-Item -ItemType Directory -Path "src/app/api/auth/[...nextauth]" -Force`
3. Write `src/app/api/auth/[...nextauth]/route.ts` with the NextAuth handlers:
   ```typescript
   import NextAuth from "next-auth";
   import { authOptions } from "@/lib/auth";

   const handler = NextAuth(authOptions);

   export { handler as GET, handler as POST };
   ```

4. Verify that the files typecheck cleanly using the TypeScript compiler:
   `npx tsc --noEmit src/lib/auth.ts src/app/api/auth/[...nextauth]/route.ts`
5. Document all results and outputs in `handoff.md` in your working directory and report back.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
