# Scope: Database, Seed & Auth Setup

## Architecture
- **Framework**: Next.js 14+ App Router
- **Database**: SQLite (local development fallback) & PostgreSQL (production target backed up in `prisma/schema.prisma.backup`)
- **Authentication**: NextAuth.js credentials-based authentication (`src/lib/auth.ts` / `src/app/api/auth`)
- **Data Seeding**: Comprehensive seed script (`prisma/seed.ts`) populating 2+ weeks of activities.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1.1 | Dependencies & Prisma Schema Setup | Install dependencies, define Postgres Prisma schema, generate client, push to DB | None | DONE |
| M1.2 | Prisma Seed Script Setup | Write and execute `prisma/seed.ts` script for 2+ weeks of realistic data | M1.1 | DONE |
| M1.3 | NextAuth Configuration Setup | Configure NextAuth credentials provider, routes, session wrapper | M1.1 | DONE |

## Interface Contracts
### Database Schema Requirements
- **User**: id, email, password (hashed), name, createdAt, updatedAt, relations to other tables.
- **Task**: id, title, description, dueDate, estimatedDuration (mins), priority (LOW, MEDIUM, HIGH), energyLevel (LOW, MEDIUM, HIGH), status (NOT_STARTED, IN_PROGRESS, COMPLETED, OVERDUE), userId, user relation.
- **Event**: id, title, startTime, endTime, category (WORK, PERSONAL, ACADEMIC, HEALTH), userId, user relation.
- **Goal**: id, title, description, targetDate, progress (0-100), userId, user relation, milestones relation.
- **Milestone**: id, title, status (NOT_STARTED, IN_PROGRESS, COMPLETED), goalId, goal relation, targetDate.
- **Habit**: id, title, frequency (DAILY, WEEKLY), userId, user relation, logs relation.
- **HabitLog**: id, completedAt, habitId, habit relation.
- **FocusSession**: id, startTime, endTime, duration (mins), taskId, task relation (optional), userId, user relation.
- **AnalyticsSnapshot**: id, date, workloadDensity, missedTaskCount, streakDeclineRate, focusTimeTrend, burnoutRiskScore, userId, user relation.
- **ScheduleSuggestion**: id, taskId, task relation, startTime, endTime, userId, user relation.
