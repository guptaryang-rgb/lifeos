/* =========================================================
 *  LifeOS — Smart Notification Engine
 *  Browser notifications with configurable rule-based checks
 * ========================================================= */
const Notifications = (function () {
  'use strict';

  const STORAGE_KEY  = 'lifeos_notification_rules';
  const SENT_KEY     = 'lifeos_notif_sent';   // dedup cache
  const CHECK_INTERVAL_MS = 60000;            // 60 seconds

  let _intervalId = null;
  let isEnabled   = false;

  /* ---------- default rules ---------- */
  const defaultRules = [
    { id: 'event_reminder',  type: 'event_reminder',  config: { minutesBefore: 15 },              enabled: true },
    { id: 'deadline_warning',type: 'deadline_warning', config: { hoursBefore: [24, 4, 1] },        enabled: true },
    { id: 'habit_reminder',  type: 'habit_reminder',   config: { times: ['09:00', '21:00'] },      enabled: true },
    { id: 'break_reminder',  type: 'break_reminder',   config: { afterMinutes: 90 },               enabled: true },
    { id: 'overdue_alert',   type: 'overdue_alert',    config: { checkInterval: 60 },              enabled: true },
  ];

  /* ====================================================
   *  Persistence helpers
   * ==================================================== */
  function loadRules() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function saveRules(rules) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  }

  function getRules() {
    let rules = loadRules();
    if (!rules || !rules.length) {
      rules = JSON.parse(JSON.stringify(defaultRules));
      saveRules(rules);
    }
    return rules;
  }

  function ruleById(id) {
    return getRules().find(r => r.id === id) || null;
  }

  /* ---------- dedup: avoid spamming the same notification ---------- */
  function sentCache() {
    try { return JSON.parse(localStorage.getItem(SENT_KEY) || '{}'); } catch (_) { return {}; }
  }

  function markSent(key, ttlMs) {
    const cache = sentCache();
    cache[key] = Date.now() + (ttlMs || 300000); // default 5 min cooldown
    /* prune expired */
    const now = Date.now();
    Object.keys(cache).forEach(k => { if (cache[k] < now) delete cache[k]; });
    localStorage.setItem(SENT_KEY, JSON.stringify(cache));
  }

  function alreadySent(key) {
    const cache = sentCache();
    return cache[key] && cache[key] > Date.now();
  }

  /* ====================================================
   *  Permission API
   * ==================================================== */
  function hasPermission() {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  }

  async function requestPermission() {
    if (typeof Notification === 'undefined') {
      console.warn('[Notifications] Browser does not support notifications.');
      return false;
    }
    if (Notification.permission === 'granted') { isEnabled = true; return true; }
    if (Notification.permission === 'denied')  { isEnabled = false; return false; }

    const result = await Notification.requestPermission();
    isEnabled = result === 'granted';
    return isEnabled;
  }

  /* ====================================================
   *  Send notification
   * ==================================================== */
  function send(title, body, options) {
    if (!hasPermission()) return null;

    const opts = Object.assign({
      body,
      icon: options && options.icon  || '/img/logo-192.png',
      badge: '/img/logo-72.png',
      tag: options && options.tag    || undefined,
      requireInteraction: false,
      silent: false,
    }, options || {});

    try {
      const n = new Notification(title, opts);

      n.onclick = function () {
        window.focus();
        if (opts.onClick) opts.onClick();
        n.close();
      };

      /* auto-close after 8 seconds */
      setTimeout(() => n.close(), 8000);

      return n;
    } catch (err) {
      console.error('[Notifications] send error:', err);
      return null;
    }
  }

  /* ====================================================
   *  Rule-based checkers
   * ==================================================== */

  /* --- 1. Event reminders --- */
  function checkEventReminders() {
    const rule = ruleById('event_reminder');
    if (!rule || !rule.enabled) return;

    const events = (typeof LifeOS !== 'undefined' && LifeOS.Events)
      ? LifeOS.Events.list()
      : [];

    const now = Date.now();
    const minsBefore = rule.config.minutesBefore || 15;
    const windowMs   = minsBefore * 60000;

    events.forEach(evt => {
      const start = new Date(evt.startDate || evt.date || evt.start);
      if (isNaN(start)) return;
      const diff = start.getTime() - now;
      /* within reminder window and hasn't already passed */
      if (diff > 0 && diff <= windowMs) {
        const key = `evt_${evt.id}_${minsBefore}`;
        if (alreadySent(key)) return;
        send('📅 Upcoming Event', `"${evt.title}" starts in ${Math.ceil(diff / 60000)} min`, { tag: key });
        markSent(key, windowMs);
      }
    });
  }

  /* --- 2. Deadline warnings --- */
  function checkDeadlineWarnings() {
    const rule = ruleById('deadline_warning');
    if (!rule || !rule.enabled) return;

    const tasks = (typeof LifeOS !== 'undefined' && LifeOS.Tasks)
      ? LifeOS.Tasks.list().filter(t => t.dueDate && t.status !== 'completed')
      : [];

    const now = Date.now();
    const hoursBefore = rule.config.hoursBefore || [24, 4, 1];

    tasks.forEach(task => {
      const due = new Date(task.dueDate);
      if (isNaN(due)) return;
      const diffH = (due.getTime() - now) / 3600000;

      hoursBefore.forEach(h => {
        if (diffH > 0 && diffH <= h) {
          const key = `dl_${task.id}_${h}h`;
          if (alreadySent(key)) return;
          const label = h >= 24 ? `${Math.round(h / 24)} day(s)` : `${h} hour(s)`;
          send('⏰ Deadline Approaching', `"${task.title}" is due in ${label}`, { tag: key });
          markSent(key, h * 3600000);
        }
      });
    });
  }

  /* --- 3. Habit reminders --- */
  function checkHabitReminders() {
    const rule = ruleById('habit_reminder');
    if (!rule || !rule.enabled) return;

    const habits = (typeof LifeOS !== 'undefined' && LifeOS.Habits)
      ? LifeOS.Habits.list()
      : [];
    if (!habits.length) return;

    const now   = new Date();
    const hhmm  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const times = rule.config.times || ['09:00', '21:00'];

    /* check if current time matches any configured reminder time (within ±1 min) */
    const matched = times.some(t => {
      const [th, tm] = t.split(':').map(Number);
      return Math.abs(now.getHours() * 60 + now.getMinutes() - (th * 60 + tm)) <= 1;
    });
    if (!matched) return;

    const todayStr = now.toISOString().slice(0, 10);
    const pending  = habits.filter(h => {
      if (!h.active && h.active !== undefined) return false;
      const log = h.log || h.completions || [];
      return !log.some(l => (l.date || l) === todayStr);
    });

    if (pending.length) {
      const key = `habit_${todayStr}_${hhmm}`;
      if (alreadySent(key)) return;
      const names = pending.slice(0, 3).map(h => h.title || h.name).join(', ');
      const extra = pending.length > 3 ? ` and ${pending.length - 3} more` : '';
      send('✅ Habit Check-in', `Pending: ${names}${extra}`, { tag: key });
      markSent(key, 300000);
    }
  }

  /* --- 4. Break reminder (Pomodoro-style) --- */
  function checkBreakReminders() {
    const rule = ruleById('break_reminder');
    if (!rule || !rule.enabled) return;

    if (typeof LifeOS === 'undefined' || !LifeOS.FocusSessions) return;
    const sessions = LifeOS.FocusSessions.list ? LifeOS.FocusSessions.list() : [];

    /* find any session that is currently active (started but not ended) */
    const active = sessions.find(s => s.startTime && !s.endTime);
    if (!active) return;

    const elapsed = (Date.now() - new Date(active.startTime).getTime()) / 60000;
    const limit   = rule.config.afterMinutes || 90;

    if (elapsed >= limit) {
      const key = `break_${active.id}_${Math.floor(elapsed / limit)}`;
      if (alreadySent(key)) return;
      send('🧘 Time for a Break', `You've been focused for ${Math.round(elapsed)} minutes — stretch and hydrate!`, { tag: key });
      markSent(key, limit * 60000);
    }
  }

  /* --- 5. Overdue alerts --- */
  function checkOverdueAlerts() {
    const rule = ruleById('overdue_alert');
    if (!rule || !rule.enabled) return;

    const tasks = (typeof LifeOS !== 'undefined' && LifeOS.Tasks)
      ? LifeOS.Tasks.list().filter(t => t.dueDate && t.status !== 'completed')
      : [];

    const now  = Date.now();
    const overdue = tasks.filter(t => new Date(t.dueDate).getTime() < now);

    if (overdue.length) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const key = `overdue_${todayStr}`;
      if (alreadySent(key)) return;
      const names = overdue.slice(0, 3).map(t => t.title).join(', ');
      const extra = overdue.length > 3 ? ` (+${overdue.length - 3} more)` : '';
      send('🚨 Overdue Tasks', `${names}${extra}`, { tag: key });
      markSent(key, (rule.config.checkInterval || 60) * 60000);
    }
  }

  /* ====================================================
   *  Master check
   * ==================================================== */
  function checkAll() {
    if (!hasPermission()) return;
    checkEventReminders();
    checkDeadlineWarnings();
    checkHabitReminders();
    checkBreakReminders();
    checkOverdueAlerts();
  }

  /* ====================================================
   *  Engine start / stop
   * ==================================================== */
  function startEngine() {
    if (_intervalId) return; // already running
    if (!hasPermission()) {
      requestPermission().then(granted => {
        if (granted) _boot();
      });
      return;
    }
    _boot();
  }

  function _boot() {
    isEnabled = true;
    checkAll(); // immediate first check
    _intervalId = setInterval(checkAll, CHECK_INTERVAL_MS);
    console.log('[Notifications] Engine started — checking every 60 s');
  }

  function stopEngine() {
    if (_intervalId) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
    isEnabled = false;
    console.log('[Notifications] Engine stopped');
  }

  /* ====================================================
   *  Settings helpers
   * ==================================================== */
  function toggleRule(ruleId) {
    const rules = getRules();
    const r = rules.find(x => x.id === ruleId);
    if (r) {
      r.enabled = !r.enabled;
      saveRules(rules);
    }
    return r;
  }

  function updateRule(ruleId, config) {
    const rules = getRules();
    const r = rules.find(x => x.id === ruleId);
    if (r) {
      Object.assign(r.config, config);
      saveRules(rules);
    }
    return r;
  }

  /* ====================================================
   *  Public API
   * ==================================================== */
  return {
    get isEnabled() { return isEnabled; },
    get rules()     { return getRules(); },
    defaultRules,

    /* permission */
    requestPermission,
    hasPermission,

    /* send */
    send,

    /* engine */
    startEngine,
    stopEngine,
    checkAll,
    checkEventReminders,
    checkDeadlineWarnings,
    checkHabitReminders,
    checkBreakReminders,
    checkOverdueAlerts,

    /* settings */
    getRules,
    toggleRule,
    updateRule,
  };
})();
