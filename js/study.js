/* =========================================================================
 *  LifeOS — Study & Test Module
 *  Flashcard-based study sessions, quiz testing, and spaced repetition
 *  for students.
 *
 *  Persistence:  localStorage  'lifeos_study_decks'     (flashcard decks)
 *                               'lifeos_study_history'   (session history)
 *                               'lifeos_study_progress'  (SM-2 card data)
 *
 *  Globals used: App, LifeOS, escHtml, localDate
 * ========================================================================= */

const Study = (() => {
  'use strict';

  // ── Storage Keys ──────────────────────────────────────────────────────
  const KEYS = {
    DECKS:    'lifeos_study_decks',
    HISTORY:  'lifeos_study_history',
    PROGRESS: 'lifeos_study_progress',
    SEEDED:   'lifeos_study_seeded',
  };

  // ── Helpers ───────────────────────────────────────────────────────────
  const uuid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

  const now  = () => new Date().toISOString();
  const _today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const _get = (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  };
  const _getObj = (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  };
  const _set = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  /** Shuffle an array in-place (Fisher–Yates). Returns same reference. */
  const _shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  /** Days between two ISO date strings (positive = d2 is later). */
  const _daysBetween = (d1, d2) =>
    Math.ceil((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));

  // ── CSS Injection ─────────────────────────────────────────────────────
  let _cssInjected = false;
  const _injectCSS = () => {
    if (_cssInjected) return;
    _cssInjected = true;

    const style = document.createElement('style');
    style.id = 'study-module-styles';
    style.textContent = `
      /* ── Study Page Layout ─────────────────────────── */
      .study-stats-banner {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .study-stat-card {
        background: var(--card-bg, #1e1e2e);
        border: 1px solid var(--border, #2a2a3e);
        border-radius: 12px;
        padding: 1.25rem;
        text-align: center;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .study-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
      .study-stat-icon { font-size: 1.5rem; margin-bottom: 0.4rem; }
      .study-stat-value { font-size: 1.6rem; font-weight: 700; color: var(--text-primary, #e0e0e0); }
      .study-stat-label { font-size: 0.75rem; color: var(--text-tertiary, #888); margin-top: 0.2rem; text-transform: uppercase; letter-spacing: 0.5px; }

      /* ── Deck Grid ─────────────────────────────────── */
      .study-deck-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.25rem;
        margin-bottom: 1.5rem;
      }
      .study-deck-card {
        background: var(--card-bg, #1e1e2e);
        border: 1px solid var(--border, #2a2a3e);
        border-radius: 14px;
        padding: 1.5rem;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        position: relative;
        overflow: hidden;
      }
      .study-deck-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 30px rgba(108,92,231,0.12);
        border-color: var(--accent-primary-light, #6c5ce7);
      }
      .study-deck-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 4px;
        background: var(--gradient-primary, linear-gradient(135deg, #6c5ce7, #a29bfe));
        border-radius: 14px 14px 0 0;
      }
      .study-deck-card.deck-cs::before { background: linear-gradient(135deg, #6c5ce7, #74b9ff); }
      .study-deck-card.deck-math::before { background: linear-gradient(135deg, #00cec9, #00b894); }
      .study-deck-card.deck-os::before { background: linear-gradient(135deg, #fd79a8, #e17055); }
      .study-deck-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem; }
      .study-deck-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary, #e0e0e0); }
      .study-deck-subject {
        font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        padding: 3px 8px; border-radius: 6px;
        background: rgba(108,92,231,0.15); color: var(--accent-primary-light, #a29bfe);
      }
      .study-deck-meta {
        display: flex; gap: 1rem; margin: 0.8rem 0;
        font-size: 0.8rem; color: var(--text-secondary, #aaa);
      }
      .study-deck-meta span { display: flex; align-items: center; gap: 4px; }
      .study-mastery-bar {
        width: 100%; height: 6px; background: rgba(255,255,255,0.08);
        border-radius: 3px; overflow: hidden; margin: 0.8rem 0 0.5rem;
      }
      .study-mastery-fill {
        height: 100%; border-radius: 3px;
        background: linear-gradient(90deg, #6c5ce7, #00cec9);
        transition: width 0.5s ease;
      }
      .study-mastery-text { font-size: 0.7rem; color: var(--text-tertiary, #888); }
      .study-deck-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
      .study-deck-actions button {
        flex: 1; padding: 0.55rem 0.75rem; border: none; border-radius: 8px;
        font-size: 0.8rem; font-weight: 600; cursor: pointer;
        transition: transform 0.15s, opacity 0.15s;
      }
      .study-deck-actions button:hover { transform: translateY(-1px); opacity: 0.9; }
      .study-btn-primary { background: var(--gradient-primary, linear-gradient(135deg, #6c5ce7, #a29bfe)); color: white; }
      .study-btn-secondary { background: rgba(108,92,231,0.12); color: var(--accent-primary-light, #a29bfe); }
      .study-btn-danger { background: rgba(225,112,85,0.12); color: #e17055; }

      /* ── Flashcard 3D Flip ─────────────────────────── */
      .study-flashcard-scene {
        perspective: 1200px;
        width: 100%; max-width: 560px;
        height: 320px;
        margin: 2rem auto;
        cursor: pointer;
      }
      .study-flashcard {
        width: 100%; height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .study-flashcard.flipped { transform: rotateY(180deg); }
      .study-flashcard-face {
        position: absolute; inset: 0;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 2rem;
        border-radius: 18px;
        text-align: center;
        font-size: 1.2rem;
        line-height: 1.6;
        font-weight: 500;
      }
      .study-flashcard-front {
        background: linear-gradient(145deg, #1e1e2e 0%, #2a2a3e 100%);
        border: 2px solid var(--border, #2a2a3e);
        color: var(--text-primary, #e0e0e0);
      }
      .study-flashcard-back {
        background: linear-gradient(145deg, #1a2744 0%, #1e3a5f 100%);
        border: 2px solid rgba(108,92,231,0.3);
        color: #a8d8ea;
        transform: rotateY(180deg);
      }
      .study-flashcard-label {
        position: absolute; top: 1rem;
        font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
        padding: 4px 12px; border-radius: 20px;
      }
      .study-flashcard-front .study-flashcard-label {
        background: rgba(108,92,231,0.2); color: #a29bfe;
      }
      .study-flashcard-back .study-flashcard-label {
        background: rgba(0,206,201,0.2); color: #00cec9;
      }
      .study-flashcard-content { font-size: 1.15rem; max-width: 90%; }
      .study-flashcard-hint { font-size: 0.75rem; color: var(--text-tertiary, #666); margin-top: 1rem; }

      /* ── Session Controls ──────────────────────────── */
      .study-session-header {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 1rem;
      }
      .study-session-title { font-size: 1.3rem; font-weight: 700; color: var(--text-primary, #e0e0e0); }
      .study-progress-bar {
        width: 100%; height: 8px; background: rgba(255,255,255,0.08);
        border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem;
      }
      .study-progress-fill {
        height: 100%; border-radius: 4px;
        background: linear-gradient(90deg, #6c5ce7, #00cec9);
        transition: width 0.4s ease;
      }
      .study-progress-text {
        font-size: 0.8rem; color: var(--text-secondary, #aaa);
        display: flex; justify-content: space-between;
        margin-bottom: 1.5rem;
      }
      .study-rate-buttons {
        display: flex; gap: 0.75rem; justify-content: center;
        margin-top: 1.5rem; flex-wrap: wrap;
      }
      .study-rate-btn {
        padding: 0.7rem 1.5rem; border: 2px solid transparent; border-radius: 10px;
        font-size: 0.85rem; font-weight: 700; cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
        min-width: 100px;
      }
      .study-rate-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
      .study-rate-btn.rate-again { background: rgba(225,112,85,0.15); color: #e17055; border-color: rgba(225,112,85,0.3); }
      .study-rate-btn.rate-hard { background: rgba(253,203,110,0.15); color: #fdcb6e; border-color: rgba(253,203,110,0.3); }
      .study-rate-btn.rate-good { background: rgba(0,184,148,0.15); color: #00b894; border-color: rgba(0,184,148,0.3); }
      .study-rate-btn.rate-easy { background: rgba(108,92,231,0.15); color: #a29bfe; border-color: rgba(108,92,231,0.3); }

      .study-session-stats {
        display: flex; gap: 1.5rem; justify-content: center;
        margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-secondary, #aaa);
      }
      .study-session-stats span { display: flex; align-items: center; gap: 5px; }

      /* ── Quiz Mode ─────────────────────────────────── */
      .study-quiz-question {
        background: var(--card-bg, #1e1e2e);
        border: 1px solid var(--border, #2a2a3e);
        border-radius: 14px;
        padding: 2rem;
        margin-bottom: 1.5rem;
      }
      .study-quiz-number {
        font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 1px; color: var(--accent-primary-light, #a29bfe);
        margin-bottom: 0.5rem;
      }
      .study-quiz-prompt {
        font-size: 1.15rem; font-weight: 600; color: var(--text-primary, #e0e0e0);
        margin-bottom: 1.5rem; line-height: 1.5;
      }
      .study-quiz-options { display: flex; flex-direction: column; gap: 0.6rem; }
      .study-quiz-option {
        display: flex; align-items: center; gap: 0.75rem;
        padding: 0.85rem 1rem; border: 2px solid var(--border, #2a2a3e);
        border-radius: 10px; cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
        font-size: 0.9rem; color: var(--text-primary, #e0e0e0);
      }
      .study-quiz-option:hover { border-color: rgba(108,92,231,0.4); background: rgba(108,92,231,0.05); }
      .study-quiz-option.selected { border-color: #6c5ce7; background: rgba(108,92,231,0.12); }
      .study-quiz-option.correct { border-color: #00b894; background: rgba(0,184,148,0.12); }
      .study-quiz-option.incorrect { border-color: #e17055; background: rgba(225,112,85,0.12); }
      .study-quiz-option-letter {
        width: 28px; height: 28px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 0.8rem;
        background: rgba(255,255,255,0.06); color: var(--text-secondary, #aaa);
        flex-shrink: 0;
      }
      .study-quiz-option.selected .study-quiz-option-letter {
        background: #6c5ce7; color: white;
      }
      .study-quiz-option.correct .study-quiz-option-letter { background: #00b894; color: white; }
      .study-quiz-option.incorrect .study-quiz-option-letter { background: #e17055; color: white; }

      .study-quiz-nav {
        display: flex; justify-content: space-between; align-items: center;
        margin-top: 1.5rem;
      }

      /* ── Quiz Results ──────────────────────────────── */
      .study-quiz-results {
        text-align: center; padding: 2rem;
        background: var(--card-bg, #1e1e2e);
        border: 1px solid var(--border, #2a2a3e);
        border-radius: 16px;
      }
      .study-quiz-score {
        font-size: 4rem; font-weight: 800;
        background: linear-gradient(135deg, #6c5ce7, #00cec9);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .study-quiz-score-label { font-size: 1rem; color: var(--text-secondary, #aaa); margin-bottom: 1rem; }
      .study-quiz-breakdown {
        display: flex; gap: 2rem; justify-content: center; margin: 1.5rem 0;
        font-size: 0.9rem; color: var(--text-secondary, #aaa);
      }
      .study-quiz-breakdown span { display: flex; align-items: center; gap: 6px; }

      /* ── Create / Edit Deck Form ───────────────────── */
      .study-form { max-width: 640px; margin: 0 auto; }
      .study-form-group { margin-bottom: 1.25rem; }
      .study-form-label {
        display: block; font-size: 0.8rem; font-weight: 600;
        color: var(--text-secondary, #aaa);
        margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.5px;
      }
      .study-form-input, .study-form-textarea {
        width: 100%; padding: 0.7rem 1rem;
        background: var(--input-bg, rgba(255,255,255,0.06));
        border: 1px solid var(--border, #2a2a3e);
        border-radius: 8px; font-size: 0.9rem;
        color: var(--text-primary, #e0e0e0);
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .study-form-input:focus, .study-form-textarea:focus {
        outline: none; border-color: var(--accent-primary-light, #6c5ce7);
      }
      .study-form-textarea { min-height: 80px; resize: vertical; font-family: inherit; }
      .study-form-row { display: flex; gap: 1rem; }
      .study-form-row > * { flex: 1; }
      .study-card-editor {
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--border, #2a2a3e);
        border-radius: 10px; padding: 1rem;
        margin-bottom: 0.75rem;
        display: flex; gap: 0.75rem; align-items: flex-start;
      }
      .study-card-editor .card-num {
        width: 28px; height: 28px; border-radius: 50%;
        background: rgba(108,92,231,0.15); color: #a29bfe;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.75rem; font-weight: 700; flex-shrink: 0; margin-top: 0.3rem;
      }
      .study-card-editor .card-fields { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
      .study-card-editor .remove-card-btn {
        background: none; border: none; color: #e17055; cursor: pointer;
        font-size: 1.1rem; padding: 4px; margin-top: 0.3rem; flex-shrink: 0;
        opacity: 0.6; transition: opacity 0.2s;
      }
      .study-card-editor .remove-card-btn:hover { opacity: 1; }

      /* ── Empty & Back ──────────────────────────────── */
      .study-empty {
        text-align: center; padding: 3rem 1rem;
        color: var(--text-tertiary, #666);
      }
      .study-empty-icon { font-size: 3rem; margin-bottom: 0.75rem; }
      .study-back-btn {
        background: none; border: none; color: var(--text-secondary, #aaa);
        cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;
        padding: 0.5rem 0; margin-bottom: 1rem; font-weight: 500;
        transition: color 0.2s;
      }
      .study-back-btn:hover { color: var(--text-primary, #e0e0e0); }

      /* ── Toolbar ────────────────────────────────────── */
      .study-toolbar {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;
      }
      .study-toolbar-title { font-size: 1.4rem; font-weight: 700; color: var(--text-primary, #e0e0e0); }
      .study-create-btn {
        display: flex; align-items: center; gap: 6px;
        padding: 0.6rem 1.2rem; border: none; border-radius: 10px;
        background: var(--gradient-primary, linear-gradient(135deg, #6c5ce7, #a29bfe));
        color: white; font-weight: 600; font-size: 0.85rem; cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .study-create-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(108,92,231,0.3); }

      /* ── Responsive ────────────────────────────────── */
      @media (max-width: 600px) {
        .study-flashcard-scene { height: 260px; }
        .study-rate-buttons { gap: 0.5rem; }
        .study-rate-btn { padding: 0.55rem 1rem; font-size: 0.8rem; min-width: 80px; }
        .study-deck-grid { grid-template-columns: 1fr; }
        .study-form-row { flex-direction: column; gap: 0.75rem; }
      }
    `;
    document.head.appendChild(style);
  };

  // ── Seed Data ─────────────────────────────────────────────────────────
  const SEED_DECKS = [
    {
      title: 'Data Structures',
      subject: 'CS 301',
      color: 'cs',
      cards: [
        { front: 'What is a Binary Search Tree?', back: 'A binary tree where for each node, the left subtree contains only nodes with keys less than the node\'s key, and the right subtree contains only nodes with keys greater.' },
        { front: 'What is the average time complexity of a hash table lookup?', back: 'O(1) average case. Hash tables use a hash function to map keys to indices in an array, allowing constant-time retrieval on average.' },
        { front: 'Describe a Linked List and its types.', back: 'A linear data structure where each element (node) contains data and a pointer to the next node. Types: singly linked, doubly linked, and circular linked list.' },
        { front: 'What is a Stack? Name its operations.', back: 'A LIFO (Last-In, First-Out) data structure. Core operations: push (add to top), pop (remove from top), peek (view top), isEmpty.' },
        { front: 'What is a Queue? How does it differ from a Stack?', back: 'A FIFO (First-In, First-Out) data structure. Elements are added at the rear (enqueue) and removed from the front (dequeue), unlike Stack\'s LIFO order.' },
        { front: 'What is a Heap? Explain min-heap vs max-heap.', back: 'A complete binary tree satisfying the heap property. Min-heap: parent ≤ children (root is minimum). Max-heap: parent ≥ children (root is maximum). Used in priority queues.' },
        { front: 'Define Graph. What is the difference between BFS and DFS?', back: 'A set of vertices connected by edges. BFS explores level by level using a queue (finds shortest path). DFS goes deep first using a stack/recursion (uses less memory on sparse graphs).' },
        { front: 'What is a Trie? When would you use one?', back: 'A tree-like data structure for storing strings where each node represents a character. Used for autocomplete, spell checking, and prefix matching. Lookup is O(m) where m is key length.' },
      ],
    },
    {
      title: 'Linear Algebra',
      subject: 'MATH 250',
      color: 'math',
      cards: [
        { front: 'What are Eigenvalues and Eigenvectors?', back: 'For a matrix A, if Av = λv (non-zero v), then λ is an eigenvalue and v is the corresponding eigenvector. They represent scaling factors along invariant directions of a linear transformation.' },
        { front: 'How do you compute the Determinant of a 2×2 matrix?', back: 'For matrix [[a,b],[c,d]], det = ad − bc. The determinant tells you the scaling factor of the area transformation and is zero when the matrix is singular (non-invertible).' },
        { front: 'What are the rules for Matrix Multiplication?', back: 'For A(m×n) · B(n×p) = C(m×p). Element C_ij = sum of A_ik · B_kj for k=1..n. The number of columns of A must equal the number of rows of B. Not commutative: AB ≠ BA in general.' },
        { front: 'What is a Vector Space?', back: 'A set V with addition and scalar multiplication satisfying 8 axioms: closure, commutativity, associativity, identity, inverse (for addition), and compatibility, identity, distributivity (for scalar mult).' },
        { front: 'What is the rank of a matrix?', back: 'The dimension of the column space (or row space). It equals the number of linearly independent rows/columns, and also the number of pivots in row echelon form. rank(A) ≤ min(m, n).' },
        { front: 'State the Rank-Nullity Theorem.', back: 'For an m×n matrix A: rank(A) + nullity(A) = n. The rank is the dimension of the image, and the nullity is the dimension of the kernel (null space). They always sum to the number of columns.' },
      ],
    },
    {
      title: 'Operating Systems',
      subject: 'CS 350',
      color: 'os',
      cards: [
        { front: 'What is Virtual Memory?', back: 'A memory management technique that creates an illusion of a large contiguous address space by mapping virtual addresses to physical memory (RAM) or disk. Enables isolation between processes and allows running programs larger than physical RAM.' },
        { front: 'Explain Paging in OS memory management.', back: 'Paging divides virtual memory into fixed-size pages and physical memory into frames of the same size. A page table maps virtual pages to physical frames, allowing non-contiguous allocation and eliminating external fragmentation.' },
        { front: 'What are the four conditions for Deadlock?', back: '1) Mutual Exclusion — resources are non-sharable. 2) Hold and Wait — process holds resources while waiting. 3) No Preemption — resources can\'t be forcibly taken. 4) Circular Wait — circular chain of processes each waiting for the next.' },
        { front: 'What is a Mutex? How does it work?', back: 'A Mutual Exclusion lock that allows only one thread to access a critical section at a time. A thread acquires (locks) the mutex before entering, and releases (unlocks) it after leaving. Other threads block until the mutex is released.' },
        { front: 'What is a Semaphore? Mutex vs Semaphore?', back: 'A synchronization primitive with a counter. wait() decrements (blocks if 0), signal() increments. A binary semaphore (0 or 1) is similar to a mutex, but a counting semaphore allows N concurrent accesses. Semaphores can be signaled by any thread; mutexes must be released by the owner.' },
        { front: 'What is a Context Switch?', back: 'The process of saving the state (registers, PC, stack pointer) of the current process/thread and restoring the state of the next one. Triggered by interrupts, system calls, or preemption. It has overhead and is a key factor in OS scheduling performance.' },
      ],
    },
  ];

  const _seedIfNeeded = () => {
    if (localStorage.getItem(KEYS.SEEDED)) return;
    const decks = SEED_DECKS.map(d => ({
      id: uuid(),
      title: d.title,
      subject: d.subject,
      color: d.color,
      cards: d.cards.map(c => ({ id: uuid(), front: c.front, back: c.back })),
      createdAt: now(),
      updatedAt: now(),
    }));
    _set(KEYS.DECKS, decks);

    // Pre-populate some spaced repetition progress for realism
    const progress = _getObj(KEYS.PROGRESS);
    const today = new Date();
    decks.forEach(deck => {
      deck.cards.forEach((card, i) => {
        // Stagger: some cards reviewed, some fresh
        if (i < Math.ceil(deck.cards.length * 0.6)) {
          const daysAgo = Math.floor(Math.random() * 5) + 1;
          const reviewDate = new Date(today);
          reviewDate.setDate(reviewDate.getDate() - daysAgo);
          const interval = Math.floor(Math.random() * 4) + 1;
          progress[card.id] = {
            easeFactor: 2.5 + (Math.random() * 0.3 - 0.15),
            interval,
            repetitions: Math.floor(Math.random() * 3) + 1,
            lastReview: reviewDate.toISOString(),
            nextReview: new Date(reviewDate.getTime() + interval * 86400000).toISOString(),
          };
        }
      });
    });
    _set(KEYS.PROGRESS, progress);

    // Add a few seed history entries
    const history = [];
    for (let d = 3; d >= 1; d--) {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - d);
      history.push({
        id: uuid(),
        deckId: decks[0].id,
        deckTitle: decks[0].title,
        type: 'study',
        cardsReviewed: Math.floor(Math.random() * 4) + 4,
        correct: Math.floor(Math.random() * 3) + 3,
        incorrect: Math.floor(Math.random() * 2),
        duration: Math.floor(Math.random() * 600) + 300, // seconds
        date: dt.toISOString(),
      });
    }
    _set(KEYS.HISTORY, history);
    localStorage.setItem(KEYS.SEEDED, 'true');
  };

  // ════════════════════════════════════════════════════════════════════════
  //  DECKS — CRUD
  // ════════════════════════════════════════════════════════════════════════
  const decks = {
    getAll() { return _get(KEYS.DECKS); },

    getById(id) { return _get(KEYS.DECKS).find(d => d.id === id) || null; },

    create(deck) {
      const all = _get(KEYS.DECKS);
      const newDeck = {
        id: uuid(),
        title: deck.title || 'Untitled Deck',
        subject: deck.subject || '',
        color: deck.color || '',
        cards: (deck.cards || []).map(c => ({ id: uuid(), front: c.front, back: c.back })),
        createdAt: now(),
        updatedAt: now(),
      };
      all.push(newDeck);
      _set(KEYS.DECKS, all);
      return newDeck;
    },

    update(id, data) {
      const all = _get(KEYS.DECKS);
      const idx = all.findIndex(d => d.id === id);
      if (idx === -1) return null;
      // Don't overwrite cards unless explicitly passed
      all[idx] = { ...all[idx], ...data, updatedAt: now() };
      _set(KEYS.DECKS, all);
      return all[idx];
    },

    delete(id) {
      const all = _get(KEYS.DECKS).filter(d => d.id !== id);
      _set(KEYS.DECKS, all);
      // Clean up progress for deleted deck's cards
      return true;
    },

    addCard(deckId, card) {
      const all = _get(KEYS.DECKS);
      const deck = all.find(d => d.id === deckId);
      if (!deck) return null;
      const newCard = { id: uuid(), front: card.front, back: card.back };
      deck.cards.push(newCard);
      deck.updatedAt = now();
      _set(KEYS.DECKS, all);
      return newCard;
    },

    removeCard(deckId, cardIndex) {
      const all = _get(KEYS.DECKS);
      const deck = all.find(d => d.id === deckId);
      if (!deck || cardIndex < 0 || cardIndex >= deck.cards.length) return false;
      const removed = deck.cards.splice(cardIndex, 1)[0];
      deck.updatedAt = now();
      _set(KEYS.DECKS, all);
      // Clean up progress for removed card
      const progress = _getObj(KEYS.PROGRESS);
      delete progress[removed.id];
      _set(KEYS.PROGRESS, progress);
      return true;
    },
  };

  // ════════════════════════════════════════════════════════════════════════
  //  SPACED REPETITION — SM-2 (simplified)
  // ════════════════════════════════════════════════════════════════════════
  /**
   * Compute the next review date for a card after a rating.
   * quality: 'again' | 'hard' | 'good' | 'easy'
   */
  const _updateSR = (cardId, quality) => {
    const progress = _getObj(KEYS.PROGRESS);
    const p = progress[cardId] || { easeFactor: 2.5, interval: 1, repetitions: 0 };

    switch (quality) {
      case 'again':
        p.interval = 1;
        p.repetitions = 0;
        p.easeFactor = Math.max(1.3, p.easeFactor - 0.2);
        break;
      case 'hard':
        p.interval = Math.max(1, Math.round(p.interval * 1.2));
        p.repetitions += 1;
        p.easeFactor = Math.max(1.3, p.easeFactor - 0.05);
        break;
      case 'good':
        p.interval = Math.max(1, Math.round(p.interval * p.easeFactor));
        p.repetitions += 1;
        break;
      case 'easy':
        p.interval = Math.max(1, Math.round(p.interval * p.easeFactor * 1.3));
        p.repetitions += 1;
        p.easeFactor += 0.15;
        break;
    }

    p.lastReview = now();
    p.nextReview = new Date(Date.now() + p.interval * 86400000).toISOString();
    progress[cardId] = p;
    _set(KEYS.PROGRESS, progress);
    return p;
  };

  const getNextReviewDate = (card) => {
    const progress = _getObj(KEYS.PROGRESS);
    const p = progress[card.id];
    if (!p || !p.nextReview) return null; // never reviewed
    return p.nextReview;
  };

  const getDueCards = (deckId) => {
    const deck = decks.getById(deckId);
    if (!deck) return [];
    const progress = _getObj(KEYS.PROGRESS);
    const todayMs = new Date(_today() + 'T23:59:59').getTime();
    return deck.cards.filter(c => {
      const p = progress[c.id];
      if (!p || !p.nextReview) return true; // never reviewed → due
      return new Date(p.nextReview).getTime() <= todayMs;
    });
  };

  /** Mastery % for a deck based on SR ease factors. */
  const _deckMastery = (deck) => {
    if (!deck.cards.length) return 0;
    const progress = _getObj(KEYS.PROGRESS);
    let total = 0;
    deck.cards.forEach(c => {
      const p = progress[c.id];
      if (p) {
        // easeFactor starts at 2.5; map reps + ease into a 0-100 score
        const repScore = Math.min(p.repetitions / 5, 1); // max after 5 reps
        const easeScore = Math.min((p.easeFactor - 1.3) / (3.5 - 1.3), 1);
        total += (repScore * 0.6 + easeScore * 0.4) * 100;
      }
    });
    return Math.round(total / deck.cards.length);
  };

  /** Next review date for the deck (soonest card). */
  const _nextDeckReview = (deck) => {
    const progress = _getObj(KEYS.PROGRESS);
    let soonest = null;
    deck.cards.forEach(c => {
      const p = progress[c.id];
      if (!p || !p.nextReview) { soonest = 'Now'; return; }
      const d = new Date(p.nextReview);
      if (!soonest || (soonest !== 'Now' && d < new Date(soonest))) {
        soonest = p.nextReview;
      }
    });
    if (soonest === 'Now') return 'Now';
    if (!soonest) return 'Now';
    const diff = _daysBetween(_today(), soonest.split('T')[0]);
    if (diff <= 0) return 'Now';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  // ════════════════════════════════════════════════════════════════════════
  //  STUDY SESSION
  // ════════════════════════════════════════════════════════════════════════
  const session = {
    current: null,

    start(deckId) {
      const deck = decks.getById(deckId);
      if (!deck || !deck.cards.length) return null;
      const due = getDueCards(deckId);
      const cards = due.length > 0 ? _shuffle([...due]) : _shuffle([...deck.cards]);
      this.current = {
        deckId,
        deckTitle: deck.title,
        cards,
        currentIndex: 0,
        flipped: false,
        results: [], // { cardId, rating, correct }
        startTime: Date.now(),
      };
      return this.current;
    },

    flip() {
      if (!this.current) return;
      this.current.flipped = !this.current.flipped;
    },

    rate(quality) {
      if (!this.current) return null;
      const card = this.current.cards[this.current.currentIndex];
      if (!card) return null;

      // Update spaced repetition
      _updateSR(card.id, quality);

      const correct = quality === 'good' || quality === 'easy';
      this.current.results.push({ cardId: card.id, rating: quality, correct });
      return { quality, correct };
    },

    next() {
      if (!this.current) return null;
      this.current.currentIndex++;
      this.current.flipped = false;
      if (this.current.currentIndex >= this.current.cards.length) {
        return this.end();
      }
      return this.current.cards[this.current.currentIndex];
    },

    getProgress() {
      if (!this.current) return { completed: 0, total: 0, correct: 0, incorrect: 0 };
      const results = this.current.results;
      return {
        completed: results.length,
        total: this.current.cards.length,
        correct: results.filter(r => r.correct).length,
        incorrect: results.filter(r => !r.correct).length,
      };
    },

    end() {
      if (!this.current) return null;
      const progress = this.getProgress();
      const entry = {
        id: uuid(),
        deckId: this.current.deckId,
        deckTitle: this.current.deckTitle,
        type: 'study',
        cardsReviewed: progress.completed,
        correct: progress.correct,
        incorrect: progress.incorrect,
        duration: Math.round((Date.now() - this.current.startTime) / 1000),
        date: now(),
      };
      const history = _get(KEYS.HISTORY);
      history.push(entry);
      _set(KEYS.HISTORY, history);
      const result = { ...entry, progress };
      this.current = null;
      return result;
    },
  };

  // ════════════════════════════════════════════════════════════════════════
  //  QUIZ MODE
  // ════════════════════════════════════════════════════════════════════════
  let _quizState = null;

  const quiz = {
    /**
     * Generate a quiz from a deck.
     * options: { count, shuffle, type }
     */
    generate(deckId, options = {}) {
      const deck = decks.getById(deckId);
      if (!deck || deck.cards.length < 2) return null;

      const count = Math.min(options.count || deck.cards.length, deck.cards.length);
      const doShuffle = options.shuffle !== false;
      const cards = doShuffle ? _shuffle([...deck.cards]) : [...deck.cards];
      const selected = cards.slice(0, count);

      // Build multiple-choice questions
      const questions = selected.map(card => {
        // Correct answer is card.back
        // Wrong answers: pick 3 random backs from other cards
        const otherBacks = deck.cards
          .filter(c => c.id !== card.id)
          .map(c => c.back);
        _shuffle(otherBacks);
        const wrongAnswers = otherBacks.slice(0, 3);

        // If the deck doesn't have enough other cards, pad with generic wrong answers
        while (wrongAnswers.length < 3) {
          wrongAnswers.push('Not enough data to generate this option.');
        }

        const allOptions = _shuffle([card.back, ...wrongAnswers]);

        return {
          id: uuid(),
          cardId: card.id,
          question: card.front,
          correctAnswer: card.back,
          options: allOptions,
          selectedAnswer: null,
        };
      });

      _quizState = {
        deckId,
        deckTitle: deck.title,
        questions,
        currentIndex: 0,
        submitted: false,
        startTime: Date.now(),
      };
      return _quizState;
    },

    submit(answers) {
      if (!_quizState) return null;

      // Apply answers if provided
      if (Array.isArray(answers)) {
        answers.forEach((ans, i) => {
          if (_quizState.questions[i]) {
            _quizState.questions[i].selectedAnswer = ans;
          }
        });
      }

      _quizState.submitted = true;
      let correct = 0;
      _quizState.questions.forEach(q => {
        if (q.selectedAnswer === q.correctAnswer) correct++;
      });

      const total = _quizState.questions.length;
      const score = Math.round((correct / total) * 100);

      const result = {
        id: uuid(),
        deckId: _quizState.deckId,
        deckTitle: _quizState.deckTitle,
        type: 'quiz',
        total,
        correct,
        incorrect: total - correct,
        score,
        duration: Math.round((Date.now() - _quizState.startTime) / 1000),
        date: now(),
        questions: _quizState.questions,
      };

      // Save to history
      const history = _get(KEYS.HISTORY);
      history.push({
        id: result.id,
        deckId: result.deckId,
        deckTitle: result.deckTitle,
        type: 'quiz',
        cardsReviewed: total,
        correct,
        incorrect: total - correct,
        score,
        duration: result.duration,
        date: result.date,
      });
      _set(KEYS.HISTORY, history);

      return result;
    },

    getResults() {
      if (!_quizState || !_quizState.submitted) return null;
      const qs = _quizState.questions;
      let correct = 0;
      qs.forEach(q => { if (q.selectedAnswer === q.correctAnswer) correct++; });
      return {
        total: qs.length,
        correct,
        incorrect: qs.length - correct,
        score: Math.round((correct / qs.length) * 100),
        questions: qs,
      };
    },
  };

  // ════════════════════════════════════════════════════════════════════════
  //  STATS & HISTORY
  // ════════════════════════════════════════════════════════════════════════
  const getStudyStats = () => {
    const history = _get(KEYS.HISTORY);
    const allDecks = _get(KEYS.DECKS);
    let totalCards = 0, totalCorrect = 0, totalSessions = history.length;

    history.forEach(h => {
      totalCards += h.cardsReviewed || 0;
      totalCorrect += h.correct || 0;
    });

    // Streak: consecutive days with at least one session
    let streak = 0;
    const today = new Date(_today() + 'T12:00:00');
    for (let d = 0; d < 365; d++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - d);
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      const hasSession = history.some(h => h.date && h.date.startsWith(dateStr));
      if (hasSession) {
        streak++;
      } else if (d > 0) {
        break;
      }
    }

    const totalDeckCards = allDecks.reduce((sum, d) => sum + d.cards.length, 0);
    const accuracy = totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0;

    return { totalCards, totalCorrect, totalSessions, streak, accuracy, totalDeckCards };
  };

  const getHistory = () => _get(KEYS.HISTORY).sort((a, b) => new Date(b.date) - new Date(a.date));

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER — Main Entry
  // ════════════════════════════════════════════════════════════════════════
  let _viewState = { page: 'list', deckId: null };
  let _container = null;

  const render = (container) => {
    _injectCSS();
    _seedIfNeeded();
    _container = container || document.getElementById('studyContent');
    if (!_container) return;

    switch (_viewState.page) {
      case 'list':        _renderDeckList(); break;
      case 'study':       _renderStudySession(); break;
      case 'quiz':        _renderQuizMode(); break;
      case 'quiz-result': _renderQuizResults(); break;
      case 'create':      _renderCreateDeck(); break;
      case 'edit':        _renderCreateDeck(_viewState.deckId); break;
      default:            _renderDeckList();
    }
  };

  const _navigateTo = (page, deckId = null) => {
    _viewState = { page, deckId };
    render();
  };

  // ── Render: Deck List ─────────────────────────────────────────────────
  const _renderDeckList = () => {
    const allDecks = decks.getAll();
    const stats = getStudyStats();

    let html = '';

    // Stats Banner
    html += `
      <div class="study-stats-banner">
        <div class="study-stat-card">
          <div class="study-stat-icon">📚</div>
          <div class="study-stat-value">${stats.totalCards}</div>
          <div class="study-stat-label">Cards Studied</div>
        </div>
        <div class="study-stat-card">
          <div class="study-stat-icon">🎯</div>
          <div class="study-stat-value">${stats.accuracy}%</div>
          <div class="study-stat-label">Accuracy</div>
        </div>
        <div class="study-stat-card">
          <div class="study-stat-icon">🔥</div>
          <div class="study-stat-value">${stats.streak}</div>
          <div class="study-stat-label">Day Streak</div>
        </div>
        <div class="study-stat-card">
          <div class="study-stat-icon">🗂️</div>
          <div class="study-stat-value">${allDecks.length}</div>
          <div class="study-stat-label">Decks</div>
        </div>
      </div>
    `;

    // Toolbar
    html += `
      <div class="study-toolbar">
        <div class="study-toolbar-title">My Decks</div>
        <button class="study-create-btn" onclick="Study.renderCreateDeck()">
          <span>＋</span> New Deck
        </button>
      </div>
    `;

    // Deck Grid
    if (allDecks.length === 0) {
      html += `
        <div class="study-empty">
          <div class="study-empty-icon">📖</div>
          <p>No decks yet. Create your first flashcard deck to start studying!</p>
        </div>
      `;
    } else {
      html += '<div class="study-deck-grid">';
      allDecks.forEach(deck => {
        const mastery = _deckMastery(deck);
        const dueCount = getDueCards(deck.id).length;
        const nextReview = _nextDeckReview(deck);
        const colorClass = deck.color ? `deck-${escHtml(deck.color)}` : '';

        html += `
          <div class="study-deck-card ${colorClass}">
            <div class="study-deck-header">
              <div class="study-deck-title">${escHtml(deck.title)}</div>
              <div class="study-deck-subject">${escHtml(deck.subject)}</div>
            </div>
            <div class="study-deck-meta">
              <span>🃏 ${deck.cards.length} cards</span>
              <span>📅 ${escHtml(nextReview)}</span>
              ${dueCount > 0 ? `<span style="color:#fdcb6e;">⚡ ${dueCount} due</span>` : ''}
            </div>
            <div class="study-mastery-bar">
              <div class="study-mastery-fill" style="width:${mastery}%"></div>
            </div>
            <div class="study-mastery-text">${mastery}% mastery</div>
            <div class="study-deck-actions">
              <button class="study-btn-primary" onclick="Study._startStudy('${deck.id}')">📖 Study</button>
              <button class="study-btn-secondary" onclick="Study._startQuiz('${deck.id}')">📝 Quiz</button>
              <button class="study-btn-secondary" onclick="Study._editDeck('${deck.id}')">✏️</button>
              <button class="study-btn-danger" onclick="Study._deleteDeck('${deck.id}')">🗑️</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    // Recent Activity
    const recentHistory = getHistory().slice(0, 5);
    if (recentHistory.length > 0) {
      html += `
        <div style="margin-top:1rem;">
          <div class="study-toolbar-title" style="font-size:1.1rem;margin-bottom:0.75rem;">Recent Activity</div>
      `;
      recentHistory.forEach(h => {
        const icon = h.type === 'quiz' ? '📝' : '📖';
        const ago = _timeAgo(h.date);
        const acc = h.cardsReviewed > 0 ? Math.round((h.correct / h.cardsReviewed) * 100) : 0;
        html += `
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid var(--border, #2a2a3e);">
            <span style="font-size:1.2rem;">${icon}</span>
            <div style="flex:1;">
              <div style="font-size:0.85rem;font-weight:600;color:var(--text-primary,#e0e0e0);">${escHtml(h.deckTitle)}</div>
              <div style="font-size:0.75rem;color:var(--text-tertiary,#666);">${h.cardsReviewed} cards · ${acc}% accuracy · ${ago}</div>
            </div>
            ${h.score !== undefined ? `<span style="font-weight:700;color:${h.score >= 80 ? '#00b894' : h.score >= 50 ? '#fdcb6e' : '#e17055'};">${h.score}%</span>` : ''}
          </div>
        `;
      });
      html += '</div>';
    }

    _container.innerHTML = html;
  };

  const _timeAgo = (isoStr) => {
    const diff = Math.round((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  // ── Render: Study Session ─────────────────────────────────────────────
  const _renderStudySession = () => {
    const s = session.current;
    if (!s) { _navigateTo('list'); return; }

    const card = s.cards[s.currentIndex];
    if (!card) { _navigateTo('list'); return; }

    const progress = session.getProgress();
    const pctDone = s.cards.length > 0 ? Math.round((progress.completed / s.cards.length) * 100) : 0;

    let html = `
      <button class="study-back-btn" onclick="Study._endStudySession()">← End Session</button>

      <div class="study-session-header">
        <div class="study-session-title">${escHtml(s.deckTitle)}</div>
        <div style="font-size:0.85rem;color:var(--text-secondary,#aaa);">
          Card ${s.currentIndex + 1} of ${s.cards.length}
        </div>
      </div>

      <div class="study-progress-bar">
        <div class="study-progress-fill" style="width:${pctDone}%"></div>
      </div>
      <div class="study-progress-text">
        <span>${progress.completed} reviewed</span>
        <span>${progress.correct} ✓ · ${progress.incorrect} ✗</span>
      </div>

      <div class="study-flashcard-scene" onclick="Study._flipCard()" id="studyCardScene">
        <div class="study-flashcard ${s.flipped ? 'flipped' : ''}" id="studyFlashcard">
          <div class="study-flashcard-face study-flashcard-front">
            <div class="study-flashcard-label">Question</div>
            <div class="study-flashcard-content">${escHtml(card.front)}</div>
            <div class="study-flashcard-hint">Click to reveal answer</div>
          </div>
          <div class="study-flashcard-face study-flashcard-back">
            <div class="study-flashcard-label">Answer</div>
            <div class="study-flashcard-content">${escHtml(card.back)}</div>
          </div>
        </div>
      </div>
    `;

    if (s.flipped) {
      html += `
        <div class="study-rate-buttons">
          <button class="study-rate-btn rate-again" onclick="Study._rateCard('again')">🔄 Again</button>
          <button class="study-rate-btn rate-hard" onclick="Study._rateCard('hard')">😓 Hard</button>
          <button class="study-rate-btn rate-good" onclick="Study._rateCard('good')">👍 Good</button>
          <button class="study-rate-btn rate-easy" onclick="Study._rateCard('easy')">🌟 Easy</button>
        </div>
      `;
    }

    html += `
      <div class="study-session-stats">
        <span>⏱️ ${_formatDuration(Math.round((Date.now() - s.startTime) / 1000))}</span>
        <span>🎯 ${progress.completed > 0 ? Math.round((progress.correct / progress.completed) * 100) : 0}% accuracy</span>
      </div>
    `;

    _container.innerHTML = html;
  };

  const _formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // ── Render: Study Session Complete ────────────────────────────────────
  const _renderSessionComplete = (result) => {
    const accuracy = result.progress.completed > 0
      ? Math.round((result.progress.correct / result.progress.completed) * 100)
      : 0;

    let html = `
      <div class="study-quiz-results">
        <div style="font-size:3rem;margin-bottom:0.5rem;">🎓</div>
        <div class="study-quiz-score">${accuracy}%</div>
        <div class="study-quiz-score-label">Session Accuracy</div>
        <div class="study-quiz-breakdown">
          <span>✅ ${result.progress.correct} correct</span>
          <span>❌ ${result.progress.incorrect} incorrect</span>
          <span>⏱️ ${_formatDuration(result.duration)}</span>
        </div>
        <div style="margin-top:1.5rem;">
          <button class="study-btn-primary" style="padding:0.75rem 2rem;font-size:0.9rem;border-radius:10px;" onclick="Study._navigateTo('list')">
            ← Back to Decks
          </button>
        </div>
      </div>
    `;
    _container.innerHTML = html;

    if (accuracy >= 80 && typeof App !== 'undefined' && App.confetti) {
      App.confetti();
    }
  };

  // ── Render: Quiz Mode ─────────────────────────────────────────────────
  const _renderQuizMode = () => {
    if (!_quizState || _quizState.submitted) {
      _renderQuizResults();
      return;
    }

    const q = _quizState.questions[_quizState.currentIndex];
    if (!q) return;

    const total = _quizState.questions.length;
    const current = _quizState.currentIndex + 1;
    const pct = Math.round(((current - 1) / total) * 100);

    let html = `
      <button class="study-back-btn" onclick="Study._navigateTo('list')">← Quit Quiz</button>

      <div class="study-session-header">
        <div class="study-session-title">📝 ${escHtml(_quizState.deckTitle)} — Quiz</div>
        <div style="font-size:0.85rem;color:var(--text-secondary,#aaa);">
          Question ${current} of ${total}
        </div>
      </div>

      <div class="study-progress-bar">
        <div class="study-progress-fill" style="width:${pct}%"></div>
      </div>

      <div class="study-quiz-question">
        <div class="study-quiz-number">Question ${current}</div>
        <div class="study-quiz-prompt">${escHtml(q.question)}</div>
        <div class="study-quiz-options">
    `;

    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, i) => {
      const selected = q.selectedAnswer === opt ? 'selected' : '';
      // Truncate long answers for display
      const displayOpt = opt.length > 150 ? opt.substring(0, 147) + '...' : opt;
      html += `
        <div class="study-quiz-option ${selected}" onclick="Study._selectQuizAnswer(${_quizState.currentIndex}, ${i})">
          <div class="study-quiz-option-letter">${letters[i]}</div>
          <div>${escHtml(displayOpt)}</div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
      <div class="study-quiz-nav">
        <button class="study-btn-secondary" style="padding:0.6rem 1.5rem;border-radius:8px;border:none;cursor:pointer;font-weight:600;"
          ${_quizState.currentIndex === 0 ? 'disabled style="opacity:0.4;cursor:default;padding:0.6rem 1.5rem;border-radius:8px;border:none;font-weight:600;"' : ''}
          onclick="Study._quizPrev()">
          ← Previous
        </button>
        <div>
    `;

    if (current < total) {
      html += `
          <button class="study-btn-primary" style="padding:0.6rem 1.5rem;border-radius:8px;border:none;cursor:pointer;font-weight:600;"
            onclick="Study._quizNext()">
            Next →
          </button>
      `;
    } else {
      // Show submit button on last question
      const answeredAll = _quizState.questions.every(q => q.selectedAnswer !== null);
      html += `
          <button class="study-btn-primary" style="padding:0.6rem 2rem;border-radius:8px;border:none;cursor:pointer;font-weight:600;${!answeredAll ? 'opacity:0.5;' : ''}"
            ${!answeredAll ? 'title="Answer all questions first"' : ''}
            onclick="Study._submitQuiz()">
            Submit Quiz ✓
          </button>
      `;
    }

    html += '</div></div>';
    _container.innerHTML = html;
  };

  // ── Render: Quiz Results ──────────────────────────────────────────────
  const _renderQuizResults = () => {
    const results = quiz.getResults();
    if (!results) { _navigateTo('list'); return; }

    const emoji = results.score >= 90 ? '🏆' : results.score >= 80 ? '🌟' : results.score >= 60 ? '👍' : results.score >= 40 ? '📖' : '💪';

    let html = `
      <button class="study-back-btn" onclick="Study._navigateTo('list')">← Back to Decks</button>

      <div class="study-quiz-results" style="margin-bottom:2rem;">
        <div style="font-size:3rem;margin-bottom:0.5rem;">${emoji}</div>
        <div class="study-quiz-score">${results.score}%</div>
        <div class="study-quiz-score-label">Quiz Score</div>
        <div class="study-quiz-breakdown">
          <span>✅ ${results.correct} correct</span>
          <span>❌ ${results.incorrect} wrong</span>
          <span>📊 ${results.total} questions</span>
        </div>
      </div>

      <div class="study-toolbar-title" style="font-size:1.1rem;margin-bottom:1rem;">Review Answers</div>
    `;

    results.questions.forEach((q, i) => {
      const isCorrect = q.selectedAnswer === q.correctAnswer;
      const icon = isCorrect ? '✅' : '❌';

      html += `
        <div class="study-quiz-question" style="border-left:3px solid ${isCorrect ? '#00b894' : '#e17055'};">
          <div class="study-quiz-number">${icon} Question ${i + 1}</div>
          <div class="study-quiz-prompt">${escHtml(q.question)}</div>
          <div class="study-quiz-options">
      `;

      const letters = ['A', 'B', 'C', 'D'];
      q.options.forEach((opt, j) => {
        let cls = '';
        if (opt === q.correctAnswer) cls = 'correct';
        else if (opt === q.selectedAnswer && opt !== q.correctAnswer) cls = 'incorrect';
        const displayOpt = opt.length > 150 ? opt.substring(0, 147) + '...' : opt;
        html += `
          <div class="study-quiz-option ${cls}" style="cursor:default;">
            <div class="study-quiz-option-letter">${letters[j]}</div>
            <div>${escHtml(displayOpt)}</div>
          </div>
        `;
      });

      html += '</div></div>';
    });

    html += `
      <div style="text-align:center;margin-top:1.5rem;">
        <button class="study-btn-primary" style="padding:0.75rem 2rem;font-size:0.9rem;border-radius:10px;" onclick="Study._navigateTo('list')">
          ← Back to Decks
        </button>
      </div>
    `;

    _container.innerHTML = html;

    // Confetti for 80%+
    if (results.score >= 80 && typeof App !== 'undefined' && App.confetti) {
      App.confetti();
    }
  };

  // ── Render: Create / Edit Deck ────────────────────────────────────────
  const _renderCreateDeck = (editId) => {
    const existing = editId ? decks.getById(editId) : null;
    const isEdit = !!existing;
    const cards = isEdit ? existing.cards : [{ front: '', back: '' }, { front: '', back: '' }];

    let html = `
      <button class="study-back-btn" onclick="Study._navigateTo('list')">← Back to Decks</button>
      <div class="study-toolbar-title" style="margin-bottom:1.25rem;">${isEdit ? 'Edit Deck' : 'Create New Deck'}</div>

      <div class="study-form" id="studyDeckForm">
        <div class="study-form-row">
          <div class="study-form-group">
            <label class="study-form-label">Deck Title</label>
            <input class="study-form-input" id="studyDeckTitle" placeholder="e.g. Data Structures"
              value="${isEdit ? escHtml(existing.title) : ''}" />
          </div>
          <div class="study-form-group">
            <label class="study-form-label">Subject / Course</label>
            <input class="study-form-input" id="studyDeckSubject" placeholder="e.g. CS 301"
              value="${isEdit ? escHtml(existing.subject) : ''}" />
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
          <label class="study-form-label" style="margin:0;">Flashcards</label>
          <button class="study-btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.75rem;border:none;border-radius:6px;cursor:pointer;font-weight:600;"
            onclick="Study._addCardField()">
            ＋ Add Card
          </button>
        </div>

        <div id="studyCardEditors">
    `;

    cards.forEach((card, i) => {
      html += _cardEditorHTML(i, card.front, card.back);
    });

    html += `
        </div>

        <div style="display:flex;gap:0.75rem;margin-top:1.5rem;">
          <button class="study-btn-primary" style="padding:0.7rem 2rem;font-size:0.9rem;border-radius:10px;border:none;cursor:pointer;font-weight:600;"
            onclick="Study._saveDeck(${isEdit ? `'${editId}'` : 'null'})">
            ${isEdit ? '💾 Save Changes' : '✨ Create Deck'}
          </button>
          <button class="study-btn-secondary" style="padding:0.7rem 1.5rem;font-size:0.9rem;border-radius:10px;border:none;cursor:pointer;font-weight:600;"
            onclick="Study._navigateTo('list')">
            Cancel
          </button>
        </div>
      </div>
    `;

    _container.innerHTML = html;
  };

  const _cardEditorHTML = (index, front = '', back = '') => `
    <div class="study-card-editor" data-card-index="${index}">
      <div class="card-num">${index + 1}</div>
      <div class="card-fields">
        <input class="study-form-input study-card-front" placeholder="Front (question)" value="${escHtml(front)}" />
        <textarea class="study-form-textarea study-card-back" placeholder="Back (answer)" rows="2">${escHtml(back)}</textarea>
      </div>
      <button class="remove-card-btn" onclick="Study._removeCardField(${index})" title="Remove card">×</button>
    </div>
  `;

  // ════════════════════════════════════════════════════════════════════════
  //  UI EVENT HANDLERS (exposed on the Study object)
  // ════════════════════════════════════════════════════════════════════════

  const _startStudy = (deckId) => {
    const deck = decks.getById(deckId);
    if (!deck || deck.cards.length === 0) {
      if (typeof App !== 'undefined') App.toast('This deck has no cards!', 'info');
      return;
    }
    session.start(deckId);
    _navigateTo('study', deckId);
  };

  const _startQuiz = (deckId) => {
    const deck = decks.getById(deckId);
    if (!deck || deck.cards.length < 2) {
      if (typeof App !== 'undefined') App.toast('Need at least 2 cards for a quiz!', 'info');
      return;
    }
    quiz.generate(deckId, { shuffle: true });
    _navigateTo('quiz', deckId);
  };

  const _editDeck = (deckId) => {
    _navigateTo('edit', deckId);
  };

  const _deleteDeck = (deckId) => {
    const deck = decks.getById(deckId);
    if (!deck) return;
    if (!confirm(`Delete "${deck.title}"? This cannot be undone.`)) return;
    decks.delete(deckId);
    if (typeof App !== 'undefined') App.toast('Deck deleted', 'info');
    _navigateTo('list');
  };

  const _flipCard = () => {
    if (!session.current) return;
    session.flip();
    const el = document.getElementById('studyFlashcard');
    if (el) {
      el.classList.toggle('flipped', session.current.flipped);
    }
    // Re-render to show/hide rate buttons after flip
    if (session.current.flipped) {
      _renderStudySession();
    }
  };

  const _rateCard = (quality) => {
    if (!session.current) return;
    session.rate(quality);
    const result = session.next();
    if (result && result.progress) {
      // Session ended — show results
      _renderSessionComplete(result);
    } else {
      _renderStudySession();
    }
  };

  const _endStudySession = () => {
    if (session.current) {
      const result = session.end();
      if (result) {
        _renderSessionComplete(result);
        return;
      }
    }
    _navigateTo('list');
  };

  const _selectQuizAnswer = (questionIndex, optionIndex) => {
    if (!_quizState || _quizState.submitted) return;
    const q = _quizState.questions[questionIndex];
    if (!q) return;
    q.selectedAnswer = q.options[optionIndex];
    _renderQuizMode();
  };

  const _quizNext = () => {
    if (!_quizState) return;
    if (_quizState.currentIndex < _quizState.questions.length - 1) {
      _quizState.currentIndex++;
      _renderQuizMode();
    }
  };

  const _quizPrev = () => {
    if (!_quizState) return;
    if (_quizState.currentIndex > 0) {
      _quizState.currentIndex--;
      _renderQuizMode();
    }
  };

  const _submitQuiz = () => {
    if (!_quizState) return;
    const unanswered = _quizState.questions.filter(q => q.selectedAnswer === null).length;
    if (unanswered > 0) {
      if (!confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) return;
    }
    // Collect current answers into an array
    const answers = _quizState.questions.map(q => q.selectedAnswer);
    quiz.submit(answers);
    _viewState.page = 'quiz-result';
    render();
  };

  const _addCardField = () => {
    const container = document.getElementById('studyCardEditors');
    if (!container) return;
    const count = container.querySelectorAll('.study-card-editor').length;
    const div = document.createElement('div');
    div.innerHTML = _cardEditorHTML(count, '', '');
    container.appendChild(div.firstElementChild);
  };

  const _removeCardField = (index) => {
    const container = document.getElementById('studyCardEditors');
    if (!container) return;
    const editors = container.querySelectorAll('.study-card-editor');
    if (editors.length <= 1) {
      if (typeof App !== 'undefined') App.toast('Need at least one card!', 'info');
      return;
    }
    if (editors[index]) editors[index].remove();
    // Re-number
    container.querySelectorAll('.study-card-editor').forEach((ed, i) => {
      const num = ed.querySelector('.card-num');
      if (num) num.textContent = i + 1;
      ed.dataset.cardIndex = i;
      const removeBtn = ed.querySelector('.remove-card-btn');
      if (removeBtn) removeBtn.setAttribute('onclick', `Study._removeCardField(${i})`);
    });
  };

  const _saveDeck = (editId) => {
    const title = (document.getElementById('studyDeckTitle')?.value || '').trim();
    const subject = (document.getElementById('studyDeckSubject')?.value || '').trim();

    if (!title) {
      if (typeof App !== 'undefined') App.toast('Please enter a deck title', 'info');
      return;
    }

    // Collect cards from the editor
    const editors = document.querySelectorAll('#studyCardEditors .study-card-editor');
    const cards = [];
    editors.forEach(ed => {
      const front = (ed.querySelector('.study-card-front')?.value || '').trim();
      const back = (ed.querySelector('.study-card-back')?.value || '').trim();
      if (front || back) {
        cards.push({ front, back });
      }
    });

    if (cards.length === 0) {
      if (typeof App !== 'undefined') App.toast('Add at least one flashcard', 'info');
      return;
    }

    if (editId) {
      // Preserve existing card IDs where possible
      const existing = decks.getById(editId);
      const updatedCards = cards.map((c, i) => {
        if (existing && existing.cards[i]) {
          return { ...existing.cards[i], front: c.front, back: c.back };
        }
        return { id: uuid(), front: c.front, back: c.back };
      });
      decks.update(editId, { title, subject, cards: updatedCards });
      if (typeof App !== 'undefined') App.toast('Deck updated! ✨', 'success');
    } else {
      decks.create({ title, subject, cards });
      if (typeof App !== 'undefined') App.toast('Deck created! 🎉', 'success');
    }

    _navigateTo('list');
  };

  // ════════════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ════════════════════════════════════════════════════════════════════════
  return {
    // Decks CRUD
    decks,

    // Study session
    session,

    // Quiz
    quiz,

    // Spaced Repetition
    getNextReviewDate,
    getDueCards,

    // Stats
    getStudyStats,
    getHistory,

    // Render (main entry point)
    render,
    renderDeckList()       { _navigateTo('list'); },
    renderStudySession()   { /* called internally */ },
    renderQuizMode()       { /* called internally */ },
    renderCreateDeck()     { _navigateTo('create'); },

    // Internal UI handlers exposed for onclick bindings
    _startStudy,
    _startQuiz,
    _editDeck,
    _deleteDeck,
    _flipCard,
    _rateCard,
    _endStudySession,
    _selectQuizAnswer,
    _quizNext,
    _quizPrev,
    _submitQuiz,
    _addCardField,
    _removeCardField,
    _saveDeck,
    _navigateTo,
  };
})();
