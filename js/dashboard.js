// ============================================================
// dashboard.js — Unified dashboard with daily briefing + widgets
// ============================================================
import { store, today, fmtDate, fmtTime, fmtDay, isToday, daysAgo } from './store.js';
import { bus, EVENTS, toast } from './bus.js';
import { h, icon, chip, modal, celebrate } from './utils.js';
import { generateSuggestedSchedule, calculateBurnoutRisk, burnoutColor } from './planner.js';

export const meta = { title: 'Dashboard', eyebrow: 'Today' };

const DAY_MS = 86400000;

export function render(root) {
  const tasks = store.get('tasks') || [];
  const events = store.get('events') || [];
  const habits = store.get('habits') || [];
  const habitLogs = store.get('habitLogs') || [];
  const sessions = store.get('focusSessions') || [];
  const goals = store.get('goals') || [];

  // --- Daily briefing ---
  const todaysEvents = events.filter(e => isToday(e.startTime)).sort((a, b) => a.startTime - b.startTime);
  const upcomingTasks = tasks.filter(t => t.status !== 'COMPLETED').sort((a, b) => {
    if (a.priority !== b.priority) return priorityRank(b.priority) - priorityRank(a.priority);
    return a.dueDate - b.dueDate;
  }).slice(0, 4);

  // --- Computed metrics ---
  const tasksToday = tasks.filter(t => t.status === 'COMPLETED' && Date.now() - (t.completedAt || t.updatedAt) < DAY_MS).length;
  const focusMinsToday = sessions.filter(s => Date.now() - s.startTime < DAY_MS).reduce((sum, s) => sum + s.duration, 0);
  const habitsDoneToday = habitLogs.filter(l => Date.now() - l.completedAt < DAY_MS).length;
  const habitsTotal = habits.length;
  const lifeScore = computeLifeScore(tasks, habits, habitLogs, sessions);

  // --- Burnout ---
  const workloadDensity = todaysEvents.length / 8; // simplistic ratio
  const missedCount = tasks.filter(t => t.status === 'OVERDUE' || (t.status !== 'COMPLETED' && t.dueDate < Date.now())).length;
  const streakDecline = 0.2;
  const focusTrend = 0.05;
  const burnout = calculateBurnoutRisk(workloadDensity, missedCount, streakDecline, focusTrend);

  root.appendChild(
    h('div.card.briefing', {},
      h('div.card-glow', {}),
      h('div.briefing-inner', {},
        h('div.briefing-greeting', {}, greeting()),
        h('div.briefing-headline', {}, briefingHeadline(todaysEvents, upcomingTasks, focusMinsToday)),
        h('div.briefing-summary', {}, briefingSummary(todaysEvents, upcomingTasks, focusMinsToday)),
        h('div.briefing-actions', {},
          h('button.btn.btn-primary', { onclick: () => location.hash = 'planner' },
            icon('sparkle', 14), 'Plan my day'),
          h('button.btn.btn-secondary', { onclick: () => location.hash = 'focus' },
            icon('play', 14), 'Start focus session'),
          h('button.btn.btn-ghost', { onclick: () => location.hash = 'tasks' },
            icon('plus', 14), 'Add task'),
        ),
        h('div.briefing-stats', {},
          statTile('Tasks today', tasksToday, '+', 'var(--success)'),
          statTile('Focus time', Math.round(focusMinsToday), 'min'),
          statTile('Habits', `${habitsDoneToday}/${habitsTotal}`),
          statTile('Life score', lifeScore, '/100', lifeScoreColor(lifeScore)),
        ),
      )
    )
  );

  // --- 2-column layout: today's plan | side widgets ---
  const grid = h('div.grid.grid-2', { style: { gridTemplateColumns: '1.6fr 1fr' } });

  // LEFT: Today's plan
  const planCard = h('div.card.span-2', {});
  const planBody = h('div.card-body', {});
  planCard.appendChild(h('div.card-header', {},
    h('div', {},
      h('div.card-title', {}, icon('calendar', 16), ' Today\'s plan'),
      h('div.card-subtitle', {}, `${todaysEvents.length} events · ${upcomingTasks.length} priority tasks`)
    ),
    h('div.row', {},
      h('button.btn.btn-sm.btn-ghost', { onclick: () => openAddEventModal() }, icon('plus', 12), ' Event'),
      h('button.btn.btn-sm.btn-ghost', { onclick: () => openAddTaskModal() }, icon('plus', 12), ' Task'),
    )
  ));

  if (todaysEvents.length === 0 && upcomingTasks.length === 0) {
    planBody.appendChild(h('div.empty', {},
      h('div.empty-icon', {}, '✨'),
      h('div.empty-title', {}, 'Your day is wide open'),
      h('div.empty-sub', {}, 'Add a task or event to start building your schedule.')
    ));
  }

  if (todaysEvents.length > 0) {
    planBody.appendChild(h('div', { style: { fontSize: '11px', fontWeight: 600, color: 'var(--text-40)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '4px' } }, 'Events'));
    todaysEvents.forEach(ev => {
      planBody.appendChild(eventRow(ev));
    });
  }

  if (upcomingTasks.length > 0) {
    const gap = h('div', { style: { height: '8px' } });
    planBody.appendChild(gap);
    planBody.appendChild(h('div', { style: { fontSize: '11px', fontWeight: 600, color: 'var(--text-40)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '4px' } }, 'Top priorities'));
    upcomingTasks.forEach(t => {
      planBody.appendChild(taskRow(t));
    });
  }

  planCard.appendChild(planBody);
  grid.appendChild(planCard);

  // RIGHT column — Burnout gauge + habit ring + goal progress
  const sideCol = h('div.col', {});

  // Burnout card
  const burnoutColorVal = burnoutColor(burnout.score);
  sideCol.appendChild(
    h('div.card', {},
      h('div.card-header', {},
        h('div', {},
          h('div.card-title', {}, icon('heart', 16), ' Burnout risk'),
          h('div.card-subtitle', {}, 'Real-time heuristic')
        ),
      ),
      h('div.burnout', { style: { position: 'relative' } },
        h('div.burnout-gauge', { html: burnoutGaugeSvg(burnout.score, burnoutColorVal) }),
        h('div.burnout-text', {},
          h('div.burnout-score', { style: { color: burnoutColorVal } }, burnout.score),
          h('div.burnout-label', {}, 'Workload health'),
        ),
      ),
      h('div.burnout-recs', { style: { marginTop: '12px' } },
        ...burnout.recommendations.slice(0, 2).map(r =>
          h('div.burnout-rec', {}, r)
        )
      ),
    )
  );

  // Goal progress card
  const topGoal = goals[0];
  if (topGoal) {
    sideCol.appendChild(
      h('div.card', {},
        h('div.card-header', {},
          h('div', {},
            h('div.card-title', {}, icon('target', 16), ' Featured goal'),
            h('div.card-subtitle', {}, fmtDate(topGoal.targetDate))
          ),
        ),
        h('div', {},
          h('div', { style: { fontSize: '14px', fontWeight: 600, marginBottom: '8px' } }, topGoal.title),
          h('div.row-between', { style: { marginBottom: '8px' } },
            h('div.text-sm.text-muted', {}, 'Progress'),
            h('div.text-sm.fw-600.text-mono', {}, topGoal.progress + '%'),
          ),
          h('div.progress', {}, h('div.progress-fill', { style: { width: topGoal.progress + '%' } }))
        ),
        h('button.btn.btn-ghost.btn-sm', { style: { marginTop: '12px' }, onclick: () => location.hash = 'goals' },
          'View all goals', icon('chevronRight', 12)
        )
      )
    );
  }

  grid.appendChild(sideCol);
  root.appendChild(grid);

  // --- Row 3: Quick actions + habits + focus chart ---
  const row3 = h('div.grid.grid-3', {});

  // Quick actions
  row3.appendChild(
    h('div.card', {},
      h('div.card-header', {},
        h('div.card-title', {}, icon('zap', 16), ' Quick actions'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' } },
        quickAction('Add task', 'plus', () => openAddTaskModal()),
        quickAction('Log habit', 'fire', () => openLogHabitModal()),
        quickAction('Log meal', 'apple', () => openLogMealModal()),
        quickAction('Journal', 'pen', () => location.hash = 'wellness'),
      )
    )
  );

  // Habits today
  const todaysHabits = habits.map(habit => {
    const done = habitLogs.some(l => l.habitId === habit.id && Date.now() - l.completedAt < DAY_MS);
    return { ...habit, doneToday: done };
  });
  row3.appendChild(
    h('div.card', {},
      h('div.card-header', {},
        h('div', {},
          h('div.card-title', {}, icon('fire', 16), ' Habits today'),
          h('div.card-subtitle', {}, `${todaysHabits.filter(h => h.doneToday).length} / ${todaysHabits.length} done`)
        ),
      ),
      h('div.list', {},
        ...todaysHabits.slice(0, 5).map(habit =>
          h('div.list-item', { onclick: () => toggleHabit(habit) },
            h('div.list-item-check', { class: habit.doneToday ? 'done' : '' }),
            h('div.list-item-title', {}, habit.title),
            h('div.list-item-meta', {}, habit.frequency === 'DAILY' ? 'Daily' : 'Weekly'),
          )
        )
      ),
    )
  );

  // Focus sparkline (last 7 days)
  row3.appendChild(
    h('div.card', {},
      h('div.card-header', {},
        h('div', {},
          h('div.card-title', {}, icon('clock', 16), ' Focus — last 7 days'),
          h('div.card-subtitle', {}, `${Math.round(sessions.filter(s => Date.now() - s.startTime < 7 * DAY_MS).reduce((sum, s) => sum + s.duration, 0))} minutes`)
        ),
      ),
      h('div', {}, { html: focusSparkline(sessions) }),
      h('div.row-between', { style: { marginTop: '4px' } },
        h('div.text-xs.text-faint', {}, '7d ago'),
        h('div.text-xs.text-faint', {}, 'Today'),
      )
    )
  );

  root.appendChild(row3);
}

// ---------- Helpers ----------
function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night';
}
function priorityRank(p) { return p === 'HIGH' ? 3 : p === 'MEDIUM' ? 2 : 1; }

function briefingHeadline(events, tasks, focusMins) {
  const name = (store.get('user')?.name || 'friend').split(' ')[0];
  if (focusMins >= 90) return `${name}, you've already put in ${Math.round(focusMins)} minutes. Keep the momentum.`;
  if (tasks.length > 0 && events.length > 0) return `${name}, ${events.length} event${events.length > 1 ? 's' : ''} today and ${tasks.length} priority task${tasks.length > 1 ? 's' : ''} waiting.`;
  if (tasks.length > 0) return `${name}, ${tasks.length} priority task${tasks.length > 1 ? 's' : ''} on deck. Let's clear them.`;
  if (events.length > 0) return `${name}, ${events.length} event${events.length > 1 ? 's' : ''} on the calendar today.`;
  return `${name}, your day is clear. Time to add some intention.`;
}

function briefingSummary(events, tasks, focusMins) {
  const next = events[0];
  const topTask = tasks[0];
  if (next && topTask) return `Next up at ${fmtTime(next.startTime)}: ${next.title}. Top priority: ${topTask.title} (${topTask.estimatedDuration} min).`;
  if (next) return `Next up at ${fmtTime(next.startTime)}: ${next.title}.`;
  if (topTask) return `Your top priority is ${topTask.title}. Estimated ${topTask.estimatedDuration} minutes.`;
  return 'Tap "Plan my day" to auto-generate a schedule around your priorities.';
}

function statTile(label, value, suffix = '', color) {
  return h('div', {},
    h('div.stat', {},
      h('div.stat-label', {}, label),
      h('div.stat-value', {},
        String(value),
        suffix && h('span.stat-suffix', {}, suffix),
      )
    )
  );
}

function eventRow(ev) {
  return h('div.task-row', {},
    h('div', { style: { width: 4, height: 36, borderRadius: 4, background: catColor(ev.category) } }),
    h('div.task-row-info', {},
      h('div.task-row-title', {}, ev.title),
      h('div.task-row-sub', {}, fmtTime(ev.startTime) + ' – ' + fmtTime(ev.endTime)),
    ),
    chip(ev.category.toLowerCase(), ev.category.toLowerCase()),
    h('div.task-row-actions', {},
      h('button.icon-btn', { onclick: (e) => { e.stopPropagation(); deleteEvent(ev.id); }, title: 'Remove' }, icon('x', 14)),
    )
  );
}

function taskRow(t) {
  return h('div.task-row', {
    onclick: () => toggleTask(t.id),
  },
    h('div.list-item-check', { class: t.status === 'COMPLETED' ? 'done' : '', onclick: (e) => { e.stopPropagation(); toggleTask(t.id); } }),
    h('div.task-row-info', {},
      h('div.task-row-title', { style: { textDecoration: t.status === 'COMPLETED' ? 'line-through' : 'none', color: t.status === 'COMPLETED' ? 'var(--text-40)' : 'var(--text-100)' } }, t.title),
      h('div.task-row-sub', {}, `${fmtDate(t.dueDate)} · ${t.estimatedDuration} min`),
    ),
    chip(t.priority.toLowerCase(), t.priority.toLowerCase()),
    h('div.task-row-actions', {},
      h('button.icon-btn', { onclick: (e) => { e.stopPropagation(); deleteTask(t.id); }, title: 'Remove' }, icon('trash', 14)),
    )
  );
}

function quickAction(label, ic, fn) {
  return h('button.btn.btn-secondary', { style: { justifyContent: 'flex-start', padding: '12px' }, onclick: fn },
    icon(ic, 14), h('span', {}, label)
  );
}

function catColor(cat) {
  return cat === 'WORK' ? 'var(--cat-work)'
    : cat === 'ACADEMIC' ? 'var(--cat-academic)'
    : cat === 'HEALTH' ? 'var(--cat-health)'
    : 'var(--cat-personal)';
}

function computeLifeScore(tasks, habits, logs, sessions) {
  const completionRate = tasks.length === 0 ? 1 : tasks.filter(t => t.status === 'COMPLETED').length / tasks.length;
  const habitRate = logs.length === 0 ? 0.5 : Math.min(1, logs.length / (habits.length * 14));
  const focusRate = sessions.length === 0 ? 0.5 : Math.min(1, sessions.reduce((s, x) => s + x.duration, 0) / 600);
  return Math.round((completionRate * 0.4 + habitRate * 0.3 + focusRate * 0.3) * 100);
}

function lifeScoreColor(s) {
  if (s >= 75) return 'var(--success)';
  if (s >= 50) return 'var(--aurora-cyan)';
  if (s >= 30) return 'var(--warning)';
  return 'var(--danger)';
}

function burnoutGaugeSvg(score, color) {
  // Half-circle gauge
  const r = 60, cx = 70, cy = 70;
  const pct = Math.max(0, Math.min(1, score / 100));
  const angle = Math.PI * (1 - pct);
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const largeArc = pct > 0.5 ? 1 : 0;
  return `
    <svg viewBox="0 0 140 80" width="140" height="80" style="overflow:visible">
      <defs>
        <linearGradient id="bgGauge${score}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.10)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0.04)"/>
        </linearGradient>
      </defs>
      <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" stroke="url(#bgGauge${score})" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}" stroke="${color}" stroke-width="10" fill="none" stroke-linecap="round" style="filter:drop-shadow(0 0 8px ${color})"/>
      <text x="${cx}" y="${cy - 12}" text-anchor="middle" font-size="9" fill="var(--text-40)" font-family="var(--font-mono)" letter-spacing="2">SCORE</text>
    </svg>
  `;
}

function focusSparkline(sessions) {
  const data = Array.from({ length: 7 }, (_, i) => {
    const day = Date.now() - (6 - i) * DAY_MS;
    return sessions.filter(s => s.startTime >= day && s.startTime < day + DAY_MS).reduce((sum, s) => sum + s.duration, 0);
  });
  const max = Math.max(60, ...data);
  const w = 280, h = 64;
  const step = w / 6;
  const points = data.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`);
  const linePath = `M ${points.join(' L ')}`;
  const fillPath = `${linePath} L ${w},${h} L 0,${h} Z`;
  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="64" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#5cf2ff"/>
          <stop offset="100%" stop-color="#ff6bd6"/>
        </linearGradient>
        <linearGradient id="sparkFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#b07cff" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#b07cff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${fillPath}" fill="url(#sparkFill)"/>
      <path d="${linePath}" fill="none" stroke="url(#sparkGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

// ---------- Actions ----------
function toggleTask(id) {
  const t = store.get('tasks').find(x => x.id === id);
  if (!t) return;
  if (t.status === 'COMPLETED') {
    store.patch('tasks', id, { status: 'NOT_STARTED', completedAt: null });
  } else {
    store.patch('tasks', id, { status: 'COMPLETED', completedAt: Date.now() });
    toast({ kind: 'success', title: 'Done!', body: t.title });
  }
}
function deleteTask(id) {
  const t = store.get('tasks').find(x => x.id === id);
  store.remove('tasks', id);
  if (t) toast({ kind: 'info', title: 'Removed', body: t.title });
}
function deleteEvent(id) {
  const ev = store.get('events').find(x => x.id === id);
  store.remove('events', id);
  if (ev) toast({ kind: 'info', title: 'Removed', body: ev.title });
}

function toggleHabit(habit) {
  const today = Date.now() - DAY_MS;
  const alreadyDone = (store.get('habitLogs') || []).some(l => l.habitId === habit.id && l.completedAt > today);
  if (alreadyDone) {
    // remove latest log
    const logs = store.get('habitLogs').filter(l => !(l.habitId === habit.id && l.completedAt > today));
    store.set('habitLogs', logs);
    toast({ kind: 'info', title: 'Undone', body: habit.title });
  } else {
    store.push('habitLogs', { id: Math.random().toString(36).slice(2), habitId: habit.id, completedAt: new Date() });
    toast({ kind: 'success', title: 'Logged', body: habit.title });
  }
}

function openAddTaskModal() {
  const titleInput = h('input.field-input', { placeholder: 'e.g. Submit lab report' });
  const dueInput = h('input.field-input', { type: 'datetime-local' });
  const prioSelect = h('select.field-select', {},
    h('option', { value: 'LOW' }, 'Low priority'),
    h('option', { value: 'MEDIUM', selected: true }, 'Medium priority'),
    h('option', { value: 'HIGH' }, 'High priority'),
  );
  const energySelect = h('select.field-select', {},
    h('option', { value: 'LOW' }, 'Low energy'),
    h('option', { value: 'MEDIUM', selected: true }, 'Medium energy'),
    h('option', { value: 'HIGH' }, 'High energy'),
  );
  const durInput = h('input.field-input', { type: 'number', value: '30', min: '5' });

  modal({
    title: 'Add task',
    subtitle: 'Drop it on the plate — the planner will slot it in.',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Title'), titleInput),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Priority'), prioSelect),
        h('div.field', {}, h('div.field-label', {}, 'Energy'), energySelect),
      ),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Due date'), dueInput),
        h('div.field', {}, h('div.field-label', {}, 'Duration (min)'), durInput),
      ),
    ),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      {
        label: 'Add task', kind: 'primary', onClick: () => {
          if (!titleInput.value.trim()) return;
          store.push('tasks', {
            id: Math.random().toString(36).slice(2),
            title: titleInput.value.trim(),
            description: '',
            dueDate: dueInput.value ? new Date(dueInput.value) : new Date(Date.now() + 24 * 3600 * 1000),
            estimatedDuration: parseInt(durInput.value) || 30,
            priority: prioSelect.value,
            energyLevel: energySelect.value,
            status: 'NOT_STARTED',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastTouchedAt: null,
          });
          toast({ kind: 'success', title: 'Task added', body: titleInput.value.trim() });
        }
      }
    ]
  });
}

function openAddEventModal() {
  const titleInput = h('input.field-input', { placeholder: 'e.g. Team meeting' });
  const startInput = h('input.field-input', { type: 'datetime-local' });
  const endInput = h('input.field-input', { type: 'datetime-local' });
  const catSelect = h('select.field-select', {},
    h('option', { value: 'WORK' }, 'Work'),
    h('option', { value: 'PERSONAL' }, 'Personal'),
    h('option', { value: 'ACADEMIC' }, 'Academic'),
    h('option', { value: 'HEALTH' }, 'Health'),
  );

  modal({
    title: 'Add event',
    subtitle: 'Schedule a fixed commitment.',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Title'), titleInput),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Starts'), startInput),
        h('div.field', {}, h('div.field-label', {}, 'Ends'), endInput),
      ),
      h('div.field', {}, h('div.field-label', {}, 'Category'), catSelect),
    ),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      {
        label: 'Schedule', kind: 'primary', onClick: () => {
          if (!titleInput.value.trim()) return;
          const start = startInput.value ? new Date(startInput.value) : new Date(Date.now() + 3600 * 1000);
          const end = endInput.value ? new Date(endInput.value) : new Date(start.getTime() + 3600 * 1000);
          store.push('events', {
            id: Math.random().toString(36).slice(2),
            title: titleInput.value.trim(),
            startTime: start, endTime: end,
            category: catSelect.value,
            createdAt: Date.now(), updatedAt: Date.now(),
          });
          toast({ kind: 'success', title: 'Scheduled', body: titleInput.value.trim() });
        }
      }
    ]
  });
}

function openLogHabitModal() {
  const habits = store.get('habits') || [];
  if (habits.length === 0) {
    toast({ kind: 'warning', title: 'No habits yet', body: 'Create one in the Habits page.' });
    return;
  }
  const list = h('div.list', {});
  habits.forEach(hb => {
    list.appendChild(h('div.list-item', { onclick: () => {
      store.push('habitLogs', { id: Math.random().toString(36).slice(2), habitId: hb.id, completedAt: new Date() });
      toast({ kind: 'success', title: 'Logged', body: hb.title });
      document.querySelector('.modal-backdrop')?.remove();
    }}, h('div.list-item-check'), h('div.list-item-title', {}, hb.title)));
  });
  modal({ title: 'Log a habit', subtitle: 'Tap to mark complete.', body: list });
}

function openLogMealModal() {
  const name = h('input.field-input', { placeholder: 'e.g. Chicken bowl' });
  const cals = h('input.field-input', { type: 'number', placeholder: 'Calories', value: '450' });
  const protein = h('input.field-input', { type: 'number', placeholder: 'Protein (g)', value: '30' });
  const meal = h('select.field-select', {},
    h('option', { value: 'breakfast' }, 'Breakfast'),
    h('option', { value: 'lunch', selected: true }, 'Lunch'),
    h('option', { value: 'dinner' }, 'Dinner'),
    h('option', { value: 'snack' }, 'Snack'),
  );
  modal({
    title: 'Log meal',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Food'), name),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Calories'), cals),
        h('div.field', {}, h('div.field-label', {}, 'Protein (g)'), protein),
      ),
      h('div.field', {}, h('div.field-label', {}, 'Meal'), meal),
    ),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Log it', kind: 'primary', onClick: () => {
        if (!name.value.trim()) return;
        store.push('foodLogs', {
          id: Math.random().toString(36).slice(2),
          foodName: name.value.trim(),
          meal: meal.value,
          servingCount: 1,
          calories: parseInt(cals.value) || 0,
          protein: parseInt(protein.value) || 0,
          carbs: 0, fat: 0, fiber: 0,
          date: new Date(), createdAt: Date.now(),
        });
        toast({ kind: 'success', title: 'Logged', body: name.value.trim() });
      } }
    ]
  });
}

export function unmount() {}
