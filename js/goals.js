// ============================================================
// goals.js — Goal + milestone system with progress auto-update
// ============================================================
import { store, fmtDate } from './store.js';
import { toast } from './bus.js';
import { h, icon, chip, modal } from './utils.js';

export const meta = { title: 'Goals', eyebrow: 'Direction' };

export function render(root) {
  const goals = store.get('goals') || [];
  const milestones = store.get('milestones') || [];

  root.appendChild(h('div.row-between', {},
    h('div', {},
      h('div', { style: { fontSize: '13px', color: 'var(--text-60)' } }, `${goals.length} active goals · ${milestones.length} milestones`)
    ),
    h('button.btn.btn-primary', { onclick: () => openGoal(null) }, icon('plus', 14), ' New goal')
  ));

  if (goals.length === 0) {
    root.appendChild(h('div.empty', {},
      h('div.empty-icon', {}, '🎯'),
      h('div.empty-title', {}, 'No goals yet'),
      h('div.empty-sub', {}, 'Set short, medium, and long-term goals. Link tasks to them later.')
    ));
    return;
  }

  const grid = h('div.grid.grid-auto-320', {});
  goals.forEach(g => grid.appendChild(goalCard(g, milestones.filter(m => m.goalId === g.id))));
  root.appendChild(grid);
}

function goalCard(g, ms) {
  const completed = ms.filter(m => m.status === 'COMPLETED').length;
  const total = ms.length;
  return h('div.card', { onclick: () => openGoal(g) },
    h('div.card-header', {},
      h('div', {},
        h('div.card-title', {}, icon('target', 16), g.title),
        h('div.card-subtitle', {}, fmtDate(g.targetDate)),
      ),
      chip(`${completed}/${total} milestones`, ''),
    ),
    h('div', { style: { fontSize: '13px', color: 'var(--text-60)', marginBottom: '14px', minHeight: '38px' } }, g.description || 'No description yet.'),
    h('div.row-between', { style: { marginBottom: '8px' } },
      h('div.text-sm.text-muted', {}, 'Progress'),
      h('div.text-sm.fw-600.text-mono', {}, g.progress + '%'),
    ),
    h('div.progress', {}, h('div.progress-fill', { style: { width: g.progress + '%' } })),
    total > 0 ? h('div.col', { style: { gap: '6px', marginTop: '14px' } },
      ...ms.slice(0, 3).map(m =>
        h('div.row', { style: { gap: '8px', fontSize: '12px' } },
          h('div', { style: { width: 8, height: 8, borderRadius: '50%', background: m.status === 'COMPLETED' ? 'var(--success)' : m.status === 'IN_PROGRESS' ? 'var(--aurora-cyan)' : 'var(--bg-elev-3)' } }),
          h('div', { style: { flex: 1, color: m.status === 'COMPLETED' ? 'var(--text-40)' : 'var(--text-80)', textDecoration: m.status === 'COMPLETED' ? 'line-through' : 'none' } }, m.title),
          h('div.text-xs.text-faint', {}, fmtDate(m.targetDate)),
        )
      ),
      total > 3 ? h('div.text-xs.text-faint', { style: { marginTop: '4px' } }, `+${total - 3} more`) : null,
    ) : null,
  );
}

