// ============================================================
// calendar.js — Smart Calendar with drag-and-drop week view
// ============================================================
import { store, today, fmtTime, fmtDay, isToday } from './store.js';
import { bus, EVENTS, toast } from './bus.js';
import { h, icon, chip, modal } from './utils.js';

export const meta = { title: 'Smart Calendar', eyebrow: 'Schedule' };

let viewOffsetDays = 0;

export function render(root) {
  const wrap = h('div', {});
  wrap.appendChild(controls());
  wrap.appendChild(weekGrid());
  root.appendChild(wrap);
}

function controls() {
  const start = new Date(today());
  start.setDate(start.getDate() + viewOffsetDays * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const fmtRange = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return h('div.row-between', { style: { marginBottom: '16px' } },
    h('div', {},
      h('div.page-eyebrow', {}, 'This week'),
      h('div', { style: { fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' } }, fmtRange),
    ),
    h('div.row', {},
      h('button.btn.btn-secondary.btn-icon', { onclick: () => { viewOffsetDays--; rerender(); } }, '←'),
      h('button.btn.btn-secondary', { onclick: () => { viewOffsetDays = 0; rerender(); } }, 'Today'),
      h('button.btn.btn-secondary.btn-icon', { onclick: () => { viewOffsetDays++; rerender(); } }, '→'),
      h('button.btn.btn-primary', { onclick: () => openAddEvent() }, icon('plus', 14), ' New event'),
    )
  );
}

function rerender() {
  location.reload();
}

function weekGrid() {
  const start = new Date(today());
  start.setDate(start.getDate() + viewOffsetDays * 7);
  start.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d;
  });

  const startHour = 6;
  const endHour = 23;
  const rows = endHour - startHour;

  const events = store.get('events') || [];
  const suggestions = store.get('scheduleSuggestions') || [];

  const grid = h('div.cal-grid', { style: { gridTemplateRows: `30px repeat(${rows}, 44px)` } });

  // Header row
  grid.appendChild(h('div', {})); // corner
  days.forEach(d => {
    grid.appendChild(h('div.cal-day-header', {
      class: isToday(d) ? 'today' : '',
    },
      h('div', { style: { fontSize: '10px' } }, fmtDay(d)),
      h('div', { style: { fontSize: '14px', fontWeight: 700, color: isToday(d) ? 'var(--aurora-cyan)' : 'var(--text-100)' } }, d.getDate())
    ));
  });

  // Time + day cells
  for (let h_idx = 0; h_idx < rows; h_idx++) {
    const hour = startHour + h_idx;
    grid.appendChild(h('div.cal-time-col', {}, (hour <= 12 ? hour : hour - 12) + (hour < 12 ? 'a' : 'p')));
    days.forEach((d, di) => {
      const cell = h('div.cal-cell', {
        class: isToday(d) ? 'today' : '',
        dataset: { day: d.toISOString().slice(0, 10), hour },
        onclick: () => openAddEvent(d, hour),
      });
      attachDropHandlers(cell, d, hour);
      // Place events that start in this cell
      const dayStart = new Date(d); dayStart.setHours(hour, 0, 0, 0);
      const dayEnd = new Date(dayStart); dayEnd.setHours(hour + 1);
      events.filter(ev => ev.startTime < dayEnd && ev.endTime > dayStart).forEach(ev => {
        const top = (ev.startTime.getHours() - hour) * 44 + (ev.startTime.getMinutes() / 60) * 44;
        const height = Math.max(28, ((ev.endTime - ev.startTime) / 60000) / 60 * 44);
        if (top >= 0 && top < 44) {
          const block = h('div.cal-event', {
            class: 'cal-event-' + ev.category.toLowerCase(),
            style: { top: top + 'px', height: height + 'px' },
            draggable: true,
            onclick: (e) => { e.stopPropagation(); openEditEvent(ev); },
          },
            h('div', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, ev.title),
            h('div.cal-event-time', {}, fmtTime(ev.startTime)),
          );
          attachDragHandlers(block, ev);
          cell.appendChild(block);
        }
      });
      grid.appendChild(cell);
    });
  }

  return grid;
}

// ---- Drag and drop ----
function attachDragHandlers(el, ev) {
  el.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', ev.id);
    e.dataTransfer.effectAllowed = 'move';
    el.style.opacity = '0.5';
  });
  el.addEventListener('dragend', () => { el.style.opacity = ''; });
}
function attachDropHandlers(cell, day, hour) {
  cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('drag-over'); });
  cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
  cell.addEventListener('drop', (e) => {
    e.preventDefault();
    cell.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const ev = (store.get('events') || []).find(x => x.id === id);
    if (!ev) return;
    const dur = ev.endTime - ev.startTime;
    const newStart = new Date(day); newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + dur);
    store.patch('events', id, { startTime: newStart, endTime: newEnd });
    toast({ kind: 'success', title: 'Moved', body: ev.title + ' to ' + fmtTime(newStart) });
    rerender();
  });
}

