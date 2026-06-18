/* =========================================================
 *  LifeOS — Life Timeline Module
 *  Chronological view aggregating tasks, goals, habits,
 *  focus sessions, and events into a beautiful vertical feed
 * ========================================================= */
const Timeline = (function () {
  'use strict';

  /* ---------- type palette ---------- */
  const TYPE_META = {
    task:      { icon: '✅', color: '#6c5ce7', label: 'Task' },
    goal:      { icon: '🎯', color: '#e17055', label: 'Goal' },
    habit:     { icon: '🔥', color: '#00b894', label: 'Habit' },
    focus:     { icon: '🧠', color: '#0984e3', label: 'Focus' },
    event:     { icon: '📅', color: '#fdcb6e', label: 'Event' },
    milestone: { icon: '🏆', color: '#d63031', label: 'Milestone' },
  };

  /* ---------- state ---------- */
  let _filter    = 'all';   // all | tasks | goals | habits | focus | milestones | events
  let _range     = 30;      // days
  let _container = null;
  let _observer  = null;    // IntersectionObserver for scroll animation

  /* ====================================================
   *  CSS injection
   * ==================================================== */
  function injectStyles() {
    if (document.getElementById('tl-styles')) return;
    const s = document.createElement('style');
    s.id = 'tl-styles';
    s.textContent = `
      /* --- controls --- */
      .tl-controls{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;align-items:center}
      .tl-controls select,.tl-controls input{padding:6px 10px;border:1px solid var(--border,#dfe6e9);border-radius:8px;font-size:.85rem;background:var(--bg-card,#fff)}
      .tl-pill{padding:5px 14px;border-radius:20px;cursor:pointer;font-size:.82rem;border:1px solid var(--border,#dfe6e9);background:var(--bg-card,#fff);transition:all .2s}
      .tl-pill.active{background:#6c5ce7;color:#fff;border-color:#6c5ce7}

      /* --- stats banner --- */
      .tl-stats{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:22px}
      .tl-stat{flex:1 1 110px;background:var(--bg-card,#fff);border-radius:10px;padding:12px 16px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.05)}
      .tl-stat-val{font-size:1.4rem;font-weight:700}
      .tl-stat-lbl{font-size:.74rem;color:var(--text-muted,#888);margin-top:2px}

      /* --- timeline --- */
      .tl-wrap{position:relative;padding-left:42px}
      .tl-wrap::before{content:'';position:absolute;left:18px;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#6c5ce7,#00b894);border-radius:2px;opacity:.25}

      /* date group header */
      .tl-date-header{font-size:.82rem;font-weight:700;color:var(--text-muted,#636e72);padding:18px 0 6px;position:relative}
      .tl-date-header::before{content:'';position:absolute;left:-30px;top:22px;width:11px;height:11px;border-radius:50%;background:#b2bec3;border:2px solid var(--bg-secondary,#f5f6fa)}

      /* entry */
      .tl-entry{position:relative;margin-bottom:16px;opacity:0;transform:translateY(20px);transition:opacity .45s ease,transform .45s ease}
      .tl-entry.visible{opacity:1;transform:translateY(0)}
      .tl-entry::before{content:'';position:absolute;left:-30px;top:16px;width:11px;height:11px;border-radius:50%;border:2px solid var(--bg-secondary,#f5f6fa);background:#6c5ce7}

      .tl-card{background:var(--bg-card,#fff);border-radius:10px;padding:14px 16px;box-shadow:0 1px 6px rgba(0,0,0,.06);border-left:4px solid #6c5ce7;transition:transform .15s,box-shadow .15s}
      .tl-card:hover{transform:translateX(4px);box-shadow:0 4px 14px rgba(0,0,0,.1)}
      .tl-card-head{display:flex;align-items:center;gap:8px;margin-bottom:4px}
      .tl-icon{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
      .tl-card-title{font-weight:600;font-size:.92rem}
      .tl-card-sub{font-size:.78rem;color:var(--text-muted,#888);margin-top:2px}
      .tl-card-time{font-size:.72rem;color:var(--text-muted,#aaa);margin-left:auto;white-space:nowrap}

      .tl-empty{text-align:center;padding:48px 16px;color:var(--text-muted,#b2bec3)}

      /* mobile */
      @media(max-width:600px){
        .tl-wrap{padding-left:32px}
        .tl-wrap::before{left:12px}
        .tl-date-header::before{left:-24px}
        .tl-entry::before{left:-24px}
      }
    `;
    document.head.appendChild(s);
  }

  /* ====================================================
   *  Data collection
   * ==================================================== */
  function safeList(module) {
    return (typeof LifeOS !== 'undefined' && LifeOS[module] && LifeOS[module].list)
      ? LifeOS[module].list()
      : [];
  }

  function cutoffDate() {
    const d = new Date();
    d.setDate(d.getDate() - _range);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getTimelineEntries() {
    const cutoff  = cutoffDate();
    const entries = [];

    /* 1. Completed tasks */
    safeList('Tasks').forEach(t => {
      if (t.status !== 'completed' || !t.completedAt) return;
      const d = new Date(t.completedAt);
      if (d < cutoff) return;
      entries.push({
        date: d, type: 'task', icon: '✅',
        title: t.title,
        subtitle: t.category ? `Category: ${t.category}` : '',
        color: TYPE_META.task.color,
        data: t,
      });
    });

    /* 2. Goal milestones / completions */
    safeList('Goals').forEach(g => {
      if (g.completedAt) {
        const d = new Date(g.completedAt);
        if (d >= cutoff) {
          entries.push({
            date: d, type: 'milestone', icon: '🏆',
            title: `Goal achieved: ${g.title || g.name}`,
            subtitle: g.description || '',
            color: TYPE_META.milestone.color,
            data: g,
          });
        }
      }
      /* goal created */
      if (g.createdAt) {
        const d = new Date(g.createdAt);
        if (d >= cutoff) {
          entries.push({
            date: d, type: 'goal', icon: '🎯',
            title: `Goal created: ${g.title || g.name}`,
            subtitle: g.description || '',
            color: TYPE_META.goal.color,
            data: g,
          });
        }
      }
      /* milestones array */
      (g.milestones || []).forEach(m => {
        if (!m.completedAt) return;
        const d = new Date(m.completedAt);
        if (d < cutoff) return;
        entries.push({
          date: d, type: 'milestone', icon: '🏆',
          title: m.title || m.name || 'Milestone reached',
          subtitle: `Goal: ${g.title || g.name}`,
          color: TYPE_META.milestone.color,
          data: m,
        });
      });
    });

    /* 3. Habit streaks */
    safeList('Habits').forEach(h => {
      const log = h.log || h.completions || [];
      log.forEach(entry => {
        const dateStr = typeof entry === 'string' ? entry : entry.date;
        if (!dateStr) return;
        const d = new Date(dateStr);
        if (d < cutoff) return;
        entries.push({
          date: d, type: 'habit', icon: '🔥',
          title: `${h.title || h.name}`,
          subtitle: entry.note || (h.currentStreak ? `${h.currentStreak}-day streak` : 'Completed'),
          color: TYPE_META.habit.color,
          data: h,
        });
      });
    });

    /* 4. Focus sessions */
    safeList('FocusSessions').forEach(s => {
      if (!s.endTime && !s.completedAt) return;
      const d = new Date(s.endTime || s.completedAt);
      if (d < cutoff) return;
      const mins = s.duration || Math.round((new Date(s.endTime) - new Date(s.startTime)) / 60000) || 0;
      entries.push({
        date: d, type: 'focus', icon: '🧠',
        title: s.title || 'Focus Session',
        subtitle: `${mins} min focused`,
        color: TYPE_META.focus.color,
        data: s,
      });
    });

    /* 5. Events attended */
    safeList('Events').forEach(evt => {
      const d = new Date(evt.startDate || evt.date || evt.start);
      if (isNaN(d) || d < cutoff) return;
      /* include past events up to today and future within range */
      entries.push({
        date: d, type: 'event', icon: '📅',
        title: evt.title,
        subtitle: evt.location || evt.description || '',
        color: TYPE_META.event.color,
        data: evt,
      });
    });

    /* sort newest first */
    entries.sort((a, b) => b.date - a.date);
    return entries;
  }

  /* ====================================================
   *  Date formatting helpers
   * ==================================================== */
  function dateBucket(d) {
    const today = new Date(); today.setHours(0,0,0,0);
    const dt    = new Date(d);  dt.setHours(0,0,0,0);
    const diff  = Math.round((today - dt) / 864e5);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)  return dt.toLocaleDateString(undefined, { weekday: 'long' });
    return dt.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: dt.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  }

  function timeStr(d) {
    return new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  /* ====================================================
   *  Stats
   * ==================================================== */
  function getStats() {
    const entries = getTimelineEntries();
    const stats = {
      tasksCompleted : 0,
      goalsAchieved  : 0,
      focusMinutes   : 0,
      bestStreak     : 0,
      mostProductiveDay : '—',
    };

    const dayCount = {};

    entries.forEach(e => {
      if (e.type === 'task')      { stats.tasksCompleted++; }
      if (e.type === 'milestone') { stats.goalsAchieved++; }
      if (e.type === 'focus')     { stats.focusMinutes += (e.data.duration || 0); }
      if (e.type === 'habit') {
        const streak = e.data.currentStreak || e.data.streak || 0;
        if (streak > stats.bestStreak) stats.bestStreak = streak;
      }

      const dayKey = e.date.toISOString().slice(0, 10);
      dayCount[dayKey] = (dayCount[dayKey] || 0) + 1;
    });

    let maxDay = 0;
    Object.entries(dayCount).forEach(([day, cnt]) => {
      if (cnt > maxDay) { maxDay = cnt; stats.mostProductiveDay = dateBucket(new Date(day)); }
    });

    return stats;
  }

  /* ====================================================
   *  Renderers
   * ==================================================== */

  function renderEntry(entry) {
    const el = document.createElement('div');
    el.className = 'tl-entry';

    const meta = TYPE_META[entry.type] || TYPE_META.task;
    el.querySelector; // no-op, just to keep closure alive

    /* bullet color override */
    el.style.setProperty('--entry-color', entry.color || meta.color);
    el.innerHTML = `
      <div class="tl-card" style="border-left-color:${entry.color || meta.color}">
        <div class="tl-card-head">
          <span class="tl-icon" style="background:${entry.color || meta.color}22;color:${entry.color || meta.color}">${entry.icon}</span>
          <span class="tl-card-title">${escHtml(entry.title)}</span>
          <span class="tl-card-time">${timeStr(entry.date)}</span>
        </div>
        ${entry.subtitle ? `<div class="tl-card-sub">${escHtml(entry.subtitle)}</div>` : ''}
      </div>`;

    /* color the bullet pseudo-element */
    const bulletColor = entry.color || meta.color;
    el.style.cssText += `; --bullet: ${bulletColor}`;
    /* inline override for ::before via custom property */
    el.querySelectorAll('.tl-card')[0]; // reference kept

    return el;
  }

  function renderControls() {
    const bar = document.createElement('div');
    bar.className = 'tl-controls';

    /* filter pills */
    const types = ['all', 'tasks', 'goals', 'habits', 'focus', 'events', 'milestones'];
    types.forEach(t => {
      const pill = document.createElement('span');
      pill.className = 'tl-pill' + (t === _filter ? ' active' : '');
      pill.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      pill.addEventListener('click', () => setFilter(t));
      bar.appendChild(pill);
    });

    /* range select */
    const sel = document.createElement('select');
    [7, 14, 30, 60, 90, 365].forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d <= 30 ? `${d} days` : d < 365 ? `${Math.round(d / 30)} months` : '1 year';
      if (d === _range) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', e => setRange(Number(e.target.value)));
    bar.appendChild(sel);

    return bar;
  }

  function renderStats() {
    const s = getStats();
    const wrap = document.createElement('div');
    wrap.className = 'tl-stats';
    const items = [
      { val: s.tasksCompleted,  lbl: 'Tasks Done' },
      { val: s.goalsAchieved,   lbl: 'Goals Hit' },
      { val: `${Math.round(s.focusMinutes / 60 * 10) / 10}h`, lbl: 'Focus Time' },
      { val: s.bestStreak,      lbl: 'Best Streak' },
      { val: s.mostProductiveDay, lbl: 'Top Day' },
    ];
    items.forEach(i => {
      const d = document.createElement('div');
      d.className = 'tl-stat';
      d.innerHTML = `<div class="tl-stat-val">${escHtml(String(i.val))}</div><div class="tl-stat-lbl">${escHtml(i.lbl)}</div>`;
      wrap.appendChild(d);
    });
    return wrap;
  }

  /* ---------- main render ---------- */
  function render(container) {
    injectStyles();
    _container = container;
    container.innerHTML = '';

    container.appendChild(renderControls());
    container.appendChild(renderStats());

    let entries = getTimelineEntries();

    /* apply type filter */
    if (_filter !== 'all') {
      const typeMap = { tasks: 'task', goals: 'goal', habits: 'habit', focus: 'focus', events: 'event', milestones: 'milestone' };
      const ft = typeMap[_filter];
      if (ft) entries = entries.filter(e => e.type === ft);
    }

    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'tl-empty';
      empty.innerHTML = '<p>No timeline entries yet.</p><p style="font-size:.85rem">Complete tasks, log habits, and run focus sessions to build your timeline!</p>';
      container.appendChild(empty);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'tl-wrap';

    /* group by date bucket */
    let lastBucket = '';
    entries.forEach(entry => {
      const bucket = dateBucket(entry.date);
      if (bucket !== lastBucket) {
        const hdr = document.createElement('div');
        hdr.className = 'tl-date-header';
        hdr.textContent = bucket;
        wrap.appendChild(hdr);
        lastBucket = bucket;
      }
      const el = renderEntry(entry);
      wrap.appendChild(el);
    });

    container.appendChild(wrap);

    /* scroll-based animation via IntersectionObserver */
    if (_observer) _observer.disconnect();
    _observer = new IntersectionObserver((items) => {
      items.forEach(item => {
        if (item.isIntersecting) {
          item.target.classList.add('visible');
          _observer.unobserve(item.target);
        }
      });
    }, { threshold: 0.15 });

    wrap.querySelectorAll('.tl-entry').forEach(el => _observer.observe(el));

    /* inject per-entry bullet colour via CSS custom property */
    wrap.querySelectorAll('.tl-entry').forEach(el => {
      const card = el.querySelector('.tl-card');
      if (card) {
        const c = card.style.borderLeftColor;
        el.style.setProperty('--bullet-color', c);
      }
    });

    /* override ::before colours (need a <style> per entry since we can't style pseudo-elements inline) */
    const dynStyle = document.createElement('style');
    let css = '';
    wrap.querySelectorAll('.tl-entry').forEach((el, i) => {
      el.setAttribute('data-tl-idx', i);
      const card = el.querySelector('.tl-card');
      const c = card ? card.style.borderLeftColor : '#6c5ce7';
      css += `.tl-entry[data-tl-idx="${i}"]::before{background:${c} !important}\n`;
    });
    dynStyle.textContent = css;
    container.appendChild(dynStyle);
  }

  /* ====================================================
   *  Filter / Range setters
   * ==================================================== */
  function setFilter(type) {
    _filter = type;
    if (_container) render(_container);
  }

  function setRange(days) {
    _range = days;
    if (_container) render(_container);
  }

  /* ====================================================
   *  Public API
   * ==================================================== */
  return {
    get filter() { return _filter; },
    get range()  { return _range; },

    render,
    getTimelineEntries,
    renderEntry,
    setFilter,
    setRange,
    getStats,
  };
})();
