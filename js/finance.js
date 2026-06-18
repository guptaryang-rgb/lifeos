/* ═══════════════════════════════════════════════════════════════════════════
   LifeOS · Personal Finance & Budget Tracker
   ─────────────────────────────────────────────────────────────────────────
   Replaces Mint / YNAB. Transaction tracking, category budgets,
   spending analytics, monthly trends.
   localStorage keys: lifeos_transactions, lifeos_budgets, lifeos_finance_goals
   ═══════════════════════════════════════════════════════════════════════════ */

const Finance = (() => {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────────────────── */
  const STORAGE_TXN     = 'lifeos_transactions';
  const STORAGE_BUDGETS = 'lifeos_budgets';
  const STORAGE_FGOALS  = 'lifeos_finance_goals';
  const CSS_ID          = 'lifeos-finance-css';

  /* ── Categories ─────────────────────────────────────────────────────────── */
  const categories = [
    { id: 'food',          name: 'Food & Dining',    icon: '🍕', color: '#e17055' },
    { id: 'transport',     name: 'Transportation',   icon: '🚗', color: '#74b9ff' },
    { id: 'entertainment', name: 'Entertainment',    icon: '🎬', color: '#a29bfe' },
    { id: 'shopping',      name: 'Shopping',         icon: '🛍️', color: '#fd79a8' },
    { id: 'bills',         name: 'Bills & Utilities', icon: '💡', color: '#fdcb6e' },
    { id: 'education',     name: 'Education',        icon: '📚', color: '#6c5ce7' },
    { id: 'health',        name: 'Health',           icon: '💊', color: '#00b894' },
    { id: 'income',        name: 'Income',           icon: '💰', color: '#00cec9' },
    { id: 'savings',       name: 'Savings',          icon: '🏦', color: '#0984e3' },
    { id: 'subscriptions', name: 'Subscriptions',    icon: '📱', color: '#e84393' },
    { id: 'other',         name: 'Other',            icon: '📦', color: '#636e72' },
  ];

  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const dateStr = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  };

  const fmtCurrency = (n) => {
    const abs = Math.abs(n);
    const str = abs >= 1000 ? abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : abs.toFixed(2);
    return (n < 0 ? '-' : '') + '$' + str;
  };

  const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const esc = (s) => typeof escHtml === 'function' ? escHtml(s) : s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const nowYear  = () => new Date().getFullYear();
  const nowMonth = () => new Date().getMonth() + 1;

  /* ── Storage ────────────────────────────────────────────────────────────── */
  const loadTxn     = () => { try { return JSON.parse(localStorage.getItem(STORAGE_TXN)) || []; } catch { return []; } };
  const saveTxn     = (d) => localStorage.setItem(STORAGE_TXN, JSON.stringify(d));
  const loadBudgets = () => { try { return JSON.parse(localStorage.getItem(STORAGE_BUDGETS)) || null; } catch { return null; } };
  const saveBudgets = (b) => localStorage.setItem(STORAGE_BUDGETS, JSON.stringify(b));

  const DEFAULT_BUDGETS = {
    food: 400, transport: 150, entertainment: 100, shopping: 200,
    bills: 350, education: 100, health: 80, subscriptions: 60, other: 100,
  };

  /* ── Seed Data (≈2 months of student transactions) ──────────────────────── */
  function seedIfNeeded() {
    if (loadTxn().length > 0) return;

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    /* helper to make date within a month */
    const d = (monthOffset, day) => {
      const dt = new Date(y, m + monthOffset, day);
      return dateStr(dt);
    };

    const txns = [
      /* ──── CURRENT MONTH ──── */
      // Income
      { title: 'Part-time Tutoring',     amount: 650,   category: 'income',   type: 'income',  date: d(0, 1),  note: 'Math tutoring paycheck' },
      { title: 'Campus Library Job',     amount: 480,   category: 'income',   type: 'income',  date: d(0, 15), note: 'Bi-weekly pay' },
      { title: 'Freelance Web Dev',      amount: 300,   category: 'income',   type: 'income',  date: d(0, 10), note: 'Logo design for local shop' },

      // Rent & Bills
      { title: 'Rent',                   amount: 750,   category: 'bills',    type: 'expense', date: d(0, 1),  note: 'Shared apartment' },
      { title: 'Electricity Bill',       amount: 45,    category: 'bills',    type: 'expense', date: d(0, 5),  note: '' },
      { title: 'Internet',              amount: 35,    category: 'bills',    type: 'expense', date: d(0, 5),  note: 'Split with roommate' },
      { title: 'Phone Plan',            amount: 40,    category: 'bills',    type: 'expense', date: d(0, 3),  note: '' },

      // Food
      { title: 'Grocery Store',          amount: 68.50, category: 'food',     type: 'expense', date: d(0, 2),  note: 'Weekly groceries' },
      { title: 'Chipotle',              amount: 12.45, category: 'food',     type: 'expense', date: d(0, 3),  note: 'Lunch' },
      { title: 'Coffee - Starbucks',    amount: 5.75,  category: 'food',     type: 'expense', date: d(0, 4),  note: 'Latte' },
      { title: 'Pizza Hut',             amount: 18.99, category: 'food',     type: 'expense', date: d(0, 6),  note: 'Friday pizza night' },
      { title: 'Grocery Store',          amount: 52.30, category: 'food',     type: 'expense', date: d(0, 9),  note: 'Weekly groceries' },
      { title: 'Boba Tea',              amount: 6.50,  category: 'food',     type: 'expense', date: d(0, 10), note: '' },
      { title: 'Subway',                amount: 9.99,  category: 'food',     type: 'expense', date: d(0, 11), note: 'Footlong sub' },
      { title: 'Grocery Store',          amount: 45.20, category: 'food',     type: 'expense', date: d(0, 14), note: 'Weekly groceries' },
      { title: 'Thai Restaurant',        amount: 16.80, category: 'food',     type: 'expense', date: d(0, 13), note: 'Dinner with friends' },

      // Subscriptions
      { title: 'Spotify Premium',        amount: 5.99,  category: 'subscriptions', type: 'expense', date: d(0, 1), note: 'Student plan' },
      { title: 'Netflix',               amount: 15.49, category: 'subscriptions', type: 'expense', date: d(0, 7), note: '' },
      { title: 'iCloud Storage',         amount: 2.99,  category: 'subscriptions', type: 'expense', date: d(0, 7), note: '200GB plan' },
      { title: 'ChatGPT Plus',          amount: 20.00, category: 'subscriptions', type: 'expense', date: d(0, 8), note: '' },

      // Transport
      { title: 'Gas',                   amount: 42.00, category: 'transport', type: 'expense', date: d(0, 4),  note: '' },
      { title: 'Uber to Campus',        amount: 8.50,  category: 'transport', type: 'expense', date: d(0, 9),  note: 'Rainy day' },
      { title: 'Bus Pass',              amount: 25.00, category: 'transport', type: 'expense', date: d(0, 1),  note: 'Monthly pass' },

      // Entertainment
      { title: 'Movie Tickets',          amount: 14.00, category: 'entertainment', type: 'expense', date: d(0, 7),  note: 'New Marvel movie' },
      { title: 'Bowling Night',          amount: 12.00, category: 'entertainment', type: 'expense', date: d(0, 12), note: 'With friends' },
      { title: 'Video Game',            amount: 29.99, category: 'entertainment', type: 'expense', date: d(0, 8),  note: 'Steam sale' },

      // Shopping
      { title: 'Amazon - Phone Case',   amount: 15.99, category: 'shopping', type: 'expense', date: d(0, 6),  note: '' },
      { title: 'Uniqlo',                amount: 34.90, category: 'shopping', type: 'expense', date: d(0, 11), note: 'T-shirts' },

      // Education
      { title: 'Textbook',              amount: 45.00, category: 'education', type: 'expense', date: d(0, 2),  note: 'Data Structures book' },
      { title: 'Udemy Course',          amount: 12.99, category: 'education', type: 'expense', date: d(0, 9),  note: 'React masterclass' },

      // Health
      { title: 'Gym Membership',        amount: 25.00, category: 'health',   type: 'expense', date: d(0, 1),  note: 'Student rate' },
      { title: 'Vitamins',              amount: 14.50, category: 'health',   type: 'expense', date: d(0, 5),  note: '' },

      // Savings
      { title: 'Emergency Fund',        amount: 100,   category: 'savings',  type: 'expense', date: d(0, 15), note: 'Monthly contribution' },

      /* ──── PREVIOUS MONTH ──── */
      // Income
      { title: 'Part-time Tutoring',     amount: 600,   category: 'income',   type: 'income',  date: d(-1, 1),  note: '' },
      { title: 'Campus Library Job',     amount: 480,   category: 'income',   type: 'income',  date: d(-1, 15), note: '' },
      { title: 'Sold Textbooks',         amount: 85,    category: 'income',   type: 'income',  date: d(-1, 8),  note: 'Old semester books' },
      { title: 'Birthday Money',         amount: 200,   category: 'income',   type: 'income',  date: d(-1, 20), note: 'From grandparents' },

      // Rent & Bills
      { title: 'Rent',                   amount: 750,   category: 'bills',    type: 'expense', date: d(-1, 1),  note: '' },
      { title: 'Electricity Bill',       amount: 52,    category: 'bills',    type: 'expense', date: d(-1, 5),  note: '' },
      { title: 'Internet',              amount: 35,    category: 'bills',    type: 'expense', date: d(-1, 5),  note: '' },
      { title: 'Phone Plan',            amount: 40,    category: 'bills',    type: 'expense', date: d(-1, 3),  note: '' },
      { title: 'Water Bill',            amount: 22,    category: 'bills',    type: 'expense', date: d(-1, 10), note: '' },

      // Food
      { title: 'Grocery Store',          amount: 72.40, category: 'food',     type: 'expense', date: d(-1, 2),  note: '' },
      { title: 'Taco Bell',             amount: 8.99,  category: 'food',     type: 'expense', date: d(-1, 4),  note: '' },
      { title: 'Grocery Store',          amount: 61.10, category: 'food',     type: 'expense', date: d(-1, 9),  note: '' },
      { title: 'Panera Bread',          amount: 11.50, category: 'food',     type: 'expense', date: d(-1, 11), note: '' },
      { title: 'Coffee - Starbucks',    amount: 5.75,  category: 'food',     type: 'expense', date: d(-1, 13), note: '' },
      { title: 'Grocery Store',          amount: 58.90, category: 'food',     type: 'expense', date: d(-1, 16), note: '' },
      { title: 'Dominos',               amount: 22.99, category: 'food',     type: 'expense', date: d(-1, 18), note: 'Study session pizza' },
      { title: 'Sushi Restaurant',       amount: 28.00, category: 'food',     type: 'expense', date: d(-1, 22), note: 'Date night' },
      { title: 'Grocery Store',          amount: 49.80, category: 'food',     type: 'expense', date: d(-1, 23), note: '' },
      { title: 'McDonalds',             amount: 7.50,  category: 'food',     type: 'expense', date: d(-1, 25), note: '' },
      { title: 'Coffee - Local Cafe',   amount: 4.25,  category: 'food',     type: 'expense', date: d(-1, 27), note: '' },

      // Subscriptions
      { title: 'Spotify Premium',        amount: 5.99,  category: 'subscriptions', type: 'expense', date: d(-1, 1), note: '' },
      { title: 'Netflix',               amount: 15.49, category: 'subscriptions', type: 'expense', date: d(-1, 7), note: '' },
      { title: 'iCloud Storage',         amount: 2.99,  category: 'subscriptions', type: 'expense', date: d(-1, 7), note: '' },
      { title: 'ChatGPT Plus',          amount: 20.00, category: 'subscriptions', type: 'expense', date: d(-1, 8), note: '' },
      { title: 'Adobe CC',              amount: 22.99, category: 'subscriptions', type: 'expense', date: d(-1, 12), note: 'Student discount' },

      // Transport
      { title: 'Gas',                   amount: 38.00, category: 'transport', type: 'expense', date: d(-1, 3),  note: '' },
      { title: 'Gas',                   amount: 44.00, category: 'transport', type: 'expense', date: d(-1, 17), note: '' },
      { title: 'Bus Pass',              amount: 25.00, category: 'transport', type: 'expense', date: d(-1, 1),  note: '' },
      { title: 'Car Wash',              amount: 12.00, category: 'transport', type: 'expense', date: d(-1, 14), note: '' },

      // Entertainment
      { title: 'Concert Ticket',        amount: 55.00, category: 'entertainment', type: 'expense', date: d(-1, 15), note: 'Indie band' },
      { title: 'Escape Room',           amount: 20.00, category: 'entertainment', type: 'expense', date: d(-1, 21), note: 'Group outing' },
      { title: 'Board Game Cafe',       amount: 10.00, category: 'entertainment', type: 'expense', date: d(-1, 28), note: '' },

      // Shopping
      { title: 'Nike Running Shoes',    amount: 89.99, category: 'shopping', type: 'expense', date: d(-1, 6),  note: 'On sale' },
      { title: 'Desk Lamp',             amount: 24.99, category: 'shopping', type: 'expense', date: d(-1, 19), note: 'Amazon' },

      // Education
      { title: 'Lab Materials',          amount: 32.00, category: 'education', type: 'expense', date: d(-1, 3),  note: '' },
      { title: 'Printing at Library',   amount: 8.50,  category: 'education', type: 'expense', date: d(-1, 24), note: 'Term paper' },

      // Health
      { title: 'Gym Membership',        amount: 25.00, category: 'health',   type: 'expense', date: d(-1, 1),  note: '' },
      { title: 'Dentist Copay',         amount: 30.00, category: 'health',   type: 'expense', date: d(-1, 12), note: '' },
      { title: 'Protein Powder',        amount: 28.00, category: 'health',   type: 'expense', date: d(-1, 20), note: '' },

      // Savings
      { title: 'Emergency Fund',        amount: 100,   category: 'savings',  type: 'expense', date: d(-1, 15), note: '' },
      { title: 'Summer Trip Fund',      amount: 50,    category: 'savings',  type: 'expense', date: d(-1, 25), note: '' },

      // Other
      { title: 'Laundry',               amount: 8.00,  category: 'other',    type: 'expense', date: d(-1, 7),  note: '' },
      { title: 'Birthday Gift',         amount: 25.00, category: 'other',    type: 'expense', date: d(-1, 19), note: 'For roommate' },
    ];

    const entries = txns.map(t => ({
      id: uid(),
      title: t.title,
      amount: t.amount,
      category: t.category,
      type: t.type,
      date: t.date,
      note: t.note || '',
      timestamp: new Date(t.date + 'T12:00:00').toISOString(),
    }));

    saveTxn(entries);

    /* Also seed budgets */
    if (!loadBudgets()) saveBudgets({ ...DEFAULT_BUDGETS });
  }

  /* ── Transaction Methods ────────────────────────────────────────────────── */
  let _syncing = false;
  async function performSync(refreshCb) {
    if (_syncing) return;
    _syncing = true;
    let changed = false;
    try {
      const res = await fetch('/api/finance');
      if (res.ok) {
        const serverTxns = await res.json();
        if (Array.isArray(serverTxns)) {
          const local = loadTxn();
          const localCount = local.length;
          const localMap = new Map(local.map(item => [item.id, item]));
          serverTxns.forEach(item => {
            localMap.set(item.id, {
              id: item.id,
              title: item.title,
              amount: item.amount,
              category: item.category,
              type: item.type,
              date: item.date,
              note: item.note || '',
              timestamp: item.timestamp || new Date().toISOString()
            });
          });
          const merged = Array.from(localMap.values());
          if (merged.length !== localCount || serverTxns.length !== localCount) {
            saveTxn(merged);
            changed = true;
          }
          const serverIds = new Set(serverTxns.map(item => item.id));
          for (const item of local) {
            if (!serverIds.has(item.id)) {
              await fetch('/api/finance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Finance sync error:', e);
    }
    _syncing = false;
    if (changed && refreshCb) {
      refreshCb();
    }
  }

  const transactions = {
    add(txn) {
      const all = loadTxn();
      const rec = {
        id: uid(),
        title: txn.title || 'Untitled',
        amount: parseFloat(txn.amount) || 0,
        category: txn.category || 'other',
        type: txn.type || 'expense',
        date: txn.date || todayStr(),
        note: txn.note || '',
        timestamp: new Date().toISOString(),
      };
      all.push(rec);
      saveTxn(all);
      performSync();
      return rec;
    },
    remove(id) {
      const all = loadTxn().filter(t => t.id !== id);
      saveTxn(all);
      performSync();
    },
    getAll() { return loadTxn(); },
    getByMonth(year, month) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return loadTxn().filter(t => t.date.startsWith(prefix));
    },
    getByCategory(cat) {
      return loadTxn().filter(t => t.category === cat);
    },
  };

  /* ── Budgets ────────────────────────────────────────────────────────────── */
  const budgets = {
    set(category, amount) {
      const all = loadBudgets() || { ...DEFAULT_BUDGETS };
      all[category] = amount;
      saveBudgets(all);
    },
    get() { return loadBudgets() || { ...DEFAULT_BUDGETS }; },
    getRemaining(category) {
      const b = this.get();
      const budget = b[category] || 0;
      const txns = transactions.getByMonth(nowYear(), nowMonth());
      const spent = txns.filter(t => t.category === category && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { budget, spent, remaining: budget - spent };
    },
  };

  /* ── Analytics ──────────────────────────────────────────────────────────── */
  const analyticsModule = {
    getMonthSummary(year, month) {
      const yr = year || nowYear();
      const mo = month || nowMonth();
      const txns = transactions.getByMonth(yr, mo);
      let income = 0, expenses = 0;
      const byCategory = {};
      categories.forEach(c => { byCategory[c.id] = 0; });
      txns.forEach(t => {
        if (t.type === 'income') income += t.amount;
        else {
          expenses += t.amount;
          byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
        }
      });
      return { year: yr, month: mo, income, expenses, savings: income - expenses, byCategory, txnCount: txns.length };
    },

    getSpendingTrend(months) {
      const n = months || 6;
      const trend = [];
      const now = new Date();
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const s = this.getMonthSummary(d.getFullYear(), d.getMonth() + 1);
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        trend.push({ year: s.year, month: s.month, label, income: s.income, expenses: s.expenses, savings: s.savings });
      }
      return trend;
    },

    getCategoryBreakdown(year, month) {
      const s = this.getMonthSummary(year, month);
      return categories
        .filter(c => c.id !== 'income' && c.id !== 'savings')
        .map(c => ({
          ...c,
          amount: s.byCategory[c.id] || 0,
          pct: s.expenses > 0 ? Math.round((s.byCategory[c.id] || 0) / s.expenses * 100) : 0,
        }))
        .filter(c => c.amount > 0)
        .sort((a, b) => b.amount - a.amount);
    },

    getSavingsRate(year, month) {
      const s = this.getMonthSummary(year, month);
      return s.income > 0 ? Math.round((s.savings / s.income) * 100) : 0;
    },

    getTopExpenses(n, year, month) {
      const yr = year || nowYear();
      const mo = month || nowMonth();
      return transactions.getByMonth(yr, mo)
        .filter(t => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, n || 5);
    },

    getRecurringExpenses() {
      /* Detect recurring by matching titles across 2+ months */
      const all = loadTxn().filter(t => t.type === 'expense');
      const titleMap = {};
      all.forEach(t => {
        const key = t.title.toLowerCase();
        const mo = t.date.slice(0, 7);
        if (!titleMap[key]) titleMap[key] = { title: t.title, category: t.category, months: new Set(), amount: t.amount };
        titleMap[key].months.add(mo);
        titleMap[key].amount = t.amount; // latest amount
      });
      return Object.values(titleMap)
        .filter(r => r.months.size >= 2)
        .map(r => ({ title: r.title, category: r.category, amount: r.amount, monthCount: r.months.size }))
        .sort((a, b) => b.amount - a.amount);
    },
  };

  /* ── Quick Expense ──────────────────────────────────────────────────────── */
  function quickExpense(title, amount, category) {
    return transactions.add({ title, amount, category, type: 'expense' });
  }

  /* ── CSS Injection ──────────────────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = `
/* ── Finance Tracker Layout ───────────────────────────────────────────── */
.finance-tracker { max-width: 600px; margin: 0 auto; padding: 4px 0 80px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.finance-tracker * { box-sizing: border-box; }

/* ── Balance Card ─────────────────────────────────────────────────────── */
.fin-balance-card {
  background: linear-gradient(135deg, #0984e3 0%, #6c5ce7 100%);
  border-radius: 20px; padding: 24px; color: #fff; margin-bottom: 16px;
}
.fin-balance-label { font-size: 13px; opacity: .8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
.fin-balance-amount { font-size: 36px; font-weight: 800; margin-bottom: 16px; line-height: 1; }
.fin-balance-row { display: flex; gap: 16px; }
.fin-balance-stat { flex: 1; background: rgba(255,255,255,.15); border-radius: 12px; padding: 12px; text-align: center; }
.fin-balance-stat .stat-amount { font-size: 20px; font-weight: 700; }
.fin-balance-stat .stat-label { font-size: 11px; opacity: .8; margin-top: 2px; }
.fin-balance-stat.income .stat-amount { color: #55efc4; }
.fin-balance-stat.expense .stat-amount { color: #fab1a0; }
.fin-savings-rate { margin-top: 12px; display: flex; align-items: center; gap: 10px; }
.fin-savings-track { flex: 1; height: 8px; background: rgba(255,255,255,.2); border-radius: 4px; overflow: hidden; }
.fin-savings-fill { height: 100%; border-radius: 4px; background: #55efc4; transition: width .4s ease; }
.fin-savings-pct { font-size: 13px; font-weight: 700; }

/* ── Budget Progress ──────────────────────────────────────────────────── */
.fin-budget-section { background: #fff; border-radius: 16px; padding: 18px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.fin-budget-section h3 { font-size: 16px; font-weight: 700; margin: 0 0 14px; display: flex; align-items: center; justify-content: space-between; }
.fin-budget-edit { border: none; background: none; font-size: 14px; cursor: pointer; color: #0984e3; font-weight: 600; }
.fin-budget-item { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.fin-budget-item:last-child { margin-bottom: 0; }
.fin-budget-icon { font-size: 20px; flex-shrink: 0; width: 30px; text-align: center; }
.fin-budget-info { flex: 1; }
.fin-budget-name { font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; margin-bottom: 3px; }
.fin-budget-bar { height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
.fin-budget-fill { height: 100%; border-radius: 4px; transition: width .4s ease; }
.fin-budget-remaining { font-size: 11px; color: #888; margin-top: 2px; }
.fin-budget-remaining.over { color: #d63031; font-weight: 600; }

/* ── Add Transaction ──────────────────────────────────────────────────── */
.fin-add-btn {
  width: 100%; padding: 14px; border: none; border-radius: 14px; cursor: pointer;
  background: linear-gradient(135deg, #00b894, #00cec9);
  color: #fff; font-size: 16px; font-weight: 700; margin-bottom: 16px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 4px 14px rgba(0,206,201,.35); transition: transform .15s, box-shadow .15s;
}
.fin-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,206,201,.45); }
.fin-add-btn:active { transform: scale(.97); }

/* ── Transaction List ─────────────────────────────────────────────────── */
.fin-txn-section { background: #fff; border-radius: 16px; padding: 18px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.fin-txn-section h3 { font-size: 16px; font-weight: 700; margin: 0 0 14px; }
.fin-txn-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.fin-txn-item:last-child { border-bottom: none; }
.fin-txn-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.fin-txn-info { flex: 1; }
.fin-txn-title { font-size: 14px; font-weight: 600; }
.fin-txn-meta { font-size: 11px; color: #999; }
.fin-txn-amount { font-weight: 700; font-size: 15px; }
.fin-txn-amount.income { color: #00b894; }
.fin-txn-amount.expense { color: #d63031; }
.fin-txn-del { border: none; background: none; font-size: 16px; cursor: pointer; opacity: .35; padding: 4px; }
.fin-txn-del:hover { opacity: 1; }
.fin-txn-empty { font-size: 13px; color: #bbb; text-align: center; padding: 20px 0; }
.fin-show-all { text-align: center; margin-top: 10px; }
.fin-show-all button { border: none; background: none; color: #0984e3; font-size: 13px; font-weight: 600; cursor: pointer; }

/* ── Category Breakdown ───────────────────────────────────────────────── */
.fin-breakdown { background: #fff; border-radius: 16px; padding: 18px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.fin-breakdown h3 { font-size: 16px; font-weight: 700; margin: 0 0 14px; }
.fin-donut-wrap { display: flex; align-items: center; gap: 20px; margin-bottom: 10px; }
.fin-donut-svg { flex-shrink: 0; }
.fin-donut-legend { flex: 1; }
.fin-legend-item { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 13px; }
.fin-legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.fin-legend-name { flex: 1; }
.fin-legend-val { font-weight: 600; }

/* ── Monthly Trend ────────────────────────────────────────────────────── */
.fin-trend { background: #fff; border-radius: 16px; padding: 18px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.fin-trend h3 { font-size: 16px; font-weight: 700; margin: 0 0 14px; }
.fin-trend-chart { display: flex; align-items: flex-end; gap: 6px; height: 130px; }
.fin-trend-month { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.fin-trend-bars { flex: 1; display: flex; align-items: flex-end; gap: 3px; width: 100%; }
.fin-trend-bar { flex: 1; border-radius: 4px 4px 1px 1px; transition: height .4s ease; min-width: 8px; }
.fin-trend-bar.income-bar { background: #55efc4; }
.fin-trend-bar.expense-bar { background: #fab1a0; }
.fin-trend-label { font-size: 10px; color: #888; margin-top: 4px; font-weight: 600; }
.fin-trend-legend { display: flex; gap: 16px; justify-content: center; margin-top: 10px; }
.fin-trend-legend-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666; }
.fin-trend-legend-dot { width: 10px; height: 10px; border-radius: 3px; }

/* ── Recurring ────────────────────────────────────────────────────────── */
.fin-recurring { background: #fff; border-radius: 16px; padding: 18px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.fin-recurring h3 { font-size: 16px; font-weight: 700; margin: 0 0 14px; }
.fin-rec-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.fin-rec-item:last-child { border-bottom: none; }
.fin-rec-icon { font-size: 18px; }
.fin-rec-name { flex: 1; font-size: 14px; font-weight: 600; }
.fin-rec-amount { font-weight: 700; font-size: 14px; color: #d63031; }
.fin-rec-badge { font-size: 10px; background: #dfe6e9; color: #636e72; padding: 2px 8px; border-radius: 8px; font-weight: 600; }

/* ── Modal ─────────────────────────────────────────────────────────────── */
.fin-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 1000;
  display: flex; align-items: flex-end; justify-content: center;
  animation: fin-fade-in .2s ease;
}
@keyframes fin-fade-in { from { opacity: 0; } to { opacity: 1; } }
.fin-modal {
  background: #fff; border-radius: 20px 20px 0 0; width: 100%; max-width: 600px;
  max-height: 90vh; overflow-y: auto; padding: 20px 20px 30px;
  animation: fin-slide-up .3s ease;
}
@keyframes fin-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.fin-modal-handle { width: 40px; height: 4px; background: #ddd; border-radius: 2px; margin: 0 auto 16px; }
.fin-modal h3 { font-size: 18px; font-weight: 700; margin: 0 0 14px; text-align: center; }
.fin-form-group { margin-bottom: 12px; }
.fin-form-group label { display: block; font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; }
.fin-form-group input, .fin-form-group select, .fin-form-group textarea {
  width: 100%; padding: 10px 14px; border: 2px solid #e0e0e0; border-radius: 10px;
  font-size: 15px; outline: none; font-family: inherit; transition: border-color .2s;
}
.fin-form-group input:focus, .fin-form-group select:focus, .fin-form-group textarea:focus { border-color: #0984e3; }
.fin-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fin-type-toggle { display: flex; gap: 8px; margin-bottom: 12px; }
.fin-type-btn {
  flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 10px;
  background: #fff; font-size: 14px; font-weight: 600; cursor: pointer; text-align: center;
  transition: all .15s;
}
.fin-type-btn.active.expense { border-color: #d63031; background: #ffeaea; color: #d63031; }
.fin-type-btn.active.income { border-color: #00b894; background: #eafff5; color: #00b894; }
.fin-cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
.fin-cat-chip {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 4px; border: 2px solid #f0f0f0; border-radius: 10px;
  cursor: pointer; font-size: 10px; font-weight: 600; color: #666;
  transition: all .15s; text-align: center;
}
.fin-cat-chip .cat-icon { font-size: 22px; }
.fin-cat-chip.active { border-color: #0984e3; background: #ebf5ff; color: #0984e3; }
.fin-modal-submit {
  width: 100%; padding: 14px; border: none; border-radius: 12px; background: #0984e3;
  color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 4px;
}
.fin-modal-submit:hover { background: #0773c5; }

/* Budget edit */
.fin-budget-edit-grid { display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center; margin: 14px 0; }
.fin-budget-edit-grid label { font-size: 13px; font-weight: 600; }
.fin-budget-edit-grid input { padding: 8px 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; outline: none; }
.fin-budget-edit-grid input:focus { border-color: #0984e3; }
`;
    document.head.appendChild(style);
  }

  /* ── Modal Utilities ────────────────────────────────────────────────────── */
  let _activeModal = null;
  function openModal(html) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'fin-modal-overlay';
    overlay.innerHTML = `<div class="fin-modal"><div class="fin-modal-handle"></div>${html}</div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    _activeModal = overlay;
    return overlay;
  }
  function closeModal() {
    if (_activeModal) { _activeModal.remove(); _activeModal = null; }
  }

  /* ── Donut Chart SVG ────────────────────────────────────────────────────── */
  function donutSVG(slices, size) {
    const sz = size || 120;
    const cx = sz / 2, cy = sz / 2, r = sz * 0.38;
    const total = slices.reduce((s, sl) => s + sl.amount, 0);
    if (total === 0) {
      return `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f0f0f0" stroke-width="${sz*0.15}"/>
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#bbb">No data</text>
      </svg>`;
    }
    const c = 2 * Math.PI * r;
    let offset = 0;
    let paths = '';
    slices.forEach(sl => {
      const pct = sl.amount / total;
      const dash = c * pct;
      paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sl.color}"
        stroke-width="${sz * 0.15}" stroke-dasharray="${dash} ${c - dash}" stroke-dashoffset="${-offset}"
        style="transition:stroke-dasharray .4s, stroke-dashoffset .4s"/>`;
      offset += dash;
    });
    return `<svg class="fin-donut-svg" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" style="transform:rotate(-90deg);">${paths}</svg>`;
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  function render(container) {
    injectCSS();
    seedIfNeeded();

    const summary = analyticsModule.getMonthSummary();
    const savingsRate = analyticsModule.getSavingsRate();
    const breakdown = analyticsModule.getCategoryBreakdown();
    const trend = analyticsModule.getSpendingTrend(4);
    const recurring = analyticsModule.getRecurringExpenses();
    const budgetData = budgets.get();
    const recentTxns = transactions.getByMonth(nowYear(), nowMonth())
      .sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp));

    const refreshAll = () => render(container);
    performSync(refreshAll);

    const maxTrend = Math.max(...trend.map(d => Math.max(d.income, d.expenses)), 1);

    let html = `<div class="finance-tracker">`;

    /* ── Balance Card ──────────────────────────────── */
    html += `
      <div class="fin-balance-card">
        <div class="fin-balance-label">This Month's Balance</div>
        <div class="fin-balance-amount">${fmtCurrency(summary.savings)}</div>
        <div class="fin-balance-row">
          <div class="fin-balance-stat income">
            <div class="stat-amount">${fmtCurrency(summary.income)}</div>
            <div class="stat-label">Income</div>
          </div>
          <div class="fin-balance-stat expense">
            <div class="stat-amount">${fmtCurrency(summary.expenses)}</div>
            <div class="stat-label">Expenses</div>
          </div>
        </div>
        <div class="fin-savings-rate">
          <span style="font-size:12px;opacity:.8;">Savings Rate</span>
          <div class="fin-savings-track"><div class="fin-savings-fill" style="width:${Math.max(0, savingsRate)}%"></div></div>
          <span class="fin-savings-pct">${savingsRate}%</span>
        </div>
      </div>
    `;

    /* ── Add Transaction Button ──────────────────── */
    html += `<button class="fin-add-btn" id="fin-add-txn-btn">＋ Add Transaction</button>`;

    /* ── Budget Progress ──────────────────────────── */
    const expenseCats = categories.filter(c => c.id !== 'income' && c.id !== 'savings');
    html += `
      <div class="fin-budget-section">
        <h3>📊 Budget Progress <button class="fin-budget-edit" id="fin-edit-budgets">Edit</button></h3>
    `;
    expenseCats.forEach(cat => {
      const bgt = budgetData[cat.id] || 0;
      if (bgt <= 0) return;
      const spent = (summary.byCategory[cat.id] || 0);
      const pct = bgt > 0 ? Math.min((spent / bgt) * 100, 100) : 0;
      const isOver = spent > bgt;
      const color = isOver ? '#d63031' : cat.color;
      html += `
        <div class="fin-budget-item">
          <span class="fin-budget-icon">${cat.icon}</span>
          <div class="fin-budget-info">
            <div class="fin-budget-name"><span>${cat.name}</span><span>${fmtCurrency(spent)} / ${fmtCurrency(bgt)}</span></div>
            <div class="fin-budget-bar"><div class="fin-budget-fill" style="width:${pct}%;background:${color}"></div></div>
            <div class="fin-budget-remaining${isOver ? ' over' : ''}">${isOver ? fmtCurrency(spent - bgt) + ' over budget' : fmtCurrency(bgt - spent) + ' remaining'}</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;

    /* ── Category Breakdown Donut ─────────────────── */
    const donutSlices = breakdown.map(b => ({ amount: b.amount, color: b.color }));
    html += `
      <div class="fin-breakdown">
        <h3>🍩 Spending Breakdown</h3>
        <div class="fin-donut-wrap">
          ${donutSVG(donutSlices, 130)}
          <div class="fin-donut-legend">
    `;
    breakdown.slice(0, 6).forEach(b => {
      html += `
        <div class="fin-legend-item">
          <span class="fin-legend-dot" style="background:${b.color}"></span>
          <span class="fin-legend-name">${b.icon} ${b.name}</span>
          <span class="fin-legend-val">${fmtCurrency(b.amount)}</span>
        </div>
      `;
    });
    html += `</div></div></div>`;

    /* ── Recent Transactions ──────────────────────── */
    const showCount = 10;
    html += `
      <div class="fin-txn-section">
        <h3>📋 Recent Transactions</h3>
    `;
    if (recentTxns.length === 0) {
      html += `<div class="fin-txn-empty">No transactions yet</div>`;
    } else {
      const displayed = recentTxns.slice(0, showCount);
      displayed.forEach(t => {
        const cat = catMap[t.category] || catMap.other;
        html += `
          <div class="fin-txn-item">
            <div class="fin-txn-icon" style="background:${cat.color}20;">${cat.icon}</div>
            <div class="fin-txn-info">
              <div class="fin-txn-title">${esc(t.title)}</div>
              <div class="fin-txn-meta">${cat.name} · ${fmtDate(t.date)}</div>
            </div>
            <span class="fin-txn-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${fmtCurrency(t.amount)}</span>
            <button class="fin-txn-del" data-id="${t.id}" title="Delete">✕</button>
          </div>
        `;
      });
      if (recentTxns.length > showCount) {
        html += `<div class="fin-show-all"><button id="fin-show-all-btn">Show all ${recentTxns.length} transactions</button></div>`;
      }
    }
    html += `</div>`;

    /* ── Monthly Trend ────────────────────────────── */
    html += `
      <div class="fin-trend">
        <h3>📈 Monthly Trend</h3>
        <div class="fin-trend-chart">
    `;
    trend.forEach(t => {
      const incPct = maxTrend > 0 ? (t.income / maxTrend * 100) : 0;
      const expPct = maxTrend > 0 ? (t.expenses / maxTrend * 100) : 0;
      html += `
        <div class="fin-trend-month">
          <div class="fin-trend-bars">
            <div class="fin-trend-bar income-bar" style="height:${Math.max(incPct, 3)}%" title="Income: ${fmtCurrency(t.income)}"></div>
            <div class="fin-trend-bar expense-bar" style="height:${Math.max(expPct, 3)}%" title="Expenses: ${fmtCurrency(t.expenses)}"></div>
          </div>
          <div class="fin-trend-label">${t.label}</div>
        </div>
      `;
    });
    html += `
        </div>
        <div class="fin-trend-legend">
          <div class="fin-trend-legend-item"><span class="fin-trend-legend-dot" style="background:#55efc4"></span> Income</div>
          <div class="fin-trend-legend-item"><span class="fin-trend-legend-dot" style="background:#fab1a0"></span> Expenses</div>
        </div>
      </div>
    `;

    /* ── Recurring Expenses ───────────────────────── */
    if (recurring.length > 0) {
      html += `
        <div class="fin-recurring">
          <h3>🔁 Recurring Expenses</h3>
      `;
      recurring.forEach(r => {
        const cat = catMap[r.category] || catMap.other;
        html += `
          <div class="fin-rec-item">
            <span class="fin-rec-icon">${cat.icon}</span>
            <span class="fin-rec-name">${esc(r.title)}</span>
            <span class="fin-rec-badge">${r.monthCount} mo</span>
            <span class="fin-rec-amount">${fmtCurrency(r.amount)}/mo</span>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `</div>`; // .finance-tracker
    container.innerHTML = html;

    /* ── Event Binding ──────────────────────────────── */

    /* Add transaction */
    container.querySelector('#fin-add-txn-btn').addEventListener('click', () => showAddTxnModal(refreshAll));

    /* Delete transactions */
    container.querySelectorAll('.fin-txn-del').forEach(btn => {
      btn.addEventListener('click', () => {
        transactions.remove(btn.dataset.id);
        refreshAll();
      });
    });

    /* Show all */
    const showAllBtn = container.querySelector('#fin-show-all-btn');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        showAllBtn.closest('.fin-show-all').remove();
        const section = container.querySelector('.fin-txn-section');
        /* Re-render all */
        const remaining = recentTxns.slice(showCount);
        remaining.forEach(t => {
          const cat = catMap[t.category] || catMap.other;
          const itemEl = document.createElement('div');
          itemEl.className = 'fin-txn-item';
          itemEl.innerHTML = `
            <div class="fin-txn-icon" style="background:${cat.color}20;">${cat.icon}</div>
            <div class="fin-txn-info">
              <div class="fin-txn-title">${esc(t.title)}</div>
              <div class="fin-txn-meta">${cat.name} · ${fmtDate(t.date)}</div>
            </div>
            <span class="fin-txn-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${fmtCurrency(t.amount)}</span>
            <button class="fin-txn-del" data-id="${t.id}" title="Delete">✕</button>
          `;
          itemEl.querySelector('.fin-txn-del').addEventListener('click', () => { transactions.remove(t.id); refreshAll(); });
          section.appendChild(itemEl);
        });
      });
    }

    /* Edit budgets */
    container.querySelector('#fin-edit-budgets').addEventListener('click', () => showBudgetEditor(refreshAll));
  }

  /* ── Add Transaction Modal ──────────────────────────────────────────────── */
  function showAddTxnModal(refreshCb) {
    let selectedType = 'expense';
    let selectedCat = 'food';

    const visibleCats = (type) => type === 'income' ? categories.filter(c => c.id === 'income') : categories.filter(c => c.id !== 'income');

    const renderForm = () => {
      const cats = visibleCats(selectedType);
      const formHtml = `
        <h3>💸 Add Transaction</h3>
        <div class="fin-type-toggle">
          <button class="fin-type-btn expense${selectedType === 'expense' ? ' active' : ''}" data-type="expense">💸 Expense</button>
          <button class="fin-type-btn income${selectedType === 'income' ? ' active' : ''}" data-type="income">💰 Income</button>
        </div>
        <div class="fin-form-group">
          <label>Title</label>
          <input type="text" id="fin-txn-title" placeholder="e.g. Grocery Store" />
        </div>
        <div class="fin-form-row">
          <div class="fin-form-group">
            <label>Amount ($)</label>
            <input type="number" id="fin-txn-amount" placeholder="0.00" step="0.01" min="0" />
          </div>
          <div class="fin-form-group">
            <label>Date</label>
            <input type="date" id="fin-txn-date" value="${todayStr()}" />
          </div>
        </div>
        <label style="display:block;font-size:12px;font-weight:600;color:#666;margin-bottom:6px;">Category</label>
        <div class="fin-cat-grid">
          ${cats.map(c => `
            <div class="fin-cat-chip${c.id === selectedCat ? ' active' : ''}" data-cat="${c.id}">
              <span class="cat-icon">${c.icon}</span>
              ${c.name.split(' ')[0]}
            </div>
          `).join('')}
        </div>
        <div class="fin-form-group">
          <label>Note (optional)</label>
          <input type="text" id="fin-txn-note" placeholder="Add a note..." />
        </div>
        <button class="fin-modal-submit" id="fin-txn-submit">Add ${selectedType === 'income' ? 'Income' : 'Expense'}</button>
      `;
      return formHtml;
    };

    const overlay = openModal(renderForm());

    const bindEvents = () => {
      /* Type toggle */
      overlay.querySelectorAll('.fin-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedType = btn.dataset.type;
          if (selectedType === 'income') selectedCat = 'income';
          else if (selectedCat === 'income') selectedCat = 'food';
          overlay.querySelector('.fin-modal').innerHTML = `<div class="fin-modal-handle"></div>` + renderForm();
          bindEvents();
        });
      });
      /* Category select */
      overlay.querySelectorAll('.fin-cat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          overlay.querySelectorAll('.fin-cat-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          selectedCat = chip.dataset.cat;
        });
      });
      /* Submit */
      overlay.querySelector('#fin-txn-submit').addEventListener('click', () => {
        const title = overlay.querySelector('#fin-txn-title').value.trim();
        const amount = parseFloat(overlay.querySelector('#fin-txn-amount').value);
        const date = overlay.querySelector('#fin-txn-date').value;
        const note = overlay.querySelector('#fin-txn-note').value.trim();
        if (!title || !amount || amount <= 0) {
          overlay.querySelector('#fin-txn-title').style.borderColor = !title ? '#d63031' : '';
          overlay.querySelector('#fin-txn-amount').style.borderColor = (!amount || amount <= 0) ? '#d63031' : '';
          return;
        }
        transactions.add({ title, amount, category: selectedCat, type: selectedType, date, note });
        closeModal();
        if (typeof App !== 'undefined' && App.toast) App.toast(`${selectedType === 'income' ? '💰' : '💸'} ${title} added!`);
        if (refreshCb) refreshCb();
      });
    };
    bindEvents();
  }

  /* ── Budget Editor Modal ────────────────────────────────────────────────── */
  function showBudgetEditor(refreshCb) {
    const b = budgets.get();
    const expCats = categories.filter(c => c.id !== 'income' && c.id !== 'savings');
    let formHtml = `<h3>📊 Edit Monthly Budgets</h3><div class="fin-budget-edit-grid">`;
    expCats.forEach(c => {
      formHtml += `
        <label>${c.icon} ${c.name}</label>
        <input type="number" data-cat="${c.id}" value="${b[c.id] || 0}" min="0" step="10" />
      `;
    });
    formHtml += `</div><button class="fin-modal-submit" id="fin-budget-save">Save Budgets</button>`;
    const overlay = openModal(formHtml);
    overlay.querySelector('#fin-budget-save').addEventListener('click', () => {
      overlay.querySelectorAll('.fin-budget-edit-grid input').forEach(inp => {
        budgets.set(inp.dataset.cat, parseInt(inp.value) || 0);
      });
      closeModal();
      if (refreshCb) refreshCb();
    });
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  return {
    categories,
    transactions,
    budgets,
    analytics: analyticsModule,
    quickExpense,
    render,
    seedIfNeeded,
  };
})();
