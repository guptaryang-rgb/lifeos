// ============================================================
// sidebar.js — Sidebar / nav rendering
// ============================================================
import { store } from './store.js';
import { h, icon, celebrate } from './utils.js';

const NAV = [
  { section: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard',   icon: 'dashboard' },
    { id: 'calendar',  label: 'Smart Calendar', icon: 'calendar' },
    { id: 'planner',   label: 'AI Planner',  icon: 'brain' },
  ]},
  { section: 'Productivity', items: [
    { id: 'tasks',   label: 'Tasks',   icon: 'check' },
    { id: 'goals',   label: 'Goals',   icon: 'target' },
    { id: 'habits',  label: 'Habits',  icon: 'fire' },
    { id: 'focus',   label: 'Deep Work', icon: 'zap' },
    { id: 'study',   label: 'Study & Test', icon: 'book' },
  ]},
  { section: 'Life', items: [
    { id: 'food',     label: 'Fitness & Nutrition', icon: 'apple' },
    { id: 'finance',  label: 'Finance', icon: 'money' },
    { id: 'wellness', label: 'Wellness', icon: 'leaf' },
  ]},
  { section: 'Insights', items: [
    { id: 'screentime', label: 'Screen Time', icon: 'phone' },
    { id: 'analytics',  label: 'Analytics', icon: 'chart' },
    { id: 'timeline',   label: 'Timeline',  icon: 'clock' },
  ]},
  { section: 'Settings', items: [
    { id: 'integrations', label: 'Integrations', icon: 'link' },
    { id: 'security',     label: 'Security',     icon: 'shield' },
  ]},
];

export function mountSidebar() {
  const sidebar = h('aside.sidebar', { id: 'sidebar', 'aria-label': 'Main navigation' });

  // Brand
  const brand = h('div.brand', {},
    h('div.brand-mark', { onclick: (e) => celebrate(e.currentTarget) }, '⚡'),
    h('div', {},
      h('div.brand-name', {}, 'LifeOS'),
      h('div.brand-tag', {}, 'AI Chief of Staff'),
    )
  );
  sidebar.appendChild(brand);

  // Nav
  const nav = h('nav.nav', {});
  NAV.forEach(section => {
    nav.appendChild(h('div.nav-section-label', {}, section.section));
    const list = h('div.nav-list', {});
    section.items.forEach(item => {
      list.appendChild(h('a.nav-item', {
        href: '#' + item.id,
        dataset: { page: item.id },
        onclick: () => { document.getElementById('sidebar')?.classList.remove('open'); },
      },
        h('span.nav-icon', {}, icon(item.icon, 16)),
        h('span', {}, item.label),
      ));
    });
    nav.appendChild(list);
  });
  sidebar.appendChild(nav);

  // Profile + theme
  const user = store.get('user') || { name: 'Alex Chen', role: 'CS Student', avatar: 'AC' };
  const footer = h('div.sidebar-footer', {});
  footer.appendChild(h('div.profile-chip', { onclick: () => location.hash = 'security' },
    h('div.profile-avatar', {}, user.avatar),
    h('div.profile-info', {},
      h('div.profile-name', {}, user.name),
      h('div.profile-role', {}, user.role),
    ),
  ));
  const currentTheme = document.documentElement.dataset.theme || 'dark';
  footer.appendChild(h('button.theme-toggle', { onclick: () => {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    store.set('settings.theme', nextTheme);
  } },
    h('span', {}, currentTheme === 'light' ? 'Light mode' : 'Dark mode'),
    icon(currentTheme === 'light' ? 'sun' : 'moon', 14),
  ));
  sidebar.appendChild(footer);

  document.body.querySelector('.sidebar')?.remove();
  const existing = document.querySelector('.app-shell .sidebar');
  if (existing) existing.remove();
  const shell = document.querySelector('.app-shell');
  if (shell) shell.prepend(sidebar);
}

function toastTheme(mode) {
  // simple inline toast since we may not have toast-stack mounted yet
  console.log('Theme:', mode);
}

export function mountTopbar() {
  const topbar = h('div.topbar', {},
    h('button.icon-btn.mobile-nav-toggle', {
      onclick: () => document.getElementById('sidebar')?.classList.toggle('open'),
      'aria-label': 'Toggle menu',
    }, icon('more', 18)),
    h('div.topbar-title', {},
      h('div.topbar-title-greeting', {}, 'Welcome back'),
      h('div', { 'data-role': 'page-eyebrow' }, '—'),
      h('div', { 'data-role': 'page-title', style: { fontSize: '16px', fontWeight: 600 } }, 'LifeOS'),
    ),
    h('div.topbar-actions', {},
      h('div.search-bar', {},
        icon('search', 14),
        h('input', { placeholder: 'Search anything…', onkeydown: (e) => { if (e.key === 'Enter') quickSearch(e.target.value); } }),
        h('span.kbd', {}, '⌘K'),
      ),
      h('button.icon-btn', { title: 'Notifications', onclick: () => location.hash = 'timeline' }, icon('bell', 16)),
    )
  );
  document.body.querySelector('.topbar')?.remove();
  const main = document.querySelector('.main');
  if (main) main.prepend(topbar);
}

function quickSearch(q) {
  if (!q.trim()) return;
  // Search across tasks + events
  const results = [];
  (store.get('tasks') || []).filter(t => t.title.toLowerCase().includes(q.toLowerCase())).forEach(t => results.push({ kind: 'task', item: t }));
  (store.get('events') || []).filter(e => e.title.toLowerCase().includes(q.toLowerCase())).forEach(e => results.push({ kind: 'event', item: e }));
  (store.get('goals') || []).filter(g => g.title.toLowerCase().includes(q.toLowerCase())).forEach(g => results.push({ kind: 'goal', item: g }));
  if (results.length === 0) {
    import('./bus.js').then(({ toast }) => toast({ kind: 'info', title: 'No results', body: q }));
    return;
  }
  const first = results[0];
  const routes = { task: 'tasks', event: 'calendar', goal: 'goals' };
  location.hash = routes[first.kind];
}
