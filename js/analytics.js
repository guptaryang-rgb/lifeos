// ============================================================
// analytics.js — Productivity analytics with custom SVG charts
// ============================================================
import { store } from './store.js';
import { h, icon, chip } from './utils.js';

export const meta = { title: 'Analytics', eyebrow: 'Insights' };

const DAY = 86400000;

export function render(root) {
  const tasks = store.get('tasks') || [];
  const sessions = store.get('focusSessions') || [];
  const habits = store.get('habits') || [];
  const habitLogs = store.get('habitLogs') || [];
  const events = store.get('events') || [];
  const water = store.get('wellness.water') || [];

  // This week
  const last7 = (arr, getTime) => arr.filter(x => Date.now() - getTime(x) < 7 * DAY);
  const weekTasks = last7(tasks.filter(t => t.status === 'COMPLETED'), t => t.completedAt || t.updatedAt);
  const weekFocus = sessions.filter(s => Date.now() - s.startTime < 7 * DAY).reduce((s, x) => s + x.duration, 0);
  const weekEvents = events.filter(e => Date.now() - new Date(e.startTime).getTime() < 7 * DAY).length;

  // Stats
  const stats = h('div.grid.grid-4', {});
  stats.appendChild(stat('Tasks done (7d)', weekTasks.length, ''));
  stats.appendChild(stat('Focus time (7d)', weekFocus, 'min'));
  stats.appendChild(stat('Events (7d)', weekEvents, ''));
  stats.appendChild(stat('Habits completed', habitLogs.length, ''));
  root.appendChild(stats);

  // Charts grid
  const grid = h('div.grid.grid-2', { style: { marginTop: '24px' } });

  // Focus line chart - last 14 days
  grid.appendChild(
    h('div.card', {},
      h('div.card-header', {},
        h('div.card-title', {}, icon('clock', 16), ' Focus minutes — last 14 days'),
      ),
      h('div', { html: focusLineChart(sessions) }),
    )
  );

  // Task completion bar chart - last 14 days
  grid.appendChild(
    h('div.card', {},
      h('div.card-header', {},
        h('div.card-title', {}, icon('check', 16), ' Tasks completed — last 14 days'),
      ),
      h('div.bar-chart', { html: tasksBarChart(tasks) }),
    )
  );

  // Category donut - tasks by priority
  grid.appendChild(
    h('div.card', {},
      h('div.card-header', {},
        h('div.card-title', {}, icon('layers', 16), ' Tasks by priority'),
      ),
      h('div.donut-wrap', { html: priorityDonut(tasks) }),
    )
  );

  // Habit consistency heatmap (already has its own page, summary here)
  grid.appendChild(
    h('div.card', {},
      h('div.card-header', {},
        h('div.card-title', {}, icon('fire', 16), ' Habit consistency'),
      ),
      h('div.col', { style: { gap: '10px' } },
        ...habits.map(hb => {
          const myLogs = habitLogs.filter(l => l.habitId === hb.id && Date.now() - l.completedAt < 14 * DAY);
          const rate = Math.round((myLogs.length / 14) * 100);
          return h('div.col', { style: { gap: '4px' } },
            h('div.row-between', {},
              h('div.text-sm.fw-600', {}, hb.title),
              h('div.text-sm.text-mono', {}, rate + '%'),
            ),
            h('div.progress', {}, h('div.progress-fill', { style: { width: rate + '%' } })),
          );
        })
      ),
    )
  );

  root.appendChild(grid);
}

function stat(label, value, suffix) {
  return h('div.card', {},
    h('div.stat', {},
      h('div.stat-label', {}, label),
      h('div.stat-value', {}, String(value), suffix && h('span.stat-suffix', {}, suffix))
    )
  );
}

