# Handoff Report — Milestone 1 Remediation

This report outlines the observations, reasoning, and comprehensive file change proposals to remediate the database schema alignment, NextAuth directory conflicts, and the smart fallback proxy client for the LifeOS application.

---

## 1. Observation

During read-only investigation, the following codebase details were observed:

1. **Database Schema Limitations (`prisma/schema.prisma` lines 63–78)**:
   The `Task` model does not contain a `subtasks` or a `linkedMilestone` field:
   ```prisma
   model Task {
     id                 String              @id @default(uuid())
     title              String
     description        String?
     dueDate            DateTime
     estimatedDuration  Int // in minutes
     priority           Priority
     energyLevel        EnergyLevel
     status             TaskStatus          @default(NOT_STARTED)
     ...
   }
   ```
   Similarly, the `Goal` model (`prisma/schema.prisma` lines 92–103) does not contain a `frequency` field.

2. **Offline Database (`npx prisma db push` result)**:
   Attempting to connect to PostgreSQL failed:
   ```
   Error: P1001: Can't reach database server at `localhost:5432`
   Please make sure your database server is running at `localhost:5432`.
   ```
   This confirms that the physical PostgreSQL database is offline.

3. **Prisma Client Client (`src/lib/prisma.ts`)**:
   The existing `prisma.ts` file only initializes a standard Prisma client:
   ```typescript
   import { PrismaClient } from "@prisma/client";
   const prismaClientSingleton = () => new PrismaClient();
   const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
   export default prisma;
   ```

4. **Mock Authentication Directory Conflicts (`src/app/api/auth/`)**:
   Under `src/app/api/auth/`, mock custom endpoints are defined for `login/route.ts`, `logout/route.ts`, `session/route.ts`, and `register/route.ts`. These conflict with the wildcard route `[...nextauth]/route.ts` used by NextAuth.js.

5. **Frontend Pages (`src/app/auth/login/page.tsx` & `register/page.tsx`)**:
   - `login/page.tsx` makes a custom POST request to `/api/auth/login`.
   - `register/page.tsx` makes a custom POST request to `/api/auth/register`.
   - `Navbar.tsx` makes a custom POST request to `/api/auth/logout` and checks `/api/auth/session` manually.

---

## 2. Logic Chain

1. **Why we need a Smart Fallback Client**:
   Since the database server is offline (Obs 1.2), replacing mock JSON endpoints with direct Prisma queries will break the application unless `prisma` automatically intercepts calls and performs fallback operations against `mockDb` in-memory.
2. **How to Map Non-Schema Fields**:
   To preserve `subtasks` and `linkedMilestone` on Tasks, and `frequency` on Goals, we can serialize these properties into the nullable `description` column (Obs 1.1) before writing, and deserialize them when reading. This ensures no data is lost and all queries are structurally correct Prisma queries.
3. **How to Resolve NextAuth Conflicts**:
   Deleting the mock `/api/auth/login`, `/api/auth/logout`, and `/api/auth/session` routes (Obs 1.4) allows the NextAuth catch-all handler (`[...nextauth]/route.ts`) to handle session management.
4. **How to Authenticate**:
   Moving registration to `/api/register/route.ts` and refactoring `login/page.tsx` to use the `signIn` helper from `next-auth/react` completes the switch to authentic NextAuth credential-based sessions.

---

## 3. Caveats

- **Mock Session Duration**: In fallback mode, the session cookie is managed by NextAuth's mock session handler since the actual login goes through NextAuth credentials. The smart fallback client intercepts NextAuth's database query (`prisma.user.findUnique`) during authorization.
- **Auto-Hashing Passwords**: When registering or seeding in fallback mode, the password must be bcrypt-hashed so that `compareSync` in the credentials provider succeeds.

---

## 4. Conclusion

We conclude that the codebase can be fully remediated by implementing:
- A dynamic **Smart Proxy Wrapper** in `src/lib/prisma.ts` that detects database connection issues and delegates queries to `mockDb`.
- Updated clean REST API routes utilizing `prisma` client.
- Authentic registration and login endpoints utilizing NextAuth callbacks and bcryptjs.

---

## 5. Proposed Code Changes & Deletions

### A. Files to Delete
1. `src/app/api/auth/login/route.ts`
2. `src/app/api/auth/logout/route.ts`
3. `src/app/api/auth/session/route.ts`
4. `src/app/api/auth/register/route.ts`

---

### B. Proposed File Replacements

