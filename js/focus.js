// ============================================================
// focus.js — Deep Work / Pomodoro timer with session logging
// ============================================================
import { store, fmtTime } from './store.js';
import { toast } from './bus.js';
import { h, icon } from './utils.js';

export const meta = { title: 'Deep Work', eyebrow: 'Focus' };

let timerInterval = null;
let timerEnd = 0;
let timerMode = 'focus'; // 'focus' | 'short' | 'long'
let timerDuration = 25 * 60;
let timerTaskTitle = null;
let paused = false;
let remainingOnPause = 0;
let mounted = false;

const MODES = {
  focus: { label: 'Focus', minutes: 25 },
  short: { label: 'Short break', minutes: 5 },
  long:  { label: 'Long break', minutes: 15 },
};

export function render(root) {
  mounted = true;
  // Listen for AI secretary start
  const aiStart = (e) => {
    const dur = e.detail?.duration || 25;
    const title = e.detail?.taskTitle || null;
    start(dur * 60, title);
  };
  window.addEventListener('lifeos:focus-start', aiStart);

  root.appendChild(buildTimerCard());
  root.appendChild(buildStatsRow());
  root.appendChild(buildRecentList());
}

function buildTimerCard() {
  if (!timerEnd || paused) {
    // idle
    timerDuration = MODES[timerMode].minutes * 60;
  }
  const card = h('div.timer', { id: 'timerCard' });
  card.appendChild(buildModeRow());
  card.appendChild(buildRing(timerDuration, timerDuration));
  card.appendChild(buildControls());
  return card;
}

function buildModeRow() {
  const row = h('div.row', { style: { gap: '6px' } });
  Object.entries(MODES).forEach(([key, m]) => {
    row.appendChild(h('div.timer-mode-pill', {
      class: timerMode === key ? 'active' : '',
      onclick: () => { timerMode = key; timerDuration = m.minutes * 60; resetTimer(); rerender(); },
    }, m.label));
  });
  return row;
}

function buildRing(durationSec, remainingSec) {
  const total = durationSec || timerDuration;
  const rem = remainingSec;
  const pct = total > 0 ? rem / total : 1;
  const r = 100, cx = 120, cy = 120;
  const angle = 2 * Math.PI * (1 - pct);
  const x = cx + r * Math.cos(angle - Math.PI / 2);
  const y = cy + r * Math.sin(angle - Math.PI / 2);
  const largeArc = pct < 0.5 ? 1 : 0;

  const wrap = h('div.timer-ring', {});
  wrap.innerHTML = `
    <svg viewBox="0 0 240 240" width="240" height="240">
      <defs>
        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#5cf2ff"/>
          <stop offset="50%" stop-color="#b07cff"/>
          <stop offset="100%" stop-color="#ff6bd6"/>
        </linearGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" stroke="rgba(255,255,255,0.06)" stroke-width="10" fill="none"/>
      <path d="M ${cx + r * Math.cos(-Math.PI/2)} ${cy + r * Math.sin(-Math.PI/2)} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}"
            stroke="url(#ringGradient)" stroke-width="10" fill="none" stroke-linecap="round"
            style="filter:drop-shadow(0 0 12px rgba(176,124,255,0.6)); transition: all 1s linear"/>
    </svg>
  `;
  const display = h('div.timer-display', { id: 'timerDisplay' }, formatTime(rem));
  display.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);';
  wrap.style.position = 'relative';
  wrap.appendChild(display);

  if (timerTaskTitle) {
    const lbl = h('div', { style: { position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: 'var(--text-60)', whiteSpace: 'nowrap' } }, 'Working on: ' + timerTaskTitle);
    wrap.appendChild(lbl);
  }
  return wrap;
}

function buildControls() {
  const controls = h('div.timer-controls', {});
  if (!timerEnd || paused) {
    controls.appendChild(h('button.btn.btn-primary.btn-lg', { onclick: () => start(timerDuration, timerTaskTitle) },
      icon('play', 14), ' Start ' + MODES[timerMode].label.toLowerCase()
    ));
  } else {
    controls.appendChild(h('button.btn.btn-secondary', { onclick: () => pause() }, icon('pause', 14), ' Pause'));
    controls.appendChild(h('button.btn.btn-danger', { onclick: () => stop(true) }, icon('x', 14), ' End session'));
  }
  return controls;
}

