## 2026-06-16T23:00:39Z

You are Milestone 1.3 Explorer 2. Your working directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_3_2. Your workspace directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos.

Examine the workspace files and design the NextAuth.js authentication configuration for Milestone 1.3.
Specifically:
1. Design `src/lib/auth.ts` containing the NextAuth configuration options:
   - Use `CredentialsProvider` that accepts `email` and `password`.
   - Query the SQLite database using Prisma client to find the user.
   - Verify the password using `bcryptjs`'s `compareSync`.
   - Implement `jwt` and `session` callbacks to map the user's `id` from the database to the NextAuth session object (`session.user.id`).
   - Define custom pages if needed (e.g., signIn: "/auth/signin" or similar), session strategy as "jwt", and a secure secret.
2. Design `src/app/api/auth/[...nextauth]/route.ts` that exports GET and POST handlers using the auth configuration from `src/lib/auth.ts`.
3. Provide step-by-step instructions on where to create directories and write these files.
4. Recommend how to verify that NextAuth compiles correctly.
5. Write your detailed analysis and the proposed file contents to `handoff.md` in your working directory.
6. Report completion back to the caller agent.
