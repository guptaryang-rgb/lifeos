## 2026-06-16T22:57:30Z

You are Milestone 1.2 Explorer 2. Your working directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_2_2. Your workspace directory is C:\Users\gupta_ikq631n\teamwork_projects\lifeos.

Examine the workspace files and design the database seeding script `prisma/seed.ts` for Milestone 1.2.
Specifically:
1. The script must populate the database with a default user: email `user@example.com`, password `password123` hashed using `bcryptjs`.
2. Generate 2+ weeks (14 days) of realistic historical data and some future scheduled items for the user, including:
   - Users (1 test user)
   - Tasks (various statuses: COMPLETED, IN_PROGRESS, NOT_STARTED, OVERDUE; various priorities and energy levels)
   - Events (WORK, PERSONAL, ACADEMIC, HEALTH)
   - Goals & Milestones (linked to the goals, with progress tracking)
   - Habits & HabitLogs (showing a consistent streak of completions)
   - FocusSessions (linked to tasks, with realistic durations in minutes)
   - AnalyticsSnapshots (daily pre-calculated burnout risk, workload density, missed tasks, focus trend)
   - ScheduleSuggestions (some AI planner suggestions for tasks)
3. Ensure the script handles database cleaning (deleting existing records) before seeding.
4. Ensure the script runs cleanly via `npx prisma db seed` (which runs `tsx prisma/seed.ts` as defined in `package.json`).
5. Write your detailed analysis and the proposed `prisma/seed.ts` file structure to `handoff.md` in your working directory.
6. Report completion back to the caller agent.