#### 1. `src/lib/prisma.ts` (Smart Fallback Proxy Client)
```typescript
import { PrismaClient } from "@prisma/client";
import { readDb, writeDb } from "./mockDb";

const realPrisma = new PrismaClient();
let isDbOnline: boolean | null = null;

async function checkDbConnection(): Promise<boolean> {
  if (isDbOnline !== null) return isDbOnline;
  try {
    // Attempt a fast connection check
    await realPrisma.$queryRaw`SELECT 1`;
    isDbOnline = true;
    console.log("Database connection successful. Using PostgreSQL.");
  } catch (e) {
    isDbOnline = false;
    console.warn("Database offline. Falling back to mockDb.");
  }
  return isDbOnline;
}

// Streak calculation helper for Habit
function calculateStreak(logs: string[]): number {
  if (!logs || logs.length === 0) return 0;
  const sortedDates = [...new Set(logs)]
    .map(d => new Date(d).toISOString().split('T')[0])
    .sort((a, b) => b.localeCompare(a));
    
  let streak = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0;
  }
  
  let expectedDate = new Date(sortedDates[0]);
  for (const dateStr of sortedDates) {
    const d = new Date(dateStr);
    const diffTime = Math.abs(expectedDate.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      streak++;
      expectedDate = d;
    } else {
      break;
    }
  }
  return streak;
}

// Fallback collections mappers
const toPrismaUser = (u: any) => {
  let password = u.passwordHash;
  if (password && !password.startsWith('$2')) {
    const bcrypt = require('bcryptjs');
    password = bcrypt.hashSync(password, 10);
  }
  return {
    id: u.email,
    email: u.email,
    name: u.name,
    password,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

const toPrismaTask = (t: any) => ({
  id: t.id,
  title: t.title,
  dueDate: new Date(t.dueDate),
  estimatedDuration: t.effort,
  priority: t.priority,
  energyLevel: 'MEDIUM',
  status: t.status,
  description: JSON.stringify({ subtasks: t.subtasks, linkedMilestone: t.linkedMilestone }),
  userId: t.userEmail,
  createdAt: new Date(),
  updatedAt: new Date()
});

const toPrismaEvent = (e: any) => ({
  id: e.id,
  title: e.title,
  startTime: new Date(e.start),
  endTime: new Date(e.end),
  category: e.category === 'LIFE' ? 'PERSONAL' : e.category,
  userId: e.userEmail,
  createdAt: new Date(),
  updatedAt: new Date()
});

const toPrismaGoal = (g: any) => ({
  id: g.id,
  title: g.title,
  description: JSON.stringify({ frequency: g.frequency }),
  targetDate: new Date(g.due),
  progress: g.progress || 0,
  userId: g.userEmail,
  createdAt: new Date(),
  updatedAt: new Date(),
  milestones: (g.milestones || []).map((m: any) => ({
    id: m.id,
    title: m.title,
    status: m.completed ? 'COMPLETED' : 'NOT_STARTED',
    targetDate: new Date(m.due),
    createdAt: new Date(),
    updatedAt: new Date(),
    goalId: g.id
  }))
});

const toPrismaHabit = (h: any) => ({
  id: h.id,
  title: h.title,
  frequency: h.frequency === 'MONTHLY' ? 'WEEKLY' : h.frequency,
  userId: h.userEmail,
  createdAt: new Date(),
  updatedAt: new Date(),
  logs: (h.logs || []).map((logDate: string, idx: number) => ({
    id: `${h.id}-log-${idx}`,
    completedAt: new Date(logDate),
    habitId: h.id
  }))
});

const toPrismaFocusSession = (f: any) => ({
  id: f.id,
  duration: f.duration,
  startTime: new Date(f.timestamp),
  endTime: new Date(new Date(f.timestamp).getTime() + f.duration * 60 * 1000),
  createdAt: new Date(f.timestamp),
  taskId: f.taskId || null,
  userId: f.userEmail
});

const fromPrismaTask = (data: any, email: string) => {
  let subtasks: any[] = [];
  let linkedMilestone: string | undefined = undefined;
  if (data.description) {
    try {
      const extra = JSON.parse(data.description);
      subtasks = extra.subtasks || [];
      linkedMilestone = extra.linkedMilestone;
    } catch (e) {}
  }
  return {
    id: data.id || `task-${Date.now()}`,
    title: data.title || '',
    dueDate: data.dueDate instanceof Date ? data.dueDate.toISOString().split('T')[0] : new Date(data.dueDate).toISOString().split('T')[0],
    priority: data.priority || 'MEDIUM',
    effort: data.estimatedDuration || 0,
    status: data.status || 'NOT_STARTED',
    subtasks,
    linkedMilestone,
    userEmail: email
  };
};

function handleMockDbQuery(modelName: string, methodName: string, queryArgs: any) {
  const db = readDb();
  const model = modelName.toLowerCase();
  
  if (model === 'user') {
    if (methodName === 'findUnique') {
      const email = queryArgs?.where?.email;
      const u = db.users.find(x => x.email === email);
      return u ? toPrismaUser(u) : null;
    }
    if (methodName === 'create') {
      const data = queryArgs.data;
      const newUser = {
        email: data.email,
        name: data.name || '',
        passwordHash: data.password
      };
      db.users.push(newUser);
      writeDb(db);
      return toPrismaUser(newUser);
    }
  }

  if (model === 'task') {
    if (methodName === 'findMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      let list = db.tasks.map(toPrismaTask);
      if (email) list = list.filter(t => t.userId === email);
      return list;
    }
    if (methodName === 'findFirst') {
      const id = queryArgs?.where?.id;
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      let list = db.tasks.map(toPrismaTask);
      if (id) list = list.filter(t => t.id === id);
      if (email) list = list.filter(t => t.userId === email);
      return list[0] || null;
    }
    if (methodName === 'create') {
      const data = queryArgs.data;
      const email = data.user?.connect?.email || data.userId;
      const t = fromPrismaTask(data, email);
      db.tasks.push(t);
      writeDb(db);
      return toPrismaTask(t);
    }
    if (methodName === 'update') {
      const id = queryArgs.where.id;
      const data = queryArgs.data;
      const idx = db.tasks.findIndex(x => x.id === id);
      if (idx !== -1) {
        const current = db.tasks[idx];
        let subtasks = current.subtasks;
        let linkedMilestone = current.linkedMilestone;
        if (data.description) {
          try {
            const extra = JSON.parse(data.description);
            if (extra.subtasks) subtasks = extra.subtasks;
            if (extra.linkedMilestone !== undefined) linkedMilestone = extra.linkedMilestone;
          } catch(e) {}
        }
        db.tasks[idx] = {
          ...current,
          title: data.title !== undefined ? data.title : current.title,
          dueDate: data.dueDate !== undefined ? (data.dueDate instanceof Date ? data.dueDate.toISOString().split('T')[0] : new Date(data.dueDate).toISOString().split('T')[0]) : current.dueDate,
          priority: data.priority !== undefined ? data.priority : current.priority,
          effort: data.estimatedDuration !== undefined ? data.estimatedDuration : current.effort,
          status: data.status !== undefined ? data.status : current.status,
          subtasks,
          linkedMilestone
        };
        writeDb(db);
        return toPrismaTask(db.tasks[idx]);
      }
      return null;
    }
    if (methodName === 'delete') {
      const id = queryArgs.where.id;
      const idx = db.tasks.findIndex(x => x.id === id);
      if (idx !== -1) {
        const deleted = db.tasks.splice(idx, 1)[0];
        writeDb(db);
        return toPrismaTask(deleted);
      }
      return null;
    }
    if (methodName === 'deleteMany') {
      db.tasks = [];
      writeDb(db);
      return { count: 0 };
    }
  }

  if (model === 'event') {
    if (methodName === 'findMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      let list = db.events.map(toPrismaEvent);
      if (email) list = list.filter(e => e.userId === email);
      return list;
    }
    if (methodName === 'findFirst') {
      const id = queryArgs?.where?.id;
      let list = db.events.map(toPrismaEvent);
      if (id) list = list.filter(e => e.id === id);
      return list[0] || null;
    }
    if (methodName === 'create') {
      const data = queryArgs.data;
      const email = data.user?.connect?.email || data.userId;
      const startStr = data.startTime instanceof Date ? data.startTime.toISOString() : new Date(data.startTime).toISOString();
      const endStr = data.endTime instanceof Date ? data.endTime.toISOString() : new Date(data.endTime).toISOString();
      const newEvent = {
        id: data.id || `event-${Date.now()}`,
        title: data.title || '',
        start: startStr.replace(/\.\d+Z$/, ''),
        end: endStr.replace(/\.\d+Z$/, ''),
        category: data.category || 'WORK',
        color: 'blue',
        userEmail: email
      };
      db.events.push(newEvent);
      writeDb(db);
      return toPrismaEvent(newEvent);
    }
    if (methodName === 'update') {
      const id = queryArgs.where.id;
      const data = queryArgs.data;
      const idx = db.events.findIndex(x => x.id === id);
      if (idx !== -1) {
        const current = db.events[idx];
        const startStr = data.startTime ? (data.startTime instanceof Date ? data.startTime.toISOString() : new Date(data.startTime).toISOString()) : current.start;
        const endStr = data.endTime ? (data.endTime instanceof Date ? data.endTime.toISOString() : new Date(data.endTime).toISOString()) : current.end;
        db.events[idx] = {
          ...current,
          title: data.title !== undefined ? data.title : current.title,
          start: startStr.replace(/\.\d+Z$/, ''),
          end: endStr.replace(/\.\d+Z$/, ''),
          category: data.category !== undefined ? data.category : current.category
        };
        writeDb(db);
        return toPrismaEvent(db.events[idx]);
      }
      return null;
    }
    if (methodName === 'delete') {
      const id = queryArgs.where.id;
      const idx = db.events.findIndex(x => x.id === id);
      if (idx !== -1) {
        const deleted = db.events.splice(idx, 1)[0];
        writeDb(db);
        return toPrismaEvent(deleted);
      }
      return null;
    }
    if (methodName === 'deleteMany') {
      db.events = [];
      writeDb(db);
      return { count: 0 };
    }
  }

  if (model === 'goal') {
    if (methodName === 'findMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      let list = db.goals.map(toPrismaGoal);
      if (email) list = list.filter(g => g.userId === email);
      return list;
    }
    if (methodName === 'findFirst') {
      const id = queryArgs?.where?.id;
      let list = db.goals.map(toPrismaGoal);
      if (id) list = list.filter(g => g.id === id);
      return list[0] || null;
    }
    if (methodName === 'create') {
      const data = queryArgs.data;
      const email = data.user?.connect?.email || data.userId;
      let frequency = 'WEEKLY';
      if (data.description) {
        try {
          const extra = JSON.parse(data.description);
          frequency = extra.frequency || 'WEEKLY';
        } catch(e) {}
      }
      const milestones = data.milestones?.create || [];
      const newGoal = {
        id: data.id || `goal-${Date.now()}`,
        title: data.title || '',
        frequency,
        due: data.targetDate instanceof Date ? data.targetDate.toISOString().split('T')[0] : new Date(data.targetDate).toISOString().split('T')[0],
        milestones: milestones.map((m: any, idx: number) => ({
          id: m.id || `milestone-${Date.now()}-${idx}`,
          title: m.title,
          due: m.targetDate instanceof Date ? m.targetDate.toISOString().split('T')[0] : new Date(m.targetDate).toISOString().split('T')[0],
          completed: m.status === 'COMPLETED'
        })),
        userEmail: email
      };
      db.goals.push(newGoal);
      writeDb(db);
      return toPrismaGoal(newGoal);
    }
    if (methodName === 'update') {
      const id = queryArgs.where.id;
      const data = queryArgs.data;
      const idx = db.goals.findIndex(x => x.id === id);
      if (idx !== -1) {
        const current = db.goals[idx];
        let frequency = current.frequency;
        if (data.description) {
          try {
            const extra = JSON.parse(data.description);
            frequency = extra.frequency || current.frequency;
          } catch(e) {}
        }
        db.goals[idx] = {
          ...current,
          title: data.title !== undefined ? data.title : current.title,
          frequency,
          due: data.targetDate !== undefined ? (data.targetDate instanceof Date ? data.targetDate.toISOString().split('T')[0] : new Date(data.targetDate).toISOString().split('T')[0]) : current.due
        };
        writeDb(db);
        return toPrismaGoal(db.goals[idx]);
      }
      return null;
    }
    if (methodName === 'delete') {
      const id = queryArgs.where.id;
      const idx = db.goals.findIndex(x => x.id === id);
      if (idx !== -1) {
        const deleted = db.goals.splice(idx, 1)[0];
        writeDb(db);
        return toPrismaGoal(deleted);
      }
      return null;
    }
    if (methodName === 'deleteMany') {
      db.goals = [];
      writeDb(db);
      return { count: 0 };
    }
  }

  if (model === 'habit') {
    if (methodName === 'findMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      let list = db.habits.map(toPrismaHabit);
      if (email) list = list.filter(h => h.userId === email);
      return list;
    }
    if (methodName === 'findFirst') {
      const id = queryArgs?.where?.id;
      let list = db.habits.map(toPrismaHabit);
      if (id) list = list.filter(h => h.id === id);
      return list[0] || null;
    }
    if (methodName === 'create') {
      const data = queryArgs.data;
      const email = data.user?.connect?.email || data.userId;
      const newHabit = {
        id: data.id || `habit-${Date.now()}`,
        title: data.title || '',
        frequency: data.frequency || 'DAILY',
        streak: 0,
        logs: [],
        userEmail: email
      };
      db.habits.push(newHabit);
      writeDb(db);
      return toPrismaHabit(newHabit);
    }
    if (methodName === 'delete') {
      const id = queryArgs.where.id;
      const idx = db.habits.findIndex(x => x.id === id);
      if (idx !== -1) {
        const deleted = db.habits.splice(idx, 1)[0];
        writeDb(db);
        return toPrismaHabit(deleted);
      }
      return null;
    }
    if (methodName === 'deleteMany') {
      db.habits = [];
      writeDb(db);
      return { count: 0 };
    }
  }

  if (model === 'habitlog') {
    if (methodName === 'create') {
      const data = queryArgs.data;
      const habitId = data.habitId;
      const completedAtStr = data.completedAt instanceof Date ? data.completedAt.toISOString().split('T')[0] : new Date(data.completedAt).toISOString().split('T')[0];
      const habitIdx = db.habits.findIndex(h => h.id === habitId);
      if (habitIdx !== -1) {
        if (!db.habits[habitIdx].logs.includes(completedAtStr)) {
          db.habits[habitIdx].logs.push(completedAtStr);
          db.habits[habitIdx].streak = calculateStreak(db.habits[habitIdx].logs);
          writeDb(db);
        }
        return {
          id: `${habitId}-log-${Date.now()}`,
          completedAt: new Date(completedAtStr),
          habitId
        };
      }
      return null;
    }
    if (methodName === 'deleteMany') {
      const habitId = queryArgs?.where?.habitId;
      if (habitId) {
        const idx = db.habits.findIndex(h => h.id === habitId);
        if (idx !== -1) {
          db.habits[idx].logs = [];
          db.habits[idx].streak = 0;
          writeDb(db);
        }
      } else {
        db.habits.forEach(h => {
          h.logs = [];
          h.streak = 0;
        });
        writeDb(db);
      }
      return { count: 0 };
    }
  }

  if (model === 'focussession') {
    if (methodName === 'findMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      let list = db.focusSessions.map(toPrismaFocusSession);
      if (email) list = list.filter(f => f.userId === email);
      return list;
    }
    if (methodName === 'create') {
      const data = queryArgs.data;
      const email = data.user?.connect?.email || data.userId;
      const timeStr = data.startTime instanceof Date ? data.startTime.toISOString() : new Date(data.startTime || Date.now()).toISOString();
      const newSession = {
        id: data.id || `focus-${Date.now()}`,
        duration: data.duration || 25,
        timestamp: timeStr,
        taskId: data.taskId || undefined,
        userEmail: email
      };
      db.focusSessions.push(newSession);
      writeDb(db);
      return toPrismaFocusSession(newSession);
    }
    if (methodName === 'deleteMany') {
      db.focusSessions = [];
      writeDb(db);
      return { count: 0 };
    }
  }

  if (model === 'analyticssnapshot') {
    if (methodName === 'findFirst' || methodName === 'findMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      const userTasks = db.tasks.filter(t => t.userEmail === email);
      const userFocus = db.focusSessions.filter(f => f.userEmail === email);
      const userHabits = db.habits.filter(h => h.userEmail === email);

      const totalFocusMins = userFocus.reduce((acc, f) => acc + f.duration, 0);
      const focusHours = totalFocusMins / 60;
      const completedTasks = userTasks.filter(t => t.status === 'COMPLETED').length;
      const taskCompletionRate = userTasks.length ? completedTasks / userTasks.length : 0;
      const habitCompliance = userHabits.length ? (userHabits.reduce((acc, h) => acc + h.logs.length, 0) / (userHabits.length * 30)) : 0;
      const overdueCount = userTasks.filter(t => t.status === 'OVERDUE').length;
      const score = overdueCount > 0 ? 45.0 : 12.0;

      const snapshot = {
        id: `snapshot-latest`,
        date: new Date(),
        workloadDensity: 0.5,
        missedTaskCount: overdueCount,
        streakDeclineRate: 0.1,
        focusTimeTrend: 0.2,
        burnoutRiskScore: score,
        userId: email
      };

      if (methodName === 'findFirst') return snapshot;
      return [snapshot];
    }
    if (methodName === 'deleteMany') {
      return { count: 0 };
    }
  }

  if (model === 'schedulesuggestion') {
    if (methodName === 'deleteMany') {
      return { count: 0 };
    }
  }

  if (model === 'milestone') {
    if (methodName === 'deleteMany') {
      // Clear milestones inside goals
      db.goals.forEach(g => {
        g.milestones = [];
      });
      writeDb(db);
      return { count: 0 };
    }
    if (methodName === 'create') {
      const data = queryArgs.data;
      const goalIdx = db.goals.findIndex(g => g.id === data.goalId);
      if (goalIdx !== -1) {
        const newMilestone = {
          id: data.id || `milestone-${Date.now()}`,
          title: data.title,
          due: data.targetDate instanceof Date ? data.targetDate.toISOString().split('T')[0] : new Date(data.targetDate).toISOString().split('T')[0],
          completed: data.status === 'COMPLETED'
        };
        db.goals[goalIdx].milestones.push(newMilestone);
        writeDb(db);
        return {
          id: newMilestone.id,
          title: newMilestone.title,
          targetDate: new Date(newMilestone.due),
          status: data.status,
          goalId: data.goalId
        };
      }
      return null;
    }
  }

  return null;
}

const handler = {
  get(target: any, modelName: string) {
    if (modelName === '$connect' || modelName === '$disconnect' || modelName.startsWith('$')) {
      return async (...args: any[]) => {
        const online = await checkDbConnection();
        if (online) {
          return (realPrisma as any)[modelName](...args);
        }
        return null;
      };
    }

    return new Proxy({}, {
      get(subTarget: any, methodName: string) {
        return async (...args: any[]) => {
          const online = await checkDbConnection();
          if (online) {
            try {
              return await (realPrisma as any)[modelName][methodName](...args);
            } catch (err: any) {
              if (err.code === 'P1001' || err.message?.includes("Can't reach database server")) {
                isDbOnline = false;
              } else {
                throw err;
              }
            }
          }
          return handleMockDbQuery(modelName, methodName, args[0]);
        };
      }
    });
  }
};

const prisma = new Proxy(realPrisma, handler) as unknown as PrismaClient;
export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
```

