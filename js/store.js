// ============================================================
// store.js — Reactive store with pub/sub (no framework needed)
// All state lives here. Modules subscribe to slices they care about.
// ============================================================

const STORAGE_KEY = 'lifeos:v2';
const SCHEMA_VERSION = 2;

const DEFAULT_STATE = {
  user: {
    name: 'Alex Chen',
    role: 'CS Student',
    avatar: 'AC',
    premium: false,
    pinHash: null,
    autoLockMinutes: 0,
  },
  tasks: [],
  events: [],
  goals: [],
  milestones: [],
  habits: [],
  habitLogs: [],
  focusSessions: [],
  foodLogs: [],
  workouts: [],
  transactions: [],
  budget: {
    monthly: 1500,
    categories: {
      food: 400, transport: 150, entertainment: 120,
      shopping: 200, bills: 350, education: 200, other: 80
    }
  },
  wellness: {
    water: [],         // [{date, glasses}]
    sleep: [],         // [{date, hours, quality}]
    mood: [],          // [{date, score, note}]
    journal: [],       // [{id, date, title, body}]
    meditation: [],    // [{date, minutes}]
  },
  study: {
    decks: [],         // [{id, name, cards: [{id, front, back, lastReview, nextReview, box}]}]
  },
  screenTime: {
    daily: [],         // [{date, app, minutes}]
  },
  analytics: [],        // snapshots
  notifications: [],
  settings: {
    workStartHour: 9,
    workEndHour: 22,
    theme: 'dark',
    notificationsEnabled: true,
  },
  meta: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    schemaVersion: SCHEMA_VERSION,
  }
};

// Tiny reactive store
class Store {
  constructor(initial) {
    this.state = initial;
    this.listeners = new Map(); // key -> Set<fn>
    this._persistScheduled = false;
  }
  get(path) {
    return path.split('.').reduce((o, k) => (o ? o[k] : undefined), this.state);
  }
  set(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    let target = this.state;
    for (const k of keys) {
      if (target[k] === undefined) target[k] = {};
      target = target[k];
    }
    const prev = typeof target[last] === 'object' && target[last] !== null ? JSON.parse(JSON.stringify(target[last])) : target[last];
    target[last] = value;
    this._notify(path, value, prev);
    this._schedulePersist();
  }
  update(path, updater) {
    this.set(path, updater(this.get(path)));
  }
  // Push entire object into array at path
  push(path, item) {
    const arr = this.get(path) || [];
    this.set(path, [...arr, item]);
  }
  // Update item by id in an array
  patch(path, id, patch) {
    const arr = this.get(path) || [];
    this.set(path, arr.map(it => it.id === id ? { ...it, ...patch, updatedAt: Date.now() } : it));
  }
  remove(path, id) {
    const arr = this.get(path) || [];
    this.set(path, arr.filter(it => it.id !== id));
  }
  subscribe(path, fn) {
    if (!this.listeners.has(path)) this.listeners.set(path, new Set());
    this.listeners.get(path).add(fn);
    return () => this.listeners.get(path).delete(fn);
  }
  _notify(path, value, prev) {
    // Notify exact path + all parent prefixes
    const parts = path.split('.');
    for (let i = parts.length; i > 0; i--) {
      const p = parts.slice(0, i).join('.');
      const set = this.listeners.get(p);
      if (set) for (const fn of set) try { fn(value, prev, path); } catch (e) { console.error(e); }
    }
    // Notify wildcard '*'
    const wild = this.listeners.get('*');
    if (wild) for (const fn of wild) try { fn(value, prev, path); } catch (e) { console.error(e); }
  }
  _schedulePersist() {
    if (this._persistScheduled) return;
    this._persistScheduled = true;
    queueMicrotask(() => {
      this._persistScheduled = false;
      this.persist();
    });
  }
  persist() {
    try {
      this.state.meta.updatedAt = Date.now();
      this.state.meta.schemaVersion = SCHEMA_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) { console.warn('Persist failed:', e); }
  }
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      // shallow merge so new defaults appear
      this.state = deepMerge(DEFAULT_STATE, parsed);

