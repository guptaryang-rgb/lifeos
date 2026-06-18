// ============================================================
// router.js — Hash-based SPA router with module lifecycle
// ============================================================
import { bus, EVENTS } from './bus.js';

const routes = new Map();
let currentRoute = null;
let currentModule = null;

export function register(path, module) {
  routes.set(path, module);
}

export function navigate(path) {
  if (location.hash !== '#' + path) {
    location.hash = path;
  } else {
    handleRoute();
  }
}

function handleRoute() {
  const hash = location.hash.replace(/^#/, '') || 'dashboard';
  const mod = routes.get(hash) || routes.get('dashboard');
  if (!mod) return;

  // Tear down previous
  if (currentModule && currentModule.unmount) {
    try { currentModule.unmount(); } catch (e) { console.warn(e); }
  }
  currentModule = mod;
  currentRoute = hash;

  const view = document.getElementById('view');
  view.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'page';
  root.dataset.page = hash;
  view.appendChild(root);

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === hash);
  });
  // Update topbar title
  const title = document.querySelector('[data-role="page-title"]');
  if (title && mod.title) title.textContent = mod.title;
  const eyebrow = document.querySelector('[data-role="page-eyebrow"]');
  if (eyebrow && mod.eyebrow) eyebrow.textContent = mod.eyebrow;

  if (mod.render) mod.render(root);
  bus.emit(EVENTS.NAV, { to: hash });
}

window.addEventListener('hashchange', handleRoute);

export function start() {
  if (!location.hash) location.hash = 'dashboard';
  handleRoute();
}

export function currentPath() { return currentRoute; }
