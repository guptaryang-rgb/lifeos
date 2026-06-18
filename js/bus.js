// ============================================================
// bus.js — Tiny event bus for cross-module messaging
// ============================================================

class EventBus {
  constructor() { this.listeners = new Map(); }
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    const set = this.listeners.get(event);
    if (set) set.delete(fn);
  }
  emit(event, payload) {
    const set = this.listeners.get(event);
    if (set) for (const fn of set) try { fn(payload); } catch (e) { console.error(e); }
    // Also fire wildcard subscribers
    const wild = this.listeners.get('*');
    if (wild) for (const fn of wild) try { fn({ event, payload }); } catch (e) { console.error(e); }
  }
}
export const bus = new EventBus();

// Common events
export const EVENTS = {
  NAV: 'nav',
  TOAST: 'toast',
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',
  TASK_ADDED: 'task:added',
  TASK_DONE: 'task:done',
  EVENT_ADDED: 'event:added',
  FOCUS_START: 'focus:start',
  FOCUS_END: 'focus:end',
  HABIT_DONE: 'habit:done',
  SECRETARY_CMD: 'secretary:cmd',
  DATA_CHANGED: 'data:changed',
};

// Toast helper
export function toast({ kind = 'info', title, body, timeout = 3500 }) {
  bus.emit(EVENTS.TOAST, { kind, title, body, id: Math.random().toString(36).slice(2) });
}