function focusLineChart(sessions) {
  const days = 14;
  const perDay = Array.from({ length: days }, (_, i) => {
    const day = Date.now() - (days - 1 - i) * DAY;
    return sessions.filter(s => s.startTime >= day && s.startTime < day + DAY).reduce((sum, s) => sum + s.duration, 0);
  });
  const max = Math.max(60, ...perDay);
  const w = 480, h = 140, pad = 10;
  const step = (w - pad * 2) / (days - 1);
  const points = perDay.map((v, i) => `${pad + i * step},${h - pad - (v / max) * (h - pad * 2)}`);
  const linePath = `M ${points.join(' L ')}`;
  const fillPath = `${linePath} L ${pad + (days - 1) * step},${h - pad} L ${pad},${h - pad} Z`;

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#5cf2ff"/>
          <stop offset="100%" stop-color="#ff6bd6"/>
        </linearGradient>
        <linearGradient id="lineFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#b07cff" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#b07cff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${perDay.map((v, i) => {
        if (v === 0) return '';
        const y = h - pad - (v / max) * (h - pad * 2);
        return `<circle cx="${pad + i * step}" cy="${y}" r="3" fill="#b07cff" filter="drop-shadow(0 0 4px #b07cff)"/>`;
      }).join('')}
      <path d="${fillPath}" fill="url(#lineFill)"/>
      <path d="${linePath}" fill="none" stroke="url(#lineGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function tasksBarChart(tasks) {
  const days = 14;
  const perDay = Array.from({ length: days }, (_, i) => {
    const day = Date.now() - (days - 1 - i) * DAY;
    return tasks.filter(t => t.status === 'COMPLETED' && (t.completedAt || t.updatedAt) >= day && (t.completedAt || t.updatedAt) < day + DAY).length;
  });
  const max = Math.max(1, ...perDay);
  return perDay.map((v, i) => {
    const day = Date.now() - (days - 1 - i) * DAY;
    const pct = v / max;
    const dayLabel = new Date(day).toLocaleDateString('en-US', { weekday: 'short' });
    return `
      <div class="bar-col">
        <div class="bar-shape" style="height: ${pct * 100}%; background: linear-gradient(180deg, var(--aurora-mint), var(--aurora-cyan))" title="${v} tasks"></div>
        <div class="bar-label">${dayLabel[0]}</div>
        <div class="bar-value">${v}</div>
      </div>
    `;
  }).join('');
}

function priorityDonut(tasks) {
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  tasks.filter(t => t.status !== 'COMPLETED').forEach(t => { counts[t.priority] = (counts[t.priority] || 0) + 1; });
  const total = counts.HIGH + counts.MEDIUM + counts.LOW;
  if (total === 0) return '<div class="empty" style="padding:20px"><div class="empty-sub">No active tasks.</div></div>';
  const colors = { HIGH: 'var(--danger)', MEDIUM: 'var(--warning)', LOW: 'var(--success)' };
  const cx = 60, cy = 60, r = 50, stroke = 14;
  const C = 2 * Math.PI * r;
  const entries = Object.entries(counts).filter(([_, v]) => v > 0);
  let offset = 0;
  const svg = `
    <svg viewBox="0 0 120 120" width="120" height="120">
      <circle cx="${cx}" cy="${cy}" r="${r}" stroke="var(--bg-elev-2)" stroke-width="${stroke}" fill="none"/>
      ${entries.map(([k, v]) => {
        const pct = v / total;
        const dash = pct * C;
        const gap = C - dash;
        const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${colors[k]}" stroke-width="${stroke}" fill="none"
          stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" stroke-linecap="round"
          transform="rotate(-90 ${cx} ${cy})" style="filter:drop-shadow(0 0 6px ${colors[k]})"/>`;
        offset += dash;
        return seg;
      }).join('')}
    </svg>
  `;
  const wrap = h('div', { style: { display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' } });
  wrap.innerHTML = svg;
  wrap.appendChild(h('div.donut-center', { style: { position: 'absolute', top: '50%', left: '60px', transform: 'translate(-50%, -50%)', textAlign: 'center' } },
    h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 700 } }, total),
    h('div.donut-center-label', {}, 'open'),
  ));
  wrap.appendChild(h('div.donut-legend', {},
    ...entries.map(([k, v]) => h('div.donut-legend-row', {},
      h('div.donut-legend-dot', { style: { background: colors[k] } }),
      h('div.donut-legend-label', {}, k.charAt(0) + k.slice(1).toLowerCase()),
      h('div.donut-legend-value', {}, v),
    ))
  ));
  return wrap.outerHTML || '';
}

export function unmount() {}
