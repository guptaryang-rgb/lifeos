// ============================================================
// tasks.js — Assignment tracker with filters, search, progress
// ============================================================
import { store, fmtDate } from './store.js';
import { toast } from './bus.js';
import { h, icon, chip, modal } from './utils.js';

export const meta = { title: 'Tasks', eyebrow: 'Productivity' };

let filter = 'all';
let searchQ = '';

export function render(root) {
  const tasks = store.get('tasks') || [];
  const events = store.get('events') || [];
  const filtered = applyFilter(tasks, filter, searchQ);

  const counts = {
    all: tasks.length,
    today: tasks.filter(t => isToday(t.dueDate) && t.status !== 'COMPLETED').length,
    upcoming: tasks.filter(t => t.dueDate > Date.now() && t.status !== 'COMPLETED').length,
    overdue: tasks.filter(t => t.dueDate < Date.now() && t.status !== 'COMPLETED').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  };

  const header = h('div.row-between', {},
    h('div.tabs', {},
      tabBtn('all', 'All', counts.all),
      tabBtn('today', 'Today', counts.today),
      tabBtn('upcoming', 'Upcoming', counts.upcoming),
      tabBtn('overdue', 'Overdue', counts.overdue),
      tabBtn('completed', 'Done', counts.completed),
    ),
    h('div.row', {},
      h('div.search-bar', { style: { minWidth: 220 } },
        icon('search', 14),
        h('input', { placeholder: 'Search tasks…', value: searchQ, oninput: (e) => { searchQ = e.target.value; rerender(); } }),
      ),
      h('button.btn.btn-primary', { onclick: () => openAdd() }, icon('plus', 14), ' New task'),
    )
  );
  root.appendChild(header);

  if (filtered.length === 0) {
    root.appendChild(h('div.empty', {},
      h('div.empty-icon', {}, '📋'),
      h('div.empty-title', {}, 'No tasks here'),
      h('div.empty-sub', {}, 'Try a different filter or add a new task.')
    ));
    return;
  }

  // Group by date bucket
  const groups = {};
  filtered.forEach(t => {
    const key = bucketLabel(t);
    (groups[key] = groups[key] || []).push(t);
  });

  Object.entries(groups).forEach(([label, items]) => {
    const group = h('div.col', { style: { gap: '8px' } });
    group.appendChild(h('div', { style: { fontSize: '11px', fontWeight: 600, color: 'var(--text-40)', letterSpacing: '0.10em', textTransform: 'uppercase' } }, label));
    items.forEach(t => group.appendChild(taskRow(t)));
    root.appendChild(group);
  });
}

function rerender() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const page = h('div.page', { dataset: { page: 'tasks' } });
  view.appendChild(page);
  render(page);
}

function tabBtn(key, label, count) {
  return h('div.tab', {
    class: filter === key ? 'active' : '',
    onclick: () => { filter = key; rerender(); },
  }, label, count > 0 ? h('span', { style: { marginLeft: '6px', fontSize: '10px', opacity: 0.8 } }, count) : '');
}

function applyFilter(tasks, filter, search) {
  let out = tasks;
  if (filter === 'today')    out = out.filter(t => isToday(t.dueDate) && t.status !== 'COMPLETED');
  if (filter === 'upcoming') out = out.filter(t => t.dueDate > Date.now() && t.status !== 'COMPLETED');
  if (filter === 'overdue')  out = out.filter(t => t.dueDate < Date.now() && t.status !== 'COMPLETED');
  if (filter === 'completed')out = out.filter(t => t.status === 'COMPLETED');
  if (search) out = out.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  return out.sort((a, b) => {
    if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
    if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
    return a.dueDate - b.dueDate;
  });
}

function isToday(d) {
  const date = new Date(d), t = new Date(); t.setHours(0,0,0,0);
  return date >= t && date < new Date(t.getTime() + 86400000);
}

function bucketLabel(t) {
  if (t.status === 'COMPLETED') return 'Completed';
  if (t.dueDate < Date.now()) return 'Overdue';
  if (isToday(t.dueDate)) return 'Today';
  if (t.dueDate < Date.now() + 3 * 86400000) return 'This week';
  return 'Later';
}

