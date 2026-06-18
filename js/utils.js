// ============================================================
// utils.js — DOM helpers, icons, formatting
// ============================================================

// Element factory: h('div.foo#id', { onclick }, 'child', h('span', 'x'))
export function h(spec, props = {}, ...children) {
  let tag = 'div', cls = '', id = '', rest = spec;
  const m = /^([a-z0-9]+)?(?:\.([\w-]+))?(?:#([\w-]+))?$/i.exec(spec.trim());
  if (m) {
    tag = m[1] || 'div';
    cls = m[2] || '';
    id = m[3] || '';
  }
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (id) el.id = id;
  if (props) {
    for (const k of Object.keys(props)) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class' || k === 'className') {
        el.className += (el.className ? ' ' : '') + v;
      } else if (k === 'style' && typeof v === 'object') {
        Object.assign(el.style, v);
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'html') {
        el.innerHTML = v;
      } else if (k === 'dataset' && typeof v === 'object') {
        Object.assign(el.dataset, v);
      } else if (v === true) {
        el.setAttribute(k, '');
      } else {
        el.setAttribute(k, v);
      }
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// SVG icon helpers (lightweight inline icons)
const ICONS = {
  dashboard: '<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>',
  calendar:  '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  brain:     '<path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v.4a3 3 0 0 0-1.5 5.6V11a3 3 0 0 0 1.5 5.6V17a2.5 2.5 0 0 0 5 0V4.5A2.5 2.5 0 0 0 9.5 2zm5 0A2.5 2.5 0 0 1 17 4.5v.4a3 3 0 0 1 1.5 5.6V11a3 3 0 0 1-1.5 5.6V17a2.5 2.5 0 0 1-5 0V4.5A2.5 2.5 0 0 1 14.5 2z"/>',
  check:     '<path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  target:    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  fire:      '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.5 0 2.5-1 2.5-2.5 0-1.5-1-2-1-3.5 0-2 1.5-4 1.5-4s-4 1-5 4c-.7 2-1 4-.5 3.5zM12 22c-4 0-7-3-7-7 0-3 2-6 5-9 1 3 4 5 7 5 0 6-2 11-5 11z"/>',
  zap:       '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  book:      '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3zm20 0h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3z"/>',
  apple:     '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>',
  money:     '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  leaf:      '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96a1 1 0 0 1 1.8.66c0 9.84-5.7 16.38-10 16.38zM2 21c0-3 1.85-5.36 5.08-6"/>',
  phone:     '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  chart:     '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  clock:     '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  link:      '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  shield:    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  plus:      '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  search:    '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  bell:      '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
  send:      '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  sparkle:   '<path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>',
  trash:     '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit:      '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  play:      '<polygon points="5 3 19 12 5 21 5 3"/>',
  pause:     '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  skip:      '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
  refresh:   '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  filter:    '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  x:         '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  chevronDown: '<polyline points="6 9 12 15 18 9"/>',
  chevronRight: '<polyline points="9 18 15 12 9 6"/>',
  flame:     '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.5 0 2.5-1 2.5-2.5 0-1.5-1-2-1-3.5 0-2 1.5-4 1.5-4s-4 1-5 4c-.7 2-1 4-.5 3.5z"/>',
  droplet:   '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  moon:      '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun:       '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  settings:  '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  mic:       '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>',
  camera:    '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  lightbulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
  trendUp:   '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  trendDown: '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
  layers:    '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  heart:     '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>',
  moon_sleep:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  coffee:    '<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>',
  dumbbell:  '<path d="M6.5 6.5l11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M6 18l12-12M3 21l18-18"/>',
  pen:       '<path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>',
  more:      '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
};

export function icon(name, size = 16, opts = {}) {
  const path = ICONS[name] || ICONS.sparkle;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', opts.fill || 'none');
  svg.setAttribute('stroke', opts.stroke || 'currentColor');
  svg.setAttribute('stroke-width', opts.strokeWidth || '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = path;
  return svg;
}

export function chip(label, kind = '') {
  return h('span.chip', { class: kind ? 'chip-' + kind : '' },
    h('span.chip-dot'), label
  );
}

// Quick modal
export function modal({ title, subtitle, body, actions }) {
  const close = () => root.remove();
  const root = h('div.modal-backdrop', {
    onclick: (e) => { if (e.target.classList.contains('modal-backdrop')) close(); }
  },
    h('div.modal', {},
      title && h('div', {}, h('div.modal-title', {}, title), subtitle && h('div.modal-sub', {}, subtitle)),
      h('div', {}, body),
      actions && h('div.modal-actions', {},
        ...actions.map(b => h('button.btn', {
          class: 'btn-' + (b.kind || 'secondary'),
          onclick: () => { b.onClick?.(); if (b.close !== false) close(); }
        }, b.label))
      )
    )
  );
  document.body.appendChild(root);
  return { close, root };
}

// Confetti / stars burst on the brand mark
export function celebrate(el) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('div');
    s.textContent = ['✦','✧','⋆','✺'][Math.floor(Math.random() * 4)];
    s.style.cssText = `
      position: fixed; pointer-events: none; z-index: 9999;
      left: ${r.left + r.width/2}px; top: ${r.top + r.height/2}px;
      color: hsl(${Math.random()*360}, 90%, 70%);
      font-size: ${12 + Math.random()*8}px;
      transition: all ${600 + Math.random()*400}ms cubic-bezier(0.16, 1, 0.3, 1);
    `;
    document.body.appendChild(s);
    requestAnimationFrame(() => {
      const angle = (i / 12) * Math.PI * 2;
      s.style.transform = `translate(${Math.cos(angle) * 60}px, ${Math.sin(angle) * 60 - 30}px) scale(0.4)`;
      s.style.opacity = '0';
    });
    setTimeout(() => s.remove(), 1200);
  }
}

// Debounce
export function debounce(fn, ms = 200) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Clamp / lerp
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// Hash a PIN (simple; for demo)
export async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + ':lifeos'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
