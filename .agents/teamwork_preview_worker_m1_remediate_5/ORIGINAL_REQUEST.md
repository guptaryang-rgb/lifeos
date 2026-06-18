## 2026-06-16T23:58:47Z

You are database, route, and frontend remediation implementer.
Your working directory is: C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_worker_m1_remediate_5
Your workspace directory is: C:\Users\gupta_ikq631n\teamwork_projects\lifeos

Please execute the database and routes/UI refactoring to eliminate the frontend input bypass, simulated analytics score, and build/prerender errors:
1. Copy the proposed heuristics logic from C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_remediate_5\proposed_heuristics.ts to src\lib\heuristics.ts.
2. Copy the proposed analytics API route logic from C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_remediate_5\proposed_analytics_route.ts to src\app\api\analytics\route.ts.
3. Copy the proposed prisma client proxy logic from C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_remediate_5\proposed_prisma.ts to src\lib\prisma.ts.
4. Apply the goals page patch from C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_remediate_5\goals_page.patch to src\app\goals\page.tsx. (If git apply fails, replace the hardcoded "Review Notes" blur listener with the dynamic tasks state search:
   ```typescript
   onBlur={() => {
     const query = taskTitle.trim().toLowerCase();
     if (!query) return;
     // Dynamic duration estimation: check existing tasks for matching title
     let matched = tasks.find(t => t.title.trim().toLowerCase() === query);
     if (!matched) {
       matched = tasks.find(t => t.title.toLowerCase().includes(query) || query.includes(t.title.toLowerCase()));
     }
     if (matched) {
       setTaskEffort(String(matched.effort));
     }
   }}
   ```
5. Clean Next.js build cache and directories:
   - Run `Remove-Item -Recurse -Force .next` (using powershell or appropriate clean command if folder exists)
   - Run `Remove-Item -Recurse -Force node_modules\.cache` (if folder exists)
6. Run the build command sequence:
   - `npm install`
   - `npx prisma generate`
   - `npm run build`
7. Document all modified files, compilation results, and any build errors or successes in handoff.md in your working directory and report back.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
