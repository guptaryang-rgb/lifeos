# Project: LifeOS

## Architecture
LifeOS is a full-stack Next.js 14+ application with App Router, Tailwind CSS for premium dark-mode glassmorphic UI, Prisma ORM for database access with PostgreSQL, and NextAuth.js for secure session management.

### Key Modules:
- **Authentication**: NextAuth.js credentials provider (email/password), session-protected app routes, and API endpoints.
- **Database (Prisma)**: Schema with Users, Tasks, Events, Goals, Milestones, Habits, HabitLogs, FocusSessions, Analytics snapshots, and Schedule suggestions.
- **Unified Dashboard**: Dark-mode glassmorphic UI displaying a Daily Briefing (combining tasks, calendar events, habits, and AI-generated summary) and quick-action widgets.
- **AI Planner & Calendar**: A time-blocking calendar engine with week/day/month views, drag-and-drop, conflict detection, and an AI Planner heuristic that auto-schedules tasks and suggests replanning when tasks are missed.
- **Assignment & Goal System**: Ingest and track assignments (with subtasks/progress percentage), and link them to short/medium/long-term goals with auto-updating milestone progress.
- **Habits & Analytics**: Streaks, visual heat map, and charts tracking focus time, task completion, and habit adherence.
- **Behavioral Intelligence**: Duration estimation based on history, procrastination detection, automatic priority recalculation, optimal time-slot suggestions, and burnout risk score (0-100) based on workload density.

---

## Code Layout
```
C:\Users\gupta_ikq631n\teamwork_projects\lifeos
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/                # Next.js App Router Pages
│   │   ├── api/            # API endpoints
│   │   ├── auth/           # NextAuth login/register views
│   │   ├── dashboard/      # Unified Dashboard
│   │   ├── calendar/       # Calendar and AI Planner UI
│   │   ├── tasks/          # Assignment tracker
│   │   ├── goals/          # Goal tracking
│   │   ├── habits/         # Habit dashboard
│   │   └── analytics/      # Burnout & Analytics charts
│   ├── components/         # React Components
│   │   ├── ui/             # Glassmorphic primitives (card, button, etc.)
│   │   └── shared/         # Navigation, layout wrappers
│   ├── lib/                # Utilities and Logic
│   │   ├── prisma.ts       # Database client
│   │   ├── auth.ts         # NextAuth configuration
│   │   ├── planner.ts      # AI planning heuristics & replanning
│   │   └── heuristics.ts   # Behavioral analytics & burnout logic
│   └── hooks/              # Custom hooks for state/fetching
├── tests/                  # Unit and E2E Tests
│   ├── e2e/                # Opaque-box E2E Tests (Tiers 1-4)
│   └── unit/               # Local logic and API route unit tests
└── package.json
```

---

## Interface Contracts
### AI Planner Helper (`src/lib/planner.ts`)
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

export function generateSuggestedSchedule(
  tasks: Task[],
  events: Event[],
  workStartHour: number, // e.g., 9
  workEndHour: number    // e.g., 22
): { suggestions: ScheduleSuggestion[]; conflicts: string[] };
```

### Behavioral Heuristics (`src/lib/heuristics.ts`)
```typescript
export function calculateBurnoutRisk(
  workloadDensity: number,  // scheduled focus hours / available hours
  missedTaskCount: number,
  streakDeclineRate: number, // relative decline in habits (0 to 1)
  focusTimeTrend: number     // relative change in focus hours (-1 to 1)
): { score: number; recommendations: string[] };

export function estimateTaskDuration(
  taskTitle: string,
  historicalTasks: { title: string; actualDuration: number }[]
): number;
```

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database, Seed & Auth | Setup PostgreSQL via Prisma, write 2+ week seed script, configure NextAuth | None | PLANNED |
| M2 | Backend API & Heuristics | Build REST CRUD routes and behavioral intelligence algorithms, verify with unit tests | M1 | PLANNED |
| M3 | Dashboard & Layout | Responsive dark-mode glassmorphic theme layout, daily briefing panel, widgets, login views | M1, M2 | PLANNED |
| M4 | Smart Calendar & AI Planner | Interactive calendar views, drag-and-drop, schedule auto-generation, replanning engine | M2, M3 | PLANNED |
| M5 | Tracker, Goals, Habits & Analytics | Task/goal system with milestone links, habit tracker heatmap, analytics charts, Pomodoro timer | M2, M3 | PLANNED |
| M6 | E2E Integration & Verification | Resolve all failures across Test Tiers 1-4, execute white-box adversarial hardening (Tier 5) | M4, M5 | PLANNED |