      // Hydrate Date objects from JSON strings
      const hydrateDate = (v) => v ? new Date(v) : v;
      if (this.state.tasks) {
        this.state.tasks.forEach(t => {
          if (t.dueDate) t.dueDate = hydrateDate(t.dueDate);
          if (t.createdAt) t.createdAt = hydrateDate(t.createdAt);
          if (t.updatedAt) t.updatedAt = hydrateDate(t.updatedAt);
        });
      }
      if (this.state.events) {
        this.state.events.forEach(e => {
          if (e.startTime) e.startTime = hydrateDate(e.startTime);
          if (e.endTime) e.endTime = hydrateDate(e.endTime);
          if (e.createdAt) e.createdAt = hydrateDate(e.createdAt);
          if (e.updatedAt) e.updatedAt = hydrateDate(e.updatedAt);
        });
      }
      if (this.state.goals) {
        this.state.goals.forEach(g => {
          if (g.targetDate) g.targetDate = hydrateDate(g.targetDate);
          if (g.createdAt) g.createdAt = hydrateDate(g.createdAt);
        });
      }
      if (this.state.milestones) {
        this.state.milestones.forEach(m => {
          if (m.targetDate) m.targetDate = hydrateDate(m.targetDate);
        });
      }
      if (this.state.focusSessions) {
        this.state.focusSessions.forEach(fs => {
          if (fs.startTime) fs.startTime = hydrateDate(fs.startTime);
          if (fs.endTime) fs.endTime = hydrateDate(fs.endTime);
          if (fs.createdAt) fs.createdAt = hydrateDate(fs.createdAt);
        });
      }
      if (this.state.foodLogs) {
        this.state.foodLogs.forEach(fl => {
          if (fl.date) fl.date = hydrateDate(fl.date);
          if (fl.createdAt) fl.createdAt = hydrateDate(fl.createdAt);
        });
      }
      if (this.state.workouts) {
        this.state.workouts.forEach(w => {
          if (w.date) w.date = hydrateDate(w.date);
          if (w.createdAt) w.createdAt = hydrateDate(w.createdAt);
        });
      }
      if (this.state.transactions) {
        this.state.transactions.forEach(tx => {
          if (tx.date) tx.date = hydrateDate(tx.date);
          if (tx.createdAt) tx.createdAt = hydrateDate(tx.createdAt);
        });
      }
      // Wellness hydration
      if (this.state.wellness) {
        if (this.state.wellness.water) {
          this.state.wellness.water.forEach(item => { if (item.date) item.date = hydrateDate(item.date); });
        }
        if (this.state.wellness.sleep) {
          this.state.wellness.sleep.forEach(item => { if (item.date) item.date = hydrateDate(item.date); });
        }
        if (this.state.wellness.mood) {
          this.state.wellness.mood.forEach(item => { if (item.date) item.date = hydrateDate(item.date); });
        }
        if (this.state.wellness.journal) {
          this.state.wellness.journal.forEach(item => { if (item.date) item.date = hydrateDate(item.date); });
        }
        if (this.state.wellness.meditation) {
          this.state.wellness.meditation.forEach(item => { if (item.date) item.date = hydrateDate(item.date); });
        }
      }
      // Study hydration
      if (this.state.study && this.state.study.decks) {
        this.state.study.decks.forEach(d => {
          if (d.cards) {
            d.cards.forEach(c => {
              if (c.lastReview) c.lastReview = hydrateDate(c.lastReview);
              if (c.nextReview) c.nextReview = hydrateDate(c.nextReview);
            });
          }
        });
      }

      return true;
    } catch (e) { console.warn('Load failed:', e); return false; }
  }
  reset() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.persist();
  }
}

function deepMerge(target, source) {
  if (Array.isArray(source)) return source.slice();
  if (source && typeof source === 'object') {
    const out = { ...target };
    for (const k of Object.keys(source)) {
      out[k] = source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])
        ? deepMerge(target?.[k] || {}, source[k])
        : source[k];
    }
    return out;
  }
  return source;
}

export const store = new Store(DEFAULT_STATE);
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
export const daysAgo = (n) => {
  const d = today();
  d.setDate(d.getDate() - n);
  return d;
};
export const fmtDate = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
export const fmtTime = (d) => {
  const dt = new Date(d);
  return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
export const fmtDay = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { weekday: 'short' });
};
export const isoDate = (d) => {
  const dt = new Date(d);
  return dt.toISOString().slice(0, 10);
};
export const isToday = (d) => {
  if (!d) return false;
  const dt = new Date(d);
  const now = new Date();
  return dt.getFullYear() === now.getFullYear() &&
         dt.getMonth() === now.getMonth() &&
         dt.getDate() === now.getDate();
};
export const minutesAgo = (n) => new Date(Date.now() - n * 60000);