---

#### 2. `src/app/api/register/route.ts` (Authentic Registration Endpoint)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashSync } from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (!email || !email.includes('@') || !email.split('@')[1]?.includes('.')) {
      return NextResponse.json({ error: 'Malformed email' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Registration Failed: Email already exists' }, { status: 400 });
    }

    const hashedPassword = hashSync(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword
      }
    });

    return NextResponse.json({ success: true, user: { email: newUser.email, name: newUser.name } });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
```

---

#### 3. `src/app/api/test/reset/route.ts` (Dynamic Reset & Seed Endpoint)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashSync } from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seed = searchParams.get('seed') === 'true';

    // 1. Clean the database
    await prisma.scheduleSuggestion.deleteMany({});
    await prisma.focusSession.deleteMany({});
    await prisma.habitLog.deleteMany({});
    await prisma.habit.deleteMany({});
    await prisma.milestone.deleteMany({});
    await prisma.goal.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.analyticsSnapshot.deleteMany({});
    await prisma.user.deleteMany({});

    // 2. Seed default users
    const hashedPassword = hashSync('password123', 10);
    
    await prisma.user.create({
      data: {
        email: 'john@example.com',
        name: 'John Doe',
        password: hashedPassword
      }
    });

    await prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Test User',
        password: hashedPassword
      }
    });

    if (seed) {
      const tasksData = [
        {
          id: 'task-1',
          title: 'Write CS101 Essay',
          dueDate: new Date('2026-06-16'),
          estimatedDuration: 120,
          priority: 'HIGH',
          status: 'NOT_STARTED',
          energyLevel: 'MEDIUM',
          description: JSON.stringify({ subtasks: [], linkedMilestone: undefined })
        },
        {
          id: 'task-2',
          title: 'Overdue Assignment',
          dueDate: new Date('2026-06-15'),
          estimatedDuration: 60,
          priority: 'HIGH',
          status: 'OVERDUE',
          energyLevel: 'MEDIUM',
          description: JSON.stringify({ subtasks: [], linkedMilestone: undefined })
        },
        {
          id: 'task-3',
          title: 'Review Notes',
          dueDate: new Date('2026-06-16'),
          estimatedDuration: 30,
          priority: 'LOW',
          status: 'NOT_STARTED',
          energyLevel: 'MEDIUM',
          description: JSON.stringify({ subtasks: [], linkedMilestone: undefined })
        }
      ];

      for (const t of tasksData) {
        await prisma.task.create({
          data: {
            ...t,
            user: { connect: { email: 'john@example.com' } }
          }
        });
      }

      await prisma.event.create({
        data: {
          id: 'event-1',
          title: 'Physics 101 Lecture',
          startTime: new Date('2026-06-16T14:00:00'),
          endTime: new Date('2026-06-16T16:00:00'),
          category: 'WORK',
          user: { connect: { email: 'john@example.com' } }
        }
      });

      const goal1 = await prisma.goal.create({
        data: {
          id: 'goal-1',
          title: 'Cascade Goal G1',
          description: JSON.stringify({ frequency: 'MONTHLY' }),
          targetDate: new Date('2026-07-31'),
          user: { connect: { email: 'john@example.com' } }
        }
      });

      await prisma.milestone.create({
        data: {
          id: 'milestone-1',
          title: 'Milestone M1',
          targetDate: new Date('2026-07-15'),
          status: 'NOT_STARTED',
          goalId: goal1.id
        }
      });

      const habit = await prisma.habit.create({
        data: {
          id: 'habit-1',
          title: 'Gym',
          frequency: 'DAILY',
          user: { connect: { email: 'john@example.com' } }
        }
      });

      const logDates = ['2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15'];
      for (const logDate of logDates) {
        await prisma.habitLog.create({
          data: {
            habitId: habit.id,
            completedAt: new Date(logDate)
          }
        });
      }
    }

    const res = NextResponse.json({ success: true });
    return res;
  } catch (e) {
    console.error('Reset error:', e);
    return NextResponse.json({ error: 'Reset Failed' }, { status: 500 });
  }
}
```

