/* ============================================
   LifeOS — Application Logic
   SPA Routing, Page Rendering, Interactions
   ============================================ */

// ── Helpers ──
const escHtml = (str) => String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const localDate = (d) => { const dt = d instanceof Date ? d : new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };

// ── App Core ──
const App = {
  currentPage: 'dashboard',

  init() {
    this.setupNavigation();
    this.setupMobileMenu();
    this.setupKeyboardShortcuts();
    this.setupResizeHandler();
    this.setupCommandPalette();
    this.updateTaskBadge();
    this.renderDashboard();
    this.initChat();
    
    // Start notification engine
    if (typeof Notifications !== 'undefined') Notifications.startEngine();
    // Start screen time tracking
    if (typeof ScreenTime !== 'undefined' && ScreenTime.startTracking) ScreenTime.startTracking();
    
    // Update user info
    const user = LifeOS.User.get();
    if (user.name) {
      document.getElementById('userName').textContent = user.name;
      document.getElementById('userAvatar').textContent = user.name.split(' ').map(n => n[0]).join('');
    }
    this.updatePremiumStatusUI();
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(item.dataset.page);
      });
    });
  },

  navigate(page) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const navItem = document.querySelector(`[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    // Update pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    this.currentPage = page;
    this.closeMobileMenu();

    // Render page content
    switch (page) {
      case 'dashboard': this.renderDashboard(); break;
      case 'calendar': Calendar.render(); break;
      case 'planner': Planner.render(); break;
      case 'tasks': TasksPage.render(); break;
      case 'goals': GoalsPage.render(); break;
      case 'habits': HabitsPage.render(); break;
      case 'focus': FocusTimer.render(); break;
      case 'analytics': AnalyticsPage.render(); break;
      case 'screentime': if (typeof ScreenTime !== 'undefined') ScreenTime.render(document.getElementById('screentimeContent')); break;
      case 'timeline': if (typeof Timeline !== 'undefined') Timeline.render(document.getElementById('timelineContent')); break;
      case 'integrations': if (typeof Integrations !== 'undefined') Integrations.render(document.getElementById('integrationsContent')); break;
      case 'study': if (typeof Study !== 'undefined') Study.render(document.getElementById('studyContent')); break;
      case 'food': if (typeof Food !== 'undefined') Food.render(document.getElementById('foodContent')); break;
      case 'finance': if (typeof Finance !== 'undefined') Finance.render(document.getElementById('financeContent')); break;
      case 'wellness': if (typeof Wellness !== 'undefined') Wellness.render(document.getElementById('wellnessContent')); break;
      case 'security': if (typeof Security !== 'undefined') Security.render(document.getElementById('securityContent')); break;
    }
  },

  setupMobileMenu() {
    document.getElementById('mobileMenuToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebarOverlay').classList.toggle('active');
    });
    document.getElementById('sidebarOverlay').addEventListener('click', () => this.closeMobileMenu());
  },

  closeMobileMenu() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Escape — close modals, command palette, chat, context menu
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        this.closeCommandPalette();
        document.getElementById('chatSidebar').classList.remove('open');
        document.getElementById('chatOverlay').classList.remove('active');
        document.getElementById('contextMenu').classList.remove('visible');
        this.closeFab();
      }
      // Cmd+K or Ctrl+K — Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggleCommandPalette();
      }
      // Cmd+Shift+C — Chat
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.toggleChat();
      }
    });
    // Close context menu on click
    document.addEventListener('click', () => {
      document.getElementById('contextMenu').classList.remove('visible');
    });
  },

  setupResizeHandler() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.currentPage === 'analytics') AnalyticsPage.render();
      }, 250);
    });
  },

  updateTaskBadge() {
    const overdue = LifeOS.Tasks.getOverdue().length;
    const badge = document.getElementById('taskBadge');
    badge.textContent = overdue;
    badge.style.display = overdue > 0 ? '' : 'none';
  },

  // ── Dashboard ──
  renderDashboard() {
    const briefing = LifeOS.AI.generateBriefing();
    const user = LifeOS.User.get();
    const firstName = (user.name || 'User').split(' ')[0];

    // Greeting
    document.getElementById('briefingGreeting').innerHTML = `${briefing.greeting}, <span>${firstName}</span> 👋`;
    document.getElementById('briefingSummary').textContent = briefing.summary;

    // Insights
    const insights = document.getElementById('briefingInsights');
    insights.innerHTML = `
      <div class="briefing-insight">
        <div class="insight-icon" style="background:rgba(108,92,231,0.15);color:var(--accent-primary-light)">📋</div>
        <span>${briefing.tasks.length} tasks due</span>
      </div>
      <div class="briefing-insight">
        <div class="insight-icon" style="background:rgba(0,206,201,0.15);color:var(--accent-secondary)">📅</div>
        <span>${briefing.events.length} events</span>
      </div>
      <div class="briefing-insight">
        <div class="insight-icon" style="background:rgba(253,121,168,0.15);color:var(--accent-tertiary)">🔥</div>
        <span>${briefing.habitsCompleted}/${briefing.habitsCount} habits</span>
      </div>
      <div class="briefing-insight">
        <div class="insight-icon" style="background:rgba(253,203,110,0.15);color:var(--accent-warning)">⚠️</div>
        <span>${briefing.overdue.length} overdue</span>
      </div>
    `;

    // Stats
    const allTasks = LifeOS.Tasks.getAll();
    const completed = allTasks.filter(t => t.status === 'completed').length;
    document.getElementById('statTasksCompleted').textContent = completed;
    document.getElementById('statTasksChange').textContent = `↑ ${completed} total`;

    const focusMin = LifeOS.FocusSessions.getTodayMinutes();
    document.getElementById('statFocusTime').textContent = focusMin >= 60 ? `${(focusMin / 60).toFixed(1)}h` : `${focusMin}m`;
    document.getElementById('statFocusChange').textContent = `${LifeOS.FocusSessions.getToday().length} sessions today`;

    const habits = LifeOS.Habits.getAll();
    const activeStreaks = habits.filter(h => LifeOS.Habits.getStreak(h.id) > 0).length;
    document.getElementById('statStreaks').textContent = activeStreaks;
    document.getElementById('statStreakChange').textContent = `${activeStreaks} of ${habits.length} active`;

    const lifeScore = LifeOS.AI.calculateLifeScore();
    document.getElementById('statLifeScore').textContent = lifeScore;
    const scoreEl = document.getElementById('statScoreChange');
    if (lifeScore >= 70) { scoreEl.textContent = '🌟 Excellent!'; scoreEl.className = 'stat-change positive'; }
    else if (lifeScore >= 50) { scoreEl.textContent = '💪 Good progress'; scoreEl.className = 'stat-change positive'; }
    else { scoreEl.textContent = '⚡ Room to grow'; scoreEl.className = 'stat-change negative'; }

    // Today's Schedule
    const schedule = document.getElementById('dashboardSchedule');
    const todayEvents = LifeOS.Events.getToday().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    if (todayEvents.length === 0) {
      schedule.innerHTML = '<div class="empty-state"><p>No events scheduled today</p></div>';
    } else {
      schedule.innerHTML = todayEvents.slice(0, 5).map(e => `
        <div class="list-item">
          <div style="width:4px;height:36px;border-radius:2px;background:var(--${this.getCategoryColor(e.category)})"></div>
          <div class="flex-1">
            <div style="font-size:0.85rem;font-weight:600">${e.title}</div>
            <div class="text-xs text-tertiary">${e.startTime || ''} – ${e.endTime || ''} ${e.location ? '· ' + e.location : ''}</div>
          </div>
          <span class="badge badge-${this.getCategoryBadge(e.category)}">${e.category}</span>
        </div>
      `).join('');
    }

    // Priority Tasks
    const tasksDiv = document.getElementById('dashboardTasks');
    const priorityTasks = LifeOS.Tasks.filter(t => t.status !== 'completed')
      .sort((a, b) => {
        const pw = { critical: 4, high: 3, medium: 2, low: 1 };
        return (pw[b.priority] || 1) - (pw[a.priority] || 1);
      }).slice(0, 5);

    if (priorityTasks.length === 0) {
      tasksDiv.innerHTML = '<div class="empty-state"><p>All caught up! 🎉</p></div>';
    } else {
      tasksDiv.innerHTML = priorityTasks.map(t => `
        <div class="list-item" style="cursor:pointer" onclick="App.navigate('tasks')">
          <div class="checkbox ${t.status === 'completed' ? 'checked' : ''}" onclick="event.stopPropagation();TasksPage.toggleTask('${t.id}')"></div>
          <div class="flex-1" style="min-width:0">
            <div style="font-size:0.85rem;font-weight:600" class="truncate">${t.title}</div>
            <div class="text-xs text-tertiary">${t.dueDate ? 'Due ' + this.formatDate(t.dueDate) : 'No due date'} ${t.course ? '· ' + t.course : ''}</div>
          </div>
          <span class="priority-dot ${t.priority}"></span>
        </div>
      `).join('');
    }

    // Burnout Widget
    const burnout = LifeOS.AI.calculateBurnoutRisk();
    document.getElementById('burnoutWidget').innerHTML = `
      <div class="flex items-center justify-between mb-sm">
        <span class="text-sm font-bold">${burnout.risk}/100</span>
        <span class="badge badge-${burnout.level === 'low' ? 'green' : burnout.level === 'moderate' ? 'orange' : 'red'}">${burnout.level}</span>
      </div>
      <div class="burnout-meter ${burnout.level}">
        <div class="meter-fill" style="width:${burnout.risk}%"></div>
      </div>
      <p class="text-xs text-secondary mt-sm">${burnout.recommendations[0]}</p>
    `;

    // AI Insights
    const insightsDiv = document.getElementById('dashboardInsights');
    const procrastination = LifeOS.AI.detectProcrastination();
    const conflicts = LifeOS.AI.detectConflicts();
    let insightsHtml = '';

    if (procrastination.length > 0) {
      insightsHtml += procrastination.slice(0, 2).map(p => `
        <div class="ai-suggestion mb-sm">
          <div class="ai-icon">⚠️</div>
          <div class="ai-text">${p.message}</div>
        </div>
      `).join('');
    }

    if (conflicts.length > 0) {
      insightsHtml += conflicts.slice(0, 2).map(c => `
        <div class="ai-suggestion mb-sm">
          <div class="ai-icon">🔴</div>
          <div class="ai-text">${c.message}</div>
        </div>
      `).join('');
    }

    if (insightsHtml === '') {
      insightsHtml = `
        <div class="ai-suggestion">
          <div class="ai-icon">✨</div>
          <div class="ai-text">Looking good! No issues detected. Keep up the momentum and consider tackling your most challenging task during your peak energy hours.</div>
        </div>
      `;
    }

    insightsDiv.innerHTML = insightsHtml;
    
    // Food & Nutrition Dashboard Widget
    const nutritionDiv = document.getElementById('dashboardNutrition');
    if (nutritionDiv && typeof Food !== 'undefined') {
      const foodSummary = Food.analytics.getTodaySummary();
      const foodGoal = Food.goals.get();
      const burnedToday = Food.workouts ? Food.workouts.getTodayBurned() : 0;
      const netCalories = Math.max(0, foodSummary.totalCalories - burnedToday);
      const pct = Math.min(100, Math.round((netCalories / foodGoal.calories) * 100));
      
      let workoutsSummary = '';
      if (Food.workouts) {
        const todayW = Food.workouts.getToday();
        if (todayW.length > 0) {
          workoutsSummary = `
            <div style="margin-top:10px;text-align:left;font-size:0.75rem;color:var(--text-secondary);border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;">
              <strong style="color:#fff;">Workouts:</strong> ${todayW.map(w => `${w.icon || '💪'} ${w.exerciseName} (${w.durationMinutes}m)`).join(', ')}
            </div>
          `;
        }
      }

      nutritionDiv.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:0.85rem;font-weight:600;">Net Calories</span>
          <span style="font-size:0.85rem;font-weight:700;color:var(--accent-secondary);">${netCalories} / ${foodGoal.calories} cal</span>
        </div>
        <div class="burnout-meter" style="background:rgba(255,255,255,0.05);height:8px;border-radius:4px;overflow:hidden;margin-bottom:12px;">
          <div class="meter-fill" style="height:100%;width:${pct}%;background:var(--gradient-cool);"></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;margin-bottom:4px;">
          <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
            <div style="font-size:0.7rem;color:var(--text-secondary);">Consumed</div>
            <div style="font-size:0.8rem;font-weight:600;color:#fff;">${foodSummary.totalCalories} cal</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
            <div style="font-size:0.7rem;color:var(--text-secondary);">Burned</div>
            <div style="font-size:0.8rem;font-weight:600;color:#00cec9;">${burnedToday} cal</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
            <div style="font-size:0.7rem;color:var(--text-secondary);">Remaining</div>
            <div style="font-size:0.8rem;font-weight:600;color:var(--accent-primary-light);">${Math.max(0, foodGoal.calories - netCalories)} cal</div>
          </div>
        </div>
        ${workoutsSummary}
      `;
    }

    // Finance Dashboard Widget
    const financeDiv = document.getElementById('dashboardFinance');
    if (financeDiv && typeof Finance !== 'undefined') {
      const finSummary = Finance.analytics.getMonthSummary();
      const allTxns = Finance.transactions.getAll();
      const todayStr = localDate(new Date());
      const todaySpent = allTxns.filter(t => t.type === 'expense' && t.date === todayStr).reduce((s, t) => s + t.amount, 0);

      financeDiv.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:0.85rem;font-weight:600;">Monthly Expenses</span>
          <span style="font-size:0.85rem;font-weight:700;color:var(--accent-warning);">$${finSummary.expenses.toFixed(2)}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:8px;">
          <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:6px;text-align:left;">
            <div style="font-size:0.7rem;color:var(--text-secondary);">Today's Spending</div>
            <div style="font-size:0.9rem;font-weight:700;color:#ff6b6b;">$${todaySpent.toFixed(2)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:6px;text-align:left;">
            <div style="font-size:0.7rem;color:var(--text-secondary);">Monthly Savings</div>
            <div style="font-size:0.9rem;font-weight:700;color:var(--accent-success);">$${finSummary.savings.toFixed(2)}</div>
          </div>
        </div>
        <div style="font-size:0.75rem;color:var(--text-secondary);text-align:center;">
          Savings rate this month: <strong>${finSummary.savingsRate}%</strong>
        </div>
      `;
    }

    // Wellness Dashboard Widget
    const wellnessDiv = document.getElementById('dashboardWellness');
    if (wellnessDiv && typeof Wellness !== 'undefined') {
      const waterLog = Wellness.water.getToday();
      const waterGoal = 8;
      const sleepSummary = Wellness.sleep.getLastNight ? Wellness.sleep.getLastNight() : null;
      const sleepHours = sleepSummary ? sleepSummary.hours : 0;
      const sleepQual = sleepSummary ? sleepSummary.quality : 0;
      const moodLog = Wellness.mood.getToday();
      const moodName = moodLog ? moodLog.mood : 'Not logged';
      const moodEmoji = moodLog ? { great: '🌟', good: '🙂', okay: '😐', bad: '🙁', terrible: '😭' }[moodLog.mood] || '😐' : '🧠';

      wellnessDiv.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="font-size:0.85rem;font-weight:600;">Water Logged</span>
          <span style="font-size:0.85rem;font-weight:700;color:var(--accent-primary-light);">${waterLog} / ${waterGoal} glasses</span>
        </div>
        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:12px;">
          ${Array.from({ length: waterGoal }).map((_, i) => `
            <span style="cursor:pointer;font-size:1.1rem;opacity:${i < waterLog ? 1 : 0.2};transition:all 0.15s;" onclick="event.stopPropagation();Wellness.water.log(1);App.renderDashboard();">💧</span>
          `).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;text-align:center;">
          <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;">
            <div style="font-size:0.7rem;color:var(--text-secondary);">Last Night Sleep</div>
            <div style="font-size:0.8rem;font-weight:600;color:var(--accent-primary-light);">${sleepHours > 0 ? sleepHours + 'h (' + sleepQual + '/5)' : 'No log'}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:6px;border-radius:6px;cursor:pointer;" onclick="App.navigate('wellness')">
            <div style="font-size:0.7rem;color:var(--text-secondary);">Today's Mood</div>
            <div style="font-size:0.8rem;font-weight:600;color:var(--accent-secondary);">${moodEmoji} ${moodName}</div>
          </div>
        </div>
      `;
    }

    this.updateTaskBadge();
  },

  // ── Helpers ──
  getCategoryColor(cat) {
    return { work: 'accent-primary', academic: 'accent-primary-light', personal: 'accent-secondary', health: 'accent-success' }[cat] || 'accent-primary';
  },

  getCategoryBadge(cat) {
    return { work: 'purple', academic: 'blue', personal: 'teal', health: 'green' }[cat] || 'purple';
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  // ── Modals ──
  openModal(id) {
    document.getElementById(id).classList.add('active');
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('active');
  },

  openTaskModal(task = null) {
    document.getElementById('taskModalTitle').textContent = task ? 'Edit Task' : 'Add New Task';
    document.getElementById('taskId').value = task ? task.id : '';
    document.getElementById('taskTitleInput').value = task ? task.title : '';
    document.getElementById('taskDescInput').value = task ? (task.description || '') : '';
    document.getElementById('taskDueInput').value = task ? (task.dueDate || '') : '';
    document.getElementById('taskPriorityInput').value = task ? (task.priority || 'medium') : 'medium';
    document.getElementById('taskCategoryInput').value = task ? (task.category || 'academic') : 'academic';
    document.getElementById('taskEstimateInput').value = task ? (task.estimatedMinutes || '') : '';
    document.getElementById('taskCourseInput').value = task ? (task.course || '') : '';

    // Populate goal dropdown
    const goalSelect = document.getElementById('taskGoalInput');
    goalSelect.innerHTML = '<option value="">None</option>';
    LifeOS.Goals.getAll().forEach(g => {
      goalSelect.innerHTML += `<option value="${g.id}" ${task && task.goalId === g.id ? 'selected' : ''}>${g.title}</option>`;
    });

    this.openModal('taskModal');
  },

  openEventModal(event = null, dateStr = null) {
    document.getElementById('eventModalTitle').textContent = event ? 'Edit Event' : 'Add New Event';
    document.getElementById('eventId').value = event ? event.id : '';
    document.getElementById('eventTitleInput').value = event ? event.title : '';
    document.getElementById('eventDateInput').value = event ? event.date : (dateStr || LifeOS.today());
    document.getElementById('eventCategoryInput').value = event ? (event.category || 'personal') : 'personal';
    document.getElementById('eventStartInput').value = event ? (event.startTime || '') : '';
    document.getElementById('eventEndInput').value = event ? (event.endTime || '') : '';
    document.getElementById('eventLocationInput').value = event ? (event.location || '') : '';
    this.openModal('eventModal');
  },

  openGoalModal(goal = null) {
    document.getElementById('goalModalTitle').textContent = goal ? 'Edit Goal' : 'Add New Goal';
    document.getElementById('goalId').value = goal ? goal.id : '';
    document.getElementById('goalTitleInput').value = goal ? goal.title : '';
    document.getElementById('goalDescInput').value = goal ? (goal.description || '') : '';
    document.getElementById('goalScopeInput').value = goal ? (goal.scope || 'monthly') : 'monthly';
    document.getElementById('goalCategoryInput').value = goal ? (goal.category || 'personal') : 'personal';
    this.openModal('goalModal');
  },

  openHabitModal() {
    document.getElementById('habitTitleInput').value = '';
    document.getElementById('habitCategoryInput').value = 'health';
    document.getElementById('habitFrequencyInput').value = 'daily';
    document.getElementById('habitIconInput').value = '';
    this.openModal('habitModal');
  },

  // ── Toast ──
  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },
};

