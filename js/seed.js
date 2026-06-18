// ============================================================
// seed.js — Populate the app with realistic demo data on first run
// 2+ weeks of tasks, events, habits, goals, finance, etc.
// ============================================================
import { store, uid, today, daysAgo, minutesAgo } from './store.js';

export function seedIfEmpty() {
  if (store.load()) return false; // already had data

  const t = today();
  const state = JSON.parse(JSON.stringify(store.state));

  // -- TASKS --
  const taskTemplates = [
    { title: 'Finish CS 281 problem set',     cat: 'ACADEMIC', prio: 'HIGH',   energy: 'HIGH',   due: 0,  dur: 90 },
    { title: 'Email professor about project', cat: 'ACADEMIC', prio: 'MEDIUM', energy: 'LOW',    due: 1,  dur: 15 },
    { title: 'Review chapter 6 — algorithms', cat: 'ACADEMIC', prio: 'MEDIUM', energy: 'MEDIUM', due: 2,  dur: 60 },
    { title: 'Submit internship application', cat: 'WORK',     prio: 'HIGH',   energy: 'LOW',    due: 1,  dur: 30 },
    { title: 'Update resume for spring career fair', cat: 'WORK', prio: 'MEDIUM', energy: 'MEDIUM', due: 4, dur: 45 },
    { title: 'Workout — chest & triceps',     cat: 'HEALTH',   prio: 'LOW',    energy: 'HIGH',   due: 0,  dur: 45 },
    { title: 'Grocery run',                   cat: 'PERSONAL', prio: 'LOW',    energy: 'LOW',    due: 0,  dur: 30 },
    { title: 'Call mom',                      cat: 'PERSONAL', prio: 'MEDIUM', energy: 'LOW',    due: 1,  dur: 20 },
    { title: 'Write blog post draft',         cat: 'WORK',     prio: 'LOW',    energy: 'MEDIUM', due: 5,  dur: 90 },
    { title: 'Read 30 pages of "Deep Work"',  cat: 'PERSONAL', prio: 'LOW',    energy: 'LOW',    due: 0,  dur: 30 },
    { title: 'Fix CSS bug on portfolio',      cat: 'WORK',     prio: 'MEDIUM', energy: 'MEDIUM', due: 2,  dur: 60 },
    { title: 'Lab partner sync — 3pm',        cat: 'ACADEMIC', prio: 'HIGH',   energy: 'MEDIUM', due: 0,  dur: 45 },
    { title: 'Pay rent',                      cat: 'PERSONAL', prio: 'HIGH',   energy: 'LOW',    due: 3,  dur: 10 },
    { title: 'Practice leetcode — graphs',    cat: 'ACADEMIC', prio: 'MEDIUM', energy: 'HIGH',   due: 2,  dur: 60 },
  ];
  state.tasks = taskTemplates.map((tpl, i) => {
    const due = new Date(t); due.setDate(due.getDate() + tpl.due); due.setHours(17, 0, 0, 0);
    const statuses = ['NOT_STARTED','IN_PROGRESS','NOT_STARTED','COMPLETED','IN_PROGRESS'];
    return {
      id: uid(),
      title: tpl.title,
      description: '',
      dueDate: due,
      estimatedDuration: tpl.dur,
      priority: tpl.prio,
      energyLevel: tpl.energy,
      status: statuses[i % statuses.length],
      createdAt: Date.now() - i * 86400000,
      updatedAt: Date.now(),
      lastTouchedAt: i % 3 === 0 ? Date.now() - 3600 * 1000 : null,
    };
  });

  // -- EVENTS (this week + last week) --
  const eventTemplates = [
    { title: 'CS 281 Lecture',     cat: 'ACADEMIC', start: -3, h: 9,  dur: 75 },
    { title: 'CS 281 Lecture',     cat: 'ACADEMIC', start: -2, h: 9,  dur: 75 },
    { title: 'CS 281 Lecture',     cat: 'ACADEMIC', start: -1, h: 9,  dur: 75 },
    { title: 'CS 281 Lecture',     cat: 'ACADEMIC', start:  0, h: 9,  dur: 75 },
    { title: 'Stand-up with team', cat: 'WORK',     start: -1, h: 10, dur: 30 },
    { title: 'Stand-up with team', cat: 'WORK',     start:  0, h: 10, dur: 30 },
    { title: 'Career advisor meeting', cat: 'WORK', start: 1, h: 14, dur: 45 },
    { title: 'Yoga class',        cat: 'HEALTH',   start: -2, h: 18, dur: 60 },
    { title: 'Yoga class',        cat: 'HEALTH',   start:  0, h: 18, dur: 60 },
    { title: 'Yoga class',        cat: 'HEALTH',   start:  2, h: 18, dur: 60 },
    { title: 'Coffee with Sam',   cat: 'PERSONAL', start:  1, h: 16, dur: 60 },
    { title: 'Dinner — parents',  cat: 'PERSONAL', start:  4, h: 19, dur: 120 },
    { title: 'Gym session',       cat: 'HEALTH',   start: -3, h: 17, dur: 60 },
    { title: 'Gym session',       cat: 'HEALTH',   start: -1, h: 17, dur: 60 },
    { title: 'Movie night',       cat: 'PERSONAL', start:  2, h: 21, dur: 150 },
  ];
  state.events = eventTemplates.map((e, i) => {
    const start = daysAgo(-e.start); // negative = future
    start.setHours(e.h, 0, 0, 0);
    const end = new Date(start.getTime() + e.dur * 60000);
    return {
      id: uid(),
      title: e.title,
      startTime: start,
      endTime: end,
      category: e.cat,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  // -- HABITS --
  state.habits = [
    { id: uid(), title: 'Morning run',        frequency: 'DAILY',   createdAt: Date.now() },
    { id: uid(), title: 'Read 30 minutes',    frequency: 'DAILY',   createdAt: Date.now() },
    { id: uid(), title: 'Meditate',           frequency: 'DAILY',   createdAt: Date.now() },
    { id: uid(), title: 'No phone first hour',frequency: 'DAILY',   createdAt: Date.now() },
    { id: uid(), title: 'Weekly review',      frequency: 'WEEKLY',  createdAt: Date.now() },
  ];

  // -- HABIT LOGS: 14 days back, mostly consistent with some gaps --
  state.habitLogs = [];
  for (let d = 0; d < 21; d++) {
    const day = daysAgo(d);
    state.habits.forEach((habit, hi) => {
      // Different completion rates per habit
      const rates = [0.7, 0.85, 0.6, 0.5, 0.4];
      if (Math.random() < rates[hi]) {
        state.habitLogs.push({
          id: uid(),
          habitId: habit.id,
          completedAt: new Date(day.getTime() + 9 * 3600 * 1000),
        });
      }
    });
  }

  // -- GOALS + MILESTONES --
  state.goals = [
    { id: uid(), title: 'Land summer internship',     description: 'SWE or research role at a top company.', targetDate: new Date(t.getTime() + 90 * 86400000),  progress: 35, createdAt: Date.now() },
    { id: uid(), title: 'Run a sub-25 5K',            description: 'Currently at 28:30, building base.',  targetDate: new Date(t.getTime() + 120 * 86400000), progress: 60, createdAt: Date.now() },
    { id: uid(), title: 'Read 20 books this year',    description: 'Currently on book 8.',                 targetDate: new Date(t.getTime() + 200 * 86400000), progress: 40, createdAt: Date.now() },
    { id: uid(), title: 'Ship personal portfolio v2', description: 'Modernize and add case studies.',     targetDate: new Date(t.getTime() + 30 * 86400000),  progress: 75, createdAt: Date.now() },
  ];
  state.milestones = [
    { id: uid(), goalId: state.goals[0].id, title: 'Update resume', status: 'COMPLETED', targetDate: daysAgo(-7) },
    { id: uid(), goalId: state.goals[0].id, title: 'Apply to 10 companies', status: 'IN_PROGRESS', targetDate: daysAgo(-20) },
    { id: uid(), goalId: state.goals[0].id, title: 'Mock interviews',  status: 'NOT_STARTED', targetDate: daysAgo(-60) },
    { id: uid(), goalId: state.goals[1].id, title: 'Run 3x/week for 4 weeks', status: 'IN_PROGRESS', targetDate: daysAgo(-15) },
    { id: uid(), goalId: state.goals[1].id, title: 'Hit 5K distance', status: 'COMPLETED', targetDate: daysAgo(-50) },
    { id: uid(), goalId: state.goals[2].id, title: 'Finish book #8',  status: 'IN_PROGRESS', targetDate: daysAgo(-3) },
  ];

  // -- FOCUS SESSIONS (last 14 days) --
  state.focusSessions = [];
  for (let d = 1; d < 15; d++) {
    const day = daysAgo(d);
    const count = Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const start = new Date(day);
      start.setHours(10 + i * 2, Math.floor(Math.random() * 60), 0, 0);
      const duration = 25 + Math.floor(Math.random() * 3) * 25; // 25/50/75
      state.focusSessions.push({
        id: uid(), startTime: start,
        endTime: new Date(start.getTime() + duration * 60000),
        duration, createdAt: Date.now(),
      });
    }
  }

  // -- FOOD LOGS (last 7 days) --
  const foods = [
    { name: 'Oatmeal with berries', meal: 'breakfast', c: 320, p: 12, ca: 55, f: 6, fi: 8 },
    { name: 'Coffee with oat milk', meal: 'breakfast', c: 60,  p: 2,  ca: 8,  f: 3, fi: 1 },
    { name: 'Chicken & rice bowl',  meal: 'lunch',     c: 580, p: 40, ca: 70, f: 14, fi: 5 },
    { name: 'Greek yogurt + honey', meal: 'snack',     c: 180, p: 15, ca: 22, f: 4, fi: 0 },
    { name: 'Salad with chickpeas', meal: 'lunch',     c: 380, p: 18, ca: 45, f: 14, fi: 11 },
    { name: 'Salmon & veggies',     meal: 'dinner',    c: 520, p: 38, ca: 30, f: 22, fi: 6 },
    { name: 'Protein shake',        meal: 'snack',     c: 220, p: 30, ca: 12, f: 5, fi: 2 },
  ];
  state.foodLogs = [];
  for (let d = 0; d < 7; d++) {
    const day = daysAgo(d);
    foods.forEach(f => {
      if (Math.random() < 0.75) {
        state.foodLogs.push({
          id: uid(), foodName: f.name, meal: f.meal, servingCount: 1,
          calories: f.c, protein: f.p, carbs: f.ca, fat: f.f, fiber: f.fi,
          date: new Date(day),
          createdAt: Date.now(),
        });
      }
    });
  }

  // -- WORKOUTS (last 14 days) --
  const workouts = [
    { name: 'Morning run 3mi',    type: 'cardio',   dur: 25, cal: 280, dist: 4.8 },
    { name: 'Push day',           type: 'strength', dur: 50, cal: 320 },
    { name: 'Pull day',           type: 'strength', dur: 55, cal: 340 },
    { name: 'Leg day',            type: 'strength', dur: 60, cal: 380 },
    { name: 'HIIT session',       type: 'cardio',   dur: 30, cal: 350 },
    { name: 'Yoga flow',          type: 'cardio',   dur: 45, cal: 180 },
  ];
  state.workouts = [];
  for (let d = 1; d < 15; d++) {
    if (Math.random() < 0.55) {
      const w = workouts[Math.floor(Math.random() * workouts.length)];
      const day = daysAgo(d);
      day.setHours(17, Math.floor(Math.random() * 60), 0, 0);
      state.workouts.push({
        id: uid(), exerciseName: w.name, type: w.type,
        durationMinutes: w.dur, calories: w.cal, distance: w.dist,
        date: day, createdAt: Date.now(),
      });
    }
  }

  // -- TRANSACTIONS (last 30 days) --
  const transactions = [
    { desc: 'Coffee at Blue Bottle', cat: 'food',         min: 5,  max: 8 },
    { desc: 'Trader Joe\'s groceries', cat: 'food',       min: 30, max: 90 },
    { desc: 'Uber ride',            cat: 'transport',     min: 8,  max: 22 },
    { desc: 'Spotify subscription', cat: 'entertainment', min: 10, max: 10 },
    { desc: 'Amazon order',         cat: 'shopping',      min: 15, max: 120 },
    { desc: 'Electric bill',        cat: 'bills',         min: 45, max: 80 },
    { desc: 'Lunch — Chipotle',     cat: 'food',          min: 11, max: 18 },
    { desc: 'Movie ticket',         cat: 'entertainment', min: 14, max: 16 },
    { desc: 'Textbook (used)',      cat: 'education',     min: 25, max: 60 },
    { desc: 'Gas',                  cat: 'transport',     min: 30, max: 55 },
  ];
  state.transactions = [];
  for (let d = 0; d < 30; d++) {
    const count = Math.floor(Math.random() * 2);
    for (let i = 0; i <= count; i++) {
      const tpl = transactions[Math.floor(Math.random() * transactions.length)];
      const amount = Math.round((tpl.min + Math.random() * (tpl.max - tpl.min)) * 100) / 100;
      state.transactions.push({
        id: uid(),
        amount,
        description: tpl.desc,
        category: tpl.cat,
        date: daysAgo(d),
        recurring: tpl.desc.includes('Spotify') || tpl.desc.includes('Electric'),
      });
    }
  }

  // -- WELLNESS --
  state.wellness.water = [];
  state.wellness.sleep = [];
  state.wellness.mood = [];
  state.wellness.journal = [];
  state.wellness.meditation = [];
  for (let d = 0; d < 14; d++) {
    const day = daysAgo(d).toISOString().slice(0,10);
    state.wellness.water.push({ date: day, glasses: Math.floor(2 + Math.random() * 6) });
    state.wellness.sleep.push({ date: day, hours: Math.round((5.5 + Math.random() * 3) * 10) / 10, quality: Math.random() > 0.3 ? 'good' : 'tired' });
    state.wellness.mood.push({ id: uid(), date: day, score: Math.ceil(2 + Math.random() * 4), note: ['productive','focused','tired but ok','great','stressed'][Math.floor(Math.random()*5)] });
    if (Math.random() > 0.6) {
      state.wellness.meditation.push({ date: day, minutes: 10 + Math.floor(Math.random() * 20) });
    }
  }
  state.wellness.journal = [
    { id: uid(), date: daysAgo(1), title: 'Today felt long', body: 'Got through the leetcode set but felt scattered. Tomorrow: morning routine first, then deep work.' },
    { id: uid(), date: daysAgo(3), title: 'Career fair prep', body: 'Updated resume, picked 6 target companies. Need to rehearse the 30s pitch.' },
    { id: uid(), date: daysAgo(7), title: 'Week 1 reflection', body: 'Workouts every day. Sleep still inconsistent. Cutting screen time after 10pm.' },
  ];

  // -- STUDY DECKS --
  state.study.decks = [
    {
      id: uid(),
      name: 'Algorithms — Final Review',
      cards: [
        { id: uid(), front: 'What is the time complexity of merge sort?', back: 'O(n log n) — best, worst, and average.', lastReview: Date.now() - 3*86400000, nextReview: Date.now(), box: 2 },
        { id: uid(), front: 'What is a BFS used for?',                  back: 'Level-order traversal, shortest path in unweighted graphs.', lastReview: Date.now() - 1*86400000, nextReview: Date.now(), box: 1 },
        { id: uid(), front: 'Dijkstra\'s algorithm requirement?',     back: 'Non-negative edge weights.', lastReview: null, nextReview: Date.now(), box: 0 },
        { id: uid(), front: 'Quicksort worst case?',                   back: 'O(n²) on already-sorted input with bad pivot choice.', lastReview: Date.now() - 5*86400000, nextReview: Date.now() - 86400000, box: 3 },
        { id: uid(), front: 'Dynamic programming core idea?',          back: 'Memoization + optimal substructure.', lastReview: null, nextReview: Date.now(), box: 0 },
      ],
    },
    {
      id: uid(), name: 'Spanish — Verbs',
      cards: [
        { id: uid(), front: 'ser (yo, present)',  back: 'soy', lastReview: Date.now() - 2*86400000, nextReview: Date.now(), box: 2 },
        { id: uid(), front: 'tener (tú, present)',back: 'tienes', lastReview: null, nextReview: Date.now(), box: 0 },
        { id: uid(), front: 'ir (él, future)',    back: 'irá', lastReview: null, nextReview: Date.now(), box: 0 },
      ],
    },
  ];

  // -- SCREEN TIME (last 7 days, aggregated per app) --
  state.screenTime.daily = [];
  const apps = ['Twitter','YouTube','Instagram','VS Code','Chrome','Messages'];
  for (let d = 0; d < 7; d++) {
    const day = daysAgo(d).toISOString().slice(0,10);
    apps.forEach(app => {
      state.screenTime.daily.push({
        date: day, app,
        minutes: Math.round(15 + Math.random() * (app === 'VS Code' ? 180 : app === 'YouTube' ? 90 : 60)),
      });
    });
  }

  store.state = state;
  store.persist();
  return true;
}
