// ============================================================
// secretary-ui.js — FAB + chat panel UI for AI Secretary
// ============================================================
import { processCommand } from './secretary.js';
import { toast } from './bus.js';
import { h, icon } from './utils.js';

let panel = null;
let messages = [];

export function mountFab() {
  const fab = h('button.fab', {
    'aria-label': 'Open AI Secretary',
    title: 'AI Secretary',
    onclick: openPanel,
  }, icon('sparkle', 24));
  document.body.appendChild(fab);
}

function openPanel() {
  if (panel) {
    panel.style.display = 'flex';
    panel.querySelector('input')?.focus();
    return;
  }
  const closeBtn = h('button.btn.btn-ghost.btn-icon', { onclick: closePanel, 'aria-label': 'Close' }, icon('x', 18));
  const list = h('div.chat-panel', { id: 'chatList' });
  const input = h('input', { placeholder: 'Try: "add task: finish lab report"', 'aria-label': 'Command input' });
  const sendBtn = h('button', { onclick: () => send() }, icon('send', 14), ' Send');

  if (messages.length === 0) {
    messages.push({ role: 'ai', body: `Hi! I'm your AI chief of staff. Tell me what to do in plain English. Try one of the suggestions below to start:` });
  }

  renderMessages(list);

  const suggestions = h('div.chat-suggestions', {},
    ...['add task: submit application', 'i drank 4 glasses of water', 'start 25 minute focus', "what's on my plate"].map(s =>
      h('div.chat-suggestion', { onclick: () => { input.value = s; send(); } }, s)
    )
  );

  const inputRow = h('div.chat-input', {}, input, sendBtn);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  panel = h('div.modal-backdrop', {
    style: { alignItems: 'flex-end', justifyContent: 'flex-end', padding: '0' },
    onclick: (e) => { if (e.target.classList.contains('modal-backdrop')) closePanel(); },
  },
    h('div.modal', { style: { maxWidth: '480px', width: '100%', margin: '0 24px 100px 0', maxHeight: '70vh' } },
      h('div.row-between', { style: { marginBottom: '12px' } },
        h('div.row', { style: { gap: '8px' } }, icon('sparkle', 16), h('div.modal-title', { style: { marginBottom: 0 } }, 'AI Secretary')),
        closeBtn,
      ),
      h('div.modal-sub', { style: { marginTop: '-8px', marginBottom: '12px' } }, 'Natural language command parser · works offline'),
      list,
      suggestions,
      inputRow,
    )
  );
  document.body.appendChild(panel);
  input.focus();

  async function send() {
    const text = input.value.trim();
    if (!text) return;
    addUserMsg(text);
    input.value = '';
    renderMessages(list);
    // Loading
    const loading = h('div.chat-msg.ai', {}, h('span', { style: { opacity: 0.6 } }, 'thinking…'));
    list.appendChild(loading);
    list.scrollTop = list.scrollHeight;
    const result = await processCommand(text);
    loading.remove();
    messages.push({ role: 'ai', body: result.message || 'Done.' });
    renderMessages(list);
  }

  function addUserMsg(text) { messages.push({ role: 'user', body: text }); }
}

function renderMessages(list) {
  list.innerHTML = '';
  messages.forEach(m => {
    list.appendChild(h("div.chat-msg", { class: m.role, html: m.body }));
  });
  list.scrollTop = list.scrollHeight;
}

function closePanel() {
  if (panel) { panel.style.display = 'none'; }
}
