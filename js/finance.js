// ============================================================
// finance.js — Budget tracker with category analytics
// ============================================================
import { store, fmtDate } from './store.js';
import { toast } from './bus.js';
import { h, icon, chip, modal } from './utils.js';

export const meta = { title: 'Finance', eyebrow: 'Money' };

const DAY = 86400000;

const CAT_COLORS = {
  food:          '#ff6bd6',
  transport:     '#5cf2ff',
  entertainment: '#b07cff',
  shopping:      '#ffb86b',
  bills:         '#6c8cff',
  education:     '#6bffc1',
  other:         'rgba(255,255,255,0.4)',
};

export function render(root) {
  const tx = store.get('transactions') || [];
  const budget = store.get('budget') || { monthly: 1500, categories: {} };

  // This month
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const monthTx = tx.filter(t => new Date(t.date) >= monthStart);
  const monthTotal = monthTx.reduce((s, t) => s + t.amount, 0);
  const remaining = budget.monthly - monthTotal;

  // By category
  const byCat = {};
  monthTx.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });

  // Recurring detection
  const descriptions = {};
  tx.forEach(t => { descriptions[t.description] = (descriptions[t.description] || 0) + 1; });
  const recurring = Object.entries(descriptions).filter(([_, c]) => c >= 2).map(([d]) => d);

  // Stats
  const stats = h('div.grid.grid-4', {});
  stats.appendChild(stat('Monthly budget', '$' + budget.monthly, ''));
  stats.appendChild(stat('Spent', '$' + monthTotal.toFixed(2), ''));
  stats.appendChild(stat('Remaining', '$' + remaining.toFixed(2), '', remaining < 0 ? 'high' : remaining < budget.monthly * 0.2 ? 'medium' : 'low'));
  stats.appendChild(stat('Recurring', recurring.length, 'items', ''));
  root.appendChild(stats);

  const grid = h('div.grid.grid-2', { style: { marginTop: '24px' } });

  // Budget progress by category
  const budgetCard = h('div.card', {});
  budgetCard.appendChild(h('div.card-header', {},
    h('div.card-title', {}, icon('layers', 16), ' Budget by category'),
    h('button.btn.btn-sm.btn-secondary', { onclick: () => openBudget() }, icon('edit', 12), ' Edit')
  ));
  const cats = Object.keys(budget.categories || {});
  cats.forEach(cat => {
    const limit = budget.categories[cat] || 0;
    const spent = byCat[cat] || 0;
    const pct = limit > 0 ? Math.min(1, spent / limit) : 0;
    const over = spent > limit;
    budgetCard.appendChild(h('div.col', { style: { gap: '4px', padding: '10px 0', borderBottom: '1px solid var(--border-soft)' } },
      h('div.row-between', {},
        h('div.row', { style: { gap: '8px' } },
          h('div', { style: { width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[cat] } }),
          h('div.text-sm.fw-600', {}, capitalize(cat)),
        ),
        h('div.text-sm.text-mono', { style: { color: over ? 'var(--danger)' : 'var(--text-80)' } }, '$' + spent.toFixed(2) + ' / $' + limit),
      ),
      h('div.progress', {}, h('div.progress-fill', {
        style: { width: (pct * 100) + '%', background: over ? 'linear-gradient(90deg, var(--danger), var(--aurora-magenta))' : `linear-gradient(90deg, ${CAT_COLORS[cat]}, var(--aurora-violet))` }
      })),
    ));
  });
  grid.appendChild(budgetCard);

  // Category donut
  const donutCard = h('div.card', {});
  donutCard.appendChild(h('div.card-header', {},
    h('div.card-title', {}, icon('chart', 16), ' Spending breakdown'),
  ));
  donutCard.appendChild(h('div', { html: donutChart(monthTx) }));
  grid.appendChild(donutCard);

  root.appendChild(grid);

  // Recent transactions
  const txCard = h('div.card', { style: { marginTop: '24px' } });
  txCard.appendChild(h('div.card-header', {},
    h('div.card-title', {}, icon('money', 16), ' Recent transactions'),
    h('button.btn.btn-sm.btn-primary', { onclick: () => openTx() }, icon('plus', 12), ' Add')
  ));
  const txList = h('div.list', {});
  const recent = tx.slice(-10).reverse();
  if (recent.length === 0) {
    txList.appendChild(h('div.empty', { style: { padding: '20px' } }, h('div.empty-title', {}, 'No transactions yet')));
  }
  recent.forEach(t => {
    txList.appendChild(h('div.list-item', { onclick: () => removeTx(t.id) },
      h('div', { style: { width: 8, height: 36, borderRadius: 4, background: CAT_COLORS[t.category] } }),
      h('div.task-row-info', {},
        h('div.task-row-title', {}, t.description),
        h('div.task-row-sub', {}, fmtDate(t.date) + ' · ' + t.category + (t.recurring ? ' · ↻ recurring' : '')),
      ),
      h('div', { style: { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', color: 'var(--text-100)' } }, '-$' + t.amount.toFixed(2)),
    ));
  });
  txCard.appendChild(txList);
  root.appendChild(txCard);

  // Recurring detection callout
  if (recurring.length > 0) {
    root.appendChild(h('div.card', { style: { marginTop: '24px', borderColor: 'rgba(255, 184, 107, 0.3)', background: 'linear-gradient(180deg, rgba(255, 184, 107, 0.06), rgba(255, 184, 107, 0.02))' } },
      h('div.card-header', {},
        h('div.card-title', {}, icon('refresh', 16), ' Recurring expenses detected'),
        h('div.card-subtitle', {}, 'Auto-flagged from repeating patterns')
      ),
      h('div.list', {},
        ...recurring.map(d => {
          const t = tx.filter(x => x.description === d);
          const avg = t.reduce((s, x) => s + x.amount, 0) / t.length;
          return h('div.list-item', {},
            h('div', { style: { width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elev-2)', display: 'grid', placeItems: 'center', fontSize: '14px' } }, '↻'),
            h('div.list-item-title', {}, d),
            chip(`avg $${avg.toFixed(2)}/mo`, 'medium'),
            h('div.list-item-meta', {}, `${t.length} charges`),
          );
        })
      )
    ));
  }
}

function stat(label, value, suffix = '', kind = '') {
  return h('div.card', {},
    h('div.stat', {},
      h('div.stat-label', {}, label),
      h('div.stat-value', { style: kind === 'high' ? { background: 'linear-gradient(135deg, var(--danger), var(--aurora-magenta))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : {} }, value, suffix && h('span.stat-suffix', {}, suffix))
    )
  );
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function donutChart(txList) {
  if (txList.length === 0) {
    return h('div.empty', { style: { padding: '20px' } }, h('div.empty-sub', {}, 'No spending this month.'));
  }
  const totals = {};
  txList.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const total = Object.values(totals).reduce((s, x) => s + x, 0);
  const cx = 60, cy = 60, r = 50, stroke = 14;
  const C = 2 * Math.PI * r;
  const cats = Object.entries(totals);
  let offset = 0;

  const svg = `
    <svg viewBox="0 0 120 120" width="120" height="120">
      <circle cx="${cx}" cy="${cy}" r="${r}" stroke="var(--bg-elev-2)" stroke-width="${stroke}" fill="none"/>
      ${cats.map(([cat, amount]) => {
        const pct = amount / total;
        const dash = pct * C;
        const gap = C - dash;
        const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${CAT_COLORS[cat]}" stroke-width="${stroke}" fill="none"
          stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" stroke-linecap="round"
          transform="rotate(-90 ${cx} ${cy})" style="filter:drop-shadow(0 0 6px ${CAT_COLORS[cat]})"/>`;
        offset += dash;
        return seg;
      }).join('')}
    </svg>
  `;
  const wrap = h('div.donut-wrap', { style: { position: 'relative' } });
  wrap.innerHTML = svg;
  wrap.appendChild(h('div.donut-center', { style: { position: 'absolute', top: '50%', left: '60px', transform: 'translate(-50%, -50%)', textAlign: 'center' } },
    h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700 } }, '$' + total.toFixed(0)),
    h('div.donut-center-label', {}, 'this mo'),
  ));
  wrap.appendChild(h('div.donut-legend', {},
    ...cats.map(([cat, amount]) => h('div.donut-legend-row', {},
      h('div.donut-legend-dot', { style: { background: CAT_COLORS[cat] } }),
      h('div.donut-legend-label', {}, capitalize(cat)),
      h('div.donut-legend-value', {}, '$' + amount.toFixed(0)),
    ))
  ));
  return wrap;
}

function openTx() {
  const desc = h('input.field-input', { placeholder: 'e.g. Coffee at Blue Bottle' });
  const amount = h('input.field-input', { type: 'number', placeholder: 'Amount', step: '0.01' });
  const cat = h('select.field-select', {},
    ['food','transport','entertainment','shopping','bills','education','other'].map(c => h('option', { value: c }, capitalize(c)))
  );
  modal({
    title: 'Add transaction',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Description'), desc),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Amount'), amount),
        h('div.field', {}, h('div.field-label', {}, 'Category'), cat),
      ),
    ),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Add', kind: 'primary', onClick: () => {
        if (!desc.value.trim() || !amount.value) return;
        store.push('transactions', {
          id: Math.random().toString(36).slice(2),
          amount: parseFloat(amount.value),
          description: desc.value.trim(),
          category: cat.value,
          date: new Date(),
          recurring: false,
        });
        toast({ kind: 'success', title: 'Added', body: '-$' + parseFloat(amount.value).toFixed(2) });
        rerender();
      } }
    ]
  });
}

function removeTx(id) {
  store.remove('transactions', id);
  toast({ kind: 'info', title: 'Removed' });
  rerender();
}

function openBudget() {
  const budget = store.get('budget') || { monthly: 1500, categories: {} };
  const total = h('input.field-input', { type: 'number', value: budget.monthly });
  const rows = Object.entries(budget.categories).map(([cat, val]) => {
    const input = h('input.field-input', { type: 'number', value: val, 'data-cat': cat });
    return h('div.field-row', {},
      h('div.field', {}, h('div.field-label', { style: { color: 'var(--text-80)' } }, capitalize(cat))),
      h('div.field', {}, input),
    );
  });
  modal({
    title: 'Edit budget',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Monthly total'), total),
      ...rows,
    ),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Save', kind: 'primary', onClick: () => {
        const categories = {};
        document.querySelectorAll('[data-cat]').forEach(inp => { categories[inp.dataset.cat] = parseInt(inp.value) || 0; });
        store.set('budget', { monthly: parseInt(total.value) || 0, categories });
        toast({ kind: 'success', title: 'Budget updated' });
        rerender();
      } }
    ]
  });
}

function rerender() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const page = h('div.page', { dataset: { page: 'finance' } });
  view.appendChild(page);
  render(page);
}

export function unmount() {}
