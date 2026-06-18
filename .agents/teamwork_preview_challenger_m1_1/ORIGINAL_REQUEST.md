## 2026-06-16T23:05:35Z
Verify the correctness and integrity of the database seed and NextAuth auth handler.
Specifically:
1. Re-run `npx prisma db seed` to check that the database seeds successfully.
2. Verify table counts and data content in the SQLite database file:
   - Check that counts match: 1 user, 3 goals, 8 milestones, 25 tasks, 25 events, 3 habits, 28 habit logs, 8 focus sessions, 14 snapshots, 3 suggestions.
3. Write a small testing script in your directory (e.g. `test_auth_check.ts`) that imports the `authorize` callback from `src/lib/auth.ts` (using relative path or config resolver), calls it with the seeded user email and password (`user@example.com` / `password123`), and asserts that it:
   - Returns the correct user details (id, email, name) when correct credentials are provided.
   - Correctly throws an error or returns null when incorrect credentials are provided.
4. Run this test script using `npx ts-node verify_auth.ts` or similar command.
5. Document your test script code, command output, database counts, and verdict in `handoff.md` in your working directory and report back.