// ═══════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════
const Calendar = {
  currentDate: new Date(),
  view: 'week',

  render() {
    this.updateTitle();
    switch (this.view) {
      case 'month': this.renderMonth(); break;
      case 'week': this.renderWeek(); break;
      case 'day': this.renderDay(); break;
    }
    this.renderConflicts();
  },

  setView(view) {
    this.view = view;
    document.querySelectorAll('#calendarViewTabs .tab').forEach(t => {
      t.classList.toggle('active', t.dataset.view === view);
    });
    this.render();
  },

  prev() {
    if (this.view === 'month') this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    else if (this.view === 'week') this.currentDate.setDate(this.currentDate.getDate() - 7);
    else this.currentDate.setDate(this.currentDate.getDate() - 1);
    this.render();
  },

  next() {
    if (this.view === 'month') this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    else if (this.view === 'week') this.currentDate.setDate(this.currentDate.getDate() + 7);
    else this.currentDate.setDate(this.currentDate.getDate() + 1);
    this.render();
  },

  goToday() {
    this.currentDate = new Date();
    this.render();
  },

  updateTitle() {
    const el = document.getElementById('calendarTitle');
    if (this.view === 'month') {
      el.textContent = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (this.view === 'week') {
      const start = new Date(this.currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      el.textContent = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      el.textContent = this.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  },

  renderMonth() {
    const container = document.getElementById('calendarContent');
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = LifeOS.today();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let html = '<div class="calendar-grid">';
    // Header
    days.forEach(d => html += `<div class="calendar-header-cell">${d}</div>`);

    // Previous month padding
    const prevMonth = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonth - i;
      html += `<div class="calendar-cell other-month"><div class="cell-date">${day}</div></div>`;
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const events = LifeOS.Events.getByDate(dateStr);

      html += `<div class="calendar-cell ${isToday ? 'today' : ''}" onclick="App.openEventModal(null, '${dateStr}')">`;
      html += `<div class="cell-date">${isToday ? `<div style="background:var(--accent-primary);color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center">${d}</div>` : d}</div>`;
      events.slice(0, 3).forEach(e => {
        html += `<div class="calendar-event ${e.category}" onclick="event.stopPropagation()" title="${e.title}">${e.startTime ? e.startTime + ' ' : ''}${e.title}</div>`;
      });
      if (events.length > 3) html += `<div class="text-xs text-tertiary">+${events.length - 3} more</div>`;
      html += '</div>';
    }

    // Next month padding
    const totalCells = firstDay + daysInMonth;
    const remaining = 7 - (totalCells % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        html += `<div class="calendar-cell other-month"><div class="cell-date">${i}</div></div>`;
      }
    }

    html += '</div>';
    container.innerHTML = html;
  },

  renderWeek() {
    const container = document.getElementById('calendarContent');
    const startOfWeek = new Date(this.currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const todayStr = LifeOS.today();
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

    let html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:700px">';
    
    // Header
    html += '<thead><tr><th style="width:60px;padding:8px;font-size:0.7rem;color:var(--text-tertiary)">Time</th>';
    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + d);
      const dateStr = localDate(date);
      const isToday = dateStr === todayStr;
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = date.getDate();
      html += `<th style="padding:8px;text-align:center;${isToday ? 'background:rgba(108,92,231,0.08)' : ''}">
        <div style="font-size:0.7rem;color:var(--text-tertiary);text-transform:uppercase">${dayName}</div>
        <div style="font-size:1.1rem;font-weight:700;${isToday ? 'color:var(--accent-primary)' : 'color:var(--text-secondary)'}">${dayNum}</div>
      </th>`;
    }
    html += '</tr></thead><tbody>';

    // Time slots
    hours.forEach(h => {
      const timeLabel = `${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}`;
      html += `<tr>
        <td style="padding:4px 8px;font-size:0.7rem;color:var(--text-tertiary);font-family:var(--font-mono);vertical-align:top;border-top:1px solid var(--border-subtle)">${timeLabel}</td>`;
      
      for (let d = 0; d < 7; d++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + d);
        const dateStr = localDate(date);
        const isToday = dateStr === todayStr;
        const hourStr = String(h).padStart(2, '0');
        
        const events = LifeOS.Events.getByDate(dateStr).filter(e => {
          if (!e.startTime) return false;
          const eventHour = parseInt(e.startTime.split(':')[0]);
          return eventHour === h;
        });

        html += `<td style="padding:2px 4px;border-top:1px solid var(--border-subtle);min-height:40px;vertical-align:top;${isToday ? 'background:rgba(108,92,231,0.03)' : ''}" 
                     onclick="App.openEventModal(null, '${dateStr}')">`;
        events.forEach(e => {
          html += `<div class="calendar-event ${e.category}" style="margin-bottom:2px" onclick="event.stopPropagation()" title="${e.title}\n${e.startTime}–${e.endTime}">${e.title}</div>`;
        });
        html += '</td>';
      }
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  },

  renderDay() {
    const container = document.getElementById('calendarContent');
    const dateStr = localDate(this.currentDate);
    const events = LifeOS.Events.getByDate(dateStr).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const hours = Array.from({ length: 14 }, (_, i) => i + 7);

    let html = '<div class="day-view">';
    hours.forEach(h => {
      const timeLabel = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
      const hourStr = String(h).padStart(2, '0');
      const hourEvents = events.filter(e => e.startTime && parseInt(e.startTime.split(':')[0]) === h);

      html += `<div class="time-slot">
        <div class="time-label">${timeLabel}</div>
        <div class="time-content" onclick="App.openEventModal(null, '${dateStr}')">`;
      
      hourEvents.forEach(e => {
        const catColors = { work: 'rgba(108,92,231,0.2)', academic: 'rgba(116,185,255,0.2)', personal: 'rgba(0,206,201,0.2)', health: 'rgba(0,184,148,0.2)' };
        html += `<div class="event-block" style="background:${catColors[e.category] || catColors.work}" onclick="event.stopPropagation()">
          <div style="font-weight:600">${e.title}</div>
          <div class="text-xs text-secondary">${e.startTime} – ${e.endTime} ${e.location ? '· ' + e.location : ''}</div>
        </div>`;
      });

      html += '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
  },

  renderConflicts() {
    const dateStr = this.view === 'day' ? localDate(this.currentDate) : LifeOS.today();
    const conflicts = LifeOS.AI.detectConflicts(dateStr);
    const el = document.getElementById('calendarConflicts');
    
    if (conflicts.length === 0) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = conflicts.map(c => `
      <div class="ai-suggestion mb-sm">
        <div class="ai-icon" style="background:linear-gradient(135deg,rgba(225,112,85,0.2),rgba(253,121,168,0.2))">⚠️</div>
        <div class="ai-text">${c.message}</div>
      </div>
    `).join('');
  },

  saveEvent(e) {
    e.preventDefault();
    const id = document.getElementById('eventId').value;
    const data = {
      title: document.getElementById('eventTitleInput').value,
      date: document.getElementById('eventDateInput').value,
      category: document.getElementById('eventCategoryInput').value,
      startTime: document.getElementById('eventStartInput').value,
      endTime: document.getElementById('eventEndInput').value,
      location: document.getElementById('eventLocationInput').value,
    };

    if (id) {
      LifeOS.Events.update(id, data);
      App.toast('Event updated!', 'success');
    } else {
      LifeOS.Events.create(data);
      App.toast('Event created!', 'success');
    }

    App.closeModal('eventModal');
    this.render();
    if (App.currentPage === 'dashboard') App.renderDashboard();
  },
};

// ═══════════════════════════════════════════
// AI PLANNER
// ═══════════════════════════════════════════
const Planner = {
  render() {
    this.renderSchedule();
    this.renderProcrastination();
    this.renderSuggestions();
    this.renderWorkload();
  },

  regenerate() {
    App.toast('🤖 Schedule regenerated with latest data!', 'info');
    this.render();
  },

  renderSchedule() {
    const schedule = LifeOS.AI.generateSchedule();
    const el = document.getElementById('plannerSchedule');

    if (schedule.length === 0) {
      el.innerHTML = '<div class="empty-state"><p>No tasks to schedule</p></div>';
      return;
    }

    el.innerHTML = schedule.map(s => {
      const isEvent = s.type === 'event';
      const bg = isEvent ? 'rgba(0,206,201,0.08)' : 'rgba(108,92,231,0.06)';
      const priorityColors = { critical: 'var(--accent-danger)', high: 'var(--accent-tertiary)', medium: 'var(--accent-warning)', low: 'var(--accent-success)' };

      return `<div class="list-item" style="background:${bg};border-radius:var(--radius-md);margin-bottom:4px">
        <div style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-tertiary);min-width:50px">${s.time}</div>
        <div style="width:3px;height:30px;border-radius:2px;background:${isEvent ? 'var(--accent-secondary)' : priorityColors[s.priority] || 'var(--accent-primary)'}"></div>
        <div class="flex-1">
          <div style="font-size:0.85rem;font-weight:600">${s.title}</div>
          <div class="text-xs text-tertiary">${isEvent ? 'Event' : `${s.priority} priority · ~${s.estimatedDuration}min`}</div>
        </div>
        ${!isEvent ? `<button class="btn btn-sm btn-success" onclick="TasksPage.toggleTask('${s.taskId}')">✓ Done</button>` : ''}
      </div>`;
    }).join('');
  },

  renderProcrastination() {
    const warnings = LifeOS.AI.detectProcrastination();
    const el = document.getElementById('procrastinationContent');

    if (warnings.length === 0) {
      el.innerHTML = '<div class="ai-suggestion"><div class="ai-icon">✅</div><div class="ai-text">No procrastination patterns detected. Great job staying on top of things!</div></div>';
      return;
    }

    el.innerHTML = warnings.map(w => `
      <div class="ai-suggestion mb-sm" style="border-color:rgba(225,112,85,0.2)">
        <div class="ai-icon" style="background:${w.severity === 'high' ? 'var(--gradient-tertiary)' : 'var(--gradient-warm)'}">
          ${w.severity === 'high' ? '🚨' : '⚠️'}
        </div>
        <div class="ai-text">${w.message}</div>
      </div>
    `).join('');
  },

  renderSuggestions() {
    const el = document.getElementById('plannerSuggestions');
    const burnout = LifeOS.AI.calculateBurnoutRisk();
    const overdue = LifeOS.Tasks.getOverdue();
    const habits = LifeOS.Habits.getAll();
    const suggestions = [];

    if (overdue.length > 0) {
      suggestions.push({ icon: '🎯', text: `<strong>Tackle overdue items first.</strong> You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. Completing even one will reduce stress.` });
    }

    if (burnout.risk > 50) {
      suggestions.push({ icon: '🧘', text: '<strong>Take a break.</strong> Your burnout risk is elevated. Schedule a 20-minute walk or meditation.' });
    }

    const lowStreaks = habits.filter(h => LifeOS.Habits.getStreak(h.id) === 0 && LifeOS.Habits.getLogsForHabit(h.id).length > 0);
    if (lowStreaks.length > 0) {
      suggestions.push({ icon: '🔥', text: `<strong>Rebuild your streaks.</strong> ${lowStreaks.length} habit${lowStreaks.length > 1 ? 's have' : ' has'} broken streaks. Small wins compound.` });
    }

    suggestions.push({ icon: '⚡', text: '<strong>Deep work block.</strong> Schedule a 50-minute focus session on your highest-priority task for maximum impact.' });

    el.innerHTML = suggestions.map(s => `
      <div class="ai-suggestion mb-sm">
        <div class="ai-icon">${s.icon}</div>
        <div class="ai-text">${s.text}</div>
      </div>
    `).join('');
  },

  renderWorkload() {
    const el = document.getElementById('workloadAnalysis');
    const tasks = LifeOS.Tasks.filter(t => t.status !== 'completed');
    const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
    tasks.forEach(t => { byPriority[t.priority] = (byPriority[t.priority] || 0) + 1; });

    const totalEst = tasks.reduce((s, t) => s + (t.estimatedMinutes || 30), 0);

    el.innerHTML = `
      <div class="mb-md">
        <div class="flex justify-between text-sm mb-sm"><span>Total Active Tasks</span><span class="font-bold">${tasks.length}</span></div>
        <div class="flex justify-between text-sm mb-sm"><span>Estimated Work</span><span class="font-bold">${Math.round(totalEst / 60)}h ${totalEst % 60}m</span></div>
      </div>
      <div class="mb-sm"><div class="flex justify-between text-xs mb-xs"><span>🔴 Critical</span><span>${byPriority.critical}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${tasks.length ? (byPriority.critical / tasks.length * 100) : 0}%;background:var(--gradient-tertiary)"></div></div></div>
      <div class="mb-sm"><div class="flex justify-between text-xs mb-xs"><span>🟠 High</span><span>${byPriority.high}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${tasks.length ? (byPriority.high / tasks.length * 100) : 0}%;background:var(--gradient-warm)"></div></div></div>
      <div class="mb-sm"><div class="flex justify-between text-xs mb-xs"><span>🟡 Medium</span><span>${byPriority.medium}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${tasks.length ? (byPriority.medium / tasks.length * 100) : 0}%"></div></div></div>
      <div class="mb-sm"><div class="flex justify-between text-xs mb-xs"><span>🟢 Low</span><span>${byPriority.low}</span></div><div class="progress-bar teal"><div class="progress-fill" style="width:${tasks.length ? (byPriority.low / tasks.length * 100) : 0}%"></div></div></div>
    `;
  }
};

// ═══════════════════════════════════════════
// TASKS PAGE
// ═══════════════════════════════════════════
const TasksPage = {
  statusFilter: 'all',

  render() {
    this.filter();
  },

  filterByStatus(status) {
    this.statusFilter = status;
    document.querySelectorAll('#taskStatusTabs .tab').forEach(t => {
      t.classList.toggle('active', t.dataset.filter === status);
    });
    this.filter();
  },

  filter() {
    let tasks = LifeOS.Tasks.getAll();
    const search = (document.getElementById('taskSearch').value || '').toLowerCase();
    const sort = document.getElementById('taskSortSelect').value;

    // Status filter
    if (this.statusFilter === 'overdue') {
      tasks = tasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date());
    } else if (this.statusFilter !== 'all') {
      tasks = tasks.filter(t => t.status === this.statusFilter);
    }

    // Search
    if (search) {
      tasks = tasks.filter(t => t.title.toLowerCase().includes(search) || (t.description || '').toLowerCase().includes(search) || (t.course || '').toLowerCase().includes(search));
    }

    // Sort
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    tasks.sort((a, b) => {
      switch (sort) {
        case 'priority': return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        case 'progress': return (b.progress || 0) - (a.progress || 0);
        case 'title': return (a.title || '').localeCompare(b.title || '');
        default: return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      }
    });

    this.renderList(tasks);
  },

  renderList(tasks) {
    const el = document.getElementById('taskList');

    if (tasks.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No tasks found</p><button class="btn btn-primary" onclick="App.openTaskModal()">+ Add Your First Task</button></div>';
      return;
    }

    el.innerHTML = tasks.map(t => {
      const isOverdue = t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date();
      const subtaskHtml = t.subtasks && t.subtasks.length ? t.subtasks.map((s, i) => `
        <div class="flex items-center gap-sm" style="padding:4px 0 4px 36px">
          <div class="checkbox ${s.completed ? 'checked' : ''}" style="width:16px;height:16px;border-radius:4px" onclick="TasksPage.toggleSubtask('${t.id}', ${i})"></div>
          <span class="text-sm ${s.completed ? 'text-tertiary' : ''}" style="${s.completed ? 'text-decoration:line-through' : ''}">${s.title}</span>
        </div>
      `).join('') : '';

      return `<div class="card mb-sm" style="${isOverdue ? 'border-color:rgba(225,112,85,0.3)' : ''}">
        <div class="flex items-center gap-md">
          <div class="checkbox ${t.status === 'completed' ? 'checked' : ''}" onclick="TasksPage.toggleTask('${t.id}')"></div>
          <div class="flex-1" style="min-width:0">
            <div class="flex items-center gap-sm">
              <span style="font-weight:600;${t.status === 'completed' ? 'text-decoration:line-through;color:var(--text-tertiary)' : ''}">${t.title}</span>
              <span class="priority-dot ${t.priority}"></span>
              ${isOverdue ? '<span class="badge badge-red">Overdue</span>' : ''}
            </div>
            <div class="text-xs text-secondary mt-xs">
              ${t.dueDate ? App.formatDate(t.dueDate) : 'No due date'}
              ${t.course ? ' · ' + t.course : ''}
              ${t.estimatedMinutes ? ' · ~' + t.estimatedMinutes + 'min' : ''}
              ${t.category ? ' · ' + t.category : ''}
            </div>
            ${t.progress !== undefined && t.progress > 0 && t.progress < 100 ? `
              <div class="flex items-center gap-sm mt-sm">
                <div class="progress-bar" style="max-width:200px"><div class="progress-fill" style="width:${t.progress}%"></div></div>
                <span class="text-xs text-tertiary">${t.progress}%</span>
              </div>
            ` : ''}
          </div>
          <div class="flex gap-xs">
            <button class="btn btn-ghost btn-sm" onclick="App.openTaskModal(LifeOS.Tasks.getById('${t.id}'))">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="TasksPage.deleteTask('${t.id}')">🗑️</button>
          </div>
        </div>
        ${subtaskHtml}
      </div>`;
    }).join('');
  },

  toggleTask(id) {
    const task = LifeOS.Tasks.getById(id);
    if (!task) return;
    if (task.status === 'completed') {
      LifeOS.Tasks.update(id, { status: 'in_progress', progress: 0, completedAt: null });
      App.toast('Task reopened', 'info');
    } else {
      LifeOS.Tasks.complete(id);
      App.toast('Task completed! 🎉', 'success');
    }
    this.filter();
    App.updateTaskBadge();
    if (App.currentPage === 'dashboard') App.renderDashboard();
  },

  toggleSubtask(taskId, idx) {
    LifeOS.Tasks.toggleSubtask(taskId, idx);
    this.filter();
  },

  deleteTask(id) {
    if (confirm('Delete this task?')) {
      LifeOS.Tasks.delete(id);
      App.toast('Task deleted', 'info');
      this.filter();
      App.updateTaskBadge();
    }
  },

  saveTask(e) {
    e.preventDefault();
    const id = document.getElementById('taskId').value;
    const data = {
      title: document.getElementById('taskTitleInput').value,
      description: document.getElementById('taskDescInput').value,
      dueDate: document.getElementById('taskDueInput').value,
      priority: document.getElementById('taskPriorityInput').value,
      category: document.getElementById('taskCategoryInput').value,
      estimatedMinutes: parseInt(document.getElementById('taskEstimateInput').value) || null,
      course: document.getElementById('taskCourseInput').value,
      goalId: document.getElementById('taskGoalInput').value || null,
    };

    if (id) {
      LifeOS.Tasks.update(id, data);
      App.toast('Task updated!', 'success');
    } else {
      data.status = 'not_started';
      data.progress = 0;
      data.subtasks = [];
      LifeOS.Tasks.create(data);
      App.toast('Task created!', 'success');
    }

    App.closeModal('taskModal');
    this.filter();
    App.updateTaskBadge();
    if (App.currentPage === 'dashboard') App.renderDashboard();
  },
};

// ═══════════════════════════════════════════
// GOALS PAGE
// ═══════════════════════════════════════════
const GoalsPage = {
  scopeFilter: 'all',

  render() {
    this.renderGoals();
  },

  filterByScope(scope, el) {
    this.scopeFilter = scope;
    document.querySelectorAll('#goalScopeTabs .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    else {
      // Fallback: find the tab matching scope
      document.querySelectorAll('#goalScopeTabs .tab').forEach(t => {
        if (t.textContent.trim().toLowerCase().startsWith(scope === 'all' ? 'all' : scope)) t.classList.add('active');
      });
    }
    this.renderGoals();
  },

  renderGoals() {
    let goals = LifeOS.Goals.getAll();
    if (this.scopeFilter !== 'all') goals = goals.filter(g => g.scope === this.scopeFilter);

    const el = document.getElementById('goalList');
    if (goals.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">🎯</div><p>No goals set yet</p><button class="btn btn-primary" onclick="App.openGoalModal()">+ Create Your First Goal</button></div>';
      return;
    }

    el.innerHTML = goals.map(g => {
      const scopeColors = { weekly: 'badge-blue', monthly: 'badge-purple', yearly: 'badge-teal' };
      const linkedTasks = LifeOS.Tasks.getByGoal(g.id);
      
      const milestonesHtml = g.milestones && g.milestones.length ? g.milestones.map((m, i) => `
        <div class="milestone">
          <div class="milestone-dot ${m.completed ? 'completed' : ''}" onclick="GoalsPage.toggleMilestone('${g.id}', ${i})" style="cursor:pointer">
            ${m.completed ? '✓' : ''}
          </div>
          <div class="milestone-info">
            <div class="milestone-title" style="${m.completed ? 'text-decoration:line-through;color:var(--text-tertiary)' : ''}">${m.title}</div>
            ${m.date ? `<div class="milestone-date">${App.formatDate(m.date)}</div>` : ''}
          </div>
        </div>
      `).join('') : '';

      return `<div class="card mb-md">
        <div class="card-header">
          <div>
            <div class="flex items-center gap-sm">
              <h3 style="font-size:1.05rem;font-weight:700">${g.title}</h3>
              <span class="badge ${scopeColors[g.scope] || 'badge-purple'}">${g.scope}</span>
            </div>
            ${g.description ? `<p class="text-sm text-secondary mt-xs">${g.description}</p>` : ''}
          </div>
          <div class="flex gap-xs">
            <button class="btn btn-ghost btn-sm" onclick="App.openGoalModal(LifeOS.Goals.getById('${g.id}'))">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="GoalsPage.deleteGoal('${g.id}')">🗑️</button>
          </div>
        </div>

        <div class="flex items-center gap-md mb-md">
          <div class="progress-bar flex-1"><div class="progress-fill" style="width:${g.progress || 0}%"></div></div>
          <span class="text-sm font-bold" style="min-width:40px">${g.progress || 0}%</span>
        </div>

        ${milestonesHtml ? `<div class="mb-md">${milestonesHtml}</div>` : ''}

        ${linkedTasks.length > 0 ? `
          <div style="border-top:1px solid var(--border-subtle);padding-top:var(--space-md)">
            <div class="text-xs text-tertiary mb-sm font-bold">LINKED TASKS (${linkedTasks.length})</div>
            ${linkedTasks.slice(0, 3).map(t => `
              <div class="flex items-center gap-sm" style="padding:4px 0">
                <div class="checkbox ${t.status === 'completed' ? 'checked' : ''}" style="width:16px;height:16px;border-radius:4px" onclick="TasksPage.toggleTask('${t.id}')"></div>
                <span class="text-sm ${t.status === 'completed' ? 'text-tertiary' : ''}">${t.title}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>`;
    }).join('');
  },

  toggleMilestone(goalId, idx) {
    LifeOS.Goals.toggleMilestone(goalId, idx);
    this.renderGoals();
    App.toast('Milestone updated!', 'success');
  },

  deleteGoal(id) {
    if (confirm('Delete this goal?')) {
      LifeOS.Goals.delete(id);
      App.toast('Goal deleted', 'info');
      this.renderGoals();
    }
  },

  saveGoal(e) {
    e.preventDefault();
    const id = document.getElementById('goalId').value;
    const data = {
      title: document.getElementById('goalTitleInput').value,
      description: document.getElementById('goalDescInput').value,
      scope: document.getElementById('goalScopeInput').value,
      category: document.getElementById('goalCategoryInput').value,
    };

    if (id) {
      LifeOS.Goals.update(id, data);
      App.toast('Goal updated!', 'success');
    } else {
      data.progress = 0;
      data.milestones = [];
      LifeOS.Goals.create(data);
      App.toast('Goal created!', 'success');
    }

    App.closeModal('goalModal');
    this.renderGoals();
  },
};

// ═══════════════════════════════════════════
// HABITS PAGE
// ═══════════════════════════════════════════
const HabitsPage = {
  render() {
    this.renderStats();
    this.renderList();
    this.renderHeatmapSelect();
    this.renderHeatmap();
  },

  renderStats() {
    const habits = LifeOS.Habits.getAll();
    const todayCompleted = LifeOS.Habits.getTodayCompletedCount();
    const bestStreak = Math.max(0, ...habits.map(h => LifeOS.Habits.getStreak(h.id)));
    const avgRate = habits.length ? Math.round(habits.reduce((s, h) => s + LifeOS.Habits.getCompletionRate(h.id), 0) / habits.length) : 0;

    document.getElementById('habitStats').innerHTML = `
      <div class="stat-card purple">
        <div class="stat-icon">🔥</div>
        <div class="stat-value">${todayCompleted}/${habits.length}</div>
        <div class="stat-label">Completed Today</div>
      </div>
      <div class="stat-card teal">
        <div class="stat-icon">🏆</div>
        <div class="stat-value">${bestStreak}</div>
        <div class="stat-label">Best Active Streak</div>
      </div>
      <div class="stat-card pink">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${avgRate}%</div>
        <div class="stat-label">30-Day Avg Rate</div>
      </div>
    `;
  },

  renderList() {
    const habits = LifeOS.Habits.getAll();
    const el = document.getElementById('habitList');

    if (habits.length === 0) {
      el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔥</div><p>No habits yet</p><button class="btn btn-primary" onclick="App.openHabitModal()">+ Add Your First Habit</button></div>';
      return;
    }

    el.innerHTML = habits.map(h => {
      const streak = LifeOS.Habits.getStreak(h.id);
      const completed = LifeOS.Habits.isCompletedToday(h.id);
      const rate = LifeOS.Habits.getCompletionRate(h.id);

      return `<div class="card" style="${completed ? 'border-color:rgba(0,184,148,0.3);background:rgba(0,184,148,0.03)' : ''}">
        <div class="flex items-center justify-between mb-md">
          <div class="flex items-center gap-md">
            <span style="font-size:1.5rem">${h.icon || '✨'}</span>
            <div>
              <div style="font-weight:600">${h.title}</div>
              <div class="text-xs text-tertiary">${h.frequency} · ${h.category}</div>
            </div>
          </div>
          <div class="flex gap-xs">
            <button class="btn ${completed ? 'btn-success' : 'btn-secondary'}" onclick="HabitsPage.toggleHabit('${h.id}')">
              ${completed ? '✓ Done' : 'Log'}
            </button>
            <button class="btn btn-ghost btn-sm" onclick="HabitsPage.deleteHabit('${h.id}')" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <div class="streak-display">
            <span class="streak-flame">🔥</span>
            <span class="streak-count">${streak}</span>
            <span class="text-xs text-tertiary">day streak</span>
          </div>
          <div class="text-right">
            <div class="text-sm font-bold">${rate}%</div>
            <div class="text-xs text-tertiary">30d rate</div>
          </div>
        </div>
        <div class="progress-bar mt-sm ${rate >= 70 ? 'teal' : rate >= 40 ? '' : 'orange'}">
          <div class="progress-fill" style="width:${rate}%"></div>
        </div>
      </div>`;
    }).join('');
  },

  renderHeatmapSelect() {
    const habits = LifeOS.Habits.getAll();
    const select = document.getElementById('heatmapHabitSelect');
    select.innerHTML = '<option value="all">All Habits</option>';
    habits.forEach(h => {
      select.innerHTML += `<option value="${h.id}">${h.icon || ''} ${h.title}</option>`;
    });
  },

  renderHeatmap() {
    const el = document.getElementById('habitHeatmap');
    const selectedHabit = document.getElementById('heatmapHabitSelect').value;
    const weeks = 26;
    
    let allDates;
    if (selectedHabit === 'all') {
      // Combine all habit logs
      const allLogs = LifeOS.Habits.getAll().flatMap(h => LifeOS.Habits.getHeatmapData(h.id, weeks));
      const dateMap = {};
      allLogs.forEach(l => {
        if (!dateMap[l.date]) dateMap[l.date] = 0;
        if (l.completed) dateMap[l.date]++;
      });
      const totalHabits = LifeOS.Habits.getAll().length || 1;
      allDates = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeks * 7));
      for (let i = 0; i < weeks * 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const ds = localDate(d);
        const count = dateMap[ds] || 0;
        const level = count === 0 ? 0 : count <= totalHabits * 0.25 ? 1 : count <= totalHabits * 0.5 ? 2 : count <= totalHabits * 0.75 ? 3 : 4;
        allDates.push({ date: ds, level });
      }
    } else {
      const data = LifeOS.Habits.getHeatmapData(selectedHabit, weeks);
      allDates = data.map(d => ({ date: d.date, level: d.completed ? 4 : 0 }));
    }

    // Render grid (7 rows × weeks cols)
    let html = '<div style="display:grid;grid-template-columns:repeat(' + weeks + ',1fr);grid-template-rows:repeat(7,1fr);gap:2px;max-width:100%">';
    
    // Reorganize data into weeks (columns) with days (rows)
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < weeks; col++) {
        const idx = col * 7 + row;
        if (idx < allDates.length) {
          const d = allDates[idx];
          html += `<div class="heatmap-cell level-${d.level}" title="${d.date}" style="aspect-ratio:1;min-width:8px"></div>`;
        }
      }
    }
    html += '</div>';

    // Legend
    html += `<div class="flex items-center gap-sm mt-md justify-end">
      <span class="text-xs text-tertiary">Less</span>
      <div class="heatmap-cell" style="width:12px;height:12px;display:inline-block"></div>
      <div class="heatmap-cell level-1" style="width:12px;height:12px;display:inline-block"></div>
      <div class="heatmap-cell level-2" style="width:12px;height:12px;display:inline-block"></div>
      <div class="heatmap-cell level-3" style="width:12px;height:12px;display:inline-block"></div>
      <div class="heatmap-cell level-4" style="width:12px;height:12px;display:inline-block"></div>
      <span class="text-xs text-tertiary">More</span>
    </div>`;

    el.innerHTML = html;
  },

  toggleHabit(id) {
    const result = LifeOS.Habits.log(id);
    App.toast(result ? 'Habit logged! 🔥' : 'Habit unlogged', result ? 'success' : 'info');
    this.render();
    if (App.currentPage === 'dashboard') App.renderDashboard();
  },

  deleteHabit(id) {
    if (confirm('Delete this habit? All logs will be lost.')) {
      LifeOS.Habits.delete(id);
      // Also remove habit logs
      const logs = JSON.parse(localStorage.getItem('lifeos_habit_logs') || '[]');
      const filtered = logs.filter(l => l.habitId !== id);
      localStorage.setItem('lifeos_habit_logs', JSON.stringify(filtered));
      App.toast('Habit deleted', 'info');
      this.render();
    }
  },

  saveHabit(e) {
    e.preventDefault();
    LifeOS.Habits.create({
      title: document.getElementById('habitTitleInput').value,
      category: document.getElementById('habitCategoryInput').value,
      frequency: document.getElementById('habitFrequencyInput').value,
      icon: document.getElementById('habitIconInput').value || '✨',
      color: '#6c5ce7',
    });
    App.closeModal('habitModal');
    App.toast('Habit created!', 'success');
    this.render();
  },
};

