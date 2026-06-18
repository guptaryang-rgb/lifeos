import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), '.mock-db.json');

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  effort: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  subtasks: { id: string; title: string; completed: boolean }[];
  linkedMilestone?: string;
  userEmail: string;
}

export interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  category: 'WORK' | 'PERSONAL' | 'ACADEMIC' | 'HEALTH' | 'LIFE';
  color: string;
  userEmail: string;
}

export interface Goal {
  id: string;
  title: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  due: string;
  milestones: { id: string; title: string; due: string; completed: boolean }[];
  userEmail: string;
}

export interface Habit {
  id: string;
  title: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  customDays?: string; // e.g. "2,4" for Tue, Thu
  streak: number;
  logs: string[]; // dates of completion
  userEmail: string;
}

export interface FocusSession {
  id: string;
  duration: number; // minutes
  timestamp: string;
  taskId?: string;
  userEmail: string;
}

export interface FoodLog {
  id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  meal: string;
  servingCount: number;
  date: string;
  userEmail: string;
}

export interface Workout {
  id: string;
  exerciseName: string;
  type: 'cardio' | 'strength';
  durationMinutes: number;
  distance?: number | null;
  weight?: number | null;
  sets?: number | null;
  reps?: number | null;
  calories: number;
  date: string;
  userEmail: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  userEmail: string;
}

export interface User {
  email: string;
  name: string;
  passwordHash: string;
  isPremium: boolean;
  stripeCustomerId?: string;
  subscriptionId?: string;
}

export interface DbState {
  users: User[];
  tasks: Task[];
  events: Event[];
  goals: Goal[];
  habits: Habit[];
  focusSessions: FocusSession[];
  foodLogs: FoodLog[];
  workouts: Workout[];
  transactions: Transaction[];
  activeEmail: string | null;
  distractionBlocked: boolean;
}

const DEFAULT_STATE: DbState = {
  users: [
    { email: 'john@example.com', name: 'John Doe', passwordHash: 'password123', isPremium: false }
  ],
  tasks: [],
  events: [],
  goals: [],
  habits: [],
  focusSessions: [],
  foodLogs: [],
  workouts: [],
  transactions: [],
  activeEmail: null,
  distractionBlocked: false
};

const SEEDED_STATE: DbState = {
  users: [
    { email: 'john@example.com', name: 'John Doe', passwordHash: 'password123', isPremium: false }
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Write CS101 Essay',
      dueDate: '2026-06-16',
      priority: 'HIGH',
      effort: 120,
      status: 'NOT_STARTED',
      subtasks: [],
      userEmail: 'john@example.com'
    },
    {
      id: 'task-2',
      title: 'Overdue Assignment',
      dueDate: '2026-06-15',
      priority: 'HIGH',
      effort: 60,
      status: 'OVERDUE',
      subtasks: [],
      userEmail: 'john@example.com'
    },
    {
      id: 'task-3',
      title: 'Review Notes',
      dueDate: '2026-06-16',
      priority: 'LOW',
      effort: 30,
      status: 'NOT_STARTED',
      subtasks: [],
      userEmail: 'john@example.com'
    }
  ],
  events: [
    {
      id: 'event-1',
      title: 'Physics 101 Lecture',
      start: '2026-06-16T14:00:00',
      end: '2026-06-16T16:00:00',
      category: 'WORK',
      color: 'blue',
      userEmail: 'john@example.com'
    }
  ],
  goals: [
    {
      id: 'goal-1',
      title: 'Cascade Goal G1',
      frequency: 'MONTHLY',
      due: '2026-07-31',
      milestones: [
        { id: 'milestone-1', title: 'Milestone M1', due: '2026-07-15', completed: false }
      ],
      userEmail: 'john@example.com'
    }
  ],
  habits: [
    {
      id: 'habit-1',
      title: 'Gym',
      frequency: 'DAILY',
      streak: 4,
      logs: ['2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15'],
      userEmail: 'john@example.com'
    }
  ],
  focusSessions: [],
  foodLogs: [],
  workouts: [],
  transactions: [],
  activeEmail: null,
  distractionBlocked: false
};

export function readDb(): DbState {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_STATE, null, 2));
    return DEFAULT_STATE;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.tasks) parsed.tasks = [];
    if (!parsed.events) parsed.events = [];
    if (!parsed.goals) parsed.goals = [];
    if (!parsed.habits) parsed.habits = [];
    if (!parsed.focusSessions) parsed.focusSessions = [];
    if (!parsed.foodLogs) parsed.foodLogs = [];
    if (!parsed.workouts) parsed.workouts = [];
    if (!parsed.transactions) parsed.transactions = [];
    return parsed;
  } catch (e) {
    return DEFAULT_STATE;
  }
}

export function writeDb(state: DbState) {
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2));
}

export function resetDb(seed: boolean) {
  const state = seed ? JSON.parse(JSON.stringify(SEEDED_STATE)) : JSON.parse(JSON.stringify(DEFAULT_STATE));
  writeDb(state);
}
