// ============================================================
// study.js — Flashcards with spaced repetition (Leitner system)
// ============================================================
import { store } from './store.js';
import { toast } from './bus.js';
import { h, icon, chip, modal } from './utils.js';

export const meta = { title: 'Study & Test', eyebrow: 'Learn' };

const DAY = 86400000;

export function render(root) {
  const decks = store.get('study.decks') || [];

  root.appendChild(h('div.row-between', {},
    h('div', {}, h('div.text-sm.text-muted', {}, `${decks.length} decks · ${decks.reduce((s, d) => s + d.cards.length, 0)} cards`)),
    h('button.btn.btn-primary', { onclick: () => openDeck() }, icon('plus', 14), ' New deck')
  ));

  if (decks.length === 0) {
    root.appendChild(h('div.empty', {}, h('div.empty-icon', {}, '📚'), h('div.empty-title', {}, 'No decks yet'), h('div.empty-sub', {}, 'Create your first deck to start spaced repetition.')));
    return;
  }

  const grid = h('div.grid.grid-auto-320', { style: { marginTop: '20px' } });
  decks.forEach(deck => grid.appendChild(deckCard(deck)));
  root.appendChild(grid);
}

function deckCard(deck) {
  const due = deck.cards.filter(c => !c.nextReview || c.nextReview <= Date.now()).length;
  return h('div.card', { onclick: () => openDeck(deck) },
    h('div.card-header', {},
      h('div.card-title', {}, icon('book', 16), deck.name),
      chip(due > 0 ? `${due} due` : 'Up to date', due > 0 ? 'high' : 'low'),
    ),
    h('div.col', { style: { gap: '8px' } },
      h('div.row-between', {},
        h('div.text-sm.text-muted', {}, 'Cards'),
        h('div.text-sm.fw-600.text-mono', {}, deck.cards.length),
      ),
      h('div.row-between', {},
        h('div.text-sm.text-muted', {}, 'Mastered'),
        h('div.text-sm.fw-600.text-mono', {}, deck.cards.filter(c => c.box >= 3).length),
      ),
      h('div.row-between', {},
        h('div.text-sm.text-muted', {}, 'Reviewed today'),
        h('div.text-sm.fw-600.text-mono', {}, deck.cards.filter(c => c.lastReview && Date.now() - c.lastReview < DAY).length),
      ),
    ),
    due > 0 ? h('button.btn.btn-primary.btn-sm', {
      style: { marginTop: '14px', width: '100%' },
      onclick: (e) => { e.stopPropagation(); openReview(deck); },
    }, icon('play', 12), ' Review now') : null,
  );
}

function openDeck(deck) {
  const isNew = !deck;
  const name = h('input.field-input', { value: deck?.name || '', placeholder: 'Deck name (e.g. Bio midterm)' });
  modal({
    title: isNew ? 'New deck' : 'Edit deck',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Name'), name),
    ),
    actions: deck
      ? [
          { label: 'Delete', kind: 'danger', onClick: () => {
              store.set('study.decks', (store.get('study.decks') || []).filter(d => d.id !== deck.id));
              toast({ kind: 'info', title: 'Deck removed' });
              rerender();
            }
          },
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Save', kind: 'primary', onClick: () => {
              if (!name.value.trim()) return;
              store.update('study.decks', decks => decks.map(d => d.id === deck.id ? { ...d, name: name.value.trim() } : d));
              toast({ kind: 'success', title: 'Renamed' });
              rerender();
            }
          },
        ]
      : [
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Create', kind: 'primary', onClick: () => {
              if (!name.value.trim()) return;
              store.push('study.decks', { id: Math.random().toString(36).slice(2), name: name.value.trim(), cards: [] });
              toast({ kind: 'success', title: 'Deck created' });
              rerender();
            }
          },
        ]
  });
  if (deck) appendCardManager(deck);
}

function appendCardManager(deck) {
  const modalEl = document.querySelector('.modal');
  if (!modalEl) return;

  const wrap = h('div.col', { style: { gap: '8px', marginTop: '20px' } });
  wrap.appendChild(h('h3', { style: { fontSize: '13px', color: 'var(--text-60)', textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 600 } }, 'Cards'));

  const list = h('div.list', {});
  deck.cards.forEach(card => {
    list.appendChild(h('div.list-item', { onclick: () => openCard(deck, card) },
      h('div.list-item-check', { class: card.box >= 3 ? 'done' : '' }),
      h('div.list-item-title', {}, card.front),
      chip('Box ' + card.box, card.box >= 3 ? 'low' : card.box >= 1 ? 'medium' : 'high'),
    ));
  });
  wrap.appendChild(list);
  wrap.appendChild(h('button.btn.btn-secondary.btn-sm', { onclick: () => openCard(deck) }, icon('plus', 12), ' Add card'));

  modalEl.appendChild(wrap);
}