function openGoal(g) {
  const isNew = !g;
  const title = h('input.field-input', { value: g?.title || '', placeholder: 'Goal title' });
  const desc = h('textarea.field-textarea', { placeholder: 'Why this goal?' }, g?.description || '');
  const target = h('input.field-input', { type: 'date' });
  const progress = h('input.slider', { type: 'range', min: 0, max: 100, value: g?.progress ?? 0 });
  const progVal = h('span.text-sm.text-mono', {}, (g?.progress ?? 0) + '%');
  progress.addEventListener('input', () => { progVal.textContent = progress.value + '%'; });
  if (g) {
    const pad = n => String(n).padStart(2,'0');
    target.value = `${g.targetDate.getFullYear()}-${pad(g.targetDate.getMonth()+1)}-${pad(g.targetDate.getDate())}`;
  } else {
    const d = new Date(Date.now() + 30 * 86400000);
    const pad = n => String(n).padStart(2,'0');
    target.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  modal({
    title: isNew ? 'New goal' : 'Edit goal',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Title'), title),
      h('div.field', {}, h('div.field-label', {}, 'Description'), desc),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Target date'), target),
        h('div.field', {}, h('div.field-label', {}, 'Progress'), h('div.row', { style: { gap: '8px' } }, progress, progVal)),
      ),
    ),
    actions: g
      ? [
          { label: 'Delete', kind: 'danger', onClick: () => {
              store.remove('goals', g.id);
              store.set('milestones', (store.get('milestones') || []).filter(m => m.goalId !== g.id));
              toast({ kind: 'info', title: 'Goal removed' });
              rerender();
            }
          },
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Save', kind: 'primary', onClick: () => save(g, title, desc, target, progress) },
        ]
      : [
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Create', kind: 'primary', onClick: () => save(g, title, desc, target, progress) },
        ]
  });

  // If editing, show milestones below
  if (g) {
    const ms = (store.get('milestones') || []).filter(m => m.goalId === g.id);
    const msBody = h('div.col', { style: { gap: '8px' } },
      ...ms.map(m => h('div.list-item', { onclick: () => cycleMilestone(m.id) },
        h('div.list-item-check', { class: m.status === 'COMPLETED' ? 'done' : '' }),
        h('div.list-item-title', {}, m.title),
        chip(m.status.toLowerCase().replace('_', '-'), m.status === 'COMPLETED' ? 'low' : m.status === 'IN_PROGRESS' ? 'medium' : ''),
      )),
      h('button.btn.btn-secondary.btn-sm', { onclick: () => openMilestone(g.id) }, icon('plus', 12), ' Add milestone'),
    );
    // Append into the modal body
    const modalEl = document.querySelector('.modal');
    if (modalEl) {
      const h2 = h('h3', { style: { fontSize: '13px', color: 'var(--text-60)', marginTop: '16px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 600 } }, 'Milestones');
      modalEl.appendChild(h2);
      modalEl.appendChild(msBody);
    }
  }
}

function save(g, title, desc, target, progress) {
  if (!title.value.trim()) return;
  const payload = {
    title: title.value.trim(),
    description: desc.value,
    targetDate: new Date(target.value),
    progress: parseInt(progress.value),
  };
  if (g) {
    store.patch('goals', g.id, payload);
    toast({ kind: 'success', title: 'Goal updated' });
  } else {
    store.push('goals', { id: Math.random().toString(36).slice(2), createdAt: Date.now(), ...payload });
    toast({ kind: 'success', title: 'Goal created', body: payload.title });
  }
  rerender();
}

function cycleMilestone(id) {
  const m = (store.get('milestones') || []).find(x => x.id === id);
  if (!m) return;
  const next = m.status === 'NOT_STARTED' ? 'IN_PROGRESS' : m.status === 'IN_PROGRESS' ? 'COMPLETED' : 'NOT_STARTED';
  store.patch('milestones', id, { status: next });
  if (next === 'COMPLETED') toast({ kind: 'success', title: 'Milestone done', body: m.title });
  rerender();
}

function openMilestone(goalId) {
  const title = h('input.field-input', { placeholder: 'Milestone title' });
  const target = h('input.field-input', { type: 'date' });
  modal({
    title: 'New milestone',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Title'), title),
      h('div.field', {}, h('div.field-label', {}, 'Target'), target),
    ),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Add', kind: 'primary', onClick: () => {
        if (!title.value.trim()) return;
        store.push('milestones', {
          id: Math.random().toString(36).slice(2),
          goalId, title: title.value.trim(),
          status: 'NOT_STARTED',
          targetDate: new Date(target.value || Date.now() + 7 * 86400000),
          createdAt: Date.now(),
        });
        toast({ kind: 'success', title: 'Milestone added' });
        rerender();
      } }
    ]
  });
}

function rerender() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const page = h('div.page', { dataset: { page: 'goals' } });
  view.appendChild(page);
  render(page);
}

export function unmount() {}