// ---- Modals ----
function openAddEvent(day, hour) {
  const titleInput = h('input.field-input', { placeholder: 'e.g. Team meeting' });
  const startInput = h('input.field-input', { type: 'datetime-local' });
  const endInput = h('input.field-input', { type: 'datetime-local' });
  const catSelect = h('select.field-select', {},
    h('option', { value: 'WORK' }, 'Work'),
    h('option', { value: 'PERSONAL' }, 'Personal'),
    h('option', { value: 'ACADEMIC' }, 'Academic'),
    h('option', { value: 'HEALTH' }, 'Health'),
  );
  // Prefill
  const d = day || new Date();
  const h0 = (hour ?? 9);
  const pad = n => String(n).padStart(2, '0');
  const iso = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(h0)}:00`;
  startInput.value = iso;
  endInput.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(h0+1)}:00`;

  modal({
    title: 'New event',
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
      { label: 'Add event', kind: 'primary', onClick: () => {
        if (!titleInput.value.trim()) return;
        const start = new Date(startInput.value);
        const end = new Date(endInput.value);
        store.push('events', {
          id: Math.random().toString(36).slice(2),
          title: titleInput.value.trim(),
          startTime: start, endTime: end,
          category: catSelect.value,
          createdAt: Date.now(), updatedAt: Date.now(),
        });
        toast({ kind: 'success', title: 'Event added', body: titleInput.value.trim() });
        rerender();
      } }
    ]
  });
}

function openEditEvent(ev) {
  const titleInput = h('input.field-input', { value: ev.title });
  const catSelect = h('select.field-select', {},
    ['WORK','PERSONAL','ACADEMIC','HEALTH'].map(c =>
      h('option', { value: c, selected: ev.category === c }, c.charAt(0) + c.slice(1).toLowerCase())
    )
  );
  const pad = n => String(n).padStart(2, '0');
  const isoStart = `${ev.startTime.getFullYear()}-${pad(ev.startTime.getMonth()+1)}-${pad(ev.startTime.getDate())}T${pad(ev.startTime.getHours())}:${pad(ev.startTime.getMinutes())}`;
  const isoEnd = `${ev.endTime.getFullYear()}-${pad(ev.endTime.getMonth()+1)}-${pad(ev.endTime.getDate())}T${pad(ev.endTime.getHours())}:${pad(ev.endTime.getMinutes())}`;
  const startInput = h('input.field-input', { type: 'datetime-local', value: isoStart });
  const endInput = h('input.field-input', { type: 'datetime-local', value: isoEnd });

  modal({
    title: 'Edit event',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Title'), titleInput),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Starts'), startInput),
        h('div.field', {}, h('div.field-label', {}, 'Ends'), endInput),
      ),
      h('div.field', {}, h('div.field-label', {}, 'Category'), catSelect),
    ),
    actions: [
      { label: 'Delete', kind: 'danger', onClick: () => { store.remove('events', ev.id); toast({ kind: 'info', title: 'Removed', body: ev.title }); rerender(); } },
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Save', kind: 'primary', onClick: () => {
        store.patch('events', ev.id, {
          title: titleInput.value.trim() || ev.title,
          category: catSelect.value,
          startTime: new Date(startInput.value),
          endTime: new Date(endInput.value),
        });
        toast({ kind: 'success', title: 'Updated' });
        rerender();
      } }
    ]
  });
}

export function unmount() { viewOffsetDays = 0; }
