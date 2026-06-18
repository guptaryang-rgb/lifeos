// ============================================================
// wellness.js — Water, sleep, mood, journal, meditation
// ============================================================
import { store, fmtDate } from './store.js';
import { toast } from './bus.js';
import { h, icon, chip, modal } from './utils.js';

export const meta = { title: 'Wellness', eyebrow: 'Mind & Body' };

const localISO = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function render(root) {
  const water = (store.get('wellness.water') || []).slice(0, 14);
  const sleep = (store.get('wellness.sleep') || []).slice(0, 14);
  const mood = (store.get('wellness.mood') || []).slice(0, 7);
  const journal = store.get('wellness.journal') || [];
  const meditation = (store.get('wellness.meditation') || []).slice(0, 14);

  const today = localISO();
  const todayWater = water.find(w => w.date === today)?.glasses || 0;
  const todaySleep = sleep.find(s => s.date === today);
  const todayMood = mood.find(m => m.date === today);

  // Top: quick loggers
  const quickRow = h('div.grid.grid-4', {});
  quickRow.appendChild(quickCard('💧', 'Water today', todayWater + ' / 8 glasses', () => addWater()));
  quickRow.appendChild(quickCard('😴', 'Sleep last night', todaySleep ? todaySleep.hours + 'h' : '—', () => openSleep()));
  quickRow.appendChild(quickCard('😊', 'Mood today', todayMood ? todayMood.note : '—', () => openMood()));
  quickRow.appendChild(quickCard('🧘', 'Meditation', meditation.length + ' sessions', () => openMeditation()));
  root.appendChild(quickRow);

  // Sleep bars
  root.appendChild(h('div.card', { style: { marginTop: '24px' } },
    h('div.card-header', {},
      h('div.card-title', {}, icon('moon', 16), ' Sleep — last 14 nights'),
    ),
    h('div.bar-chart', { html: sleepBars(sleep) }),
  ));

  // Mood timeline
  root.appendChild(h('div.card', { style: { marginTop: '24px' } },
    h('div.card-header', {},
      h('div.card-title', {}, icon('heart', 16), ' Mood — this week'),
    ),
    h('div', { html: moodTimeline(mood) }),
  ));

  // Journal
  root.appendChild(h('div.card', { style: { marginTop: '24px' } },
    h('div.card-header', {},
      h('div.card-title', {}, icon('pen', 16), ' Journal'),
      h('button.btn.btn-sm.btn-primary', { onclick: () => openJournal() }, icon('plus', 12), ' Write')
    ),
    journal.length === 0
      ? h('div.empty', { style: { padding: '20px' } }, h('div.empty-icon', { style: { fontSize: '24px' } }, '📓'), h('div.empty-title', {}, 'No entries yet'))
      : h('div.list', {},
          ...journal.slice(0, 5).map(j =>
            h('div.list-item', { onclick: () => openJournal(j) },
              h('div', { style: { width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--aurora-violet), var(--aurora-magenta))', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 700, color: 'white' } }, 'J'),
              h('div.list-item-title', {}, j.title || j.body.slice(0, 60)),
              h('div.list-item-meta', {}, fmtDate(j.date)),
            )
          )
        )
  ));

  // Knowledge library callout
  root.appendChild(h('div.card', { style: { marginTop: '24px' } },
    h('div.card-header', {},
      h('div.card-title', {}, icon('lightbulb', 16), ' Today\'s read'),
    ),
    h('div', { style: { padding: '20px', background: 'linear-gradient(135deg, rgba(108, 252, 193, 0.08), rgba(92, 242, 255, 0.05))', borderRadius: '12px' } },
      h('div.text-sm.fw-600', { style: { color: 'var(--aurora-mint)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: '6px' } }, 'Cognitive science'),
      h('div', { style: { fontSize: '16px', fontWeight: 600, marginBottom: '8px' } }, 'Spacing effect: why you should review tomorrow'),
      h('div.text-sm.text-muted', {}, 'Reviewing material at expanding intervals — 1 day, 3 days, 7 days, 14 days — produces dramatically better retention than cramming. The brain encodes retrieval as a memory strength signal.'),
    )
  ));
}

function quickCard(emoji, label, value, fn) {
  return h('div.card', { onclick: fn, style: { cursor: 'pointer', textAlign: 'center', padding: '20px' } },
    h('div', { style: { fontSize: '28px', marginBottom: '8px' } }, emoji),
    h('div.text-xs.text-muted', { style: { textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 600, marginBottom: '4px' } }, label),
    h('div', { style: { fontSize: '14px', fontWeight: 600 } }, value),
  );
}

function sleepBars(sleep) {
  if (sleep.length === 0) return '';
  const max = 10;
  const days = sleep.slice(0, 14).reverse();
  return days.map(s => {
    const pct = Math.min(1, s.hours / max);
    const color = s.hours >= 7 ? 'linear-gradient(180deg, var(--aurora-mint), var(--aurora-cyan))'
                : s.hours >= 6 ? 'linear-gradient(180deg, var(--aurora-cyan), var(--aurora-violet))'
                : 'linear-gradient(180deg, var(--warning), var(--danger))';
    return `
      <div class="bar-col">
        <div class="bar-shape" style="height: ${pct * 100}%; background: ${color}" title="${s.hours}h"></div>
        <div class="bar-value">${s.hours}h</div>
      </div>
    `;
  }).join('');
}

function moodTimeline(mood) {
  if (mood.length === 0) return '<div class="empty" style="padding:20px"><div class="empty-sub">No mood entries yet.</div></div>';
  const moods = ['😣','😟','😐','🙂','😄'];
  return h('div.row', { style: { justifyContent: 'space-between', gap: '8px' } },
    ...mood.slice(0, 7).map(m =>
      h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 } },
        h('div', { style: { fontSize: '28px' } }, moods[m.score - 1] || '🙂'),
        h('div.text-xs.text-muted', {}, new Date(m.date).toLocaleDateString('en-US', { weekday: 'short' })),
        h('div.text-xs.text-faint', {}, m.note),
      )
    )
  );
}

function addWater() {
  const today = localISO();
  const water = store.get('wellness.water') || [];
  const idx = water.findIndex(w => w.date === today);
  if (idx >= 0) {
    water[idx] = { ...water[idx], glasses: water[idx].glasses + 1 };
    store.set('wellness.water', [...water]);
  } else {
    store.push('wellness.water', { date: today, glasses: 1 });
  }
  toast({ kind: 'success', title: '+1 glass 💧' });
  rerender();
}

function openSleep() {
  const hours = h('input.slider', { type: 'range', min: '0', max: '12', step: '0.5', value: '7' });
  const val = h('span.text-mono', {}, '7.0h');
  hours.addEventListener('input', () => { val.textContent = parseFloat(hours.value).toFixed(1) + 'h'; });
  modal({
    title: 'Log sleep',
    body: h('div', {},
      h('div', { style: { padding: '20px', textAlign: 'center' } }, h('div', { style: { fontSize: '36px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '12px' } }, val.firstChild ? '7.0h' : '7.0h'), hours),
      h('div.field', {}, h('div.field-label', {}, 'Hours slept')),
    ),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Save', kind: 'primary', onClick: () => {
        const today = localISO();
        const sleep = store.get('wellness.sleep') || [];
        const idx = sleep.findIndex(s => s.date === today);
        const entry = { date: today, hours: parseFloat(hours.value), quality: parseFloat(hours.value) >= 7 ? 'good' : 'tired' };
        if (idx >= 0) sleep[idx] = entry; else sleep.unshift(entry);
        store.set('wellness.sleep', sleep.slice(0, 60));
        toast({ kind: 'success', title: 'Logged' });
        rerender();
      } }
    ]
  });
}

function openMood() {
  const moods = [
    { score: 1, note: 'rough' }, { score: 2, note: 'tough' }, { score: 3, note: 'okay' },
    { score: 4, note: 'good' },  { score: 5, note: 'great' },
  ];
  const selected = { score: 4, note: 'good' };
  const noteInput = h('input.field-input', { placeholder: 'Optional note', value: '' });
  
  const modalBody = h('div', {},
    h('div.row.mood-options', { style: { justifyContent: 'space-around', marginBottom: '20px', fontSize: '32px' } },
      ...moods.map(m =>
        h('div.mood-option', {
          style: { cursor: 'pointer', padding: '8px 12px', borderRadius: '12px', transition: 'all 200ms', background: selected.score === m.score ? 'rgba(176,124,255,0.2)' : 'transparent' },
          onclick: () => {
            selected.score = m.score;
            selected.note = m.note;
            modalBody.querySelectorAll('.mood-option').forEach((el, idx) => {
              el.style.background = (idx + 1) === m.score ? 'rgba(176,124,255,0.2)' : 'transparent';
            });
          }
        }, ['😣','😟','😐','🙂','😄'][m.score - 1])
      )
    ),
    h('div.field', {}, h('div.field-label', {}, 'Note'), noteInput),
  );

  modal({
    title: 'How are you feeling?',
    body: modalBody,
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Save', kind: 'primary', onClick: () => {
        const today = localISO();
        store.push('wellness.mood', {
          id: Math.random().toString(36).slice(2),
          date: today,
          score: selected.score,
          note: noteInput.value || selected.note,
        });
        toast({ kind: 'success', title: 'Mood logged' });
        rerender();
      } }
    ]
  });
}

