import { PrismaClient } from "@prisma/client";
import { readDb, writeDb } from "./mockDb";
import { calculateBurnoutRisk } from "./heuristics";
import bcrypt from 'bcryptjs';

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
  const sortedDates = Array.from(new Set(logs))
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
    password = bcrypt.hashSync(password, 10);
  }
  return {
    id: u.email,
    email: u.email,
    name: u.name,
    password,
    isPremium: u.isPremium || false,
    stripeCustomerId: u.stripeCustomerId || null,
    subscriptionId: u.subscriptionId || null,
    subscriptionEnd: u.subscriptionEnd ? new Date(u.subscriptionEnd) : null,
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
  endTime: e.end ? new Date(e.end) : new Date(new Date(e.start).getTime() + (e.duration || 0) * 60 * 1000),
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
  frequency: h.frequency,
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

const toPrismaFoodLog = (f: any) => ({
  id: f.id,
  foodName: f.foodName,
  calories: f.calories,
  protein: f.protein,
  carbs: f.carbs,
  fat: f.fat,
  fiber: f.fiber,
  meal: f.meal,
  servingCount: f.servingCount,
  date: f.date,
  userId: f.userEmail,
  createdAt: f.createdAt ? new Date(f.createdAt) : new Date()
});

const toPrismaWorkout = (w: any) => ({
  id: w.id,
  exerciseName: w.exerciseName,
  type: w.type,
  durationMinutes: w.durationMinutes,
  distance: w.distance || null,
  weight: w.weight || null,
  sets: w.sets || null,
  reps: w.reps || null,
  calories: w.calories,
  date: w.date,
  userId: w.userEmail,
  createdAt: w.createdAt ? new Date(w.createdAt) : new Date()
});

const toPrismaTransaction = (t: any) => ({
  id: t.id,
  title: t.title,
  amount: t.amount,
  category: t.category,
  type: t.type,
  date: t.date,
  userId: t.userEmail,
  createdAt: t.createdAt ? new Date(t.createdAt) : new Date()
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
        passwordHash: data.password,
        isPremium: data.isPremium || false,
        stripeCustomerId: data.stripeCustomerId || undefined,
        subscriptionId: data.subscriptionId || undefined,
      };
      db.users.push(newUser);
      writeDb(db);
      return toPrismaUser(newUser);
    }
    if (methodName === 'update') {
      const email = queryArgs?.where?.email;
      const data = queryArgs.data;
      const idx = db.users.findIndex(x => x.email === email);
      if (idx !== -1) {
        const current = db.users[idx];
        if (data.isPremium !== undefined) current.isPremium = data.isPremium;
        if (data.stripeCustomerId !== undefined) current.stripeCustomerId = data.stripeCustomerId || undefined;
        if (data.subscriptionId !== undefined) current.subscriptionId = data.subscriptionId || undefined;
        if (data.name !== undefined) current.name = data.name;
        // Store subscriptionEnd as ISO string in the mock db
        if (data.subscriptionEnd !== undefined) {
          (current as any).subscriptionEnd = data.subscriptionEnd ? (data.subscriptionEnd instanceof Date ? data.subscriptionEnd.toISOString() : new Date(data.subscriptionEnd).toISOString()) : null;
        }
        db.users[idx] = current;
        writeDb(db);
        return toPrismaUser(current);
      }
      return null;
    }
    if (methodName === 'deleteMany') {
      db.users = [];
      writeDb(db);
      return { count: 0 };
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
      let frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'WEEKLY';
      if (data.description) {
        try {
          const extra = JSON.parse(data.description);
          if (extra.frequency === 'DAILY' || extra.frequency === 'WEEKLY' || extra.frequency === 'MONTHLY') {
            frequency = extra.frequency;
          }
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
        let frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' = current.frequency;
        if (data.description) {
          try {
            const extra = JSON.parse(data.description);
            if (extra.frequency === 'DAILY' || extra.frequency === 'WEEKLY' || extra.frequency === 'MONTHLY') {
              frequency = extra.frequency;
            }
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

      // Heuristic calculations
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // workloadDensity
      const scheduledFocusHours = userTasks.filter(t => t.status !== 'COMPLETED').reduce((acc, t) => acc + (t.effort || 0), 0) / 60;
      const availableHours = 40.0;
      const workloadDensity = Math.min(scheduledFocusHours / availableHours, 1.0);

      // missedTaskCount
      const missedTaskCount = overdueCount;

      // streakDeclineRate
      let totalDecline = 0.0;
      let habitCount = 0;
      for (const habit of userHabits) {
        const recentLogs = (habit.logs || []).filter((logDate: string) => {
          const d = new Date(logDate);
          return d >= sevenDaysAgo && d <= now;
        }).length;
        
        const prevLogs = (habit.logs || []).filter((logDate: string) => {
          const d = new Date(logDate);
          return d >= fourteenDaysAgo && d < sevenDaysAgo;
        }).length;
        
        const decline = prevLogs > recentLogs ? (prevLogs - recentLogs) / prevLogs : 0.0;
        totalDecline += decline;
        habitCount++;
      }
      const streakDeclineRate = habitCount > 0 ? totalDecline / habitCount : 0.0;

      // focusTimeTrend
      const recentFocusMins = userFocus.filter(session => {
        const d = new Date(session.timestamp);
        return d >= sevenDaysAgo && d <= now;
      }).reduce((sum, s) => sum + s.duration, 0);

      const prevFocusMins = userFocus.filter(session => {
        const d = new Date(session.timestamp);
        return d >= fourteenDaysAgo && d < sevenDaysAgo;
      }).reduce((sum, s) => sum + s.duration, 0);

      let focusTimeTrend = 0.0;
      if (prevFocusMins > 0) {
        focusTimeTrend = (recentFocusMins - prevFocusMins) / prevFocusMins;
      } else if (recentFocusMins > 0) {
        focusTimeTrend = 1.0;
      }
      focusTimeTrend = Math.max(-1.0, Math.min(1.0, focusTimeTrend));

      const { score: burnoutRiskScore } = calculateBurnoutRisk(
        workloadDensity,
        missedTaskCount,
        streakDeclineRate,
        focusTimeTrend
      );

      const snapshot = {
        id: `snapshot-latest`,
        date: new Date(),
        workloadDensity,
        missedTaskCount,
        streakDeclineRate,
        focusTimeTrend,
        burnoutRiskScore,
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

  if (model === 'foodlog') {
    if (methodName === 'findMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      const date = queryArgs?.where?.date;
      let list = db.foodLogs.map(toPrismaFoodLog);
      if (email) list = list.filter(x => x.userId === email);
      if (date) list = list.filter(x => x.date === date);
      return list;
    }
    if (methodName === 'create') {
      const data = queryArgs.data;
      const email = data.user?.connect?.email || data.userId;
      const newFood = {
        id: data.id || `food-${Date.now()}`,
        foodName: data.foodName,
        calories: parseInt(data.calories) || 0,
        protein: parseFloat(data.protein) || 0,
        carbs: parseFloat(data.carbs) || 0,
        fat: parseFloat(data.fat) || 0,
        fiber: parseFloat(data.fiber) || 0,
        meal: data.meal || 'Snacks',
        servingCount: parseFloat(data.servingCount) || 1,
        date: data.date,
        userEmail: email,
        createdAt: new Date().toISOString()
      };
      db.foodLogs.push(newFood);
      writeDb(db);
      return toPrismaFoodLog(newFood);
    }
    if (methodName === 'delete') {
      const id = queryArgs.where.id;
      const idx = db.foodLogs.findIndex(x => x.id === id);
      if (idx !== -1) {
        const deleted = db.foodLogs.splice(idx, 1)[0];
        writeDb(db);
        return toPrismaFoodLog(deleted);
      }
      return null;
    }
    if (methodName === 'deleteMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      if (email) {
        db.foodLogs = db.foodLogs.filter(x => x.userEmail !== email);
      } else {
        db.foodLogs = [];
      }
      writeDb(db);
      return { count: 0 };
    }
  }

  if (model === 'workout') {
    if (methodName === 'findMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      const date = queryArgs?.where?.date;
      let list = db.workouts.map(toPrismaWorkout);
      if (email) list = list.filter(x => x.userId === email);
      if (date) list = list.filter(x => x.date === date);
      return list;
    }
    if (methodName === 'create') {
      const data = queryArgs.data;
      const email = data.user?.connect?.email || data.userId;
      const newWorkout = {
        id: data.id || `workout-${Date.now()}`,
        exerciseName: data.exerciseName,
        type: data.type || 'cardio',
        durationMinutes: parseInt(data.durationMinutes) || 0,
        distance: data.distance !== undefined && data.distance !== null ? parseFloat(data.distance) : null,
        weight: data.weight !== undefined && data.weight !== null ? parseInt(data.weight) : null,
        sets: data.sets !== undefined && data.sets !== null ? parseInt(data.sets) : null,
        reps: data.reps !== undefined && data.reps !== null ? parseInt(data.reps) : null,
        calories: parseInt(data.calories) || 0,
        date: data.date,
        userEmail: email,
        createdAt: new Date().toISOString()
      };
      db.workouts.push(newWorkout);
      writeDb(db);
      return toPrismaWorkout(newWorkout);
    }
    if (methodName === 'delete') {
      const id = queryArgs.where.id;
      const idx = db.workouts.findIndex(x => x.id === id);
      if (idx !== -1) {
        const deleted = db.workouts.splice(idx, 1)[0];
        writeDb(db);
        return toPrismaWorkout(deleted);
      }
      return null;
    }
    if (methodName === 'deleteMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      if (email) {
        db.workouts = db.workouts.filter(x => x.userEmail !== email);
      } else {
        db.workouts = [];
      }
      writeDb(db);
      return { count: 0 };
    }
  }

  if (model === 'transaction') {
    if (methodName === 'findMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      const date = queryArgs?.where?.date;
      let list = db.transactions.map(toPrismaTransaction);
      if (email) list = list.filter(x => x.userId === email);
      if (date) list = list.filter(x => x.date === date);
      return list;
    }
    if (methodName === 'create') {
      const data = queryArgs.data;
      const email = data.user?.connect?.email || data.userId;
      const newTx = {
        id: data.id || `tx-${Date.now()}`,
        title: data.title,
        amount: parseFloat(data.amount) || 0,
        category: data.category,
        type: data.type || 'expense',
        date: data.date,
        userEmail: email,
        createdAt: new Date().toISOString()
      };
      db.transactions.push(newTx);
      writeDb(db);
      return toPrismaTransaction(newTx);
    }
    if (methodName === 'delete') {
      const id = queryArgs.where.id;
      const idx = db.transactions.findIndex(x => x.id === id);
      if (idx !== -1) {
        const deleted = db.transactions.splice(idx, 1)[0];
        writeDb(db);
        return toPrismaTransaction(deleted);
      }
      return null;
    }
    if (methodName === 'deleteMany') {
      const email = queryArgs?.where?.user?.email || queryArgs?.where?.userId;
      if (email) {
        db.transactions = db.transactions.filter(x => x.userEmail !== email);
      } else {
        db.transactions = [];
      }
      writeDb(db);
      return { count: 0 };
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

if (process.env.NODE_ENV !== "production") (globalThis as any).prismaGlobal = prisma;
