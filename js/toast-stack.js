// ============================================================
// toast-stack.js — Toast notification system
// ============================================================
import { bus, EVENTS } from './bus.js';
import { h, icon } from './utils.js';

const ICONS = {
  success: 'check', info: 'sparkle', warning: 'lightbulb', danger: 'lightbulb'
};

let stack = null;

export function mountToasts() {
  stack = h('div.toast-stack', {});
  document.body.appendChild(stack);

  bus.on(EVENTS.TOAST, (t) => {
    show(t);
  });
}

function show(t) {
  if (!stack) return;
  const el = h('div.toast', { class: t.kind || 'info' },
    h('div.toast-icon', {}, icon(ICONS[t.kind] || 'sparkle', 14)),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div.text-sm.fw-600', {}, t.title),
      t.body ? h('div.text-xs.text-muted', { style: { marginTop: '2px' } }, t.body) : null,
    )
  );
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 300);
  }, t.timeout || 3500);
}
