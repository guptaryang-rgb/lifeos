## 2026-06-16T22:54:36Z

<USER_REQUEST>
You are Database Installation Worker. Your working directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_worker_db_install. Your workspace directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos.

Since PostgreSQL is not installed on this host and is required for Milestone 1.1, please attempt to install it using the available package managers.
Try the following methods in order:
1. Try using `winget` to install PostgreSQL:
   `winget install PostgreSQL.PostgreSQL --silent --accept-package-agreements --accept-source-agreements`
2. If winget fails or is blocked, try using Chocolatey (`choco`):
   `choco install postgresql16 --params "'/Password:postgres'" -y` (Note: if it requires admin privileges and fails, record the logs).
3. If both installation methods fail (e.g., due to network lock or permissions), do not get stuck. As a fallback, check if you can configure Prisma schema to use a temporary `sqlite` provider for verification purposes:
   - Make a backup of your `prisma/schema.prisma` file.
   - Modify `prisma/schema.prisma` to use:
     ```prisma
     datasource db {
       provider = "sqlite"
       url      = "file:./dev.db"
     }
     ```
   - Convert all custom Postgres enums in `schema.prisma` to standard Prisma fields if SQLite doesn't support them. (Note: SQLite does not support enums, so you must replace all `enum` definitions and fields with `String` types, but you can add comments or documentation).
   - If using SQLite fallback, update `.env` to point to the SQLite file.
   - Run `npx prisma generate`, `npx prisma db push` to verify that the schema is completely valid and compiles/runs successfully under SQLite.
4. Report back the result of the installation or fallback setup in `handoff.md` in your working directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
</USER_REQUEST>
