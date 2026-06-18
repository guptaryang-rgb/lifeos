// ============================================================
// app.js — Entry point: mounts sidebar, topbar, toasts, FAB, routes
// ============================================================
import { store } from './store.js';
import { seedIfEmpty } from './seed.js';
import { register, start } from './router.js';
import { mountSidebar, mountTopbar } from './sidebar.js';
import { mountToasts } from './toast-stack.js';
import { mountFab } from './secretary-ui.js';

import * as dashboard    from './dashboard.js';
import * as calendar     from './calendar.js';
import * as planner      from './planner-page.js';
import * as tasks        from './tasks.js';
import * as goals        from './goals.js';
import * as habits       from './habits.js';
import * as focus        from './focus.js';
import * as study        from './study.js';
import * as food         from './food.js';
import * as finance      from './finance.js';
import * as wellness     from './wellness.js';
import * as screentime   from './screentime.js';
import * as analytics    from './analytics.js';
import * as timeline     from './timeline.js';
import * as integrations from './integrations.js';
import * as security     from './security.js';

// 1. Seed on first run
seedIfEmpty();

// Load and apply saved theme
const savedTheme = store.get('settings.theme') || 'dark';
document.documentElement.dataset.theme = savedTheme;

// 2. Build shell structure
document.body.innerHTML = `
  <div class="cosmic-bg"></div>
  <div class="app-shell">
    <main class="main">
      <div id="view"></div>
    </main>
  </div>
`;

// 3. Mount chrome
mountSidebar();
mountTopbar();
mountToasts();
mountFab();

// 4. Register routes
register('dashboard',    dashboard);
register('calendar',     calendar);
register('planner',      planner);
register('tasks',        tasks);
register('goals',        goals);
register('habits',       habits);
register('focus',        focus);
register('study',        study);
register('food',         food);
register('finance',      finance);
register('wellness',     wellness);
register('screentime',   screentime);
register('analytics',    analytics);
register('timeline',     timeline);
register('integrations', integrations);
register('security',     security);

// 5. Boot
start();
security.initSecurity();

// Re-render sidebar when user or theme changes
store.subscribe('user', () => mountSidebar());
store.subscribe('settings.theme', () => mountSidebar());
