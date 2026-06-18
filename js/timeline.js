// ============================================================
// timeline.js — Chronological view of all activity
// ============================================================
import { store, fmtDate, fmtTime } from './store.js';
import { h, icon, chip } from './utils.js';

export const meta = { title: 'Timeline', eyebrow: 'Activity' };

const DAY = 86400000;

export function render(root) {
  // Aggregate all events into one chronological stream
  const tasks = (store.get('tasks') || []).map(t => ({
    type: 'task',
    title: t.title,
    time: t.completedAt || t.updatedAt || t.createdAt,
    icon: t.status === 'COMPLETED' ? 'check' : 'target',
    meta: t.priority + ' priority',
    color: t.status === 'COMPLETED' ? 'var(--success)' : 'var(--aurora-violet)',
  }));
  const events = (store.get('events') || []).map(e => ({
    type: 'event', title: e.title, time: e.startTime, icon: 'calendar',
    meta: fmtTime(e.startTime) + ' – ' + fmtTime(e.endTime),
    color: 'var(--cat-' + e.category.toLowerCase() + ')',
  }));
  const sessions = (store.get('focusSessions') || []).map(s => ({
    type: 'focus', title: s.taskTitle || 'Focus session', time: s.startTime, icon: 'clock',
    meta: s.duration + ' minutes',
    color: 'var(--aurora-cyan)',
  }));
  const workouts = (store.get('workouts') || []).map(w => ({
    type: 'workout', title: w.exerciseName, time: w.date, icon: 'dumbbell',
    meta: w.durationMinutes + ' min · ' + w.calories + ' kcal',
    color: 'var(--cat-health)',
  }));
  const habitLogs = (store.get('habitLogs') || []).map(l => {
    const habit = (store.get('habits') || []).find(h => h.id === l.habitId);
    return {
      type: 'habit', title: habit?.title || 'Habit', time: l.completedAt, icon: 'fire',
      meta: 'habit logged',
      color: 'var(--aurora-mint)',
    };
  });

  const all = [...tasks, ...events, ...sessions, ...workouts, ...habitLogs]
    .filter(x => x.time)
    .sort((a, b) => b.time - a.time);

  root.appendChild(h('div.row-between', {},
    h('div.text-sm.text-muted', {}, `${all.length} activities tracked`),
    h('div.tabs', {},
      h('div.tab.active', {}, 'All'),
      h('div.tab', {}, 'Tasks'),
      h('div.tab', {}, 'Events'),
      h('div.tab', {}, 'Sessions'),
    )
  ));

  if (all.length === 0) {
    root.appendChild(h('div.empty', {}, h('div.empty-icon', {}, '🕐'), h('div.empty-title', {}, 'No activity yet')));
    return;
  }

  // Group by day
  const groups = {};
  all.forEach(item => {
    const d = new Date(item.time); d.setHours(0,0,0,0);
    const key = d.toISOString().slice(0,10);
    (groups[key] = groups[key] || []).push(item);
  });

  const stream = h('div', { style: { position: 'relative', paddingLeft: '32px' } });
  // Timeline rail
  stream.appendChild(h('div', { style: { position: 'absolute', left: '14px', top: '8px', bottom: '8px', width: '2px', background: 'linear-gradient(180deg, var(--aurora-cyan), var(--aurora-violet), var(--aurora-magenta))', borderRadius: '1px' } }));

  Object.entries(groups).forEach(([day, items]) => {
    const dayLabel = dayLabelFor(day);
    const dayWrap = h('div', { style: { marginBottom: '24px' } });
    dayWrap.appendChild(h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' } },
      h('div', { style: { width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--aurora-cyan), var(--aurora-violet))', marginLeft: '-25px', boxShadow: '0 0 12px rgba(176,124,255,0.5)' } }),
      h('div.text-sm.fw-600', { style: { textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--text-60)' } }, dayLabel),
      h('div.text-xs.text-faint', {}, `${items.length} items`),
    ));

    const list = h('div.col', { style: { gap: '8px' } });
    items.forEach(item => {
      list.appendChild(h('div.list-item', { style: { padding: '12px 14px' } },
        h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: item.color + '22', color: item.color, display: 'grid', placeItems: 'center', flexShrink: 0 } }, icon(item.icon, 14)),
        h('div.task-row-info', {},
          h('div.task-row-title', {}, item.title),
          h('div.task-row-sub', {}, item.meta),
        ),
        h('div.list-item-meta', { style: { fontFamily: 'var(--font-mono)', fontSize: '11px' } }, fmtTime(item.time)),
      ));
    });
    dayWrap.appendChild(list);
    stream.appendChild(dayWrap);
  });

  root.appendChild(stream);
}

function dayLabelFor(dayStr) {
  const day = new Date(dayStr); day.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (day.getTime() === today.getTime()) return 'Today';
  if (day.getTime() === yesterday.getTime()) return 'Yesterday';
  return day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function unmount() {}
