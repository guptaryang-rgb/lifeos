/* ============================================
   LifeOS — Data Layer
   localStorage CRUD + Seed Data + AI Engine
   ============================================ */

const LifeOS = (() => {
  // ── Storage Keys ──
  const KEYS = {
    USER: 'lifeos_user',
    TASKS: 'lifeos_tasks',
    EVENTS: 'lifeos_events',
    GOALS: 'lifeos_goals',
    HABITS: 'lifeos_habits',
    HABIT_LOGS: 'lifeos_habit_logs',
    FOCUS_SESSIONS: 'lifeos_focus_sessions',
    ANALYTICS: 'lifeos_analytics',
    SETTINGS: 'lifeos_settings',
    SEEDED: 'lifeos_seeded',
    TAGS: 'lifeos_tags',
    PROJECTS: 'lifeos_projects',
    CHAT_HISTORY: 'lifeos_chat_history',
    SCREENTIME: 'lifeos_screentime',
    SCREENTIME_LIMITS: 'lifeos_screentime_limits',
    IMPORTS: 'lifeos_imports',
    NOTIFICATION_RULES: 'lifeos_notification_rules',
  };

  // ── Helpers ──
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  const now = () => new Date().toISOString();
  const localDateStr = (d) => { const dt = d instanceof Date ? d : new Date(); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
  const today = () => localDateStr(new Date());
  const daysBetween = (d1, d2) => Math.ceil((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
  
  function get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }
  
  function getObj(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }
  
  function set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ── CRUD Operations ──
  const crud = (key) => ({
    getAll: () => get(key),
    getById: (id) => get(key).find(i => i.id === id),
    create: (item) => {
      const items = get(key);
      const newItem = { ...item, id: uuid(), createdAt: now(), updatedAt: now() };
      items.push(newItem);
      set(key, items);
      return newItem;
    },
    update: (id, updates) => {
      const items = get(key);
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...updates, updatedAt: now() };
      set(key, items);
      return items[idx];
    },
    delete: (id) => {
      const items = get(key).filter(i => i.id !== id);
      set(key, items);
      return true;
    },
    filter: (fn) => get(key).filter(fn),
    count: () => get(key).length,
  });

  // ── Domain Models ──
  const Tasks = {
    ...crud(KEYS.TASKS),
    getByStatus: (status) => get(KEYS.TASKS).filter(t => t.status === status),
    getOverdue: () => get(KEYS.TASKS).filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()),
    getDueToday: () => {
      const d = today();
      return get(KEYS.TASKS).filter(t => t.status !== 'completed' && t.dueDate && t.dueDate.startsWith(d));
    },
    getDueThisWeek: () => {
      const now = new Date();
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
      return get(KEYS.TASKS).filter(t => {
        if (t.status === 'completed') return false;
        const due = new Date(t.dueDate);
        return due >= now && due <= endOfWeek;
      });
    },
    getByGoal: (goalId) => get(KEYS.TASKS).filter(t => t.goalId === goalId),
    toggleSubtask: (taskId, subtaskIdx) => {
      const items = get(KEYS.TASKS);
      const task = items.find(i => i.id === taskId);
      if (task && task.subtasks && task.subtasks[subtaskIdx]) {
        task.subtasks[subtaskIdx].completed = !task.subtasks[subtaskIdx].completed;
        // Recalculate progress
        const completed = task.subtasks.filter(s => s.completed).length;
        task.progress = Math.round((completed / task.subtasks.length) * 100);
        task.updatedAt = now();
        set(KEYS.TASKS, items);
      }
      return task;
    },
    complete: (id) => {
      const items = get(KEYS.TASKS);
      const task = items.find(i => i.id === id);
      if (task) {
        task.status = 'completed';
        task.progress = 100;
        task.completedAt = now();
        task.updatedAt = now();
        if (task.subtasks) task.subtasks.forEach(s => s.completed = true);
        set(KEYS.TASKS, items);
        // Update goal progress if linked
        if (task.goalId) Goals.recalculateProgress(task.goalId);
      }
      return task;
    },
    getCompletedCount: (dateStr) => {
      return get(KEYS.TASKS).filter(t => t.completedAt && t.completedAt.startsWith(dateStr)).length;
    }
  };

  const Events = {
    ...crud(KEYS.EVENTS),
    getByDate: (dateStr) => get(KEYS.EVENTS).filter(e => e.date === dateStr),
    getByDateRange: (start, end) => get(KEYS.EVENTS).filter(e => e.date >= start && e.date <= end),
    getToday: () => get(KEYS.EVENTS).filter(e => e.date === today()),
    getUpcoming: (days = 7) => {
      const start = today();
      const end = new Date();
      end.setDate(end.getDate() + days);
      const endStr = end.toISOString().split('T')[0];
      return get(KEYS.EVENTS).filter(e => e.date >= start && e.date <= endStr).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
    },
  };

  const Goals = {
    ...crud(KEYS.GOALS),
    getByScope: (scope) => get(KEYS.GOALS).filter(g => g.scope === scope),
    recalculateProgress: (goalId) => {
      const items = get(KEYS.GOALS);
      const goal = items.find(g => g.id === goalId);
      if (!goal) return;
      const linkedTasks = get(KEYS.TASKS).filter(t => t.goalId === goalId);
      if (linkedTasks.length > 0) {
        const completed = linkedTasks.filter(t => t.status === 'completed').length;
        goal.progress = Math.round((completed / linkedTasks.length) * 100);
      }
      // Also check milestones
      if (goal.milestones && goal.milestones.length > 0) {
        const completedMs = goal.milestones.filter(m => m.completed).length;
        const msProgress = Math.round((completedMs / goal.milestones.length) * 100);
        goal.progress = Math.max(goal.progress || 0, msProgress);
      }
      goal.updatedAt = now();
      set(KEYS.GOALS, items);
      return goal;
    },
    toggleMilestone: (goalId, msIdx) => {
      const items = get(KEYS.GOALS);
      const goal = items.find(g => g.id === goalId);
      if (goal && goal.milestones && goal.milestones[msIdx]) {
        goal.milestones[msIdx].completed = !goal.milestones[msIdx].completed;
        goal.updatedAt = now();
        set(KEYS.GOALS, items);
        Goals.recalculateProgress(goalId);
      }
      return goal;
    }
  };

  const Habits = {
    ...crud(KEYS.HABITS),
    log: (habitId, dateStr = today()) => {
      const logs = get(KEYS.HABIT_LOGS);
      const existing = logs.find(l => l.habitId === habitId && l.date === dateStr);
      if (existing) {
        // Toggle off
        const filtered = logs.filter(l => !(l.habitId === habitId && l.date === dateStr));
        set(KEYS.HABIT_LOGS, filtered);
        return false;
      }
      logs.push({ id: uuid(), habitId, date: dateStr, completedAt: now() });
      set(KEYS.HABIT_LOGS, logs);
      return true;
    },
    isCompletedToday: (habitId) => {
      return get(KEYS.HABIT_LOGS).some(l => l.habitId === habitId && l.date === today());
    },
    getStreak: (habitId) => {
      const logs = get(KEYS.HABIT_LOGS).filter(l => l.habitId === habitId).map(l => l.date).sort().reverse();
      if (logs.length === 0) return 0;
      let streak = 0;
      let checkDate = new Date();
      // Check if today is done
      if (logs[0] !== today()) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      for (let i = 0; i < 365; i++) {
        const ds = checkDate.toISOString().split('T')[0];
        if (logs.includes(ds)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      return streak;
    },
    getCompletionRate: (habitId, days = 30) => {
      const logs = get(KEYS.HABIT_LOGS).filter(l => l.habitId === habitId);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];
      const recent = logs.filter(l => l.date >= startStr);
      return Math.round((recent.length / days) * 100);
    },
    getLogsForHabit: (habitId) => get(KEYS.HABIT_LOGS).filter(l => l.habitId === habitId),
    getTodayCompletedCount: () => {
      const d = today();
      const todayLogs = get(KEYS.HABIT_LOGS).filter(l => l.date === d);
      return new Set(todayLogs.map(l => l.habitId)).size;
    },
    getHeatmapData: (habitId, weeks = 52) => {
      const logs = get(KEYS.HABIT_LOGS).filter(l => l.habitId === habitId);
      const logDates = new Set(logs.map(l => l.date));
      const data = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeks * 7));
      for (let i = 0; i < weeks * 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        data.push({ date: ds, completed: logDates.has(ds) });
      }
      return data;
    }
  };

  const FocusSessions = {
    ...crud(KEYS.FOCUS_SESSIONS),
    getToday: () => get(KEYS.FOCUS_SESSIONS).filter(s => s.date === today()),
    getTodayMinutes: () => {
      return get(KEYS.FOCUS_SESSIONS)
        .filter(s => s.date === today())
        .reduce((sum, s) => sum + (s.duration || 0), 0);
    },
    getThisWeekMinutes: () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startStr = startOfWeek.toISOString().split('T')[0];
      return get(KEYS.FOCUS_SESSIONS)
        .filter(s => s.date >= startStr)
        .reduce((sum, s) => sum + (s.duration || 0), 0);
    },
    getByDateRange: (start, end) => {
      return get(KEYS.FOCUS_SESSIONS).filter(s => s.date >= start && s.date <= end);
    },
    getTotalSessions: () => get(KEYS.FOCUS_SESSIONS).length,
  };

  // ── User ──
  const User = {
    get: () => getObj(KEYS.USER),
    set: (data) => set(KEYS.USER, data),
    getName: () => (getObj(KEYS.USER).name || 'User'),
  };

  // ── Settings ──
  const Settings = {
    get: () => ({ focusDuration: 25, shortBreak: 5, longBreak: 15, ...getObj(KEYS.SETTINGS) }),
    set: (data) => set(KEYS.SETTINGS, { ...getObj(KEYS.SETTINGS), ...data }),
  };

  // ── AI Engine ──
  const AI = {
    // Generate daily briefing
    generateBriefing: () => {
      const tasks = Tasks.getDueToday();
      const overdue = Tasks.getOverdue();
      const events = Events.getToday();
      const habitsCount = Habits.getAll().length;
      const habitsCompleted = Habits.getTodayCompletedCount();
      const focusMin = FocusSessions.getTodayMinutes();
      
      const greetingTime = new Date().getHours();
      let greeting = 'Good morning';
      if (greetingTime >= 12 && greetingTime < 17) greeting = 'Good afternoon';
      if (greetingTime >= 17) greeting = 'Good evening';
      
      let summary = '';
      if (overdue.length > 0) {
        summary += `⚠️ You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} that need attention. `;
      }
      if (tasks.length > 0) {
        summary += `📋 ${tasks.length} task${tasks.length > 1 ? 's' : ''} due today. `;
      }
      if (events.length > 0) {
        summary += `📅 ${events.length} event${events.length > 1 ? 's' : ''} scheduled. `;
      }
      if (habitsCount > 0) {
        summary += `🎯 ${habitsCompleted}/${habitsCount} habits completed. `;
      }
      if (focusMin > 0) {
        summary += `⏱️ ${focusMin} minutes of deep work logged. `;
      }
      if (summary === '') {
        summary = '✨ Your schedule is clear today. A great day to tackle something meaningful or plan ahead!';
      }
      
      return { greeting, summary, tasks, overdue, events, habitsCompleted, habitsCount, focusMin };
    },

    // Calculate Life Score (0-100)
    calculateLifeScore: () => {
      let score = 50; // Base score
      
      // Task completion rate (last 7 days)
      const allTasks = Tasks.getAll();
      const recentTasks = allTasks.filter(t => {
        const created = new Date(t.createdAt);
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        return created >= weekAgo;
      });
      if (recentTasks.length > 0) {
        const completedRecent = recentTasks.filter(t => t.status === 'completed').length;
        score += Math.round((completedRecent / recentTasks.length) * 15);
      }
      
      // Overdue penalty
      const overdue = Tasks.getOverdue();
      score -= Math.min(overdue.length * 3, 15);
      
      // Habit streak bonus
      const habits = Habits.getAll();
      if (habits.length > 0) {
        const avgStreak = habits.reduce((sum, h) => sum + Habits.getStreak(h.id), 0) / habits.length;
        score += Math.min(Math.round(avgStreak * 2), 15);
      }
      
      // Focus time bonus
      const weekFocus = FocusSessions.getThisWeekMinutes();
      score += Math.min(Math.round(weekFocus / 30), 10);
      
      // Goal progress bonus
      const goals = Goals.getAll();
      if (goals.length > 0) {
        const avgGoalProgress = goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length;
        score += Math.round(avgGoalProgress / 10);
      }
      
      return Math.max(0, Math.min(100, score));
    },

    // Burnout prediction (0-100, higher = more risk)
    calculateBurnoutRisk: () => {
      let risk = 0;
      
      // Workload density
      const thisWeekTasks = Tasks.getDueThisWeek();
      if (thisWeekTasks.length > 15) risk += 25;
      else if (thisWeekTasks.length > 10) risk += 15;
      else if (thisWeekTasks.length > 5) risk += 5;
      
      // Overdue tasks
      const overdue = Tasks.getOverdue();
      risk += Math.min(overdue.length * 5, 25);
      
      // Declining habit streaks
      const habits = Habits.getAll();
      if (habits.length > 0) {
        const brokenStreaks = habits.filter(h => {
          const streak = Habits.getStreak(h.id);
          return streak === 0 && Habits.getLogsForHabit(h.id).length > 3;
        }).length;
        risk += Math.min(brokenStreaks * 8, 20);
      }
      
      // Low focus time
      const weekFocus = FocusSessions.getThisWeekMinutes();
      if (weekFocus < 60) risk += 10;
      
      // High-priority tasks piling up
      const criticalTasks = Tasks.filter(t => t.priority === 'critical' && t.status !== 'completed');
      risk += Math.min(criticalTasks.length * 5, 20);
      
      risk = Math.max(0, Math.min(100, risk));
      
      let level, recommendations;
      if (risk < 30) {
        level = 'low';
        recommendations = ['You\'re in a great zone! Keep up the balanced routine.', 'Consider setting a stretch goal for this week.'];
      } else if (risk < 60) {
        level = 'moderate';
        recommendations = ['Consider deferring some low-priority tasks.', 'Schedule a 15-minute break every 90 minutes.', 'Try to complete one overdue task today.'];
      } else {
        level = 'high';
        recommendations = ['🚨 High burnout risk detected!', 'Clear your schedule of non-essential tasks.', 'Take a proper break — your productivity will recover.', 'Consider rescheduling deadlines if possible.'];
      }
      
      return { risk, level, recommendations };
    },

    // AI Schedule Suggestions
    generateSchedule: (date = today()) => {
      const tasks = Tasks.filter(t => t.status !== 'completed')
        .sort((a, b) => {
          // Priority weight
          const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
          const pa = priorityWeight[a.priority] || 1;
          const pb = priorityWeight[b.priority] || 1;
          
          // Deadline proximity
          const da = a.dueDate ? daysBetween(date, a.dueDate) : 999;
          const db = b.dueDate ? daysBetween(date, b.dueDate) : 999;
          
          // Combined score (lower = more urgent)
          const scoreA = da - (pa * 3);
          const scoreB = db - (pb * 3);
          
          return scoreA - scoreB;
        });

      const events = Events.getByDate(date);
      const busySlots = events.map(e => ({
        start: e.startTime,
        end: e.endTime,
        title: e.title,
      }));

      // Generate time blocks
      const schedule = [];
      const startHour = 8;
      const endHour = 20;
      let currentHour = startHour;
      let taskIdx = 0;

      while (currentHour < endHour && taskIdx < tasks.length) {
        const timeStr = `${String(currentHour).padStart(2, '0')}:00`;
        const endTimeStr = `${String(currentHour + 1).padStart(2, '0')}:00`;
        
        // Check if slot is busy
        const isBusy = busySlots.some(s => {
          const slotStart = parseInt(s.start);
          const slotEnd = parseInt(s.end);
          return currentHour >= slotStart && currentHour < slotEnd;
        });

        if (!isBusy) {
          const task = tasks[taskIdx];
          schedule.push({
            time: timeStr,
            endTime: endTimeStr,
            title: task.title,
            taskId: task.id,
            priority: task.priority,
            type: 'suggested',
            estimatedDuration: task.estimatedMinutes || 60,
          });
          taskIdx++;
        } else {
          const event = busySlots.find(s => parseInt(s.start) <= currentHour && parseInt(s.end) > currentHour);
          schedule.push({
            time: timeStr,
            endTime: endTimeStr,
            title: event ? event.title : 'Busy',
            type: 'event',
          });
        }
        currentHour++;
      }

      return schedule;
    },

    // Detect procrastination
    detectProcrastination: () => {
      const warnings = [];
      const tasks = Tasks.filter(t => t.status !== 'completed' && t.dueDate);
      
      tasks.forEach(t => {
        const daysLeft = daysBetween(today(), t.dueDate);
        const daysSinceCreated = daysBetween(t.createdAt.split('T')[0], today());
        
        if (daysLeft <= 1 && daysSinceCreated > 3 && t.progress < 20) {
          warnings.push({
            taskId: t.id,
            taskTitle: t.title,
            message: `"${t.title}" is due ${daysLeft <= 0 ? 'today' : 'tomorrow'} with only ${t.progress || 0}% progress.`,
            severity: 'high'
          });
        } else if (daysLeft <= 3 && daysSinceCreated > 5 && t.progress < 30) {
          warnings.push({
            taskId: t.id,
            taskTitle: t.title,
            message: `"${t.title}" is due in ${daysLeft} days with minimal progress.`,
            severity: 'medium'
          });
        }
      });

      return warnings;
    },

    // Conflict detection
    detectConflicts: (date = today()) => {
      const events = Events.getByDate(date).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      const conflicts = [];
      
      for (let i = 0; i < events.length - 1; i++) {
        for (let j = i + 1; j < events.length; j++) {
          if (events[i].endTime > events[j].startTime) {
            conflicts.push({
              event1: events[i],
              event2: events[j],
              message: `"${events[i].title}" overlaps with "${events[j].title}"`
            });
          }
        }
      }

      // Check workload
      const tasks = Tasks.getDueToday();
      const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
      if (totalEstimated > 480) { // 8 hours
        conflicts.push({
          type: 'overload',
          message: `Today's tasks total ~${Math.round(totalEstimated / 60)}h of estimated work. Consider rescheduling some tasks.`
        });
      }

      return conflicts;
    },

    // Estimate task duration based on historical data
    estimateDuration: (category) => {
      const completedTasks = Tasks.filter(t => t.status === 'completed' && t.category === category && t.actualMinutes);
      if (completedTasks.length < 3) return 60; // Default 1 hour
      const avg = completedTasks.reduce((sum, t) => sum + t.actualMinutes, 0) / completedTasks.length;
      return Math.round(avg);
    },
  };

  // ── Seed Data ──
  const seedData = () => {
    if (localStorage.getItem(KEYS.SEEDED)) return;
    
    // User
    User.set({ name: 'Alex Chen', email: 'alex@lifeos.app', role: 'Computer Science Student', joinedAt: now() });
    
    const todayDate = new Date();
    const fmt = (d) => localDateStr(d);
    const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    const subDays = (d, n) => addDays(d, -n);

    // ── Tasks ──
    const taskData = [
      { title: 'Complete Data Structures assignment', description: 'Binary tree implementation and traversal algorithms', status: 'in_progress', priority: 'critical', category: 'academic', dueDate: fmt(addDays(todayDate, 1)), estimatedMinutes: 120, progress: 45, course: 'CS 301', subtasks: [{ title: 'Implement BST insert', completed: true }, { title: 'Implement BST delete', completed: true }, { title: 'Write traversal methods', completed: false }, { title: 'Add unit tests', completed: false }] },
      { title: 'Study for Linear Algebra midterm', description: 'Review chapters 4-7, practice eigenvalues', status: 'not_started', priority: 'high', category: 'academic', dueDate: fmt(addDays(todayDate, 3)), estimatedMinutes: 180, progress: 0, course: 'MATH 250', subtasks: [{ title: 'Review Chapter 4', completed: false }, { title: 'Review Chapter 5', completed: false }, { title: 'Practice problems Ch 6-7', completed: false }] },
      { title: 'Team project: API endpoints', description: 'Build REST API for the group project', status: 'in_progress', priority: 'high', category: 'work', dueDate: fmt(addDays(todayDate, 5)), estimatedMinutes: 240, progress: 30, course: 'CS 460', subtasks: [{ title: 'Set up Express server', completed: true }, { title: 'User auth endpoints', completed: false }, { title: 'CRUD for resources', completed: false }, { title: 'API documentation', completed: false }] },
      { title: 'Update resume for internship apps', description: 'Tailor for Google and Meta internships', status: 'not_started', priority: 'medium', category: 'personal', dueDate: fmt(addDays(todayDate, 7)), estimatedMinutes: 90, progress: 0, subtasks: [] },
      { title: 'Read Chapter 12 - Operating Systems', description: 'Virtual memory and paging', status: 'not_started', priority: 'medium', category: 'academic', dueDate: fmt(addDays(todayDate, 2)), estimatedMinutes: 60, progress: 0, course: 'CS 350' },
      { title: 'Gym workout plan for the week', description: 'Plan push/pull/legs split', status: 'completed', priority: 'low', category: 'health', dueDate: fmt(subDays(todayDate, 1)), estimatedMinutes: 30, progress: 100, completedAt: subDays(todayDate, 1).toISOString() },
      { title: 'Fix portfolio website bugs', description: 'Mobile responsiveness and contact form', status: 'in_progress', priority: 'medium', category: 'work', dueDate: fmt(addDays(todayDate, 4)), estimatedMinutes: 120, progress: 60, subtasks: [{ title: 'Fix mobile nav', completed: true }, { title: 'Fix contact form', completed: true }, { title: 'Add project screenshots', completed: false }] },
      { title: 'Prepare presentation slides', description: 'CS 460 group project demo', status: 'not_started', priority: 'high', category: 'academic', dueDate: fmt(addDays(todayDate, 6)), estimatedMinutes: 150, progress: 0, course: 'CS 460' },
      { title: 'Grocery shopping', description: 'Weekly grocery run', status: 'completed', priority: 'low', category: 'personal', dueDate: fmt(subDays(todayDate, 2)), estimatedMinutes: 45, progress: 100, completedAt: subDays(todayDate, 2).toISOString() },
      { title: 'LeetCode daily challenge', description: 'Solve 3 medium problems', status: 'not_started', priority: 'medium', category: 'work', dueDate: fmt(todayDate), estimatedMinutes: 90, progress: 0 },
      { title: 'Write blog post about React hooks', description: 'Technical blog for portfolio', status: 'not_started', priority: 'low', category: 'work', dueDate: fmt(addDays(todayDate, 10)), estimatedMinutes: 120, progress: 0 },
      { title: 'Review pull request for open source project', description: 'Review PR #342 on the OSS repo', status: 'not_started', priority: 'low', category: 'work', dueDate: fmt(addDays(todayDate, 3)), estimatedMinutes: 45, progress: 0 },
    ];

    const createdTasks = [];
    taskData.forEach(t => {
      const task = Tasks.create({ ...t, createdAt: subDays(todayDate, Math.floor(Math.random() * 10) + 1).toISOString() });
      createdTasks.push(task);
    });

    // ── Events ──
    const eventData = [
      { title: 'CS 301 Lecture', date: fmt(todayDate), startTime: '09:00', endTime: '10:30', category: 'academic', location: 'Room 204', recurring: true },
      { title: 'Team standup', date: fmt(todayDate), startTime: '11:00', endTime: '11:30', category: 'work', location: 'Zoom', recurring: true },
      { title: 'Lunch with Sarah', date: fmt(todayDate), startTime: '12:00', endTime: '13:00', category: 'personal', location: 'Campus cafe' },
      { title: 'MATH 250 Tutorial', date: fmt(todayDate), startTime: '14:00', endTime: '15:00', category: 'academic', location: 'Room 108' },
      { title: 'Gym session', date: fmt(todayDate), startTime: '17:00', endTime: '18:30', category: 'health', location: 'Rec center' },
      { title: 'CS 460 Lab', date: fmt(addDays(todayDate, 1)), startTime: '10:00', endTime: '12:00', category: 'academic', location: 'CS Lab 3' },
      { title: 'Career fair prep meeting', date: fmt(addDays(todayDate, 1)), startTime: '14:00', endTime: '15:00', category: 'work', location: 'Student center' },
      { title: 'CS 350 Lecture', date: fmt(addDays(todayDate, 2)), startTime: '09:00', endTime: '10:30', category: 'academic', location: 'Auditorium B' },
      { title: 'Study group - Algorithms', date: fmt(addDays(todayDate, 2)), startTime: '16:00', endTime: '18:00', category: 'academic', location: 'Library room 5' },
      { title: 'Coffee chat with mentor', date: fmt(addDays(todayDate, 3)), startTime: '10:00', endTime: '11:00', category: 'personal', location: 'Starbucks downtown' },
      { title: 'Yoga class', date: fmt(addDays(todayDate, 3)), startTime: '07:00', endTime: '08:00', category: 'health', location: 'Wellness center' },
      { title: 'Movie night', date: fmt(addDays(todayDate, 4)), startTime: '19:00', endTime: '22:00', category: 'personal', location: 'AMC Theater' },
      { title: 'MATH 250 Midterm', date: fmt(addDays(todayDate, 3)), startTime: '13:00', endTime: '15:00', category: 'academic', location: 'Exam Hall A' },
      { title: 'Project demo rehearsal', date: fmt(addDays(todayDate, 5)), startTime: '15:00', endTime: '17:00', category: 'work', location: 'CS Lab 1' },
    ];
    eventData.forEach(e => Events.create(e));

    // ── Goals ──
    const goalData = [
      { title: 'Land a summer internship', description: 'Secure a software engineering internship at a top tech company', scope: 'yearly', progress: 35, category: 'career', milestones: [{ title: 'Update resume', completed: true, date: fmt(subDays(todayDate, 30)) }, { title: 'Apply to 20 companies', completed: true, date: fmt(subDays(todayDate, 14)) }, { title: 'Complete 50 LeetCode problems', completed: false, date: fmt(addDays(todayDate, 30)) }, { title: 'Get 3 interviews', completed: false, date: fmt(addDays(todayDate, 45)) }, { title: 'Accept offer', completed: false, date: fmt(addDays(todayDate, 90)) }] },
      { title: 'Maintain 3.8+ GPA', description: 'Excel in all courses this semester', scope: 'yearly', progress: 70, category: 'academic', milestones: [{ title: 'Midterm grades above B+', completed: true, date: fmt(subDays(todayDate, 20)) }, { title: 'All assignments submitted on time', completed: false, date: fmt(addDays(todayDate, 60)) }, { title: 'Final exam preparation', completed: false, date: fmt(addDays(todayDate, 80)) }] },
      { title: 'Build 3 side projects', description: 'Full-stack projects for portfolio', scope: 'yearly', progress: 33, category: 'career', milestones: [{ title: 'Portfolio website v2', completed: true, date: fmt(subDays(todayDate, 10)) }, { title: 'AI chatbot project', completed: false, date: fmt(addDays(todayDate, 30)) }, { title: 'Mobile app MVP', completed: false, date: fmt(addDays(todayDate, 60)) }] },
      { title: 'Run a 5K under 25 minutes', description: 'Improve running fitness', scope: 'monthly', progress: 60, category: 'health', milestones: [{ title: 'Run 3x per week for 2 weeks', completed: true, date: fmt(subDays(todayDate, 7)) }, { title: 'Complete 5K without stopping', completed: true, date: fmt(subDays(todayDate, 3)) }, { title: 'Beat 25-minute mark', completed: false, date: fmt(addDays(todayDate, 14)) }] },
      { title: 'Read 2 technical books this month', description: 'DDIA and Clean Code', scope: 'monthly', progress: 25, category: 'personal', milestones: [{ title: 'Finish DDIA Ch 1-6', completed: true, date: fmt(subDays(todayDate, 5)) }, { title: 'Finish DDIA Ch 7-12', completed: false, date: fmt(addDays(todayDate, 10)) }, { title: 'Read Clean Code', completed: false, date: fmt(addDays(todayDate, 20)) }] },
      { title: 'Complete all CS assignments on time', description: 'Zero late submissions this week', scope: 'weekly', progress: 50, category: 'academic', milestones: [{ title: 'CS 301 assignment', completed: false, date: fmt(addDays(todayDate, 1)) }, { title: 'CS 350 reading', completed: false, date: fmt(addDays(todayDate, 2)) }] },
    ];
    
    goalData.forEach(g => {
      const goal = Goals.create(g);
      // Link first few tasks to first goal
      if (g.title.includes('internship') && createdTasks.length > 0) {
        Tasks.update(createdTasks[3].id, { goalId: goal.id }); // Resume task
        Tasks.update(createdTasks[9].id, { goalId: goal.id }); // LeetCode task
      }
    });

    // ── Habits ──
    const habitData = [
      { title: 'Morning meditation', category: 'wellness', frequency: 'daily', icon: '🧘', color: '#6c5ce7' },
      { title: 'Exercise (30 min)', category: 'health', frequency: 'daily', icon: '💪', color: '#00b894' },
      { title: 'Read for 20 minutes', category: 'learning', frequency: 'daily', icon: '📚', color: '#0984e3' },
      { title: 'Drink 8 glasses of water', category: 'health', frequency: 'daily', icon: '💧', color: '#00cec9' },
      { title: 'LeetCode problem', category: 'career', frequency: 'daily', icon: '💻', color: '#fd79a8' },
      { title: 'Journal before bed', category: 'wellness', frequency: 'daily', icon: '📝', color: '#fdcb6e' },
      { title: 'No social media until noon', category: 'productivity', frequency: 'daily', icon: '📵', color: '#e17055' },
    ];

    const createdHabits = [];
    habitData.forEach(h => {
      const habit = Habits.create(h);
      createdHabits.push(habit);
    });

    // Generate habit logs for past 30 days (realistic patterns)
    for (let d = 30; d >= 0; d--) {
      const date = fmt(subDays(todayDate, d));
      createdHabits.forEach((habit, idx) => {
        // Different completion rates for different habits
        const rates = [0.85, 0.7, 0.6, 0.75, 0.5, 0.65, 0.4];
        if (Math.random() < (rates[idx] || 0.5)) {
          const logs = get(KEYS.HABIT_LOGS);
          logs.push({ id: uuid(), habitId: habit.id, date, completedAt: subDays(todayDate, d).toISOString() });
          set(KEYS.HABIT_LOGS, logs);
        }
      });
    }

    // ── Focus Sessions (past 14 days) ──
    for (let d = 14; d >= 1; d--) {
      const date = fmt(subDays(todayDate, d));
      const sessionsPerDay = Math.floor(Math.random() * 4) + 1;
      for (let s = 0; s < sessionsPerDay; s++) {
        FocusSessions.create({
          date,
          duration: [25, 25, 50, 25, 45, 30][Math.floor(Math.random() * 6)],
          type: ['pomodoro', 'deep_work', 'pomodoro'][Math.floor(Math.random() * 3)],
          taskTitle: ['Coding', 'Studying', 'Reading', 'Problem solving', 'Writing'][Math.floor(Math.random() * 5)],
          completedAt: subDays(todayDate, d).toISOString(),
        });
      }
    }

    localStorage.setItem(KEYS.SEEDED, 'true');
    console.log('🌱 LifeOS seed data loaded successfully!');
  };

  // ── Analytics Helpers ──
  const Analytics = {
    getWeeklyProductivity: () => {
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const tasksCompleted = Tasks.getCompletedCount(dateStr);
        const focusMinutes = FocusSessions.getByDateRange(dateStr, dateStr).reduce((sum, s) => sum + (s.duration || 0), 0);
        const habitsCompleted = get(KEYS.HABIT_LOGS).filter(l => l.date === dateStr).length;
        
        data.push({ date: dateStr, dayName, tasksCompleted, focusMinutes, habitsCompleted });
      }
      return data;
    },
    
    getMonthlyTrends: () => {
      const data = [];
      for (let w = 3; w >= 0; w--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (w * 7) - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const startStr = weekStart.toISOString().split('T')[0];
        const endStr = weekEnd.toISOString().split('T')[0];
        
        const sessions = FocusSessions.getByDateRange(startStr, endStr);
        const totalFocus = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        
        data.push({
          week: `Week ${4 - w}`,
          focusMinutes: totalFocus,
          focusHours: Math.round(totalFocus / 60 * 10) / 10,
        });
      }
      return data;
    },

    getTaskDistribution: () => {
      const tasks = Tasks.getAll();
      const categories = {};
      tasks.forEach(t => {
        const cat = t.category || 'other';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      return categories;
    },

    getCompletionRate: (days = 7) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];
      
      const tasks = Tasks.filter(t => t.createdAt && t.createdAt.split('T')[0] >= startStr);
      if (tasks.length === 0) return 0;
      const completed = tasks.filter(t => t.status === 'completed').length;
      return Math.round((completed / tasks.length) * 100);
    },
  };

  // ── Tags & Projects ──
  const Tags = {
    ...crud(KEYS.TAGS),
    filter: (fn) => get(KEYS.TAGS).filter(fn),
    getColors: () => ['#6c5ce7','#00cec9','#fd79a8','#fdcb6e','#00b894','#e17055','#74b9ff','#a29bfe','#55efc4','#636e72'],
  };

  const Projects = {
    ...crud(KEYS.PROJECTS),
    filter: (fn) => get(KEYS.PROJECTS).filter(fn),
    getTaskCount: (projectId) => Tasks.filter(t => t.projectId === projectId).length,
  };

  // ── Chat History ──
  const ChatHistory = {
    getAll: () => get(KEYS.CHAT_HISTORY),
    add: (msg) => {
      const history = get(KEYS.CHAT_HISTORY);
      history.push({ ...msg, timestamp: now() });
      // Keep last 100 messages
      if (history.length > 100) history.splice(0, history.length - 100);
      set(KEYS.CHAT_HISTORY, history);
    },
    clear: () => set(KEYS.CHAT_HISTORY, []),
  };

  // ── Public API ──
  return {
    Tasks, Events, Goals, Habits, FocusSessions, User, Settings, AI, Analytics,
    Tags, Projects, ChatHistory,
    seedData, uuid, today, localDateStr,
    // Reset everything
    reset: () => {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
      location.reload();
    }
  };
})();

// Auto-seed on first load
LifeOS.seedData();