// ═══════════════════════════════════════════
// FOCUS TIMER
// ═══════════════════════════════════════════
const FocusTimer = {
  state: 'idle', // idle, running, paused, break
  timeRemaining: 25 * 60,
  totalTime: 25 * 60,
  interval: null,
  sessionsCompleted: 0,
  sessionType: 'focus', // focus, shortBreak, longBreak

  render() {
    this.updateDisplay();
    this.renderStats();
    this.renderRecentSessions();
  },

  toggle() {
    if (this.state === 'running') {
      this.pause();
    } else {
      this.start();
    }
  },

  start() {
    if (this.state === 'idle') {
      const settings = LifeOS.Settings.get();
      this.totalTime = settings.focusDuration * 60;
      this.timeRemaining = this.totalTime;
      this.sessionType = 'focus';
    }
    
    this.state = 'running';
    this.updateToggleButton();
    
    this.interval = setInterval(() => {
      this.timeRemaining--;
      this.updateDisplay();
      
      if (this.timeRemaining <= 0) {
        this.completeSession();
      }
    }, 1000);
  },

  pause() {
    this.state = 'paused';
    clearInterval(this.interval);
    this.updateToggleButton();
  },

  reset() {
    clearInterval(this.interval);
    this.state = 'idle';
    this.sessionType = 'focus';
    const settings = LifeOS.Settings.get();
    this.totalTime = settings.focusDuration * 60;
    this.timeRemaining = this.totalTime;
    this.updateDisplay();
    this.updateToggleButton();
    document.getElementById('timerLabel').textContent = 'Focus Time';
  },

  skip() {
    clearInterval(this.interval);
    this.completeSession();
  },

  completeSession() {
    clearInterval(this.interval);
    
    if (this.sessionType === 'focus') {
      // Log the focus session
      const settings = LifeOS.Settings.get();
      LifeOS.FocusSessions.create({
        date: LifeOS.today(),
        duration: settings.focusDuration,
        type: 'pomodoro',
        taskTitle: document.getElementById('focusTaskInput').value || 'Focus session',
      });
      
      this.sessionsCompleted++;
      App.toast(`Focus session complete! 🎉 (${this.sessionsCompleted} today)`, 'success');
      
      // Determine break type
      if (this.sessionsCompleted % 4 === 0) {
        this.sessionType = 'longBreak';
        this.totalTime = LifeOS.Settings.get().longBreak * 60;
        document.getElementById('timerLabel').textContent = 'Long Break';
      } else {
        this.sessionType = 'shortBreak';
        this.totalTime = LifeOS.Settings.get().shortBreak * 60;
        document.getElementById('timerLabel').textContent = 'Short Break';
      }
    } else {
      // Break complete
      this.sessionType = 'focus';
      this.totalTime = LifeOS.Settings.get().focusDuration * 60;
      document.getElementById('timerLabel').textContent = 'Focus Time';
      App.toast('Break over! Ready for another session? 💪', 'info');
    }
    
    this.timeRemaining = this.totalTime;
    this.state = 'idle';
    this.updateDisplay();
    this.updateToggleButton();
    this.renderStats();
    this.renderRecentSessions();
  },

  updateDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    document.getElementById('timerDisplay').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Update progress ring
    const progress = document.getElementById('timerProgress');
    const circumference = 2 * Math.PI * 140;
    const offset = circumference * (1 - this.timeRemaining / this.totalTime);
    progress.style.strokeDasharray = circumference;
    progress.style.strokeDashoffset = circumference - offset;
  },

  updateToggleButton() {
    const btn = document.getElementById('timerToggle');
    if (this.state === 'running') {
      btn.textContent = '⏸';
      btn.classList.remove('start');
      btn.classList.add('pause');
      btn.setAttribute('data-tooltip', 'Pause');
    } else {
      btn.textContent = '▶';
      btn.classList.remove('pause');
      btn.classList.add('start');
      btn.setAttribute('data-tooltip', 'Start');
    }
  },

  updateSettings() {
    const focusDuration = Math.max(1, Math.min(120, parseInt(document.getElementById('focusDuration').value) || 25));
    const shortBreak = Math.max(1, Math.min(30, parseInt(document.getElementById('shortBreakDuration').value) || 5));
    const longBreak = Math.max(1, Math.min(60, parseInt(document.getElementById('longBreakDuration').value) || 15));
    document.getElementById('focusDuration').value = focusDuration;
    document.getElementById('shortBreakDuration').value = shortBreak;
    document.getElementById('longBreakDuration').value = longBreak;
    
    LifeOS.Settings.set({ focusDuration, shortBreak, longBreak });
    
    if (this.state === 'idle') {
      if (this.sessionType === 'focus') this.totalTime = focusDuration * 60;
      else if (this.sessionType === 'shortBreak') this.totalTime = shortBreak * 60;
      else this.totalTime = longBreak * 60;
      this.timeRemaining = this.totalTime;
      this.updateDisplay();
    }
  },

  renderStats() {
    const todaySessions = LifeOS.FocusSessions.getToday();
    const todayMinutes = LifeOS.FocusSessions.getTodayMinutes();
    const weekMinutes = LifeOS.FocusSessions.getThisWeekMinutes();
    const totalSessions = LifeOS.FocusSessions.getTotalSessions();

    document.getElementById('focusStats').innerHTML = `
      <div class="flex justify-between items-center mb-md" style="padding:var(--space-md);background:rgba(108,92,231,0.06);border-radius:var(--radius-md)">
        <div>
          <div class="text-xs text-tertiary">Today's Focus</div>
          <div style="font-size:1.5rem;font-weight:800">${todayMinutes >= 60 ? (todayMinutes / 60).toFixed(1) + 'h' : todayMinutes + 'm'}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-tertiary">Sessions</div>
          <div style="font-size:1.5rem;font-weight:800">${todaySessions.length}</div>
        </div>
      </div>
      <div class="flex justify-between text-sm mb-sm"><span class="text-secondary">This Week</span><span class="font-bold">${(weekMinutes / 60).toFixed(1)}h</span></div>
      <div class="flex justify-between text-sm mb-sm"><span class="text-secondary">All Time Sessions</span><span class="font-bold">${totalSessions}</span></div>
    `;
  },

  renderRecentSessions() {
    const sessions = LifeOS.FocusSessions.getAll().sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || '')).slice(0, 8);
    const el = document.getElementById('recentSessions');

    if (sessions.length === 0) {
      el.innerHTML = '<p class="text-sm text-tertiary text-center">No sessions yet. Start your first focus session!</p>';
      return;
    }

    el.innerHTML = sessions.map(s => `
      <div class="list-item" style="padding:8px 0">
        <div style="width:6px;height:6px;border-radius:50%;background:var(--accent-primary)"></div>
        <div class="flex-1">
          <div class="text-sm">${s.taskTitle || 'Focus'}</div>
          <div class="text-xs text-tertiary">${s.date} · ${s.duration}min</div>
        </div>
        <span class="badge badge-purple">${s.type === 'deep_work' ? 'Deep Work' : 'Pomodoro'}</span>
      </div>
    `).join('');
  },
};