function openCard(deck, card) {
  const isNew = !card;
  const front = h('input.field-input', { value: card?.front || '', placeholder: 'Front (question)' });
  const back = h('textarea.field-textarea', { placeholder: 'Back (answer)' }, card?.back || '');
  modal({
    title: isNew ? 'New card' : 'Edit card',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Front'), front),
      h('div.field', {}, h('div.field-label', {}, 'Back'), back),
    ),
    actions: card
      ? [
          { label: 'Delete', kind: 'danger', onClick: () => {
              store.update('study.decks', decks => decks.map(d => d.id === deck.id ? { ...d, cards: d.cards.filter(c => c.id !== card.id) } : d));
              toast({ kind: 'info', title: 'Card removed' });
              rerender();
            }
          },
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Save', kind: 'primary', onClick: () => {
              if (!front.value.trim()) return;
              store.update('study.decks', decks => decks.map(d => d.id === deck.id ? {
                ...d, cards: d.cards.map(c => c.id === card.id ? { ...c, front: front.value.trim(), back: back.value } : c)
              } : d));
              toast({ kind: 'success', title: 'Updated' });
              rerender();
            }
          },
        ]
      : [
          { label: 'Cancel', kind: 'ghost' },
          { label: 'Add', kind: 'primary', onClick: () => {
              if (!front.value.trim()) return;
              store.update('study.decks', decks => decks.map(d => d.id === deck.id ? {
                ...d, cards: [...d.cards, {
                  id: Math.random().toString(36).slice(2),
                  front: front.value.trim(),
                  back: back.value,
                  lastReview: null,
                  nextReview: Date.now(),
                  box: 0,
                }]
              } : d));
              toast({ kind: 'success', title: 'Card added' });
              rerender();
            }
          },
        ]
  });
}

function openReview(deck) {
  const dueCards = deck.cards.filter(c => !c.nextReview || c.nextReview <= Date.now());
  if (dueCards.length === 0) {
    toast({ kind: 'info', title: 'Nothing due', body: 'All caught up.' });
    return;
  }
  let idx = 0;
  let correct = 0;

  function showCard() {
    if (idx >= dueCards.length) {
      modal({
        title: 'Session complete',
        body: h('div', {},
          h('div', { style: { fontSize: '32px', fontWeight: 700, marginBottom: '8px', background: 'linear-gradient(135deg, var(--aurora-cyan), var(--aurora-violet))', '-webkit-background-clip': 'text', backgroundClip: 'text', color: 'transparent' } }, `${correct}/${dueCards.length} correct`),
          h('div.text-muted', {}, 'Cards you struggled with will resurface sooner.')
        ),
        actions: [{ label: 'Done', kind: 'primary' }]
      });
      return;
    }
    const card = dueCards[idx];
    let revealed = false;
    modal({
      title: `Card ${idx + 1} / ${dueCards.length}`,
      subtitle: deck.name,
      body: h('div', { id: 'studyCard' },
        h('div', { style: { padding: '20px', background: 'var(--bg-elev-1)', borderRadius: '12px', fontSize: '18px', fontWeight: 600, marginBottom: '14px', textAlign: 'center', minHeight: '60px' } }, card.front),
        h('div#back', { style: { padding: '20px', background: 'linear-gradient(135deg, rgba(108,140,255,0.15), rgba(176,124,255,0.10))', borderRadius: '12px', fontSize: '15px', display: revealed ? 'block' : 'none', marginBottom: '14px' } }, card.back),
        h('button.btn.btn-secondary', { style: { width: '100%' }, onclick: () => {
          revealed = true;
          const b = document.querySelector('#back'); if (b) b.style.display = 'block';
          // Replace body to show rating buttons
          document.querySelector('.modal').remove();
          showRating();
        } }, revealed ? 'Show answer' : 'Tap to reveal answer'),
      ),
      actions: []
    });
  }

  function showRating() {
    const card = dueCards[idx];
    modal({
      title: 'How well did you remember?',
      subtitle: card.front,
      body: h('div', {},
        h('div', { style: { padding: '20px', background: 'var(--bg-elev-1)', borderRadius: '12px', fontSize: '15px', marginBottom: '14px' } }, card.back),
        h('div', { style: { fontSize: '11px', color: 'var(--text-40)', marginBottom: '12px' } }, 'Boxes resurface cards at: Box 0 = today, 1 = 1 day, 2 = 3 days, 3 = 7 days, 4 = 14 days.'),
      ),
      actions: [
        { label: 'Again', kind: 'danger', onClick: () => { rate(card, 0); idx++; showCard(); } },
        { label: 'Hard',  kind: 'secondary', onClick: () => { rate(card, Math.max(0, card.box - 1)); idx++; showCard(); } },
        { label: 'Good',  kind: 'primary', onClick: () => { rate(card, card.box + 1); correct++; idx++; showCard(); } },
        { label: 'Easy',  kind: 'primary', onClick: () => { rate(card, card.box + 2); correct++; idx++; showCard(); } },
      ]
    });
  }

  function rate(card, newBox) {
    const intervals = [0, 1, 3, 7, 14, 30];
    const interval = intervals[Math.min(newBox, intervals.length - 1)];
    store.update('study.decks', decks => decks.map(d => d.id === deck.id ? {
      ...d, cards: d.cards.map(c => c.id === card.id ? {
        ...c, box: Math.max(0, Math.min(5, newBox)),
        lastReview: Date.now(),
        nextReview: Date.now() + interval * DAY,
      } : c)
    } : d));
  }

  showCard();
}

function rerender() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const page = h('div.page', { dataset: { page: 'study' } });
  view.appendChild(page);
  render(page);
}

export function unmount() {}