function buildStatsRow() {
  const sessions = store.get('focusSessions') || [];
  const today = sessions.filter(s => Date.now() - s.startTime < 86400000);
  const week = sessions.filter(s => Date.now() - s.startTime < 7 * 86400000);
  const todayMin = today.reduce((sum, s) => sum + s.duration, 0);
  const weekMin = week.reduce((sum, s) => sum + s.duration, 0);
  const avg = sessions.length === 0 ? 0 : Math.round(sessions.reduce((s, x) => s + x.duration, 0) / sessions.length);

  const grid = h('div.grid.grid-4', { style: { marginTop: '24px' } },
    stat('Today', todayMin, 'min'),
    stat('This week', weekMin, 'min'),
    stat('Sessions', sessions.length, ''),
    stat('Avg length', avg, 'min'),
  );
  return grid;
}

function stat(label, value, suffix) {
  return h('div.card', {},
    h('div.stat', {},
      h('div.stat-label', {}, label),
      h('div.stat-value', {}, String(value), suffix && h('span.stat-suffix', {}, suffix))
    )
  );
}

function buildRecentList() {
  const sessions = (store.get('focusSessions') || []).slice(-10).reverse();
  if (sessions.length === 0) return h('div', {});

  const card = h('div.card', { style: { marginTop: '24px' } });
  card.appendChild(h('div.card-header', {},
    h('div.card-title', {}, icon('clock', 16), ' Recent sessions'),
    h('div.card-subtitle', {}, `${sessions.length} latest`)
  ));

  const list = h('div.list', {});
  sessions.forEach(s => {
    list.appendChild(h('div.list-item', {},
      h('div', { style: { width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--aurora-cyan), var(--aurora-violet))', display: 'grid', placeItems: 'center', color: 'var(--bg-void)', fontWeight: 700, fontSize: '11px' } }, s.duration + 'm'),
      h('div.list-item-title', {}, s.taskTitle || 'Focus session'),
      h('div.list-item-meta', {}, new Date(s.startTime).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }))
    ));
  });
  card.appendChild(list);
  return card;
}

// ---- Timer mechanics ----
function start(seconds, taskTitle) {
  if (timerEnd && !paused) return;
  timerDuration = seconds || MODES.focus.minutes * 60;
  timerTaskTitle = taskTitle || null;
  timerEnd = Date.now() + (paused ? remainingOnPause : timerDuration) * 1000;
  paused = false;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);
  rerender();
}
function pause() {
  if (!timerEnd || paused) return;
  remainingOnPause = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
  timerEnd = 0;
  paused = true;
  if (timerInterval) clearInterval(timerInterval);
  rerender();
}
function stop(logIt) {
  const elapsed = timerDuration - Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
  if (logIt && elapsed > 60) {
    store.push('focusSessions', {
      id: Math.random().toString(36).slice(2),
      startTime: new Date(Date.now() - elapsed * 1000),
      endTime: new Date(),
      duration: elapsed,
      taskTitle: timerTaskTitle,
      createdAt: Date.now(),
    });
    toast({ kind: 'success', title: 'Session saved', body: `${elapsed} minutes of focus` });
  } else if (!logIt) {
    toast({ kind: 'info', title: 'Session ended' });
  }
  timerEnd = 0;
  paused = false;
  remainingOnPause = 0;
  if (timerInterval) clearInterval(timerInterval);
  rerender();
}
function resetTimer() {
  timerEnd = 0;
  paused = false;
  remainingOnPause = 0;
  if (timerInterval) clearInterval(timerInterval);
}

function tick() {
  const rem = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
  const disp = document.getElementById('timerDisplay');
  if (disp) disp.textContent = formatTime(rem);
  // Update ring
  const card = document.getElementById('timerCard');
  if (card) {
    const svg = card.querySelector('svg');
    if (svg) {
      const pct = rem / timerDuration;
      const r = 100, cx = 120, cy = 120;
      const angle = 2 * Math.PI * (1 - pct);
      const x = cx + r * Math.cos(angle - Math.PI / 2);
      const y = cy + r * Math.sin(angle - Math.PI / 2);
      const largeArc = pct < 0.5 ? 1 : 0;
      const path = svg.querySelector('path');
      if (path) path.setAttribute('d', `M ${cx + r * Math.cos(-Math.PI/2)} ${cy + r * Math.sin(-Math.PI/2)} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`);
    }
  }
  if (rem <= 0) {
    stop(true);
    toast({ kind: 'success', title: 'Focus complete!', body: 'Nice work. Take a break.', timeout: 5000 });
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function rerender() {
  if (!mounted) return;
  const view = document.getElementById('view');
  view.innerHTML = '';
  const page = h('div.page', { dataset: { page: 'focus' } });
  view.appendChild(page);
  render(page);
}

export function unmount() {
  mounted = false;
  // Don't kill the timer if running — let it complete in background
}