// ═══════════════════════════════════════════
// ANALYTICS PAGE
// ═══════════════════════════════════════════
const AnalyticsPage = {
  render() {
    this.renderStats();
    this.renderWeeklyChart();
    this.renderDistributionChart();
    this.renderFocusTrend();
    this.renderBurnoutAnalysis();
    this.renderHabitAdherence();
  },

  renderStats() {
    const completionRate = LifeOS.Analytics.getCompletionRate(7);
    const weekFocus = LifeOS.FocusSessions.getThisWeekMinutes();
    const lifeScore = LifeOS.AI.calculateLifeScore();
    const totalTasks = LifeOS.Tasks.getAll().length;

    document.getElementById('analyticsStats').innerHTML = `
      <div class="stat-card purple">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${completionRate}%</div>
        <div class="stat-label">7-Day Completion Rate</div>
      </div>
      <div class="stat-card teal">
        <div class="stat-icon">⏱️</div>
        <div class="stat-value">${(weekFocus / 60).toFixed(1)}h</div>
        <div class="stat-label">Focus This Week</div>
      </div>
      <div class="stat-card pink">
        <div class="stat-icon">⚡</div>
        <div class="stat-value">${lifeScore}</div>
        <div class="stat-label">Life Score</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${totalTasks}</div>
        <div class="stat-label">Total Tasks</div>
      </div>
    `;
  },

  renderWeeklyChart() {
    const data = LifeOS.Analytics.getWeeklyProductivity();
    const canvas = document.getElementById('weeklyChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 500;
    ctx.scale(2, 2);
    const w = rect.width;
    const h = 250;

    ctx.clearRect(0, 0, w, h);

    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Find max value
    const maxVal = Math.max(10, ...data.map(d => d.focusMinutes), ...data.map(d => d.tasksCompleted * 10));

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), padding.left - 8, y + 4);
    }

    // Draw bars (Focus minutes)
    const barWidth = chartW / data.length * 0.35;
    const gap = chartW / data.length;

    data.forEach((d, i) => {
      const x = padding.left + gap * i + gap * 0.15;
      const barH = (d.focusMinutes / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, 'rgba(108,92,231,0.8)');
      grad.addColorStop(1, 'rgba(108,92,231,0.3)');
      ctx.fillStyle = grad;
      
      // Rounded rect
      const radius = 4;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barH);
      ctx.lineTo(x, y + barH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.fill();

      // Tasks completed dots
      const dotX = x + barWidth + gap * 0.15;
      const dotBarH = (d.tasksCompleted * 10 / maxVal) * chartH;
      const dotY = padding.top + chartH - dotBarH;
      
      const grad2 = ctx.createLinearGradient(dotX, dotY, dotX, dotY + dotBarH);
      grad2.addColorStop(0, 'rgba(0,206,201,0.8)');
      grad2.addColorStop(1, 'rgba(0,206,201,0.3)');
      ctx.fillStyle = grad2;
      
      ctx.beginPath();
      ctx.moveTo(dotX + radius, dotY);
      ctx.lineTo(dotX + barWidth - radius, dotY);
      ctx.quadraticCurveTo(dotX + barWidth, dotY, dotX + barWidth, dotY + radius);
      ctx.lineTo(dotX + barWidth, dotY + dotBarH);
      ctx.lineTo(dotX, dotY + dotBarH);
      ctx.lineTo(dotX, dotY + radius);
      ctx.quadraticCurveTo(dotX, dotY, dotX + radius, dotY);
      ctx.fill();

      // Day label
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(d.dayName, padding.left + gap * i + gap / 2, h - 12);
    });

    // Legend
    ctx.fillStyle = 'rgba(108,92,231,0.8)';
    ctx.fillRect(w - 180, 8, 10, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Focus (min)', w - 165, 17);

    ctx.fillStyle = 'rgba(0,206,201,0.8)';
    ctx.fillRect(w - 90, 8, 10, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Tasks ×10', w - 75, 17);
  },

  renderDistributionChart() {
    const dist = LifeOS.Analytics.getTaskDistribution();
    const canvas = document.getElementById('distributionChart');
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 500;
    ctx.scale(2, 2);
    const w = rect.width;
    const h = 250;

    ctx.clearRect(0, 0, w, h);

    const entries = Object.entries(dist);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    if (total === 0) return;

    const colors = {
      academic: ['#6c5ce7', '#a29bfe'],
      work: ['#0984e3', '#74b9ff'],
      personal: ['#00cec9', '#55efc4'],
      health: ['#00b894', '#55efc4'],
      other: ['#636e72', '#b2bec3'],
    };

    const centerX = w / 2 - 50;
    const centerY = h / 2;
    const radius = 80;

    let startAngle = -Math.PI / 2;

    entries.forEach(([cat, count]) => {
      const sliceAngle = (count / total) * Math.PI * 2;
      const [color1, color2] = colors[cat] || colors.other;
      
      const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      grad.addColorStop(0, color2);
      grad.addColorStop(1, color1);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // White gap
      ctx.strokeStyle = 'rgba(10,10,15,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle += sliceAngle;
    });

    // Inner circle (donut)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,10,15,0.9)';
    ctx.fill();

    // Center text
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 20px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(total, centerX, centerY + 2);
    ctx.font = '10px Inter';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Total Tasks', centerX, centerY + 16);

    // Legend
    let legendY = 40;
    entries.forEach(([cat, count]) => {
      const [color1] = colors[cat] || colors.other;
      ctx.fillStyle = color1;
      ctx.fillRect(w - 100, legendY, 10, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '11px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`${cat} (${count})`, w - 84, legendY + 9);
      legendY += 22;
    });
  },

  renderFocusTrend() {
    const data = LifeOS.Analytics.getMonthlyTrends();
    const canvas = document.getElementById('focusTrendChart');
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 500;
    ctx.scale(2, 2);
    const w = rect.width;
    const h = 250;

    ctx.clearRect(0, 0, w, h);

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(1, ...data.map(d => d.focusHours)) * 1.2;

    // Draw area chart
    const points = data.map((d, i) => ({
      x: padding.left + (chartW / (data.length - 1 || 1)) * i,
      y: padding.top + chartH - (d.focusHours / maxVal) * chartH,
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    grad.addColorStop(0, 'rgba(0,206,201,0.3)');
    grad.addColorStop(1, 'rgba(0,206,201,0.01)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, h - padding.bottom);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#00cec9';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00cec9';
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,10,15,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Value label
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(data[i].focusHours + 'h', p.x, p.y - 12);
    });

    // X labels
    data.forEach((d, i) => {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(d.week, padding.left + (chartW / (data.length - 1 || 1)) * i, h - 12);
    });

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }
  },

  renderBurnoutAnalysis() {
    const burnout = LifeOS.AI.calculateBurnoutRisk();
    const el = document.getElementById('burnoutAnalysis');

    const gaugeColor = burnout.level === 'low' ? '#00b894' : burnout.level === 'moderate' ? '#fdcb6e' : '#e17055';

    el.innerHTML = `
      <div class="flex items-center gap-lg mb-lg">
        <div style="position:relative;width:120px;height:120px">
          <svg viewBox="0 0 120 120" style="transform:rotate(-90deg)">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="${gaugeColor}" stroke-width="8" 
                    stroke-dasharray="${2 * Math.PI * 52}" 
                    stroke-dashoffset="${2 * Math.PI * 52 * (1 - burnout.risk / 100)}"
                    stroke-linecap="round"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <span style="font-size:1.8rem;font-weight:800;color:${gaugeColor}">${burnout.risk}</span>
            <span class="text-xs text-tertiary">Risk Score</span>
          </div>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-sm mb-sm">
            <span class="badge badge-${burnout.level === 'low' ? 'green' : burnout.level === 'moderate' ? 'orange' : 'red'}" style="font-size:0.8rem;padding:4px 12px">${burnout.level.toUpperCase()} RISK</span>
          </div>
          ${burnout.recommendations.map(r => `<p class="text-sm text-secondary mb-xs">• ${r}</p>`).join('')}
        </div>
      </div>
    `;
  },

  renderHabitAdherence() {
    const habits = LifeOS.Habits.getAll();
    const el = document.getElementById('habitAdherence');

    if (habits.length === 0) {
      el.innerHTML = '<p class="text-sm text-tertiary text-center">No habits to analyze</p>';
      return;
    }

    el.innerHTML = habits.map(h => {
      const rate = LifeOS.Habits.getCompletionRate(h.id);
      const streak = LifeOS.Habits.getStreak(h.id);
      const color = rate >= 70 ? 'teal' : rate >= 40 ? '' : 'orange';
      
      return `<div class="flex items-center gap-md mb-md">
        <span style="font-size:1.3rem;min-width:30px">${h.icon || '✨'}</span>
        <div class="flex-1" style="min-width:0">
          <div class="flex justify-between items-center mb-xs">
            <span class="text-sm font-bold truncate">${h.title}</span>
            <span class="text-sm" style="color:${rate >= 70 ? 'var(--accent-success)' : rate >= 40 ? 'var(--accent-warning)' : 'var(--accent-danger)'}">${rate}%</span>
          </div>
          <div class="progress-bar ${color}"><div class="progress-fill" style="width:${rate}%"></div></div>
        </div>
        <div class="text-right" style="min-width:60px">
          <div class="text-sm font-bold">${streak}🔥</div>
          <div class="text-xs text-tertiary">streak</div>
        </div>
      </div>`;
    }).join('');
  },
};

// ═══════════════════════════════════════════
// LIFEOS 2.0 — Command Palette
// ═══════════════════════════════════════════
App.setupCommandPalette = function() {
  const overlay = document.getElementById('commandPalette');
  const input = document.getElementById('commandInput');
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) this.closeCommandPalette();
  });
  
  // Handle input
  input.addEventListener('input', () => this.updateCommandResults(input.value));
  input.addEventListener('keydown', (e) => {
    const items = document.querySelectorAll('.command-item');
    const active = document.querySelector('.command-item.active');
    let idx = Array.from(items).indexOf(active);
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (active) active.classList.remove('active');
      idx = (idx + 1) % items.length;
      items[idx]?.classList.add('active');
      items[idx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (active) active.classList.remove('active');
      idx = idx <= 0 ? items.length - 1 : idx - 1;
      items[idx]?.classList.add('active');
      items[idx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active) active.click();
      else if (typeof Secretary !== 'undefined' && input.value.trim()) {
        // Process as secretary command
        const response = Secretary.chat(input.value.trim());
        this.closeCommandPalette();
        this.toggleChat();
        // Chat will show the response
      }
    }
  });
};

