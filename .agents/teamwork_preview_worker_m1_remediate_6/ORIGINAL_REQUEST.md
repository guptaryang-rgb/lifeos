## 2026-06-16T19:18:56-05:00
You are database, route, and frontend remediation implementer, spawned to replace an unresponsive worker.
Your working directory is: C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_worker_m1_remediate_6
Your workspace directory is: C:\Users\gupta_ikq631n\teamwork_projects\lifeos

The files (src/lib/heuristics.ts, src/app/api/analytics/route.ts, src/lib/prisma.ts, src/app/goals/page.tsx) have already been modified by the previous worker. Your task is to verify they are correct and cleanly compile/build the project, and check for lints or build errors:
1. Verify the files are correct and conform to specifications.
2. Clean Next.js build cache and directories:
   - Run `Remove-Item -Recurse -Force .next` (using powershell or appropriate clean command if folder exists)
   - Run `Remove-Item -Recurse -Force node_modules\.cache` (if folder exists)
3. Run the build command sequence:
   - `npm install`
   - `npx prisma generate`
   - `npm run build`
4. Document all modified files, compilation results, and any build errors or successes in handoff.md in your working directory and report back.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
