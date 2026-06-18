// ============================================================
// integrations.js — Connectors / integrations page (mostly stubs)
// ============================================================
import { toast } from './bus.js';
import { h, icon, chip } from './utils.js';

export const meta = { title: 'Integrations', eyebrow: 'Connect' };

const INTEGRATIONS = [
  { id: 'google',   name: 'Google Calendar',  desc: 'Sync events in both directions.',         status: 'available', icon: '📅' },
  { id: 'apple',    name: 'Apple Calendar',   desc: 'iCloud sync for native calendar events.', status: 'available', icon: '🍎' },
  { id: 'todoist',  name: 'Todoist',          desc: 'Import tasks and projects.',              status: 'available', icon: '✅' },
  { id: 'notion',   name: 'Notion',           desc: 'Sync databases and tasks.',              status: 'available', icon: '📝' },
  { id: 'slack',    name: 'Slack',            desc: 'Send focus status updates.',             status: 'available', icon: '💬' },
  { id: 'fitbit',   name: 'Fitbit',           desc: 'Pull workouts and sleep.',               status: 'available', icon: '⌚' },
  { id: 'strava',   name: 'Strava',           desc: 'Sync runs and rides.',                   status: 'available', icon: '🏃' },
  { id: 'spotify',  name: 'Spotify',          desc: 'Auto-play focus playlists.',              status: 'available', icon: '🎵' },
  { id: 'github',   name: 'GitHub',           desc: 'Track commits as focus sessions.',        status: 'available', icon: '🐙' },
  { id: 'gemini',   name: 'Gemini AI',        desc: 'Bring your own API key for richer NLP.',  status: 'available', icon: '✨' },
  { id: 'openai',   name: 'OpenAI',           desc: 'GPT-powered planning and summaries.',    status: 'available', icon: '🧠' },
  { id: 'webhook',  name: 'Custom Webhook',   desc: 'Push events to your own endpoint.',       status: 'available', icon: '🔗' },
];

export function render(root) {
  root.appendChild(h('div', { style: { marginBottom: '20px' } },
    h('div.text-sm.text-muted', {}, 'Connect your tools. Most integrations work locally without an account.')
  ));

  const grid = h('div.grid.grid-auto-320', {});
  INTEGRATIONS.forEach(int => grid.appendChild(card(int)));
  root.appendChild(grid);
}

function card(int) {
  return h('div.card', { onclick: () => toast({ kind: 'info', title: int.name, body: 'Connect flow coming soon. Will be wired to OAuth / API key storage.' }) },
    h('div.card-header', {},
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
        h('div', { style: { width: 40, height: 40, borderRadius: '10px', background: 'var(--bg-elev-2)', display: 'grid', placeItems: 'center', fontSize: '22px' } }, int.icon),
        h('div', {},
          h('div.card-title', {}, int.name),
          h('div.card-subtitle', { style: { fontSize: '11px', maxWidth: '220px' } }, int.desc),
        ),
      ),
    ),
    h('div.row-between', { style: { marginTop: '12px' } },
      chip('Available', 'low'),
      h('button.btn.btn-secondary.btn-sm', { onclick: (e) => { e.stopPropagation(); toast({ kind: 'success', title: 'Connected', body: int.name }); } }, 'Connect'),
    )
  );
}

export function unmount() {}