function openMeditation() {
  const minutes = h('input.field-input', { type: 'number', value: '10', min: '1' });
  modal({
    title: 'Log meditation',
    body: h('div', {}, h('div.field', {}, h('div.field-label', {}, 'Minutes'), minutes)),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Log', kind: 'primary', onClick: () => {
        const today = localISO();
        store.push('wellness.meditation', { date: today, minutes: parseInt(minutes.value) || 10 });
        toast({ kind: 'success', title: 'Logged', body: '🧘' });
        rerender();
      } }
    ]
  });
}

function openJournal(j) {
  const isNew = !j;
  const title = h('input.field-input', { value: j?.title || '', placeholder: 'Title (optional)' });
  const body = h('textarea.field-textarea', { placeholder: 'What\'s on your mind?', style: { minHeight: '160px' } }, j?.body || '');
  modal({
    title: isNew ? 'New entry' : 'Edit entry',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Title'), title),
      h('div.field', {}, h('div.field-label', {}, 'Body'), body),
    ),
    actions: j
      ? [
          { label: 'Delete', kind: 'danger', onClick: () => {
              store.set('wellness.journal', (store.get('wellness.journal') || []).filter(x => x.id !== j.id));
              toast({ kind: 'info', title: 'Removed' });
              rerender();
            }
          },
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Save', kind: 'primary', onClick: () => {
              store.update('wellness.journal', arr => arr.map(x => x.id === j.id ? { ...x, title: title.value, body: body.value } : x));
              toast({ kind: 'success', title: 'Saved' });
              rerender();
            }
          },
        ]
      : [
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Save', kind: 'primary', onClick: () => {
              if (!body.value.trim()) return;
              store.push('wellness.journal', { id: Math.random().toString(36).slice(2), date: new Date(), title: title.value, body: body.value });
              toast({ kind: 'success', title: 'Saved' });
              rerender();
            }
          },
        ]
  });
}

function rerender() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const page = h('div.page', { dataset: { page: 'wellness' } });
  view.appendChild(page);
  render(page);
}

export function unmount() {}