function taskRow(t) {
  return h('div.task-row', { onclick: () => openEdit(t) },
    h('div.list-item-check', {
      class: t.status === 'COMPLETED' ? 'done' : '',
      onclick: (e) => { e.stopPropagation(); toggle(t.id); }
    }),
    h('div.task-row-info', {},
      h('div.task-row-title', {
        style: {
          textDecoration: t.status === 'COMPLETED' ? 'line-through' : 'none',
          color: t.status === 'COMPLETED' ? 'var(--text-40)' : 'var(--text-100)'
        }
      }, t.title),
      h('div.task-row-sub', {}, `${fmtDate(t.dueDate)} · ${t.estimatedDuration} min · ${t.energyLevel.toLowerCase()} energy`),
    ),
    chip(t.priority.toLowerCase(), t.priority.toLowerCase()),
    h('div.task-row-actions', {},
      h('button.icon-btn', { onclick: (e) => { e.stopPropagation(); remove(t.id); }, title: 'Delete' }, icon('trash', 14)),
    )
  );
}

function toggle(id) {
  const t = store.get('tasks').find(x => x.id === id);
  if (!t) return;
  if (t.status === 'COMPLETED') {
    store.patch('tasks', id, { status: 'NOT_STARTED', completedAt: null });
  } else {
    store.patch('tasks', id, { status: 'COMPLETED', completedAt: Date.now() });
    toast({ kind: 'success', title: 'Task done!', body: t.title });
    rerender();
  }
}

function remove(id) {
  const t = store.get('tasks').find(x => x.id === id);
  store.remove('tasks', id);
  if (t) toast({ kind: 'info', title: 'Removed', body: t.title });
  rerender();
}

function openAdd() { openEdit(null); }

function openEdit(t) {
  const title = h('input.field-input', { value: t?.title || '', placeholder: 'What needs to get done?' });
  const desc = h('textarea.field-textarea', { placeholder: 'Notes (optional)' }, t?.description || '');
  const due = h('input.field-input', { type: 'datetime-local' });
  const prio = h('select.field-select', {}, priorityOptions(t?.priority));
  const energy = h('select.field-select', {}, energyOptions(t?.energyLevel));
  const dur = h('input.field-input', { type: 'number', value: t?.estimatedDuration ?? 30, min: '5' });
  if (t) {
    const pad = n => String(n).padStart(2, '0');
    due.value = `${t.dueDate.getFullYear()}-${pad(t.dueDate.getMonth()+1)}-${pad(t.dueDate.getDate())}T${pad(t.dueDate.getHours())}:${pad(t.dueDate.getMinutes())}`;
  }

  modal({
    title: t ? 'Edit task' : 'New task',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Title'), title),
      h('div.field', {}, h('div.field-label', {}, 'Notes'), desc),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Priority'), prio),
        h('div.field', {}, h('div.field-label', {}, 'Energy'), energy),
      ),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Due'), due),
        h('div.field', {}, h('div.field-label', {}, 'Duration (min)'), dur),
      ),
    ),
    actions: t
      ? [
          { label: 'Delete', kind: 'danger', onClick: () => { store.remove('tasks', t.id); toast({ kind: 'info', title: 'Removed', body: t.title }); rerender(); } },
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Save', kind: 'primary', onClick: () => save(t, title, desc, due, prio, energy, dur) },
        ]
      : [
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Add task', kind: 'primary', onClick: () => save(t, title, desc, due, prio, energy, dur) },
        ]
  });
}

function save(t, title, desc, due, prio, energy, dur) {
  if (!title.value.trim()) return;
  const payload = {
    title: title.value.trim(),
    description: desc.value,
    dueDate: due.value ? new Date(due.value) : new Date(Date.now() + 86400000),
    estimatedDuration: parseInt(dur.value) || 30,
    priority: prio.value,
    energyLevel: energy.value,
  };
  if (t) {
    store.patch('tasks', t.id, payload);
    toast({ kind: 'success', title: 'Updated' });
  } else {
    store.push('tasks', {
      id: Math.random().toString(36).slice(2),
      status: 'NOT_STARTED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastTouchedAt: null,
      ...payload,
    });
    toast({ kind: 'success', title: 'Task added', body: payload.title });
  }
  rerender();
}

function priorityOptions(selected) {
  return ['LOW','MEDIUM','HIGH'].map(p => h('option', { value: p, selected: selected === p }, p.charAt(0) + p.slice(1).toLowerCase() + ' priority'));
}
function energyOptions(selected) {
  return ['LOW','MEDIUM','HIGH'].map(p => h('option', { value: p, selected: selected === p }, p.charAt(0) + p.slice(1).toLowerCase() + ' energy'));
}

export function unmount() { filter = 'all'; searchQ = ''; }
