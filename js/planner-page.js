// ============================================================
// planner-page.js — AI Planner: heuristic scheduling view
// ============================================================
import { store } from './store.js';
import { toast } from './bus.js';
import { h, icon, chip } from './utils.js';
import { generateSuggestedSchedule } from './planner.js';

export const meta = { title: 'AI Planner', eyebrow: 'Intelligence' };

let lastResult = null;

export function render(root) {
  const tasks = store.get('tasks') || [];
  const events = store.get('events') || [];
  const settings = store.get('settings') || {};
  const result = generateSuggestedSchedule(tasks, events, settings.workStartHour ?? 9, settings.workEndHour ?? 22);
  lastResult = result;

  const wrap = h('div', {});

  // Top: explanation + regenerate
  wrap.appendChild(
    h('div.card.briefing', { style: { padding: '28px' } },
      h('div.card-glow', {}),
      h('div.briefing-inner', {},
        h('div.briefing-greeting', {}, 'Heuristic engine'),
        h('div.briefing-headline', { style: { fontSize: '24px' } }, `${result.suggestions.length} of ${tasks.filter(t => t.status !== 'COMPLETED').length} tasks scheduled`),
        h('div.briefing-summary', {}, 'Sorted by priority × deadline urgency × energy preference, placed into the highest-scoring free slot before each deadline.'),
        h('div.briefing-actions', {},
          h('button.btn.btn-primary', { onclick: () => applySchedule() }, icon('sparkle', 14), ' Apply all suggestions'),
          h('button.btn.btn-secondary', { onclick: () => location.reload() }, icon('refresh', 14), ' Regenerate'),
          h('span.text-sm.text-muted', { style: { alignSelf: 'center' } }, `${result.conflicts.length} conflict${result.conflicts.length === 1 ? '' : 's'} detected`),
        ),
      )
    )
  );

  // Conflicts
  if (result.conflicts.length > 0) {
    wrap.appendChild(
      h('div.card', { style: { borderColor: 'rgba(255, 126, 158, 0.4)' } },
        h('div.card-header', {},
          h('div.card-title', {}, icon('lightbulb', 16), ' Conflicts'),
          h('div.card-subtitle', {}, `${result.conflicts.length} issue${result.conflicts.length === 1 ? '' : 's'}`)
        ),
        h('div.list', {},
          ...result.conflicts.map(c =>
            h('div.list-item', { style: { borderColor: 'rgba(255, 126, 158, 0.2)', background: 'rgba(255, 126, 158, 0.05)' } },
              h('div.list-item-check', { style: { borderColor: 'var(--danger)' } }),
              h('div.list-item-title', { style: { color: 'var(--text-80)' } }, c)
            )
          )
        )
      )
    );
  }

  // Two columns: suggested schedule | unscheduled
  const grid = h('div.grid.grid-2', {});

  // Suggested schedule
  const suggestionMap = new Map(result.suggestions.map(s => [s.taskId, s]));
  const tasksWithSlots = tasks
    .filter(t => t.status !== 'COMPLETED')
    .map(t => ({ task: t, slot: suggestionMap.get(t.id) }))
    .sort((a, b) => {
      if (a.slot && b.slot) return a.slot.startTime - b.slot.startTime;
      if (a.slot) return -1;
      if (b.slot) return 1;
      return a.task.dueDate - b.task.dueDate;
    });

  const schedCard = h('div.card', {});
  schedCard.appendChild(h('div.card-header', {},
    h('div.card-title', {}, icon('calendar', 16), ' Suggested schedule'),
    h('div.card-subtitle', {}, 'Tap to lock in')
  ));
  const list = h('div.list', {});
  tasksWithSlots.forEach(({ task, slot }) => {
    list.appendChild(
      h('div.list-item', { onclick: () => toggleSlot(task.id) },
        h('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 64, fontFamily: 'var(--font-mono)', fontSize: '11px', color: slot ? 'var(--aurora-cyan)' : 'var(--text-40)' } },
          slot ? formatDayShort(slot.startTime) : '—',
          slot ? formatTime(slot.startTime) : 'unsched'
        ),
        h('div.list-item-title', {}, task.title),
        chip(task.priority.toLowerCase(), task.priority.toLowerCase()),
      )
    );
  });
  schedCard.appendChild(list);
  grid.appendChild(schedCard);

  // Algorithm transparency
  grid.appendChild(
    h('div.card', {},
      h('div.card-header', {},
        h('div.card-title', {}, icon('layers', 16), ' How it scores'),
      ),
      h('div.col', { style: { gap: '12px' } },
        scoreRow('Priority weight', 'HIGH = 4×, MEDIUM = 2×, LOW = 1×'),
        scoreRow('Deadline urgency', 'Higher when due date is near'),
        scoreRow('Energy match', 'High-energy → morning, Low-energy → afternoon'),
        scoreRow('Earliness bonus', 'HIGH-priority tasks prefer earlier slots'),
        scoreRow('Conflict penalty', 'Slots overlapping events get −20'),
      )
    )
  );

  wrap.appendChild(grid);
  root.appendChild(wrap);
}

function scoreRow(label, body) {
  return h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border-soft)' } },
    h('div', { style: { width: 6, height: 6, borderRadius: '50%', background: 'var(--aurora-violet)', marginTop: 8, flexShrink: 0 } }),
    h('div', { style: { flex: 1 } },
      h('div.text-sm.fw-600', {}, label),
      h('div.text-xs.text-muted', {}, body),
    )
  );
}

function formatDayShort(d) {
  const date = new Date(d);
  const today = new Date(); today.setHours(0,0,0,0);
  if (date < new Date(today.getTime() + 86400000)) return 'Today';
  if (date < new Date(today.getTime() + 2 * 86400000)) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}
function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function applySchedule() {
  if (!lastResult) return;
  // Persist suggestions so other pages can use them
  store.set('scheduleSuggestions', lastResult.suggestions);
  toast({ kind: 'success', title: 'Schedule applied', body: `${lastResult.suggestions.length} slots locked in.` });
  setTimeout(() => location.hash = 'calendar', 600);
}

function toggleSlot(taskId) {
  toast({ kind: 'info', title: 'Tap "Apply all" to lock in', body: 'Or open the calendar to drag manually.' });
}

export function unmount() { lastResult = null; }
