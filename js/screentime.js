// ============================================================
// screentime.js — App usage tracker with productivity scoring
// ============================================================
import { store } from './store.js';
import { toast } from './bus.js';
import { h, icon, chip, modal } from './utils.js';

export const meta = { title: 'Screen Time', eyebrow: 'Awareness' };

const DAY = 86400000;

const APP_COLORS = {
  'VS Code':  '#6c8cff',
  'Chrome':   '#5cf2ff',
  'Twitter':  '#5cf2ff',
  'YouTube':  '#ff7e9e',
  'Instagram':'#ff6bd6',
  'Messages': '#6bffc1',
};

const PRODUCTIVE = new Set(['VS Code', 'Notion', 'GitHub', 'Linear', 'Docs']);
const DISTRACTING = new Set(['Twitter', 'YouTube', 'Instagram', 'TikTok', 'Reddit']);

export function render(root) {
  const daily = store.get('screenTime.daily') || [];

  // Aggregate per day
  const perDay = {};
  daily.forEach(d => {
    perDay[d.date] = perDay[d.date] || { total: 0, byApp: {}, productive: 0, distracting: 0 };
    perDay[d.date].total += d.minutes;
    perDay[d.date].byApp[d.app] = (perDay[d.date].byApp[d.app] || 0) + d.minutes;
    if (PRODUCTIVE.has(d.app)) perDay[d.date].productive += d.minutes;
    if (DISTRACTING.has(d.app)) perDay[d.date].distracting += d.minutes;
  });

  const dates = Object.keys(perDay).sort().reverse();
  const today = dates[0];
  const todayData = perDay[today] || { total: 0, byApp: {}, productive: 0, distracting: 0 };
  const productivityScore = todayData.total > 0 ? Math.round((todayData.productive / todayData.total) * 100) : 0;

  const stats = h('div.grid.grid-4', {});
  stats.appendChild(stat('Total today', formatMinutes(todayData.total), ''));
  stats.appendChild(stat('Productive', formatMinutes(todayData.productive), '', productivityScore >= 50 ? 'low' : productivityScore >= 30 ? 'medium' : 'high'));
  stats.appendChild(stat('Distracting', formatMinutes(todayData.distracting), '', todayData.distracting > 60 ? 'high' : 'low'));
  stats.appendChild(stat('Productivity', productivityScore, '%', productivityScore >= 60 ? 'low' : productivityScore >= 40 ? 'medium' : 'high'));
  root.appendChild(stats);

  // Alert if distracting > 60 min
  if (todayData.distracting > 60) {
    root.appendChild(h('div.card', { style: { marginTop: '20px', borderColor: 'rgba(255, 184, 107, 0.3)', background: 'linear-gradient(180deg, rgba(255, 184, 107, 0.06), rgba(255, 184, 107, 0.02))' } },
      h('div.row', { style: { gap: '14px' } },
        h('div', { style: { fontSize: '32px' } }, '⚠️'),
        h('div', { style: { flex: 1 } },
          h('div.text-sm.fw-600', { style: { color: 'var(--warning)', marginBottom: '4px' } }, 'Focus alert'),
          h('div.text-sm.text-muted', {}, `You've spent ${formatMinutes(todayData.distracting)} on distracting apps today. Consider a 25-minute focus block.`),
        ),
        h('button.btn.btn-secondary.btn-sm', { onclick: () => location.hash = 'focus' }, 'Start focus'),
      )
    ));
  }

  // Per-day bars + per-app breakdown for today
  const grid = h('div.grid.grid-2', { style: { marginTop: '24px' } });

  // Daily totals bar chart
  const dailyCard = h('div.card', {});
  dailyCard.appendChild(h('div.card-header', {},
    h('div.card-title', {}, icon('phone', 16), ' Daily usage — last 7 days'),
  ));
  dailyCard.appendChild(h('div', { html: dailyChart(perDay, dates) }));
  grid.appendChild(dailyCard);

  // Today's apps breakdown
  const appsCard = h('div.card', {});
  appsCard.appendChild(h('div.card-header', {},
    h('div.card-title', {}, icon('layers', 16), ' Today\'s apps'),
  ));
  const appsList = h('div.list', {});
  const apps = Object.entries(todayData.byApp).sort((a, b) => b[1] - a[1]);
  apps.forEach(([app, min]) => {
    const pct = todayData.total > 0 ? min / todayData.total : 0;
    const kind = PRODUCTIVE.has(app) ? 'low' : DISTRACTING.has(app) ? 'high' : '';
    appsList.appendChild(h('div.list-item', {},
      h('div', { style: { width: 8, height: 32, borderRadius: 4, background: APP_COLORS[app] || 'var(--aurora-violet)' } }),
      h('div.task-row-info', {},
        h('div.task-row-title', {}, app),
        h('div.task-row-sub', {}, Math.round(pct * 100) + '% of total'),
      ),
      chip(formatMinutes(min), kind),
    ));
  });
  appsCard.appendChild(appsList);
  grid.appendChild(appsCard);

  root.appendChild(grid);

  // Manual logger
  root.appendChild(h('div.card', { style: { marginTop: '24px' } },
    h('div.card-header', {},
      h('div.card-title', {}, icon('plus', 16), ' Log app usage'),
      h('div.card-subtitle', {}, 'Track a session manually'),
    ),
    h('div.row', { style: { gap: '12px', alignItems: 'flex-end' } },
      h('div.field', { style: { flex: 1, marginBottom: 0 } },
        h('div.field-label', {}, 'App'),
        h('select.field-select', { id: 'stApp' },
          ['VS Code','Chrome','Twitter','YouTube','Instagram','Messages','Other'].map(a => h('option', { value: a }, a))
        ),
      ),
      h('div.field', { style: { width: 120, marginBottom: 0 } },
        h('div.field-label', {}, 'Minutes'),
        h('input.field-input', { id: 'stMin', type: 'number', value: '25' }),
      ),
      h('button.btn.btn-primary', { onclick: () => logUsage() }, icon('plus', 14), ' Add'),
    )
  ));
}