App.toggleCommandPalette = function() {
  const overlay = document.getElementById('commandPalette');
  if (overlay.classList.contains('active')) {
    this.closeCommandPalette();
  } else {
    overlay.classList.add('active');
    const input = document.getElementById('commandInput');
    input.value = '';
    input.focus();
    this.updateCommandResults('');
  }
};

App.closeCommandPalette = function() {
  document.getElementById('commandPalette').classList.remove('active');
};

App.updateCommandResults = function(query) {
  const container = document.getElementById('commandResults');
  const q = query.toLowerCase().trim();
  
  // Define all commands
  const commands = [
    // Navigation
    { group: 'Navigate', icon: '📊', title: 'Dashboard', desc: 'Go to dashboard', action: () => { this.navigate('dashboard'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '📅', title: 'Smart Calendar', desc: 'View calendar', action: () => { this.navigate('calendar'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '🤖', title: 'AI Planner', desc: 'AI schedule optimizer', action: () => { this.navigate('planner'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '✅', title: 'Tasks', desc: 'Manage tasks', action: () => { this.navigate('tasks'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '🎯', title: 'Goals', desc: 'Track goals', action: () => { this.navigate('goals'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '🔥', title: 'Habits', desc: 'Track habits', action: () => { this.navigate('habits'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '🧠', title: 'Deep Work', desc: 'Focus sessions', action: () => { this.navigate('focus'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '📈', title: 'Analytics', desc: 'Productivity analytics', action: () => { this.navigate('analytics'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '📱', title: 'Screen Time', desc: 'Digital productivity', action: () => { this.navigate('screentime'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '🕐', title: 'Timeline', desc: 'Life timeline', action: () => { this.navigate('timeline'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '🔗', title: 'Integrations', desc: 'Connect apps', action: () => { this.navigate('integrations'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '📚', title: 'Study & Test', desc: 'Flashcards and quizzes', action: () => { this.navigate('study'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '🍎', title: 'Food & Nutrition', desc: 'Track meals and calories', action: () => { this.navigate('food'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '💰', title: 'Finance', desc: 'Budget and expenses', action: () => { this.navigate('finance'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '🧘', title: 'Wellness', desc: 'Water, sleep, meditation, reads', action: () => { this.navigate('wellness'); this.closeCommandPalette(); } },
    { group: 'Navigate', icon: '🔒', title: 'Security', desc: 'PIN lock and secure notes', action: () => { this.navigate('security'); this.closeCommandPalette(); } },
    // Actions
    { group: 'Actions', icon: '📝', title: 'New Task', desc: 'Create a new task', shortcut: '', action: () => { this.openTaskModal(); this.closeCommandPalette(); } },
    { group: 'Actions', icon: '📅', title: 'New Event', desc: 'Create a new event', action: () => { this.openEventModal(); this.closeCommandPalette(); } },
    { group: 'Actions', icon: '🧠', title: 'Start Focus Session', desc: 'Begin a pomodoro timer', action: () => { this.navigate('focus'); this.closeCommandPalette(); } },
    { group: 'Actions', icon: '🤖', title: 'Open AI Chat', desc: 'Talk to your AI secretary', shortcut: '⌘⇧C', action: () => { this.toggleChat(); this.closeCommandPalette(); } },
    // AI
    { group: 'AI Secretary', icon: '💡', title: 'What should I do now?', desc: 'Get AI recommendation', action: () => { this.closeCommandPalette(); this.toggleChat(); if(typeof Secretary!=='undefined') Secretary.quickAction('suggest'); } },
    { group: 'AI Secretary', icon: '📋', title: 'Daily Briefing', desc: 'Get your morning briefing', action: () => { this.closeCommandPalette(); this.toggleChat(); if(typeof Secretary!=='undefined') Secretary.quickAction('briefing'); } },
    { group: 'AI Secretary', icon: '📊', title: 'Progress Report', desc: 'See your productivity report', action: () => { this.closeCommandPalette(); this.toggleChat(); if(typeof Secretary!=='undefined') Secretary.quickAction('report'); } },
  ];
  
  // Filter commands
  const filtered = q ? commands.filter(c => 
    c.title.toLowerCase().includes(q) || 
    c.desc.toLowerCase().includes(q) || 
    c.group.toLowerCase().includes(q)
  ) : commands;
  
  // Group commands
  const groups = {};
  filtered.forEach(c => {
    if (!groups[c.group]) groups[c.group] = [];
    groups[c.group].push(c);
  });
  
  // Render
  let html = '';
  let first = true;
  for (const [group, items] of Object.entries(groups)) {
    html += `<div class="command-group">
      <div class="command-group-title">${escHtml(group)}</div>
      ${items.map((item, i) => `
        <div class="command-item${first && i === 0 ? ' active' : ''}" onclick="App._cmdActions[${commands.indexOf(item)}]()" data-idx="${commands.indexOf(item)}">
          <div class="command-item-icon">${item.icon}</div>
          <div class="command-item-text">
            <div class="command-item-title">${escHtml(item.title)}</div>
            <div class="command-item-desc">${escHtml(item.desc)}</div>
          </div>
          ${item.shortcut ? `<span class="command-item-shortcut">${item.shortcut}</span>` : ''}
        </div>
      `).join('')}
    </div>`;
    first = false;
  }
  
  if (!filtered.length) {
    html = `<div style="padding:24px;text-align:center;color:var(--text-tertiary)">
      <div style="font-size:1.5rem;margin-bottom:8px">🔍</div>
      <div>No results for "${escHtml(q)}"</div>
      <div style="font-size:0.75rem;margin-top:4px">Try typing a command like "add task" or "schedule"</div>
    </div>`;
  }
  
  container.innerHTML = html;
  
  // Store action refs for click handlers
  App._cmdActions = commands.map(c => c.action);
};

// ═══════════════════════════════════════════
// LIFEOS 2.0 — Chat Sidebar
// ═══════════════════════════════════════════
App.toggleChat = function() {
  document.getElementById('chatSidebar').classList.toggle('open');
  document.getElementById('chatOverlay').classList.toggle('active');
  // Scroll to bottom on open
  setTimeout(() => {
    const msgs = document.getElementById('chatMessages');
    msgs.scrollTop = msgs.scrollHeight;
  }, 100);
};

App.initChat = function() {
  // Load greeting
  const messages = document.getElementById('chatMessages');
  if (typeof Secretary !== 'undefined') {
    const greeting = Secretary.getGreeting();
    this.addChatMessage('assistant', greeting);
  } else {
    this.addChatMessage('assistant', "👋 Hi! I'm your AI Secretary. I can help you manage your schedule, tasks, and goals. Try asking me anything!");
  }
};

App.sendChat = function(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  
  input.value = '';
  this.addChatMessage('user', msg);
  
  // Show typing indicator briefly
  const typing = document.createElement('div');
  typing.className = 'chat-typing-indicator';
  typing.innerHTML = '<span></span><span></span><span></span>';
  document.getElementById('chatMessages').appendChild(typing);
  document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
  
  setTimeout(() => {
    if (typeof Secretary !== 'undefined') {
      const result = Secretary.chat(msg);
      if (result && typeof result.then === 'function') {
        result.then(asyncResult => {
          typing.remove();
          const response = asyncResult.content || asyncResult.response || asyncResult;
          App.addChatMessage('assistant', response);
          if (asyncResult && asyncResult.success && App.navigate) {
            App.navigate(App.currentPage);
          }
        }).catch(err => {
          typing.remove();
          App.addChatMessage('assistant', "Sorry, I encountered an error communicating with my server.");
        });
      } else {
        typing.remove();
        const response = result.content || result.response || result;
        App.addChatMessage('assistant', response);
        if (result && result.success && App.navigate) {
          App.navigate(App.currentPage);
        }
      }
    } else {
      typing.remove();
      const response = "I understand you said: \"" + escHtml(msg) + "\". My AI engine is loading...";
      this.addChatMessage('assistant', response);
    }
  }, 400 + Math.random() * 600);
};

App.addChatMessage = function(role, content) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-message ${role}`;
  // Support basic markdown bold
  div.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  
  // Store in chat history
  LifeOS.ChatHistory.add({ role, content });
};

// ═══════════════════════════════════════════
// LIFEOS 2.0 — FAB (Floating Action Button)
// ═══════════════════════════════════════════
App.toggleFab = function() {
  const btn = document.getElementById('fabBtn');
  const menu = document.getElementById('fabMenu');
  btn.classList.toggle('open');
  menu.classList.toggle('open');
};

App.closeFab = function() {
  document.getElementById('fabBtn').classList.remove('open');
  document.getElementById('fabMenu').classList.remove('open');
};

App.openTaskModal = function() {
  document.getElementById('taskForm').reset();
  document.getElementById('taskId').value = '';
  document.getElementById('taskModalTitle').textContent = 'Add New Task';
  this.openModal('taskModal');
};

App.openEventModal = function() {
  document.getElementById('eventForm').reset();
  document.getElementById('eventId').value = '';
  document.getElementById('eventModalTitle').textContent = 'Add New Event';
  this.openModal('eventModal');
};

// ═══════════════════════════════════════════
// LIFEOS 2.0 — Confetti Effect
// ═══════════════════════════════════════════
App.confetti = function() {
  const container = document.getElementById('confettiContainer');
  const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#00b894', '#e17055', '#74b9ff', '#a29bfe'];
  
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 1 + 's';
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    piece.style.width = (6 + Math.random() * 8) + 'px';
    piece.style.height = piece.style.width;
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(piece);
  }
  
  setTimeout(() => { container.innerHTML = ''; }, 4000);
};

// ═══════════════════════════════════════════
// LIFEOS 2.0 — Context Menu
// ═══════════════════════════════════════════
const ContextMenu = {
  targetId: null,
  targetType: null,
  
  show(e, id, type) {
    e.preventDefault();
    e.stopPropagation();
    this.targetId = id;
    this.targetType = type;
    
    const menu = document.getElementById('contextMenu');
    menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
    menu.classList.add('visible');
  },
  
  edit() {
    if (this.targetType === 'task') {
      TasksPage.editTask(this.targetId);
    }
    document.getElementById('contextMenu').classList.remove('visible');
  },
  
  duplicate() {
    if (this.targetType === 'task') {
      const task = LifeOS.Tasks.getById(this.targetId);
      if (task) {
        const { id, createdAt, ...copy } = task;
        copy.title = 'Copy of ' + copy.title;
        copy.status = 'not_started';
        copy.progress = 0;
        LifeOS.Tasks.create(copy);
        App.toast('Task duplicated', 'success');
        TasksPage.render();
      }
    }
    document.getElementById('contextMenu').classList.remove('visible');
  },
  
  complete() {
    if (this.targetType === 'task') {
      LifeOS.Tasks.update(this.targetId, { status: 'completed', progress: 100, completedAt: new Date().toISOString() });
      App.toast('Task completed! 🎉', 'success');
      App.confetti();
      if (App.currentPage === 'tasks') TasksPage.render();
      else App.renderDashboard();
    }
    document.getElementById('contextMenu').classList.remove('visible');
  },
  
  delete() {
    if (this.targetType === 'task') {
      LifeOS.Tasks.delete(this.targetId);
      App.toast('Task deleted', 'info');
      if (App.currentPage === 'tasks') TasksPage.render();
      else App.renderDashboard();
    }
    document.getElementById('contextMenu').classList.remove('visible');
  },
};

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  App.init();

  // Theme toggle
  (function initTheme() {
    const saved = localStorage.getItem('lifeos_theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }
    
    const btn = document.getElementById('themeToggle');
    if (btn) {
      // Update icon based on current theme
      function updateIcon() {
        const current = document.documentElement.getAttribute('data-theme');
        const isDark = !current || current === 'dark';
        btn.querySelector('.theme-toggle-icon').textContent = isDark ? '🌙' : '☀️';
      }
      updateIcon();
      
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const isDark = !current || current === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('lifeos_theme', newTheme);
        updateIcon();
      });
    }
  })();

  // Offline indicator
  (function initOfflineIndicator() {
    function updateOnlineStatus() {
      let banner = document.getElementById('offline-banner');
      if (!navigator.onLine) {
        if (!banner) {
          banner = document.createElement('div');
          banner.id = 'offline-banner';
          banner.setAttribute('role', 'alert');
          banner.innerHTML = '📡 You\'re offline — changes will sync when you reconnect';
          banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#e17055,#d63031);color:white;text-align:center;padding:0.5rem 1rem;font-size:0.85rem;font-weight:500;z-index:100000;animation:fadeIn 0.3s ease;';
          document.body.prepend(banner);
        }
      } else {
        if (banner) {
          banner.remove();
        }
      }
    }
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  })();

  // ── Handle Stripe checkout redirects ──
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('upgraded') === 'true') {
    const user = LifeOS.User.get();
    user.isPremium = true;
    LifeOS.User.set(user);
    App.updatePremiumStatusUI();
    App.toast('👑 Welcome to LifeOS Premium! Your subscription is active.', 'success');
    window.history.replaceState({}, '', window.location.pathname);
  }
  if (urlParams.get('cancelled') === 'true') {
    App.toast('Checkout was cancelled. No charges were made.', 'info');
    window.history.replaceState({}, '', window.location.pathname);
  }
});

// ═══════════════════════════════════════════
// LIFEOS 2.0 — AI Companion Widget (Dashboard)
// ═══════════════════════════════════════════
App.handleCompanionInput = function(e) {
  e.preventDefault();
  const input = document.getElementById('companionInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  
  // Show inline response placeholder or container
  const widget = document.getElementById('aiCompanionWidget');
  let responseEl = widget.querySelector('.ai-companion-response');
  if (!responseEl) {
    responseEl = document.createElement('div');
    responseEl.className = 'ai-companion-response';
    widget.appendChild(responseEl);
  }
  
  // Process through Secretary
  if (typeof Secretary !== 'undefined') {
    const result = Secretary.chat(msg);
    if (result && typeof result.then === 'function') {
      responseEl.innerHTML = "Thinking...";
      result.then(asyncResult => {
        const response = asyncResult.content || asyncResult.response || asyncResult;
        responseEl.innerHTML = response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        this.updateTaskBadge();
        if (this.currentPage === 'dashboard') {
          this.renderDashboard();
        }
        App.toast('✨ Done!', 'success');
      }).catch(err => {
        responseEl.innerHTML = "Sorry, I encountered an error.";
        App.toast('❌ Error processing request', 'danger');
      });
    } else {
      const response = result.content || result.response || result;
      responseEl.innerHTML = response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      
      // Re-render dashboard to reflect any changes
      setTimeout(() => {
        this.updateTaskBadge();
        // Refresh stats if on dashboard
        if (this.currentPage === 'dashboard') {
          this.renderDashboard();
        }
      }, 300);
      App.toast('✨ Done!', 'success');
    }
  } else {
    const response = 'Processing: "' + escHtml(msg) + '"...';
    responseEl.innerHTML = response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    App.toast('✨ Done!', 'success');
  }
};

App.renderCompanion = function() {
  const suggestions = document.getElementById('aiCompanionSuggestions');
  if (!suggestions) return;
  
  // Smart contextual suggestions
  const chips = [];
  const hour = new Date().getHours();
  
  if (hour < 12) {
    chips.push({ text: '☀️ Morning briefing', action: 'Give me my morning briefing' });
  } else if (hour < 17) {
    chips.push({ text: '⏰ Take a break', action: 'Should I take a break?' });
  } else {
    chips.push({ text: '📊 Day summary', action: 'Summarize my day' });
  }
  
  chips.push(
    { text: '📝 Add a task', action: 'Add task ' },
    { text: '📅 Schedule event', action: 'Schedule ' },
    { text: '💡 What to do next?', action: 'What should I work on next?' },
    { text: '🧠 Start focus', action: 'Start focus session' },
    { text: '📚 Study cards', action: 'study' },
  );
  
  suggestions.innerHTML = chips.map(c => 
    `<span class="ai-suggestion-chip" onclick="document.getElementById('companionInput').value='${escHtml(c.action)}';document.getElementById('companionInput').focus()">${c.text}</span>`
  ).join('');
};

// Patch renderDashboard to also render companion
const _origRenderDashboard = App.renderDashboard;
App.renderDashboard = function() {
  _origRenderDashboard.call(this);
  this.renderCompanion();
  this.updatePremiumStatusUI();
};

App.openPaywall = function() {
  const user = LifeOS.User.get();
  const isPremium = !!user.isPremium;
  const checkoutSection = document.getElementById('paywallCheckoutSection');
  const manageSection = document.getElementById('premiumManageSection');
  if (isPremium) {
    if (checkoutSection) checkoutSection.style.display = 'none';
    if (manageSection) manageSection.style.display = 'block';
  } else {
    if (checkoutSection) checkoutSection.style.display = 'block';
    if (manageSection) manageSection.style.display = 'none';
  }
  this.openModal('paywallModal');
};

App.closePaywall = function() {
  this.closeModal('paywallModal');
};

App.handlePremiumCheckout = async function() {
  const btn = document.getElementById('btn-paywall-checkout');
  if (btn) btn.textContent = 'Processing...';
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    if (data.url) {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } else if (data.demo) {
      // Demo mode — Stripe not configured, simulate upgrade
      const user = LifeOS.User.get();
      user.isPremium = true;
      LifeOS.User.set(user);
      this.updatePremiumStatusUI();
      this.closePaywall();
      this.toast('👑 Premium activated (demo mode)!', 'success');
      if (this.currentPage === 'dashboard') {
        this.renderDashboard();
      }
    } else {
      throw new Error(data.error || 'Checkout failed');
    }
  } catch (err) {
    console.error('Checkout error:', err);
    this.toast('❌ Checkout failed. Please try again.', 'danger');
  } finally {
    if (btn) {
      btn.textContent = '🚀 Upgrade Now';
      btn.disabled = false;
    }
  }
};

// Wire up manage subscription button
document.getElementById('btn-manage-subscription')?.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else if (data.demo) {
      App.toast('Subscription management is available in production mode.', 'info');
    }
  } catch (err) {
    App.toast('❌ Could not open subscription manager.', 'danger');
  }
});

// Wire up close button in manage section
document.getElementById('btn-close-premium-manage')?.addEventListener('click', () => {
  App.closePaywall();
});

App.updatePremiumStatusUI = function() {
  const user = LifeOS.User.get();
  const isPremium = !!user.isPremium;
  
  const nameEl = document.getElementById('userName');
  if (nameEl) {
    const rawName = user.name || 'Alex Chen';
    if (isPremium) {
      nameEl.innerHTML = rawName.trim() + ' 👑';
      nameEl.style.color = '#ffd700';
    } else {
      nameEl.innerHTML = rawName;
      nameEl.style.color = '';
    }
  }
  
  const banner = document.getElementById('premiumBanner');
  if (banner) {
    const unexpanded = document.getElementById('premiumBannerUnexpanded');
    const active = document.getElementById('premiumBannerActive');
    if (isPremium) {
      if (unexpanded) unexpanded.style.display = 'none';
      if (active) active.style.display = 'flex';
      banner.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,140,0,0.1))';
    } else {
      if (unexpanded) unexpanded.style.display = 'flex';
      if (active) active.style.display = 'none';
      banner.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.05), rgba(255,140,0,0.05))';
    }
  }
};
