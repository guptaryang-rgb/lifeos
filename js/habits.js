// ============================================================
// habits.js — Habit tracker with streaks + heatmap
// ============================================================
import { store, today, fmtDate } from './store.js';
import { toast } from './bus.js';
import { h, icon, chip, modal } from './utils.js';

export const meta = { title: 'Habits', eyebrow: 'Consistency' };

const DAY = 86400000;

export function render(root) {
  const habits = store.get('habits') || [];
  const logs = store.get('habitLogs') || [];

  // Header
  root.appendChild(h('div.row-between', {},
    h('div', {}, h('div.text-sm.text-muted', {}, `${habits.length} habits tracked`)),
    h('button.btn.btn-primary', { onclick: () => openHabit() }, icon('plus', 14), ' New habit')
  ));

  if (habits.length === 0) {
    root.appendChild(h('div.empty', {}, h('div.empty-icon', {}, '🔥'), h('div.empty-title', {}, 'No habits yet'), h('div.empty-sub', {}, 'Start small — one habit at a time.')));
    return;
  }

  // Habits grid
  const grid = h('div.grid.grid-auto-320', {});
  habits.forEach(habit => grid.appendChild(habitCard(habit, logs)));
  root.appendChild(grid);

  // Big heatmap at the bottom
  root.appendChild(h('div.card', { style: { marginTop: '24px' } },
    h('div.card-header', {},
      h('div.card-title', {}, icon('chart', 16), ' Activity heatmap'),
      h('div.card-subtitle', {}, 'Last 12 weeks')
    ),
    h('div', { html: heatmap(logs) }),
    h('div.row', { style: { gap: '12px', fontSize: '11px', color: 'var(--text-40)', marginTop: '12px' } },
      h('span', {}, 'Less'),
      h('div', { style: { display: 'flex', gap: '3px' } },
        ...[0,1,2,3,4].map(l => h('div.heatmap-cell', { 'data-level': l })),
      ),
      h('span', {}, 'More'),
    )
  ));
}

function habitCard(habit, allLogs) {
  const myLogs = allLogs.filter(l => l.habitId === habit.id);
  const streak = computeStreak(myLogs);
  const last30 = myLogs.filter(l => Date.now() - l.completedAt < 30 * DAY).length;
  const rate = Math.round((last30 / 30) * 100);

  return h('div.card', { onclick: () => openHabit(habit) },
    h('div.card-header', {},
      h('div', {},
        h('div.card-title', {}, icon('fire', 16), habit.title),
        h('div.card-subtitle', {}, `${habit.frequency === 'DAILY' ? 'Daily' : habit.frequency === 'WEEKLY' ? 'Weekly' : 'Monthly'}`),
      ),
      chip(`${streak}d streak`, streak >= 7 ? 'low' : streak >= 3 ? 'medium' : ''),
    ),
    h('div.row-between', { style: { marginBottom: '6px' } },
      h('div.text-sm.text-muted', {}, '30-day rate'),
      h('div.text-sm.fw-600.text-mono', {}, rate + '%'),
    ),
    h('div.progress', {}, h('div.progress-fill', { style: { width: rate + '%' } })),
    h('div', { style: { marginTop: '14px' } }, { html: miniHeatmap(myLogs, 28) }),
    h('div.row', { style: { gap: '8px', marginTop: '14px' } },
      h('button.btn.btn-primary.btn-sm', { onclick: (e) => { e.stopPropagation(); logHabit(habit.id); } },
        icon('check', 12), ' Mark done today'
      ),
    ),
  );
}

function computeStreak(logs) {
  if (logs.length === 0) return 0;
  const dates = new Set(logs.map(l => new Date(l.completedAt).toISOString().slice(0,10)));
  let s = 0;
  const cursor = new Date(); cursor.setHours(0,0,0,0);
  while (dates.has(cursor.toISOString().slice(0,10))) {
    s++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return s;
}

function miniHeatmap(logs, days) {
  const dateSet = new Set(logs.map(l => new Date(l.completedAt).toISOString().slice(0,10)));
  let html = '<div class="heatmap" style="grid-template-rows: repeat(2, 14px)">';
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const key = d.toISOString().slice(0,10);
    const has = dateSet.has(key);
    html += `<div class="heatmap-cell" data-level="${has ? 4 : 0}" title="${key}"></div>`;
  }
  html += '</div>';
  return html;
}

function heatmap(logs) {
  const dateCounts = new Map();
  logs.forEach(l => {
    const k = new Date(l.completedAt).toISOString().slice(0,10);
    dateCounts.set(k, (dateCounts.get(k) || 0) + 1);
  });
  const weeks = 12;
  const today = new Date(); today.setHours(0,0,0,0);
  // Find start of week (Sunday)
  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay() - (weeks - 1) * 7);

  let html = `<div class="heatmap" style="grid-template-rows: repeat(7, 14px); grid-auto-flow: column">`;
  for (let w = 0; w < weeks; w++) {
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(start);
      d.setDate(d.getDate() + w * 7 + dow);
      if (d > today) {
        html += `<div class="heatmap-cell" style="opacity:0.15"></div>`;
        continue;
      }
      const c = dateCounts.get(d.toISOString().slice(0,10)) || 0;
      const level = c >= 4 ? 4 : c >= 3 ? 3 : c >= 2 ? 2 : c >= 1 ? 1 : 0;
      html += `<div class="heatmap-cell" data-level="${level}" title="${d.toISOString().slice(0,10)}: ${c}"></div>`;
    }
  }
  html += '</div>';
  return html;
}

function logHabit(id) {
  store.push('habitLogs', { id: Math.random().toString(36).slice(2), habitId: id, completedAt: new Date() });
  const habit = store.get('habits').find(h => h.id === id);
  toast({ kind: 'success', title: 'Logged', body: habit?.title });
  rerender();
}

function openHabit(habit) {
  const isNew = !habit;
  const title = h('input.field-input', { value: habit?.title || '', placeholder: 'e.g. Meditate 10 minutes' });
  const freq = h('select.field-select', {},
    ['DAILY','WEEKLY','MONTHLY'].map(f => h('option', { value: f, selected: habit?.frequency === f }, f.charAt(0) + f.slice(1).toLowerCase()))
  );

  modal({
    title: isNew ? 'New habit' : 'Edit habit',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Title'), title),
      h('div.field', {}, h('div.field-label', {}, 'Frequency'), freq),
    ),
    actions: habit
      ? [
          { label: 'Delete', kind: 'danger', onClick: () => {
              store.remove('habits', habit.id);
              store.set('habitLogs', (store.get('habitLogs') || []).filter(l => l.habitId !== habit.id));
              toast({ kind: 'info', title: 'Habit removed' });
              rerender();
            }
          },
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Save', kind: 'primary', onClick: () => {
              if (!title.value.trim()) return;
              store.patch('habits', habit.id, { title: title.value.trim(), frequency: freq.value });
              toast({ kind: 'success', title: 'Updated' });
              rerender();
            }
          },
        ]
      : [
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Create', kind: 'primary', onClick: () => {
              if (!title.value.trim()) return;
              store.push('habits', { id: Math.random().toString(36).slice(2), title: title.value.trim(), frequency: freq.value, createdAt: Date.now() });
              toast({ kind: 'success', title: 'Habit created' });
              rerender();
            }
          },
        ]
  });
}

function rerender() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const page = h('div.page', { dataset: { page: 'habits' } });
  view.appendChild(page);
  render(page);
}

export function unmount() {}