function stat(label, value, suffix, kind = '') {
  const colors = { low: 'var(--success)', medium: 'var(--warning)', high: 'var(--danger)' };
  return h('div.card', {},
    h('div.stat', {},
      h('div.stat-label', {}, label),
      h('div.stat-value', { style: { background: kind ? `linear-gradient(135deg, ${colors[kind]}, var(--aurora-violet))` : '', WebkitBackgroundClip: kind ? 'text' : '', backgroundClip: kind ? 'text' : '', color: kind ? 'transparent' : '' } },
        value, suffix && h('span.stat-suffix', {}, suffix)
      )
    )
  );
}

function formatMinutes(min) {
  if (min < 60) return min + 'm';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h + 'h ' + (m > 0 ? m + 'm' : '');
}

function dailyChart(perDay, dates) {
  const last = dates.slice(0, 7).reverse();
  if (last.length === 0) return '<div class="empty" style="padding:20px"><div class="empty-sub">No data yet.</div></div>';
  const max = Math.max(60, ...last.map(d => perDay[d].total));
  return h('div.bar-chart', { html: last.map(d => {
    const data = perDay[d];
    const pct = data.total / max;
    const pPct = data.total > 0 ? (data.productive / data.total) : 0;
    return `
      <div class="bar-col">
        <div class="bar-shape" style="height: ${pct * 100}%; position:relative">
          <div style="position:absolute; bottom:0; left:0; right:0; height:${pPct*100}%; background:linear-gradient(180deg, var(--aurora-mint), var(--aurora-cyan)); border-radius: 6px 6px 2px 2px;"></div>
        </div>
        <div class="bar-label">${new Date(d).toLocaleDateString('en-US',{weekday:'short'})}</div>
        <div class="bar-value">${formatMinutes(data.total)}</div>
      </div>
    `;
  }).join('') });
}

function logUsage() {
  const app = document.getElementById('stApp')?.value || 'Other';
  const min = parseInt(document.getElementById('stMin')?.value || '0') || 0;
  if (min <= 0) return;
  const today = new Date().toISOString().slice(0,10);
  store.push('screenTime.daily', { date: today, app, minutes: min });
  toast({ kind: 'success', title: 'Logged', body: `${min} minutes on ${app}` });
  rerender();
}

function rerender() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const page = h('div.page', { dataset: { page: 'screentime' } });
  view.appendChild(page);
  render(page);
}

export function unmount() {}
