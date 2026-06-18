/* =========================================================
 *  LifeOS — Kanban Board Module
 *  Drag-and-drop task board with filters, stats, and rich cards
 * ========================================================= */
const Kanban = (function () {
  'use strict';

  /* ---------- column definitions ---------- */
  const columns = [
    { id: 'not_started', title: 'To Do',        color: '#636e72' },
    { id: 'in_progress', title: 'In Progress',  color: '#6c5ce7' },
    { id: 'review',      title: 'Review',       color: '#fdcb6e' },
    { id: 'completed',   title: 'Done',         color: '#00b894' },
  ];

  /* ---------- priority palette ---------- */
  const PRIORITY_COLORS = {
    critical : '#e74c3c',
    high     : '#e17055',
    medium   : '#fdcb6e',
    low      : '#00b894',
    none     : '#b2bec3',
  };

  /* ---------- internal state ---------- */
  let draggedTask  = null;   // task object being dragged
  let draggedEl    = null;   // DOM element being dragged
  let _container   = null;   // root mount node

  const filter = { category: 'all', priority: 'all', search: '' };

  /* ====================================================
   *  CSS injection (once)
   * ==================================================== */
  function injectStyles() {
    if (document.getElementById('kanban-styles')) return;
    const style = document.createElement('style');
    style.id = 'kanban-styles';
    style.textContent = `
      /* --- board --- */
      .kb-board{display:flex;gap:16px;padding:8px 0;overflow-x:auto;min-height:520px}
      .kb-column{flex:0 0 280px;background:var(--bg-secondary,#f5f6fa);border-radius:12px;display:flex;flex-direction:column;max-height:calc(100vh - 180px)}
      .kb-col-header{padding:14px 16px 10px;display:flex;align-items:center;gap:8px;font-weight:700;font-size:.97rem;border-bottom:2px solid transparent}
      .kb-col-header .kb-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
      .kb-col-header .kb-count{margin-left:auto;font-size:.78rem;opacity:.6;font-weight:400}
      .kb-col-body{flex:1;overflow-y:auto;padding:8px 10px 14px;display:flex;flex-direction:column;gap:10px;transition:background .2s}
      .kb-col-body.drag-over{background:rgba(108,92,231,.08);box-shadow:inset 0 0 0 2px rgba(108,92,231,.35);border-radius:0 0 12px 12px}

      /* --- card --- */
      .kb-card{background:var(--bg-card,#fff);border-radius:10px;padding:12px 14px;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,.06);transition:transform .15s,box-shadow .15s,opacity .15s;position:relative}
      .kb-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.1);transform:translateY(-2px)}
      .kb-card.dragging{opacity:.45;transform:rotate(2deg) scale(.96);box-shadow:0 8px 24px rgba(0,0,0,.18)}
      .kb-card-title{font-size:.9rem;font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:6px}
      .kb-priority-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
      .kb-meta{display:flex;flex-wrap:wrap;gap:6px;font-size:.74rem;color:var(--text-muted,#888)}
      .kb-badge{padding:2px 8px;border-radius:6px;font-weight:500}
      .kb-due{background:rgba(108,92,231,.1);color:#6c5ce7}
      .kb-due.overdue{background:rgba(231,76,60,.1);color:#e74c3c}
      .kb-cat{background:rgba(0,184,148,.1);color:#00b894}
      .kb-goal{background:rgba(253,203,110,.15);color:#b8860b}
      .kb-progress{margin-top:8px;height:5px;background:var(--bg-secondary,#eee);border-radius:3px;overflow:hidden}
      .kb-progress-bar{height:100%;border-radius:3px;transition:width .3s}

      /* --- filter bar --- */
      .kb-filters{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;align-items:center}
      .kb-filters select,.kb-filters input{padding:6px 10px;border:1px solid var(--border,#dfe6e9);border-radius:8px;font-size:.85rem;background:var(--bg-card,#fff)}
      .kb-filters input[type=search]{min-width:180px}

      /* --- empty --- */
      .kb-empty{text-align:center;padding:28px 12px;color:var(--text-muted,#b2bec3);font-size:.82rem}

      /* mobile */
      @media(max-width:700px){
        .kb-board{flex-direction:column}
        .kb-column{flex:none;max-height:none}
      }
    `;
    document.head.appendChild(style);
  }

  /* ====================================================
   *  Helpers
   * ==================================================== */
  function allTasks() {
    return (typeof LifeOS !== 'undefined' && LifeOS.Tasks)
      ? LifeOS.Tasks.list()
      : [];
  }

  function taskStatus(task) {
    const s = (task.status || 'not_started').toLowerCase().replace(/\s+/g, '_');
    return columns.find(c => c.id === s) ? s : 'not_started';
  }

  function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((dt - today) / 864e5);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function isOverdue(task) {
    if (!task.dueDate || taskStatus(task) === 'completed') return false;
    return new Date(task.dueDate) < new Date();
  }

  function subtaskProgress(task) {
    const subs = task.subtasks || task.checklist || [];
    if (!subs.length) return null;
    const done = subs.filter(s => s.completed || s.done).length;
    return { done, total: subs.length, pct: Math.round((done / subs.length) * 100) };
  }

  function categoryLabel(task) {
    return task.category || task.course || task.tag || null;
  }

  function linkedGoal(task) {
    if (!task.goalId && !task.goal) return null;
    if (typeof LifeOS !== 'undefined' && LifeOS.Goals) {
      const g = LifeOS.Goals.get(task.goalId || task.goal);
      if (g) return g.title || g.name;
    }
    return task.goalTitle || task.goal || null;
  }

  /* categories + priorities for filter dropdowns */
  function uniqueCategories() {
    const cats = new Set();
    allTasks().forEach(t => { const c = categoryLabel(t); if (c) cats.add(c); });
    return [...cats].sort();
  }

  function uniquePriorities() {
    const set = new Set();
    allTasks().forEach(t => { if (t.priority) set.add(t.priority); });
    return [...set];
  }

  /* ====================================================
   *  Filtering
   * ==================================================== */
  function getFilteredTasks() {
    let tasks = allTasks();

    if (filter.category !== 'all') {
      tasks = tasks.filter(t => categoryLabel(t) === filter.category);
    }
    if (filter.priority !== 'all') {
      tasks = tasks.filter(t => (t.priority || 'none') === filter.priority);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      tasks = tasks.filter(t => (t.title || '').toLowerCase().includes(q));
    }
    return tasks;
  }

  function setFilter(key, value) {
    filter[key] = value;
    if (_container) render(_container);
  }

  /* ====================================================
   *  Column stats
   * ==================================================== */
  function getColumnStats() {
    const tasks = getFilteredTasks();
    const stats = {};
    columns.forEach(c => { stats[c.id] = 0; });
    tasks.forEach(t => {
      const s = taskStatus(t);
      if (stats[s] !== undefined) stats[s]++;
    });
    return stats;
  }

  /* ====================================================
   *  Drag & Drop handlers
   * ==================================================== */
  function onDragStart(e, task) {
    draggedTask = task;
    draggedEl   = e.currentTarget;
    draggedEl.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);

    /* semi-transparent ghost */
    const ghost = draggedEl.cloneNode(true);
    ghost.style.opacity = '0.65';
    ghost.style.position = 'absolute';
    ghost.style.top = '-9999px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 60, 20);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onDragEnter(e, _columnId) {
    e.preventDefault();
    const body = e.currentTarget;
    if (body) body.classList.add('drag-over');
  }

  function onDragLeave(e) {
    const body = e.currentTarget;
    /* only remove if we truly left (not entering a child) */
    if (body && !body.contains(e.relatedTarget)) {
      body.classList.remove('drag-over');
    }
  }

  function onDrop(e, columnId) {
    e.preventDefault();
    const body = e.currentTarget;
    if (body) body.classList.remove('drag-over');

    if (!draggedTask) return;
    /* update task status */
    draggedTask.status = columnId;
    if (columnId === 'completed' && !draggedTask.completedAt) {
      draggedTask.completedAt = new Date().toISOString();
    }
    if (typeof LifeOS !== 'undefined' && LifeOS.Tasks && LifeOS.Tasks.update) {
      LifeOS.Tasks.update(draggedTask.id, { status: columnId, completedAt: draggedTask.completedAt });
    }
    draggedTask = null;
    if (_container) render(_container);
  }

  function onDragEnd(_e) {
    if (draggedEl) draggedEl.classList.remove('dragging');
    draggedTask = null;
    draggedEl   = null;
    /* clean up any lingering drag-over highlights */
    document.querySelectorAll('.kb-col-body.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  /* ====================================================
   *  Renderers
   * ==================================================== */
  function renderCard(task) {
    const card = document.createElement('div');
    card.className = 'kb-card';
    card.draggable = true;
    card.setAttribute('data-task-id', task.id);
    card.addEventListener('dragstart', e => onDragStart(e, task));
    card.addEventListener('dragend', onDragEnd);

    const priColor = PRIORITY_COLORS[(task.priority || 'none').toLowerCase()] || PRIORITY_COLORS.none;

    /* title row */
    let html = `<div class="kb-card-title">
      <span class="kb-priority-dot" style="background:${priColor}" title="${escHtml(task.priority || 'None')} priority"></span>
      <span>${escHtml(task.title || 'Untitled')}</span>
    </div>`;

    /* meta badges */
    html += '<div class="kb-meta">';
    if (task.dueDate) {
      const cls = isOverdue(task) ? 'kb-badge kb-due overdue' : 'kb-badge kb-due';
      html += `<span class="${cls}">${escHtml(formatDate(task.dueDate))}</span>`;
    }
    const cat = categoryLabel(task);
    if (cat) {
      html += `<span class="kb-badge kb-cat">${escHtml(cat)}</span>`;
    }
    const goal = linkedGoal(task);
    if (goal) {
      html += `<span class="kb-badge kb-goal">🎯 ${escHtml(goal)}</span>`;
    }
    html += '</div>';

    /* subtask progress */
    const prog = subtaskProgress(task);
    if (prog) {
      html += `<div class="kb-progress" title="${prog.done}/${prog.total} subtasks">
        <div class="kb-progress-bar" style="width:${prog.pct}%;background:${priColor}"></div>
      </div>`;
    }

    card.innerHTML = html;

    /* open task detail on click (if App modal exists) */
    card.addEventListener('click', e => {
      if (e.defaultPrevented) return;
      if (typeof App !== 'undefined' && App.openModal) {
        App.openModal('task-detail', { taskId: task.id });
      }
    });

    return card;
  }

  function renderColumn(column, tasks) {
    const col = document.createElement('div');
    col.className = 'kb-column';

    /* header */
    const header = document.createElement('div');
    header.className = 'kb-col-header';
    header.innerHTML = `<span class="kb-dot" style="background:${column.color}"></span>
      <span>${escHtml(column.title)}</span>
      <span class="kb-count">${tasks.length}</span>`;
    col.appendChild(header);

    /* body — drop zone */
    const body = document.createElement('div');
    body.className = 'kb-col-body';
    body.addEventListener('dragover',  onDragOver);
    body.addEventListener('dragenter', e => onDragEnter(e, column.id));
    body.addEventListener('dragleave', onDragLeave);
    body.addEventListener('drop',      e => onDrop(e, column.id));

    if (tasks.length === 0) {
      body.innerHTML = '<div class="kb-empty">No tasks here</div>';
    } else {
      tasks.forEach(t => body.appendChild(renderCard(t)));
    }
    col.appendChild(body);
    return col;
  }

  /* ---------- filter bar ---------- */
  function renderFilters() {
    const bar = document.createElement('div');
    bar.className = 'kb-filters';

    /* category select */
    const cats = uniqueCategories();
    let catOpts = '<option value="all">All Categories</option>';
    cats.forEach(c => {
      const sel = filter.category === c ? ' selected' : '';
      catOpts += `<option value="${escHtml(c)}"${sel}>${escHtml(c)}</option>`;
    });
    const catSel = document.createElement('select');
    catSel.innerHTML = catOpts;
    catSel.addEventListener('change', e => setFilter('category', e.target.value));
    bar.appendChild(catSel);

    /* priority select */
    const pris = uniquePriorities();
    let priOpts = '<option value="all">All Priorities</option>';
    pris.forEach(p => {
      const sel = filter.priority === p ? ' selected' : '';
      priOpts += `<option value="${escHtml(p)}"${sel}>${escHtml(p)}</option>`;
    });
    const priSel = document.createElement('select');
    priSel.innerHTML = priOpts;
    priSel.addEventListener('change', e => setFilter('priority', e.target.value));
    bar.appendChild(priSel);

    /* search */
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Search tasks…';
    search.value = filter.search;
    search.addEventListener('input', e => setFilter('search', e.target.value));
    bar.appendChild(search);

    return bar;
  }

  /* ---------- main render ---------- */
  function render(container) {
    injectStyles();
    _container = container;
    container.innerHTML = '';

    /* filters */
    container.appendChild(renderFilters());

    /* board */
    const board = document.createElement('div');
    board.className = 'kb-board';

    const tasks = getFilteredTasks();

    columns.forEach(col => {
      const colTasks = tasks.filter(t => taskStatus(t) === col.id);
      board.appendChild(renderColumn(col, colTasks));
    });

    container.appendChild(board);
  }

  /* ====================================================
   *  Public API
   * ==================================================== */
  return {
    columns,
    get draggedTask() { return draggedTask; },
    filter,
    render,
    renderColumn,
    renderCard,
    onDragStart,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    onDragEnd,
    setFilter,
    getFilteredTasks,
    getColumnStats,
  };
})();
