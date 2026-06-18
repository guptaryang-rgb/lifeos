# Handoff Report: Next.js 14+ Project Initialization & Prisma Schema Design (Milestone 1.1)

## 1. Observation
The following source documents and directory state were observed directly:
1. **Directory Contents**: Listing `C:\Users\gupta_ikq631n\teamwork_projects\lifeos` via search/list tools confirmed only the following files/folders exist in the root of the workspace:
   - `PROJECT.md`
   - `ORIGINAL_REQUEST.md` (which we wrote/was created)
   - `.agents` (subdirectories containing agents metadata)
   There were no other files (such as `package.json`, `tsconfig.json`, `prisma/`, or `src/`) present in the root folder.
2. **Architecture and Requirements**: `PROJECT.md` (lines 4-13) states:
   > "LifeOS is a full-stack Next.js 14+ application with App Router, Tailwind CSS for premium dark-mode glassmorphic UI, Prisma ORM for database access with PostgreSQL, and NextAuth.js for secure session management."
   Key modules include Authentication, Database (Prisma), Unified Dashboard, AI Planner & Calendar, Assignment & Goal System, Habits & Analytics, and Behavioral Intelligence.
3. **Interface Contracts**: `PROJECT.md` defines two primary contracts:
   - `src/lib/planner.ts` interface exports:
     ```typescript
     interface Task {
       id: string;
       title: string;
       dueDate: Date;
       estimatedDuration: number; // in minutes
       priority: 'LOW' | 'MEDIUM' | 'HIGH';
       energyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
       status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
     }

     interface Event {
       id: string;
       title: string;
       startTime: Date;
       endTime: Date;
       category: 'WORK' | 'PERSONAL' | 'ACADEMIC' | 'HEALTH';
     }

     interface ScheduleSuggestion {
       taskId: string;
       startTime: Date;
       endTime: Date;
     }
     ```
   - `src/lib/heuristics.ts` exports:
     ```typescript
     export function calculateBurnoutRisk(
       workloadDensity: number,  // scheduled focus hours / available hours
       missedTaskCount: number,
       streakDeclineRate: number, // relative decline in habits (0 to 1)
       focusTimeTrend: number     // relative change in focus hours (-1 to 1)
     ): { score: number; recommendations: string[] };
     ```
4. **Database Schema Requirements**: `.agents\sub_orch_m1\SCOPE.md` (lines 17-27) states:
   > - **User**: id, email, password (hashed), name, createdAt, updatedAt, relations to other tables.
   > - **Task**: id, title, description, dueDate, estimatedDuration (mins), priority (LOW, MEDIUM, HIGH), energyLevel (LOW, MEDIUM, HIGH), status (NOT_STARTED, IN_PROGRESS, COMPLETED, OVERDUE), userId, user relation.
   > - **Event**: id, title, startTime, endTime, category (WORK, PERSONAL, ACADEMIC, HEALTH), userId, user relation.
   > - **Goal**: id, title, description, targetDate, progress (0-100), userId, user relation, milestones relation.
   > - **Milestone**: id, title, status (NOT_STARTED, IN_PROGRESS, COMPLETED), goalId, goal relation, targetDate.
   > - **Habit**: id, title, frequency (DAILY, WEEKLY), userId, user relation, logs relation.
   > - **HabitLog**: id, completedAt, habitId, habit relation.
   > - **FocusSession**: id, startTime, endTime, duration (mins), taskId, task relation (optional), userId, user relation.
   > - **AnalyticsSnapshot**: id, date, workloadDensity, missedTaskCount, streakDeclineRate, focusTimeTrend, burnoutRiskScore, userId, user relation.
   > - **ScheduleSuggestion**: id, taskId, task relation, startTime, endTime, userId, user relation.

---

## 2. Logic Chain
Based on the direct observations from `PROJECT.md` and `SCOPE.md`, the following reasoning yields the final design and initialization plan:
1. **Next.js & React Selection**: Next.js 14+ is required with App Router and TypeScript support. We recommend the latest stable Next.js 14 release (`14.2.3`) and React 18 (`18.3.1`) to ensure compatibility with standard libraries (NextAuth, Framer Motion, and Recharts).
2. **Tailwind CSS & Framer Motion Configuration**: The system needs a premium "dark-mode glassmorphic" theme. Tailwind CSS (`^3.4.3`), PostCSS (`^8.4.38`), and `framer-motion` (`^11.2.6`) are required. A customized `tailwind.config.ts` extending `backdropBlur` and specifying a `glass-gradient` and custom border colors (`rgba(255, 255, 255, 0.1)`) is proposed to implement this look systematically.
3. **Database Client & Authentication**: NextAuth.js credentials provider requires standard session fields and passwords. Thus, `bcryptjs` is recommended for hashing, and `@prisma/client` + `prisma` package (`^5.14.0`) is configured.
4. **Relational Constraints**:
   - `User` is the central model; deletion of a User should cascade delete (`onDelete: Cascade`) their Tasks, Events, Goals, Habits, FocusSessions, AnalyticsSnapshots, and ScheduleSuggestions to prevent orphaned database records.
   - `Goal` to `Milestone` has a cascading relationship so that if a Goal is removed, all its child Milestones are also removed.
   - `Habit` to `HabitLog` similarly cascades on deletion.
   - `Task` to `FocusSession` should NOT cascade delete; a user's focus sessions history should be preserved even if the associated task is deleted (or if the focus session was general). Therefore, `taskId` in `FocusSession` is optional (`String?`) with `onDelete: SetNull`.
   - `Task` to `ScheduleSuggestion` is a one-to-one mapping (represented as a unique taskId reference in `ScheduleSuggestion`) that cascades on task deletion.