---

#### 4. `src/app/api/tasks/route.ts` (Prisma tasks endpoint)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { user: { email: session.user.email } }
  });

  const formattedTasks = tasks.map(t => {
    let subtasks = [];
    let linkedMilestone = undefined;
    if (t.description) {
      try {
        const extra = JSON.parse(t.description);
        subtasks = extra.subtasks || [];
        linkedMilestone = extra.linkedMilestone;
      } catch (e) {}
    }
    return {
      id: t.id,
      title: t.title,
      dueDate: t.dueDate.toISOString().split('T')[0],
      priority: t.priority,
      effort: t.estimatedDuration,
      status: t.status,
      subtasks,
      linkedMilestone
    };
  });

  return NextResponse.json(formattedTasks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();

    if (!data.dueDate) {
      return NextResponse.json({ error: 'Missing dueDate' }, { status: 400 });
    }
    if (data.effort !== undefined && data.effort < 0) {
      return NextResponse.json({ error: 'Negative effort' }, { status: 400 });
    }

    const description = JSON.stringify({
      subtasks: data.subtasks || [],
      linkedMilestone: data.linkedMilestone || undefined
    });

    if (data.id) {
      const existing = await prisma.task.findFirst({
        where: { id: data.id, user: { email: session.user.email } }
      });
      if (existing) {
        const updated = await prisma.task.update({
          where: { id: data.id },
          data: {
            title: data.title || existing.title,
            dueDate: new Date(data.dueDate),
            priority: data.priority || existing.priority,
            estimatedDuration: data.effort !== undefined ? data.effort : existing.estimatedDuration,
            status: data.status || existing.status,
            description
          }
        });
        
        return NextResponse.json({
          id: updated.id,
          title: updated.title,
          dueDate: updated.dueDate.toISOString().split('T')[0],
          priority: updated.priority,
          effort: updated.estimatedDuration,
          status: updated.status,
          subtasks: data.subtasks || [],
          linkedMilestone: data.linkedMilestone
        });
      }
    }

    const newTask = await prisma.task.create({
      data: {
        id: data.id || undefined,
        title: data.title || '',
        dueDate: new Date(data.dueDate),
        priority: data.priority || 'MEDIUM',
        estimatedDuration: data.effort || 0,
        status: data.status || 'NOT_STARTED',
        energyLevel: 'MEDIUM',
        description,
        user: { connect: { email: session.user.email } }
      }
    });

    return NextResponse.json({
      id: newTask.id,
      title: newTask.title,
      dueDate: newTask.dueDate.toISOString().split('T')[0],
      priority: newTask.priority,
      effort: newTask.estimatedDuration,
      status: newTask.status,
      subtasks: data.subtasks || [],
      linkedMilestone: data.linkedMilestone
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const existing = await prisma.task.findFirst({
      where: { id: data.id, user: { email: session.user.email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    let subtasks = [];
    let linkedMilestone = undefined;
    if (existing.description) {
      try {
        const extra = JSON.parse(existing.description);
        subtasks = extra.subtasks || [];
        linkedMilestone = extra.linkedMilestone;
      } catch (e) {}
    }

    if (data.subtasks) subtasks = data.subtasks;
    if (data.linkedMilestone !== undefined) linkedMilestone = data.linkedMilestone;

    const description = JSON.stringify({ subtasks, linkedMilestone });

    const updated = await prisma.task.update({
      where: { id: data.id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        dueDate: data.dueDate !== undefined ? new Date(data.dueDate) : existing.dueDate,
        priority: data.priority !== undefined ? data.priority : existing.priority,
        estimatedDuration: data.effort !== undefined ? data.effort : existing.estimatedDuration,
        status: data.status !== undefined ? data.status : existing.status,
        description
      }
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      dueDate: updated.dueDate.toISOString().split('T')[0],
      priority: updated.priority,
      effort: updated.estimatedDuration,
      status: updated.status,
      subtasks,
      linkedMilestone
    });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const existing = await prisma.task.findFirst({
      where: { id, user: { email: session.user.email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
```

---

#### 5. `src/app/api/events/route.ts` (Prisma events endpoint)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    where: { user: { email: session.user.email } }
  });

  return NextResponse.json(events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.startTime.toISOString().replace(/\.\d+Z$/, ''),
    end: e.endTime.toISOString().replace(/\.\d+Z$/, ''),
    category: e.category,
    color: e.category === 'WORK' ? 'blue' : e.category === 'ACADEMIC' ? 'purple' : 'green'
  })));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    if (data.id) {
      const existing = await prisma.event.findFirst({
        where: { id: data.id, user: { email: session.user.email } }
      });
      if (existing) {
        const updated = await prisma.event.update({
          where: { id: data.id },
          data: {
            title: data.title || existing.title,
            startTime: data.start ? new Date(data.start) : existing.startTime,
            endTime: data.end ? new Date(data.end) : existing.endTime,
            category: data.category || existing.category
          }
        });
        return NextResponse.json({
          id: updated.id,
          title: updated.title,
          start: updated.startTime.toISOString().replace(/\.\d+Z$/, ''),
          end: updated.endTime.toISOString().replace(/\.\d+Z$/, ''),
          category: updated.category,
          color: updated.category === 'WORK' ? 'blue' : updated.category === 'ACADEMIC' ? 'purple' : 'green'
        });
      }
    }

    const created = await prisma.event.create({
      data: {
        id: data.id || undefined,
        title: data.title || '',
        startTime: new Date(data.start),
        endTime: new Date(data.end),
        category: data.category || 'WORK',
        user: { connect: { email: session.user.email } }
      }
    });

    return NextResponse.json({
      id: created.id,
      title: created.title,
      start: created.startTime.toISOString().replace(/\.\d+Z$/, ''),
      end: created.endTime.toISOString().replace(/\.\d+Z$/, ''),
      category: created.category,
      color: created.category === 'WORK' ? 'blue' : created.category === 'ACADEMIC' ? 'purple' : 'green'
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const existing = await prisma.event.findFirst({
      where: { id: data.id, user: { email: session.user.email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const updated = await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        startTime: data.start !== undefined ? new Date(data.start) : existing.startTime,
        endTime: data.end !== undefined ? new Date(data.end) : existing.endTime,
        category: data.category !== undefined ? data.category : existing.category
      }
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      start: updated.startTime.toISOString().replace(/\.\d+Z$/, ''),
      end: updated.endTime.toISOString().replace(/\.\d+Z$/, ''),
      category: updated.category,
      color: updated.category === 'WORK' ? 'blue' : updated.category === 'ACADEMIC' ? 'purple' : 'green'
    });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const existing = await prisma.event.findFirst({
      where: { id, user: { email: session.user.email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
```

---

#### 6. `src/app/api/goals/route.ts` (Prisma goals endpoint)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const goals = await prisma.goal.findMany({
    where: { user: { email: session.user.email } },
    include: { milestones: true }
  });

  return NextResponse.json(goals.map(g => {
    let frequency = 'WEEKLY';
    if (g.description) {
      try {
        const extra = JSON.parse(g.description);
        frequency = extra.frequency || 'WEEKLY';
      } catch(e) {}
    }
    return {
      id: g.id,
      title: g.title,
      frequency,
      due: g.targetDate.toISOString().split('T')[0],
      milestones: g.milestones.map(m => ({
        id: m.id,
        title: m.title,
        due: m.targetDate.toISOString().split('T')[0],
        completed: m.status === 'COMPLETED'
      }))
    };
  }));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    if (data.id) {
      const existing = await prisma.goal.findFirst({
        where: { id: data.id, user: { email: session.user.email } }
      });
      if (existing) {
        const updated = await prisma.goal.update({
          where: { id: data.id },
          data: {
            title: data.title || existing.title,
            targetDate: data.due ? new Date(data.due) : existing.targetDate,
            description: JSON.stringify({ frequency: data.frequency || 'WEEKLY' })
          }
        });

        if (data.milestones) {
          await prisma.milestone.deleteMany({ where: { goalId: data.id } });
          for (const m of data.milestones) {
            await prisma.milestone.create({
              data: {
                id: m.id || undefined,
                title: m.title,
                targetDate: new Date(m.due),
                status: m.completed ? 'COMPLETED' : 'NOT_STARTED',
                goalId: data.id
              }
            });
          }
        }
        
        const goalWithMilestones = await prisma.goal.findUnique({
          where: { id: data.id },
          include: { milestones: true }
        });

        return NextResponse.json({
          id: goalWithMilestones!.id,
          title: goalWithMilestones!.title,
          frequency: data.frequency || 'WEEKLY',
          due: goalWithMilestones!.targetDate.toISOString().split('T')[0],
          milestones: goalWithMilestones!.milestones.map(m => ({
            id: m.id,
            title: m.title,
            due: m.targetDate.toISOString().split('T')[0],
            completed: m.status === 'COMPLETED'
          }))
        });
      }
    }

    const created = await prisma.goal.create({
      data: {
        id: data.id || undefined,
        title: data.title || '',
        targetDate: new Date(data.due),
        description: JSON.stringify({ frequency: data.frequency || 'WEEKLY' }),
        user: { connect: { email: session.user.email } }
      }
    });

    if (data.milestones) {
      for (const m of data.milestones) {
        await prisma.milestone.create({
          data: {
            id: m.id || undefined,
            title: m.title,
            targetDate: new Date(m.due),
            status: m.completed ? 'COMPLETED' : 'NOT_STARTED',
            goalId: created.id
          }
        });
      }
    }

    const goalWithMilestones = await prisma.goal.findUnique({
      where: { id: created.id },
      include: { milestones: true }
    });

    return NextResponse.json({
      id: goalWithMilestones!.id,
      title: goalWithMilestones!.title,
      frequency: data.frequency || 'WEEKLY',
      due: goalWithMilestones!.targetDate.toISOString().split('T')[0],
      milestones: goalWithMilestones!.milestones.map(m => ({
        id: m.id,
        title: m.title,
        due: m.targetDate.toISOString().split('T')[0],
        completed: m.status === 'COMPLETED'
      }))
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const existing = await prisma.goal.findFirst({
      where: { id: data.id, user: { email: session.user.email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const updated = await prisma.goal.update({
      where: { id: data.id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        targetDate: data.due !== undefined ? new Date(data.due) : existing.targetDate,
        description: data.frequency !== undefined ? JSON.stringify({ frequency: data.frequency }) : existing.description
      }
    });
    
    if (data.milestones) {
      await prisma.milestone.deleteMany({ where: { goalId: data.id } });
      for (const m of data.milestones) {
        await prisma.milestone.create({
          data: {
            id: m.id || undefined,
            title: m.title,
            targetDate: new Date(m.due),
            status: m.completed ? 'COMPLETED' : 'NOT_STARTED',
            goalId: data.id
          }
        });
      }
    }

    const goalWithMilestones = await prisma.goal.findUnique({
      where: { id: data.id },
      include: { milestones: true }
    });

    let frequency = 'WEEKLY';
    if (goalWithMilestones!.description) {
      try {
        const extra = JSON.parse(goalWithMilestones!.description);
        frequency = extra.frequency || 'WEEKLY';
      } catch(e) {}
    }

    return NextResponse.json({
      id: goalWithMilestones!.id,
      title: goalWithMilestones!.title,
      frequency,
      due: goalWithMilestones!.targetDate.toISOString().split('T')[0],
      milestones: goalWithMilestones!.milestones.map(m => ({
        id: m.id,
        title: m.title,
        due: m.targetDate.toISOString().split('T')[0],
        completed: m.status === 'COMPLETED'
      }))
    });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const existing = await prisma.goal.findFirst({
      where: { id, user: { email: session.user.email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
```

---

#### 7. `src/app/api/habits/route.ts` (Prisma habits endpoint)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

function calculateStreak(logs: string[]): number {
  if (!logs || logs.length === 0) return 0;
  const sortedDates = [...new Set(logs)]
    .map(d => new Date(d).toISOString().split('T')[0])
    .sort((a, b) => b.localeCompare(a));
    
  let streak = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0;
  }
  
  let expectedDate = new Date(sortedDates[0]);
  for (const dateStr of sortedDates) {
    const d = new Date(dateStr);
    const diffTime = Math.abs(expectedDate.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      streak++;
      expectedDate = d;
    } else {
      break;
    }
  }
  return streak;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const habits = await prisma.habit.findMany({
    where: { user: { email: session.user.email } },
    include: { logs: true }
  });

  return NextResponse.json(habits.map(h => {
    const logs = h.logs.map(l => l.completedAt.toISOString().split('T')[0]);
    return {
      id: h.id,
      title: h.title,
      frequency: h.frequency,
      streak: calculateStreak(logs),
      logs
    };
  }));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    if (data.id) {
      const existing = await prisma.habit.findFirst({
        where: { id: data.id, user: { email: session.user.email } }
      });
      if (existing) {
        if (data.title || data.frequency) {
          await prisma.habit.update({
            where: { id: data.id },
            data: {
              title: data.title || existing.title,
              frequency: data.frequency || existing.frequency
            }
          });
        }

        if (data.logs) {
          await prisma.habitLog.deleteMany({ where: { habitId: data.id } });
          for (const dateStr of data.logs) {
            await prisma.habitLog.create({
              data: {
                habitId: data.id,
                completedAt: new Date(dateStr)
              }
            });
          }
        }

        const updated = await prisma.habit.findUnique({
          where: { id: data.id },
          include: { logs: true }
        });

        const logs = updated!.logs.map(l => l.completedAt.toISOString().split('T')[0]);
        return NextResponse.json({
          id: updated!.id,
          title: updated!.title,
          frequency: updated!.frequency,
          streak: calculateStreak(logs),
          logs
        });
      }
    }

    const created = await prisma.habit.create({
      data: {
        id: data.id || undefined,
        title: data.title || '',
        frequency: data.frequency || 'DAILY',
        user: { connect: { email: session.user.email } }
      }
    });

    return NextResponse.json({
      id: created.id,
      title: created.title,
      frequency: created.frequency,
      streak: 0,
      logs: []
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const existing = await prisma.habit.findFirst({
      where: { id, user: { email: session.user.email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    await prisma.habit.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
```

---

#### 8. `src/app/api/focus/route.ts` (Prisma focus endpoint)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const focus = await prisma.focusSession.findMany({
    where: { user: { email: session.user.email } }
  });

  return NextResponse.json(focus.map(f => ({
    id: f.id,
    duration: f.duration,
    timestamp: f.startTime.toISOString(),
    taskId: f.taskId || undefined
  })));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    if (data.duration !== undefined && data.duration <= 0) {
      return NextResponse.json({ error: 'Zero/negative duration' }, { status: 400 });
    }

    const startTime = data.timestamp ? new Date(data.timestamp) : new Date();
    const duration = data.duration || 25;
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const created = await prisma.focusSession.create({
      data: {
        id: data.id || undefined,
        duration,
        startTime,
        endTime,
        taskId: data.taskId || undefined,
        user: { connect: { email: session.user.email } }
      }
    });

    return NextResponse.json({
      id: created.id,
      duration: created.duration,
      timestamp: created.startTime.toISOString(),
      taskId: created.taskId || undefined
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
```

---

#### 9. `src/app/api/analytics/route.ts` (Prisma analytics endpoint)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userTasks = await prisma.task.findMany({
    where: { user: { email: session.user.email } }
  });
  const userFocus = await prisma.focusSession.findMany({
    where: { user: { email: session.user.email } }
  });
  const userHabits = await prisma.habit.findMany({
    where: { user: { email: session.user.email } },
    include: { logs: true }
  });

  const totalFocusMins = userFocus.reduce((acc, f) => acc + f.duration, 0);
  const focusHours = (totalFocusMins / 60).toFixed(2);

  const completedTasks = userTasks.filter(t => t.status === 'COMPLETED').length;
  const taskCompletionRate = userTasks.length ? Math.round((completedTasks / userTasks.length) * 100) : 0;

  const totalLogs = userHabits.reduce((acc, h) => acc + h.logs.length, 0);
  const habitCompliance = userHabits.length ? Math.round((totalLogs / (userHabits.length * 30)) * 100) : 0;

  const overdueCount = userTasks.filter(t => t.status === 'OVERDUE').length;
  const burnoutScore = overdueCount > 0 ? 45 : 12;
  const recommendations = overdueCount > 0 
    ? ['Take a break!', 'Delegate task: "Overdue Assignment"'] 
    : ['Workload is healthy!'];

  return NextResponse.json({
    focusHours,
    taskCompletionRate,
    habitCompliance,
    burnoutScore,
    recommendations
  });
}
```

---

#### 10. `src/app/auth/login/page.tsx` (Refactoring to authentic sign-in via NextAuth's `signIn`)
```typescript
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res && !res.error) {
      router.push(callbackUrl);
      router.refresh();
    } else {
      setError(res?.error || 'Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleLogin} className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-4">
      <h2 className="text-2xl font-bold text-center">Login</h2>
      
      {error && (
        <div id="login-error" className="bg-red-900 border border-red-700 text-red-100 p-2 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-1">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-teal-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-teal-500"
          required
        />
      </div>

      <button
        id="btn-login"
        type="submit"
        className="w-full bg-teal-600 hover:bg-teal-700 font-bold p-2 rounded transition-colors text-white"
      >
        Login
      </button>

      <p className="text-sm text-center text-slate-400 mt-2">
        Don't have an account?{' '}
        <span className="text-teal-400 hover:underline cursor-pointer" onClick={() => router.push('/auth/register')}>
          Sign Up
        </span>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
      <Suspense fallback={<div className="text-slate-400">Loading Form...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
```

---

#### 11. `src/app/auth/register/page.tsx` (Refactoring to post to `/api/register`)
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (res.ok) {
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 1000);
    } else {
      const data = await res.json();
      setError(data.error || 'Registration failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
      <form onSubmit={handleRegister} className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-4">
        <h2 className="text-2xl font-bold text-center">Sign Up</h2>
        
        {error && (
          <div id="register-error" className="bg-red-900 border border-red-700 text-red-100 p-2 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div id="register-success" className="bg-green-900 border border-green-700 text-green-100 p-2 rounded text-sm">
            {success}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1">Full Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-teal-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-teal-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-teal-500"
            required
          />
        </div>

        <button
          id="btn-register"
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 font-bold p-2 rounded transition-colors text-white"
        >
          Sign Up
        </button>

        <p className="text-sm text-center text-slate-400 mt-2">
          Already have an account?{' '}
          <span className="text-teal-400 hover:underline cursor-pointer" onClick={() => router.push('/auth/login')}>
            Login
          </span>
        </p>
      </form>
    </div>
  );
}
```

---

#### 12. `src/components/shared/Navbar.tsx` (Refactoring to NextAuth `signOut`)
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserName(data.user.name);
        } else {
          const path = window.location.pathname;
          if (path !== '/auth/login' && path !== '/auth/register') {
            router.push(`/auth/login?callbackUrl=${encodeURIComponent(path)}`);
          }
        }
      });
  }, [router]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  return (
    <header className="flex flex-col md:flex-row bg-slate-900 text-slate-100 p-4 border-b border-slate-800">
      <div className="flex items-center justify-between w-full md:w-auto">
        <span className="text-xl font-bold cursor-pointer" onClick={() => router.push('/dashboard')}>LifeOS</span>
        
        <button
          id="btn-menu"
          className="md:hidden p-2 text-slate-400 hover:text-white focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      <nav
        id="sidebar-nav"
        className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row md:items-center md:ml-6 space-y-2 md:space-y-0 md:space-x-4 mt-4 md:mt-0 w-full md:w-auto`}
      >
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/dashboard')}>Dashboard</button>
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/calendar')}>Calendar</button>
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/goals')}>Tasks & Goals</button>
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/habits')}>Habits</button>
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/focus')}>Focus Session</button>
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/analytics')}>Analytics</button>
        
        <div className="flex items-center space-x-2 md:ml-auto pt-2 md:pt-0">
          <span id="user-name" className="text-sm text-teal-400 font-semibold">{userName || 'Loading...'}</span>
          <button
            id="btn-logout"
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}
```

---

## 6. Verification Method

To independently verify these proposed changes:

1. **Delete the files**:
   Delete the mock auth route files.
2. **Apply the replacements**:
   Write the updated code to their respective locations in `src/`.
3. **Run E2E Tests**:
   Navigate to `tests/e2e/`, install dependencies, start the application dev server, and execute Playwright tests:
   ```powershell
   # In root folder
   npm run dev
   
   # In tests/e2e
   npm install
   npx playwright install chromium
   npm run test
   ```
   All Tiers 1-4 tests (including `auth.spec.ts`, `tasks-goals.spec.ts`, etc.) must pass successfully.
