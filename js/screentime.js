/* =========================================================================
 *  LifeOS — Screen Time Tracker
 *  Monitors productivity by categorising browsing activity, computing
 *  scores, and surfacing daily / weekly reports.
 *
 *  Persistence : localStorage  'lifeos_screentime'        (entries)
 *                               'lifeos_screentime_limits'  (limits)
 *
 *  Because a single web-page cannot observe other tabs' URLs, this module
 *  ships with 14 days of realistic *simulated* data and tracks the current
 *  LifeOS session in real-time as a "focus" entry.
 * ========================================================================= */

const ScreenTime = (() => {
  'use strict';

  /* -----------------------------------------------------------------------
   *  Constants
   * ----------------------------------------------------------------------- */
  const STORAGE_KEY        = 'lifeos_screentime';
  const LIMITS_STORAGE_KEY = 'lifeos_screentime_limits';
  const MS_PER_MINUTE      = 60_000;

  /* -----------------------------------------------------------------------
   *  Category definitions
   * ----------------------------------------------------------------------- */
  const categories = {
    productive: {
      sites: [
        'github.com', 'stackoverflow.com', 'docs.google.com',
        'notion.so', 'coursera.org', 'leetcode.com',
        'canvas.instructure.com'
      ],
      color: '#00b894',
      label: 'Productive'
    },
    neutral: {
      sites: [
        'google.com', 'gmail.com', 'drive.google.com', 'outlook.com'
      ],
      color: '#fdcb6e',
      label: 'Neutral'
    },
    distracting: {
      sites: [
        'youtube.com', 'reddit.com', 'twitter.com', 'instagram.com',
        'tiktok.com', 'netflix.com', 'twitch.tv'
      ],
      color: '#e17055',
      label: 'Distracting'
    },
    focus: {
      sites: [],
      color: '#6c5ce7',
      label: 'Focus (LifeOS)'
    }
  };

  /* -----------------------------------------------------------------------
   *  Internal state
   * ----------------------------------------------------------------------- */
  let _entries        = [];
  let _limits         = {};
  let _isTracking     = false;
  let _currentSession = null;
  let _intervalId     = null;
  let _visChangeHandler = null;

  /* -----------------------------------------------------------------------
   *  Helpers
   * ----------------------------------------------------------------------- */
  const _today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const _dateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const _dayOfWeek = (dateStr) => new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun

  const _isWeekend = (dateStr) => {
    const dow = _dayOfWeek(dateStr);
    return dow === 0 || dow === 6;
  };

  const _randomInt   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const _randomFloat = (min, max) => Math.random() * (max - min) + min;
  const _pick        = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const _uuid = () =>
    'st_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

  /* -----------------------------------------------------------------------
   *  Persistence
   * ----------------------------------------------------------------------- */
  const _save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_entries)); } catch (_) { /* quota */ }
  };

  const _saveLimits = () => {
    try { localStorage.setItem(LIMITS_STORAGE_KEY, JSON.stringify(_limits)); } catch (_) { /* quota */ }
  };

  const _load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) _entries = JSON.parse(raw);
    } catch (_) { _entries = []; }

    try {
      const raw = localStorage.getItem(LIMITS_STORAGE_KEY);
      if (raw) _limits = JSON.parse(raw);
    } catch (_) { _limits = {}; }
  };

  /* -----------------------------------------------------------------------
   *  Seed / simulation helpers
   * ----------------------------------------------------------------------- */

  /** Weighted-random site picker that returns { url, title } */
  const _sitePool = {
    productive: [
      { url: 'https://github.com/pulls',                  title: 'Pull Requests · GitHub' },
      { url: 'https://github.com/user/lifeos',            title: 'lifeos · GitHub' },
      { url: 'https://stackoverflow.com/questions',       title: 'Questions · Stack Overflow' },
      { url: 'https://docs.google.com/document/d/abc',    title: 'Project Spec — Google Docs' },
      { url: 'https://notion.so/workspace/notes',         title: 'Study Notes — Notion' },
      { url: 'https://coursera.org/learn/ml',             title: 'Machine Learning — Coursera' },
      { url: 'https://leetcode.com/problems',             title: 'Problems — LeetCode' },
      { url: 'https://canvas.instructure.com/courses/101', title: 'CS 301 — Canvas' },
      { url: 'https://github.com/explore',                title: 'Explore · GitHub' },
      { url: 'https://docs.google.com/spreadsheets/d/x',  title: 'Budget Sheet — Google Sheets' }
    ],
    neutral: [
      { url: 'https://google.com/search?q=js+date',  title: 'js date — Google Search' },
      { url: 'https://gmail.com/inbox',               title: 'Inbox — Gmail' },
      { url: 'https://drive.google.com/drive/my-drive', title: 'My Drive — Google Drive' },
      { url: 'https://outlook.com/mail',              title: 'Mail — Outlook' },
      { url: 'https://google.com/search?q=weather',   title: 'weather — Google Search' },
      { url: 'https://gmail.com/inbox',               title: 'Inbox (3 unread) — Gmail' }
    ],
    distracting: [
      { url: 'https://youtube.com/watch?v=abc',       title: 'Lofi Hip Hop — YouTube' },
      { url: 'https://reddit.com/r/programming',      title: 'r/programming — Reddit' },
      { url: 'https://twitter.com/home',              title: 'Home / X' },
      { url: 'https://instagram.com',                 title: 'Instagram' },
      { url: 'https://tiktok.com/foryou',             title: 'For You — TikTok' },
      { url: 'https://netflix.com/browse',            title: 'Home — Netflix' },
      { url: 'https://twitch.tv/directory',           title: 'Browse — Twitch' },
      { url: 'https://youtube.com/feed/subscriptions', title: 'Subscriptions — YouTube' },
      { url: 'https://reddit.com/r/webdev',           title: 'r/webdev — Reddit' }
    ]
  };

  /**
   * Generate entries for one simulated day.
   * @param {string} dateStr  YYYY-MM-DD
   * @param {boolean} weekend
   * @returns {object[]}
   */
  const _generateDay = (dateStr, weekend) => {
    const entries = [];

    /* Decide total minutes per category */
    const productive  = weekend ? _randomInt(60, 120)  : _randomInt(180, 240);
    const neutral     = weekend ? _randomInt(60, 120)  : _randomInt(60, 120);
    const distracting = weekend ? _randomInt(120, 180) : _randomInt(60, 120);
    const focus       = weekend ? _randomInt(0, 30)    : _randomInt(30, 90);

    const buckets = { productive, neutral, distracting, focus };

    /* Active hours: ~8 AM to ~11 PM */
    const startHour = weekend ? _randomInt(9, 11) : _randomInt(7, 9);
    const endHour   = weekend ? _randomInt(22, 23) : _randomInt(21, 23);

    Object.keys(buckets).forEach((cat) => {
      let remaining = buckets[cat];
      if (remaining <= 0) return;

      while (remaining > 0) {
        /* Session length 3–45 min */
        const duration = Math.min(remaining, _randomInt(3, 45));
        remaining -= duration;

        const hour   = _randomInt(startHour, endHour);
        const minute = _randomInt(0, 59);
        const ts     = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).toISOString();

        let url, title;
        if (cat === 'focus') {
          url   = window.location ? window.location.href : 'https://lifeos.app';
          title = 'LifeOS — Focus Session';
        } else {
          const site = _pick(_sitePool[cat]);
          url   = site.url;
          title = site.title;
        }

        entries.push({
          id: _uuid(),
          date: dateStr,
          timestamp: ts,
          category: cat,
          duration,          // minutes
          url,
          title,
          hour
        });
      }
    });

    return entries;
  };

  /**
   * Generate today's data with hourly entries up to the current hour.
   */
  const _generateToday = () => {
    const dateStr   = _today();
    const now       = new Date();
    const curHour   = now.getHours();
    const entries   = [];

    if (curHour < 7) return entries; // too early, no data yet

    const startHour = _dayOfWeek(dateStr) === 0 || _dayOfWeek(dateStr) === 6
      ? Math.min(9, curHour)
      : Math.min(7, curHour);

    for (let h = startHour; h <= curHour; h++) {
      /* 1-3 entries per hour */
      const count = _randomInt(1, 3);
      for (let i = 0; i < count; i++) {
        const cat = (() => {
          if (h >= 9 && h <= 12) return _pick(['productive', 'productive', 'productive', 'neutral']);
          if (h >= 13 && h <= 14) return _pick(['neutral', 'neutral', 'distracting']);
          if (h >= 15 && h <= 18) return _pick(['productive', 'productive', 'focus', 'neutral']);
          if (h >= 19) return _pick(['distracting', 'distracting', 'neutral', 'productive']);
          return _pick(['neutral', 'productive']);
        })();

        const duration = _randomInt(5, 25);
        const minute   = _randomInt(0, 55);
        const ts       = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, minute).toISOString();

        let url, title;
        if (cat === 'focus') {
          url   = typeof window !== 'undefined' && window.location ? window.location.href : 'https://lifeos.app';
          title = 'LifeOS — Focus Session';
        } else {
          const site = _pick(_sitePool[cat]);
          url   = site.url;
          title = site.title;
        }

        entries.push({
          id: _uuid(),
          date: dateStr,
          timestamp: ts,
          category: cat,
          duration,
          url,
          title,
          hour: h
        });
      }
    }
    return entries;
  };

  /**
   * Seed 14 days of historical data (only if storage is empty).
   */
  const _seed = () => {
    if (_entries.length > 0) return;

    const now = new Date();
    for (let d = 13; d >= 1; d--) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - d);
      const ds = _dateStr(dt);
      _entries.push(..._generateDay(ds, _isWeekend(ds)));
    }

    /* Today's partial data */
    _entries.push(..._generateToday());
    _save();
  };

  /* -----------------------------------------------------------------------
   *  Core tracking (Page Visibility API + interval)
   * ----------------------------------------------------------------------- */

  const startTracking = () => {
    if (_isTracking) return;
    _isTracking = true;

    /* Start a LifeOS focus session */
    _currentSession = {
      id: _uuid(),
      start: Date.now(),
      category: 'focus',
      url: typeof window !== 'undefined' && window.location ? window.location.href : 'https://lifeos.app',
      title: 'LifeOS — Active Session'
    };

    /* Periodic log every 60 s */
    _intervalId = setInterval(() => {
      if (!_currentSession) return;
      if (document.visibilityState === 'visible') {
        _flushCurrentMinute();
      }
    }, MS_PER_MINUTE);

    /* Visibility change — pause / resume */
    _visChangeHandler = () => {
      if (document.visibilityState === 'hidden' && _currentSession) {
        _flushCurrentMinute();
      }
    };
    document.addEventListener('visibilitychange', _visChangeHandler);
  };

  const _flushCurrentMinute = () => {
    if (!_currentSession) return;
    const elapsed = Math.round((Date.now() - _currentSession.start) / MS_PER_MINUTE);
    if (elapsed < 1) return;

    logActivity('focus', elapsed, _currentSession.url, _currentSession.title);
    _currentSession.start = Date.now(); // reset
  };

  const stopTracking = () => {
    if (!_isTracking) return;
    _isTracking = false;

    if (_currentSession) _flushCurrentMinute();
    _currentSession = null;

    if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
    if (_visChangeHandler) {
      document.removeEventListener('visibilitychange', _visChangeHandler);
      _visChangeHandler = null;
    }
  };

  /* -----------------------------------------------------------------------
   *  Logging
   * ----------------------------------------------------------------------- */

  const logActivity = (category, duration, url, title) => {
    if (!category || duration <= 0) return null;

    const now = new Date();
    const entry = {
      id: _uuid(),
      date: _dateStr(now),
      timestamp: now.toISOString(),
      category,
      duration: Math.round(duration),
      url: url || '',
      title: title || url || '',
      hour: now.getHours()
    };
    _entries.push(entry);
    _save();
    return entry;
  };

  /* -----------------------------------------------------------------------
   *  Data queries
   * ----------------------------------------------------------------------- */

  const getToday = () => {
    const td = _today();
    return _entries.filter((e) => e.date === td);
  };

  const getThisWeek = () => {
    const now  = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    const cutoff = _dateStr(startOfWeek);
    return _entries.filter((e) => e.date >= cutoff);
  };

  const getTotalToday = () =>
    getToday().reduce((s, e) => s + e.duration, 0);

  const getByCategory = (category) =>
    _entries.filter((e) => e.category === category);

  /* -----------------------------------------------------------------------
   *  Classification
   * ----------------------------------------------------------------------- */

  const classifySite = (url) => {
    if (!url) return 'neutral';
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      for (const [cat, cfg] of Object.entries(categories)) {
        if (cfg.sites.some((s) => hostname === s || hostname.endsWith('.' + s))) {
          return cat;
        }
      }
    } catch (_) { /* invalid URL */ }
    return 'neutral';
  };

  /* -----------------------------------------------------------------------
   *  Analytics
   * ----------------------------------------------------------------------- */

  /**
   * Productivity score 0-100.
   * Formula: (productive*1.0 + focus*1.2 + neutral*0.3 – distracting*0.8) / totalMinutes * 100
   * Clamped to [0, 100].
   */
  const getProductivityScore = () => {
    const today = getToday();
    if (today.length === 0) return 50; // neutral default

    const mins = { productive: 0, neutral: 0, distracting: 0, focus: 0 };
    today.forEach((e) => { mins[e.category] = (mins[e.category] || 0) + e.duration; });

    const total = Object.values(mins).reduce((a, b) => a + b, 0);
    if (total === 0) return 50;

    const weighted = (mins.productive * 1.0) + (mins.focus * 1.2)
                   + (mins.neutral * 0.3)  - (mins.distracting * 0.8);
    const raw = (weighted / total) * 100;
    return Math.round(Math.max(0, Math.min(100, raw)));
  };

  /** Hourly breakdown for today (0-23). */
  const getDailyBreakdown = () => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      productive: 0,
      neutral: 0,
      distracting: 0,
      focus: 0,
      total: 0
    }));

    getToday().forEach((e) => {
      const h = e.hour;
      if (h >= 0 && h < 24) {
        hours[h][e.category] = (hours[h][e.category] || 0) + e.duration;
        hours[h].total += e.duration;
      }
    });

    return hours;
  };

  /** 7-day trend: array of { date, total, productive, neutral, distracting, focus, score }. */
  const getWeeklyTrend = () => {
    const days = [];
    const now  = new Date();

    for (let d = 6; d >= 0; d--) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - d);
      const ds = _dateStr(dt);

      const dayEntries = _entries.filter((e) => e.date === ds);
      const mins = { productive: 0, neutral: 0, distracting: 0, focus: 0 };
      dayEntries.forEach((e) => { mins[e.category] = (mins[e.category] || 0) + e.duration; });
      const total = Object.values(mins).reduce((a, b) => a + b, 0);

      /* Per-day score */
      let score = 50;
      if (total > 0) {
        const weighted = (mins.productive * 1.0) + (mins.focus * 1.2)
                       + (mins.neutral * 0.3)  - (mins.distracting * 0.8);
        score = Math.round(Math.max(0, Math.min(100, (weighted / total) * 100)));
      }

      days.push({ date: ds, total, ...mins, score });
    }
    return days;
  };

  /** Time per category (today). */
  const getCategoryBreakdown = () => {
    const mins = { productive: 0, neutral: 0, distracting: 0, focus: 0 };
    getToday().forEach((e) => { mins[e.category] = (mins[e.category] || 0) + e.duration; });

    return Object.entries(mins).map(([cat, duration]) => ({
      category: cat,
      label: categories[cat]?.label || cat,
      duration,
      color: categories[cat]?.color || '#636e72',
      percent: 0 // filled below
    })).map((item, _i, arr) => {
      const total = arr.reduce((s, a) => s + a.duration, 0);
      item.percent = total > 0 ? Math.round((item.duration / total) * 100) : 0;
      return item;
    });
  };

  /** Top sites by total time (today). */
  const getTopSites = (limit = 10) => {
    const map = {};
    getToday().forEach((e) => {
      const key = e.url || 'unknown';
      if (!map[key]) map[key] = { url: e.url, title: e.title, category: e.category, duration: 0, visits: 0 };
      map[key].duration += e.duration;
      map[key].visits += 1;
    });

    return Object.values(map)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  };

  /* -----------------------------------------------------------------------
   *  Limits & alerts
   * ----------------------------------------------------------------------- */

  const setLimit = (category, minutes) => {
    if (!categories[category]) return;
    _limits[category] = Math.max(0, Math.round(minutes));
    _saveLimits();
  };

  const getLimits = () => ({ ..._limits });

  const checkLimits = () => {
    const warnings = [];
    const todayMins = {};
    getToday().forEach((e) => { todayMins[e.category] = (todayMins[e.category] || 0) + e.duration; });

    Object.entries(_limits).forEach(([cat, limit]) => {
      const used = todayMins[cat] || 0;
      if (used >= limit) {
        warnings.push({
          category: cat,
          label: categories[cat]?.label || cat,
          limit,
          used,
          exceeded: true,
          message: `⚠️ You've exceeded your ${categories[cat]?.label || cat} limit (${used}/${limit} min)`
        });
      } else if (used >= limit * 0.8) {
        warnings.push({
          category: cat,
          label: categories[cat]?.label || cat,
          limit,
          used,
          exceeded: false,
          message: `⏳ Approaching ${categories[cat]?.label || cat} limit (${used}/${limit} min)`
        });
      }
    });

    return warnings;
  };

  /* -----------------------------------------------------------------------
   *  Reports
   * ----------------------------------------------------------------------- */

  const getDailyReport = () => {
    const today        = getToday();
    const total        = getTotalToday();
    const score        = getProductivityScore();
    const breakdown    = getCategoryBreakdown();
    const topSites     = getTopSites(5);
    const hourly       = getDailyBreakdown();
    const warnings     = checkLimits();
    const peakHour     = hourly.reduce((best, h) => h.total > best.total ? h : best, hourly[0]);

    return {
      date: _today(),
      totalMinutes: total,
      totalFormatted: `${Math.floor(total / 60)}h ${total % 60}m`,
      productivityScore: score,
      categoryBreakdown: breakdown,
      topSites,
      hourlyBreakdown: hourly,
      peakHour: peakHour.hour,
      peakHourFormatted: `${peakHour.hour % 12 || 12}${peakHour.hour >= 12 ? 'PM' : 'AM'}`,
      entryCount: today.length,
      warnings,
      summary: _scoreSummary(score)
    };
  };

  const getWeeklyReport = () => {
    const trend = getWeeklyTrend();
    const weekTotal = trend.reduce((s, d) => s + d.total, 0);
    const avgScore  = Math.round(trend.reduce((s, d) => s + d.score, 0) / trend.length);
    const bestDay   = trend.reduce((best, d) => d.score > best.score ? d : best, trend[0]);
    const worstDay  = trend.reduce((worst, d) => d.score < worst.score ? d : worst, trend[0]);

    /* Category totals for the week */
    const weekEntries = getThisWeek();
    const catTotals = { productive: 0, neutral: 0, distracting: 0, focus: 0 };
    weekEntries.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + e.duration; });

    return {
      totalMinutes: weekTotal,
      totalFormatted: `${Math.floor(weekTotal / 60)}h ${weekTotal % 60}m`,
      averageScore: avgScore,
      dailyTrend: trend,
      bestDay,
      worstDay,
      categoryTotals: catTotals,
      avgDailyMinutes: Math.round(weekTotal / 7),
      summary: _scoreSummary(avgScore)
    };
  };

  const _scoreSummary = (score) => {
    if (score >= 80) return '🔥 Excellent focus today! Keep it up.';
    if (score >= 60) return '👍 Good productivity. Room for improvement.';
    if (score >= 40) return '😐 Average day. Try reducing distractions.';
    if (score >= 20) return '⚠️ Below average. Consider a focus session.';
    return '🚨 Heavy distraction day. Reset and refocus!';
  };

  /* -----------------------------------------------------------------------
   *  Initialisation
   * ----------------------------------------------------------------------- */
  const init = () => {
    _load();
    _seed();

    /* Set sensible default limits if none exist */
    if (Object.keys(_limits).length === 0) {
      _limits = { distracting: 120, neutral: 180 };
      _saveLimits();
    }

    /* Auto-start tracking */
    startTracking();
  };

  /* Run on load */
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  /* -----------------------------------------------------------------------
   *  Public API
   * ----------------------------------------------------------------------- */
  return {
    /* State (read-only getters) */
    get isTracking()     { return _isTracking; },
    get currentSession() { return _currentSession ? { ..._currentSession } : null; },

    /* Category metadata */
    categories,

    /* Core tracking */
    startTracking,
    stopTracking,
    logActivity,

    /* Data queries */
    getToday,
    getThisWeek,
    getTotalToday,
    getByCategory,

    /* Classification */
    classifySite,

    /* Analytics */
    getProductivityScore,
    getDailyBreakdown,
    getWeeklyTrend,
    getCategoryBreakdown,
    getTopSites,

    /* Limits & alerts */
    setLimit,
    getLimits,
    checkLimits,

    /* Reports */
    getDailyReport,
    getWeeklyReport
  };
})();