5. **Database Types & Indexing**:
   - Primary Keys: Set to UUID format using `@default(uuid())` for robust, standard distributed database keys.
   - Enums: Explicitly defined for fields with finite sets of values to match TypeScript interfaces: `Priority` (LOW, MEDIUM, HIGH), `EnergyLevel` (LOW, MEDIUM, HIGH), `TaskStatus` (NOT_STARTED, IN_PROGRESS, COMPLETED, OVERDUE), `EventCategory` (WORK, PERSONAL, ACADEMIC, HEALTH), `MilestoneStatus` (NOT_STARTED, IN_PROGRESS, COMPLETED), and `HabitFrequency` (DAILY, WEEKLY).
   - Date formats: Specified using standard PostgreSQL `DateTime` mapping.
   - Snapshot uniqueness: Add a composite unique constraint `@@unique([userId, date])` in `AnalyticsSnapshot` to guarantee that only one analytics summary is generated per user per day.

---

## 3. Caveats
- **Read-Only Scoping**: No packages have been installed and no configurations have been written to the workspace root directory, as this is a read-only investigation.
- **Environment Prerequisites**: We assume a PostgreSQL server is running and accessible. The implementer must define a valid `DATABASE_URL` in the `.env` file prior to executing the database push command.
- **Node Version**: The commands and packages assume a Node.js version of 18.x or 20.x is installed on the host system.

---

## 4. Conclusion
We have compiled the proposed files and commands required for Milestone 1.1. They are stored inside this agent's folder and detailed below for direct execution by the implementer.

### Proposed Files Index
- **Package Config**: `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_1_1\proposed_package.json`
- **Prisma Schema**: `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_1_1\proposed_schema.prisma`
- **Tailwind Config**: `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_1_1\proposed_tailwind_config.ts`
- **TS Config**: `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_1_1\proposed_tsconfig.json`
- **Next Config**: `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_1_1\proposed_next_config.mjs`
- **PostCSS Config**: `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_1_1\proposed_postcss_config.js`
- **Prisma Client Utility**: `C:\Users\gupta_ikq631n\teamwork_projects\lifeos\.agents\teamwork_preview_explorer_m1_1_1\proposed_prisma.ts`

### Recommended Initialization Commands
To set up the project, the implementer should execute the following sequence of commands in the project root (`C:\Users\gupta_ikq631n\teamwork_projects\lifeos`):

1. **Initialize Project Files**:
   Copy the proposed configuration files from the explorer agent folder to the root:
   ```powershell
   copy .agents\teamwork_preview_explorer_m1_1_1\proposed_package.json package.json
   copy .agents\teamwork_preview_explorer_m1_1_1\proposed_tsconfig.json tsconfig.json
   copy .agents\teamwork_preview_explorer_m1_1_1\proposed_tailwind_config.ts tailwind.config.ts
   copy .agents\teamwork_preview_explorer_m1_1_1\proposed_next_config.mjs next.config.mjs
   copy .agents\teamwork_preview_explorer_m1_1_1\proposed_postcss_config.js postcss.config.js
   ```
2. **Install Dependencies**:
   Run standard package installations:
   ```powershell
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the root containing:
   ```env
   DATABASE_URL="postgresql://<username>:<password>@localhost:5432/lifeos?schema=public"
   NEXTAUTH_SECRET="some_highly_secure_nextauth_secret_key"
   NEXTAUTH_URL="http://localhost:3000"
   ```
4. **Setup Prisma Folders & Files**:
   Create the `prisma` directory and copy the proposed schema:
   ```powershell
   mkdir prisma
   copy .agents\teamwork_preview_explorer_m1_1_1\proposed_schema.prisma prisma\schema.prisma
   ```
5. **Generate Prisma Client**:
   Generate the TS types for the client:
   ```powershell
   npx prisma generate
   ```
6. **Push Schema to PostgreSQL Database**:
   Push the designed tables and relationships to the database:
   ```powershell
   npx prisma db push
   ```
7. **Write Prisma Client Utility File**:
   Create the library folder and place the prisma client configuration inside:
   ```powershell
   mkdir src\lib -Force
   copy .agents\teamwork_preview_explorer_m1_1_1\proposed_prisma.ts src\lib\prisma.ts
   ```

---

## 5. Verification Method
To verify that this configuration and schema are correct:
1. **Lint and Type Check**: Run `npx tsc --noEmit` and `npm run lint` (once initialized) to check for typescript errors.
2. **Prisma Validation Check**: Execute `npx prisma validate` from the root directory to verify that the schema file syntax is perfectly valid.
3. **Database Inspection**:
   - Access the PostgreSQL database via a client tool (e.g. pgAdmin or CLI) and run `\dt` to list all tables.
   - Verify all 10 tables are present: `User`, `Task`, `Event`, `Goal`, `Milestone`, `Habit`, `HabitLog`, `FocusSession`, `AnalyticsSnapshot`, and `ScheduleSuggestion`.
   - Verify unique indices, enums, and foreign keys match the schema requirements.
4. **Prisma Client Generation**: Run `npx prisma generate` and verify that the client generates without errors.
