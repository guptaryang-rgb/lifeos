/* ============================================
   LifeOS — AI Secretary Engine
   Natural-language command parsing, contextual
   chat, stateful conversations, smart suggestions
   ============================================ */

// eslint-disable-next-line no-unused-vars
const Secretary = (() => {
  'use strict';

  // ── Constants ──────────────────────────────
  const STORAGE_KEY = 'lifeos_chat_history';
  const MAX_HISTORY = 200;

  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const DAY_ABBREVS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  // ── Session State for Multi-Turn Clarification Flows ──
  let _sessionState = {
    pendingAction: null, // 'schedule_event_title', 'add_task_title', 'log_expense_amount', etc.
    data: {}             // Temp data collected
  };

  // ── Helpers ────────────────────────────────
  const _now   = () => new Date();
  const _today = () => { const d = _now(); return _fmtDate(d); };

  /** Format a Date to YYYY-MM-DD (local timezone). */
  const _fmtDate = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  /** Add `n` days to a Date and return a new Date. */
  const _addDays = (d, n) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };

  /** Current hour (0-23). */
  const _hour = () => _now().getHours();

  /** Friendly time label. */
  const _timeOfDay = () => {
    const h = _hour();
    if (h < 5)  return 'night';
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    if (h < 21) return 'evening';
    return 'night';
  };

  /** Convert minutes integer to human string (e.g. "2h 15m"). */
  const _minsToStr = (m) => {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  };

  /** Pluralise helper: _p(3,'task') → "3 tasks" */
  const _p = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  /** Ordinal suffix: 1→"1st" 2→"2nd" etc. */
  const _ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  /** Format date string as "Mon Jun 17" style. */
  const _prettyDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  /** Format a 24h time string "14:30" → "2:30 PM". */
  const _prettyTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  // ═══════════════════════════════════════════
  //  DATE PARSER
  //  Converts natural language → YYYY-MM-DD
  // ═══════════════════════════════════════════
  const DateParser = {
    parse(text) {
      if (!text) return null;
      const s = text.trim().toLowerCase();

      if (s === 'today') return _today();
      if (s === 'tomorrow') return _fmtDate(_addDays(_now(), 1));
      if (s === 'yesterday') return _fmtDate(_addDays(_now(), -1));
      if (s === 'day after tomorrow') return _fmtDate(_addDays(_now(), 2));

      // "in N day(s) / week(s)"
      const inNMatch = s.match(/^in\s+(\d+)\s+(day|days|week|weeks)$/);
      if (inNMatch) {
        const n = parseInt(inNMatch[1], 10);
        const unit = inNMatch[2].startsWith('week') ? 7 : 1;
        return _fmtDate(_addDays(_now(), n * unit));
      }

      // "next <weekday>" or bare "<weekday>"
      const nextDayMatch = s.match(/^(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)$/);
      if (nextDayMatch) {
        return this._nextWeekday(nextDayMatch[1]);
      }

      // "this <weekday>"
      const thisDayMatch = s.match(/^this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)$/);
      if (thisDayMatch) {
        return this._thisWeekday(thisDayMatch[1]);
      }

      if (s === 'next week') return this._nextWeekday('monday');
      if (s === 'end of week' || s === 'end of the week' || s === 'this friday') return this._nextWeekday('friday');

      const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})$/);
      if (isoMatch) return isoMatch[1];

      // "MM/DD" or "MM/DD/YYYY"
      const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
      if (slashMatch) {
        const month = parseInt(slashMatch[1], 10);
        const day = parseInt(slashMatch[2], 10);
        let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : _now().getFullYear();
        if (year < 100) year += 2000;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      // Month name matching
      const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const monthAbbrevs = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      for (let i = 0; i < 12; i++) {
        const mFull = months[i];
        const mAbbr = monthAbbrevs[i];
        // "June 20" or "Jun 20"
        const m1 = s.match(new RegExp(`^(?:${mFull}|${mAbbr})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{4}))?$`));
        if (m1) {
          const year = m1[2] ? parseInt(m1[2], 10) : _now().getFullYear();
          return `${year}-${String(i + 1).padStart(2, '0')}-${String(parseInt(m1[1], 10)).padStart(2, '0')}`;
        }
        // "20 June" or "20 Jun"
        const m2 = s.match(new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:${mFull}|${mAbbr})\\.?(?:\\s*,?\\s*(\\d{4}))?$`));
        if (m2) {
          const year = m2[2] ? parseInt(m2[2], 10) : _now().getFullYear();
          return `${year}-${String(i + 1).padStart(2, '0')}-${String(parseInt(m2[1], 10)).padStart(2, '0')}`;
        }
      }

      return null;
    },

    _nextWeekday(dayName) {
      const target = this._dayIndex(dayName);
      if (target === -1) return null;
      const today = _now();
      const current = today.getDay();
      let diff = target - current;
      if (diff <= 0) diff += 7;
      return _fmtDate(_addDays(today, diff));
    },

    _thisWeekday(dayName) {
      const target = this._dayIndex(dayName);
      if (target === -1) return null;
      const today = _now();
      const current = today.getDay();
      const diff = target - current;
      return _fmtDate(_addDays(today, diff));
    },

    _dayIndex(name) {
      const n = name.toLowerCase();
      let idx = DAY_NAMES.indexOf(n);
      if (idx === -1) idx = DAY_ABBREVS.indexOf(n.slice(0, 3));
      return idx;
    },
  };

  // ═══════════════════════════════════════════
  //  TIME PARSER
  //  Converts natural language → "HH:MM" (24-h)
  // ═══════════════════════════════════════════
  const TimeParser = {
    parse(text) {
      if (!text) return null;
      const s = text.trim().toLowerCase().replace(/\./g, ':');

      const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
      if (!m) return null;

      let hour = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      const ampm = m[3];

      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      if (!ampm && hour >= 1 && hour <= 7) hour += 12; // PM heuristic

      if (hour > 23 || min > 59) return null;
      return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    },
  };

  // ═══════════════════════════════════════════
  //  DURATION PARSER
  //  "30 minutes" → 30,  "2 hours" → 120
  // ═══════════════════════════════════════════
  const DurationParser = {
    parse(text) {
      if (!text) return null;
      const s = text.trim().toLowerCase();

      const hm = s.match(/(\d+)\s*(?:hour|hr|h)s?(?:\s*(?:and\s*)?(\d+)\s*(?:minute|min|m)s?)?/);
      if (hm) {
        const hours = parseInt(hm[1], 10);
        const mins = hm[2] ? parseInt(hm[2], 10) : 0;
        return hours * 60 + mins;
      }

      const mOnly = s.match(/(\d+)\s*(?:minute|min|m)s?/);
      if (mOnly) return parseInt(mOnly[1], 10);

      const bare = s.match(/^(\d+)$/);
      if (bare) return parseInt(bare[1], 10);

      return null;
    },
  };

  // ═══════════════════════════════════════════
  //  COMMAND PARSER
  //  Pattern-based NL → structured command
  // ═══════════════════════════════════════════
  const CommandParser = {
    parse(input) {
      if (!input || typeof input !== 'string') {
        return { type: 'unknown', data: {}, confidence: 0 };
      }

      const s = input.trim();
      const lower = s.toLowerCase();

      // ── Clarification triggers (Empty command names) ──
      if (lower === 'schedule' || lower === 'schedule event' || lower === 'add event' || lower === 'new event' || lower === 'create event') {
        _sessionState.pendingAction = 'schedule_event_title';
        _sessionState.data = {};
        return {
          type: 'clarification_trigger',
          data: { response: "📅 I can help you schedule an event. **What is the title or name of the event?**\n\n_(Type **cancel** to abort)_" },
          confidence: 1.0
        };
      }
      if (lower === 'add task' || lower === 'create task' || lower === 'new task') {
        _sessionState.pendingAction = 'add_task_title';
        _sessionState.data = {};
        return {
          type: 'clarification_trigger',
          data: { response: "📋 Let's create a new task. **What is the task name?**\n\n_(Type **cancel** to abort)_" },
          confidence: 1.0
        };
      }
      if (lower === 'log expense' || lower === 'add expense' || lower === 'log spending' || lower === 'spent') {
        _sessionState.pendingAction = 'log_expense_amount';
        _sessionState.data = {};
        return {
          type: 'clarification_trigger',
          data: { response: "💰 Logging an expense. **How much did you spend?** (e.g. 15.50 or $45)\n\n_(Type **cancel** to abort)_" },
          confidence: 1.0
        };
      }

      // Try custom parsed commands!
      const foodCmd = this.parseFood(s);
      if (foodCmd) return foodCmd;

      // ── Food Photo Scanner ──
      if (/\b(?:scan|photo|camera|photograph|picture|snap|capture)\b.*\b(?:food|meal|plate|dish|eat|lunch|dinner|breakfast|snack)\b/i.test(s) ||
          /\b(?:food|meal|plate|dish)\b.*\b(?:scan|photo|camera|photograph|picture|snap|capture)\b/i.test(s)) {
        return { type: 'scan_food', data: {}, confidence: 0.95 };
      }

      const workoutCmd = this.parseWorkout(s);
      if (workoutCmd) return workoutCmd;

      const expenseCmd = this.parseExpense(s);
      if (expenseCmd) return expenseCmd;

      const incomeCmd = this.parseIncome(s);
      if (incomeCmd) return incomeCmd;

      // ── Search Wellness Library articles contextually ──
      const queryWords = lower.replace(/[?.,!]/g, '').split(/\s+/);
      const stopWords = ['what', 'is', 'how', 'does', 'the', 'a', 'an', 'explain', 'tell', 'me', 'about', 'teach', 'to', 'for', 'on', 'with', 'in', 'rules', 'principle', 'tips'];
      const keywords = queryWords.filter(w => !stopWords.includes(w) && w.length > 2);

      if (keywords.length > 0 && (lower.includes('what is') || lower.includes('explain') || lower.includes('tell me about') || lower.includes('how does') || lower.includes('teach me') || lower.includes('tips on') || lower.includes('tips for'))) {
        if (typeof Wellness !== 'undefined' && Wellness.reads && Wellness.reads.library) {
          const articles = Wellness.reads.library;
          let bestMatch = null;
          let maxHits = 0;

          articles.forEach(art => {
            let hits = 0;
            const titleLower = art.title.toLowerCase();
            const contentLower = art.content.toLowerCase();
            keywords.forEach(kw => {
              if (titleLower.includes(kw)) hits += 3; // weight title matches more
              else if (contentLower.includes(kw)) hits += 1;
            });
            if (hits > maxHits) {
              maxHits = hits;
              bestMatch = art;
            }
          });

          if (bestMatch && maxHits >= 2) {
            return {
              type: 'query_article',
              data: { articleId: bestMatch.id },
              confidence: 0.9
            };
          }
        }
      }
    // Custom parsers continue inside parse(input)...


      // ── Water Logging ──
      const waterMatch = lower.match(/^(?:log|add|drank|i\s+drank)\s+(\d+)\s*(?:glass|glasses|cup|cups|oz)?\s*(?:of\s*)?water$/i);
      if (waterMatch) {
        return {
          type: 'log_water',
          data: { glasses: parseInt(waterMatch[1], 10) },
          confidence: 0.95
        };
      }

      // ── Sleep Logging ──
      const sleepHrMatch = lower.match(/^(?:log\s+sleep|i\s+slept|slept)\s+(\d+(?:\.\d+)?)\s*(?:hours|hour|hr|hrs)?(?:\s+(?:with\s+)?quality\s*(\d))?$/i);
      if (sleepHrMatch) {
        return {
          type: 'log_sleep',
          data: {
            hours: parseFloat(sleepHrMatch[1]),
            quality: sleepHrMatch[2] ? parseInt(sleepHrMatch[2], 10) : 4
          },
          confidence: 0.95
        };
      }
      const sleepTimeMatch = lower.match(/^(?:log\s+sleep|sleep)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+quality\s*(\d))?$/i);
      if (sleepTimeMatch) {
        return {
          type: 'log_sleep',
          data: {
            bedtime: sleepTimeMatch[1],
            wakeup: sleepTimeMatch[2],
            quality: sleepTimeMatch[3] ? parseInt(sleepTimeMatch[3], 10) : 4
          },
          confidence: 0.95
        };
      }

      // ── Mood Logging ──
      const moodMatch = lower.match(/^(?:log\s+mood|i\s+feel|mood)\s+(great|good|okay|bad|terrible)(?:\s*:\s*(.+))?$/i);
      if (moodMatch) {
        return {
          type: 'log_mood',
          data: {
            mood: moodMatch[1].toLowerCase(),
            note: moodMatch[2] || ''
          },
          confidence: 0.95
        };
      }

      // ── Journal Logging ──
      const journalMatch = lower.match(/^(?:journal|log\s+journal|write\s+journal)\s*:\s*(.+)$/i);
      if (journalMatch) {
        return {
          type: 'log_journal',
          data: { content: journalMatch[1] },
          confidence: 0.95
        };
      }

      // ── Expense Logging ──
      const expenseMatch = lower.match(/^(?:spent|log\s+expense|expense|bought)\s+\$?(\d+(?:\.\d+)?)(?:\s+(?:on|for)\s+(.+?))?(?:\s+(?:in|category)\s+(.+?))?$/i);
      if (expenseMatch) {
        return {
          type: 'log_expense',
          data: {
            amount: parseFloat(expenseMatch[1]),
            title: this._titleCase(expenseMatch[2] || 'Unspecified Purchase'),
            category: expenseMatch[3] || 'other'
          },
          confidence: 0.9
        };
      }

      // ── Income Logging ──
      const incomeMatch = lower.match(/^(?:earned|log\s+income|income|got\s+paid)\s+\$?(\d+(?:\.\d+)?)(?:\s+(?:from|for)\s+(.+?))?$/i);
      if (incomeMatch) {
        return {
          type: 'log_income',
          data: {
            amount: parseFloat(incomeMatch[1]),
            title: this._titleCase(incomeMatch[2] || 'Income Source')
          },
          confidence: 0.9
        };
      }

      // ── Search Secure Notes ──
      const searchNotesMatch = lower.match(/^(?:search\s+note|search\s+notes|find\s+note|find\s+notes|look\s+up\s+notes|notes\s+search)\s+(.+)$/i);
      if (searchNotesMatch) {
        return {
          type: 'search_notes',
          data: { query: searchNotesMatch[1] },
          confidence: 0.95
        };
      }

      // ── Screen Time Queries ──
      if (lower.match(/^(?:screentime|screen\s*time|app\s*usage|focus\s*score\s*stats)$/i)) {
        return {
          type: 'query_screentime',
          data: {},
          confidence: 0.95
        };
      }

      // ── Schedule / Create Event ─────────────
      const scheduleMatch = lower.match(
        /^(?:schedule|create\s+event|add\s+event|put)\s+(?:an?\s+)?(.+?)(?:\s+at\s+(.+?))?(?:\s+on\s+(.+?))?$/
      );
      if (scheduleMatch) {
        return {
          type: 'schedule_event',
          data: {
            title: this._titleCase(scheduleMatch[1]),
            time: TimeParser.parse(scheduleMatch[2] || ''),
            date: DateParser.parse(scheduleMatch[3] || '') || _today(),
          },
          confidence: 0.9,
        };
      }

      // ── Remind me to ... ───────────────────
      const remindMatch = lower.match(
        /^remind\s+me\s+to\s+(.+?)(?:\s+(?:on|by|at|due)\s+(.+?))?$/
      );
      if (remindMatch) {
        return {
          type: 'remind_task',
          data: {
            title: this._titleCase(remindMatch[1]),
            dueDate: DateParser.parse(remindMatch[2] || '') || _fmtDate(_addDays(_now(), 1)),
          },
          confidence: 0.9,
        };
      }

      // ── Add task ───────────────────────────
      const addTaskMatch = lower.match(
        /^(?:add\s+task|create\s+task|new\s+task|add)\s+(.+?)(?:\s+due\s+(.+?))?$/
      );
      if (addTaskMatch) {
        return {
          type: 'add_task',
          data: {
            title: this._titleCase(addTaskMatch[1]),
            dueDate: DateParser.parse(addTaskMatch[2] || '') || null,
          },
          confidence: 0.9,
        };
      }

      // ── Block focus time ───────────────────
      const blockMatch = lower.match(
        /^block\s+(.+?)\s+(?:for|on|to)\s+(.+?)$/
      );
      if (blockMatch) {
        const duration = DurationParser.parse(blockMatch[1]);
        if (duration) {
          return {
            type: 'block_focus',
            data: {
              duration,
              activity: this._titleCase(blockMatch[2]),
              date: _today(),
            },
            confidence: 0.85,
          };
        }
      }

      // ── Bulk reschedule overdue ─────────────
      if (
        lower.match(/move\s+(?:all\s+)?overdue\s+tasks?\s+to\s+(.+)/) ||
        lower.match(/reschedule\s+(?:all\s+)?overdue\s+(?:tasks?\s+)?(?:to\s+)?(.+)/)
      ) {
        const targetMatch = lower.match(/(?:to|for)\s+(.+?)$/);
        const targetDate = targetMatch
          ? DateParser.parse(targetMatch[1]) || _fmtDate(_addDays(_now(), 1))
          : _fmtDate(_addDays(_now(), 1));
        return {
          type: 'bulk_reschedule',
          data: { targetDate },
          confidence: 0.9,
        };
      }

      // ── Query: schedule ────────────────────
      if (
        lower.match(/(?:what'?s|what\s+is|show|tell\s+me)\s+(?:my\s+)?(?:schedule|agenda|calendar|plan)/) ||
        lower.match(/(?:what\s+do\s+i\s+have|what'?s\s+on)\s+(?:today|tomorrow|this\s+week)/) ||
        lower.match(/^(?:today|tomorrow|this\s+week|my\s+day)$/)
      ) {
        let period = 'today';
        if (lower.includes('tomorrow')) period = 'tomorrow';
        else if (lower.includes('this week') || lower.includes('week')) period = 'week';
        return { type: 'query_schedule', data: { period }, confidence: 0.95 };
      }

      // ── Query: goals ───────────────────────
      if (
        lower.match(/(?:how|what)\s+.*(goal|goals)/) ||
        lower.match(/(?:goal|goals)\s+(?:progress|status|update)/) ||
        lower.match(/am\s+i\s+on\s+track/)
      ) {
        return { type: 'query_goals', data: {}, confidence: 0.9 };
      }

      // ── Suggest next ──────────────────────
      if (
        lower.match(/what\s+should\s+i\s+(?:do|work\s+on|tackle|focus\s+on)/) ||
        lower.match(/suggest(?:ion)?|recommend/) ||
        lower.match(/^what'?s?\s+next\??$/) ||
        lower.match(/priorit(?:y|ize|ies)/)
      ) {
        return { type: 'suggest_next', data: {}, confidence: 0.9 };
      }

      // ── Start focus session ────────────────
      if (
        lower.match(/^(?:start|begin|launch)\s+(?:a\s+)?(?:focus|pomodoro|deep\s+work|timer)/) ||
        lower.match(/^focus\s+(?:session|mode|time)$/)
      ) {
        return { type: 'start_focus', data: {}, confidence: 0.95 };
      }

      // ── Log habit ──────────────────────────
      const logHabitMatch = lower.match(
        /^(?:log|complete|check\s+off|mark|done)\s+(?:habit\s+)?(.+?)$/
      );
      if (logHabitMatch) {
        return {
          type: 'log_habit',
          data: { habitName: logHabitMatch[1].trim() },
          confidence: 0.8,
        };
      }

      // ── Productivity / summary ─────────────
      if (
        lower.match(/(?:summarize|summary|how\s+(?:was|did|am\s+i))/) ||
        lower.match(/(?:productivity|progress)\s*(?:report|summary)?/) ||
        lower.match(/how'?s?\s+my\s+day/) ||
        lower.match(/^my\s+day$/)
      ) {
        let period = 'today';
        if (lower.includes('week')) period = 'week';
        return { type: 'productivity_report', data: { period }, confidence: 0.85 };
      }

      // ── Find free time ─────────────────────
      if (lower.match(/(?:find|show|when|free)\s+(?:free\s+)?(?:time|slot|gap|opening)/)) {
        return { type: 'find_free_time', data: { date: _today() }, confidence: 0.85 };
      }

      // ── Greetings ──────────────────────────
      if (lower.match(/^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening)|howdy|yo|sup)/)) {
        return { type: 'greeting', data: {}, confidence: 0.95 };
      }

      // ── Help ───────────────────────────────
      if (lower.match(/^(?:help|what\s+can\s+you\s+do|\?|commands)$/)) {
        return { type: 'help', data: {}, confidence: 1.0 };
      }

      // ── Thank you ──────────────────────────
      if (lower.match(/^(?:thanks?|thank\s+you|thx|ty|cheers|appreciated)/)) {
        return { type: 'thanks', data: {}, confidence: 0.95 };
      }

      // ── Clear / reset chat ─────────────────
      if (lower.match(/^(?:clear|reset)\s+(?:chat|history|conversation)$/)) {
        return { type: 'clear_chat', data: {}, confidence: 1.0 };
      }

      return { type: 'unknown', data: {}, confidence: 0 };
    },

    parseFood(text) {
      const lower = text.toLowerCase().trim();
      const foodVerbMatch = lower.match(/^(?:please\s+)?(?:log\s+food|add\s+food|i\s+had|i\s+ate|i\s+drank|had|ate|drank|log)\s+(.+)$/i);
      if (!foodVerbMatch) return null;
      
      let content = foodVerbMatch[1];
      
      // If it matches water logging, let water match run instead
      if (content.match(/^\d+\s*(?:glass|glasses|cup|cups|oz)?\s*(?:of\s*)?water$/i)) {
        return null;
      }
      // If it matches expense/income logging, let those run instead
      if (content.match(/^\$?(\d+(?:\.\d+)?)/i) && (lower.includes('spent') || lower.includes('bought') || lower.includes('paid') || lower.includes('earned'))) {
        return null;
      }
      
      let meal = 'Snacks';
      const mealMatch = content.match(/\s+for\s+(breakfast|lunch|dinner|snacks)$/i);
      if (mealMatch) {
        meal = mealMatch[1];
        content = content.replace(/\s+for\s+(breakfast|lunch|dinner|snacks)$/i, '').trim();
      }
      
      const parts = content.split(/\s+and\s+|,\s*and\s+|,\s*/i);
      const items = [];
      
      parts.forEach(p => {
        const itemText = p.trim();
        if (!itemText) return;
        
        let quantity = 1;
        let foodName = itemText;
        
        const qtyMatch = itemText.match(/^(\d+(?:\.\d+)?|\d+\/\d+|an?|one|two|three|four|five|half)\s+(.+)$/i);
        if (qtyMatch) {
          const qtyStr = qtyMatch[1].toLowerCase();
          foodName = qtyMatch[2];
          
          if (qtyStr === 'a' || qtyStr === 'an' || qtyStr === 'one') {
            quantity = 1;
          } else if (qtyStr === 'two') {
            quantity = 2;
          } else if (qtyStr === 'three') {
            quantity = 3;
          } else if (qtyStr === 'four') {
            quantity = 4;
          } else if (qtyStr === 'five') {
            quantity = 5;
          } else if (qtyStr === 'half') {
            quantity = 0.5;
          } else if (qtyStr.includes('/')) {
            const [num, den] = qtyStr.split('/').map(Number);
            quantity = den ? num / den : 1;
          } else {
            quantity = parseFloat(qtyStr) || 1;
          }
        }
        
        foodName = foodName.replace(/^(?:of\s+)/i, '');
        const unitMatch = foodName.match(/^(.+?)\s+(?:servings?|pieces?|cups?|oz|slices?|glasses?|scoops?|grams?|g)(?:\s+of\s+(.+))?$/i);
        if (unitMatch) {
          foodName = unitMatch[2] || unitMatch[1];
        }
        
        items.push({
          rawText: itemText,
          foodName: foodName.trim(),
          servingCount: quantity
        });
      });
      
      if (items.length === 0) return null;
      
      return {
        type: 'log_food_multi',
        data: { items, meal },
        confidence: 0.9
      };
    },

    parseWorkout(text) {
      const lower = text.toLowerCase().trim();
      if (!lower.includes('workout') && !lower.includes('exercise') && !lower.includes('ran') && !lower.includes('run') && !lower.includes('cycled') && !lower.includes('cycling') && !lower.includes('swam') && !lower.includes('swimming') && !lower.includes('walk') && !lower.includes('walked') && !lower.includes('lifted') && !lower.includes('lifting') && !lower.includes('yoga') && !lower.includes('hiit') && !lower.includes('cardio') && !lower.includes('strength')) {
        return null;
      }
      
      let content = lower.replace(/^(?:please\s+)?(?:log|add|i\s+did|i\s+went|i\s+had)\s+(?:a\s+)?(?:workout|exercise)?/i, '').trim();
      
      let duration = 30;
      const durMatch = content.match(/(?:for\s+)?(\d+)\s*(?:minutes?|mins?|m|hours?|hrs?|h)(?:\s+and\s+(\d+)\s*(?:minutes?|mins?|m))?/i);
      if (durMatch) {
        if (content.includes('hour') || content.includes('hr')) {
          const hours = parseInt(durMatch[1], 10);
          const mins = durMatch[2] ? parseInt(durMatch[2], 10) : 0;
          duration = hours * 60 + mins;
        } else {
          duration = parseInt(durMatch[1], 10);
        }
      }
      
      let exerciseName = 'Running';
      let type = 'cardio';
      let distance = null;
      let weight = null;
      let sets = null;
      let reps = null;
      
      if (content.includes('run') || content.includes('ran')) {
        exerciseName = 'Running';
        type = 'cardio';
        const distMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi|km|kilometers?)/i);
        if (distMatch) distance = parseFloat(distMatch[1]);
      } else if (content.includes('cycl') || content.includes('bike')) {
        exerciseName = 'Cycling';
        type = 'cardio';
        const distMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi|km|kilometers?)/i);
        if (distMatch) distance = parseFloat(distMatch[1]);
      } else if (content.includes('swim') || content.includes('swam')) {
        exerciseName = 'Swimming';
        type = 'cardio';
      } else if (content.includes('walk')) {
        exerciseName = 'Walking';
        type = 'cardio';
        const distMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi|km|kilometers?)/i);
        if (distMatch) distance = parseFloat(distMatch[1]);
      } else if (content.includes('hiit')) {
        exerciseName = 'HIIT';
        type = 'cardio';
      } else if (content.includes('yoga')) {
        exerciseName = 'Yoga';
        type = 'strength';
      } else if (content.includes('pilates')) {
        exerciseName = 'Pilates';
        type = 'strength';
      } else if (content.includes('lift') || content.includes('strength') || content.includes('weight') || content.includes('bench press') || content.includes('squat')) {
        exerciseName = 'Weightlifting';
        type = 'strength';
        
        const weightMatch = content.match(/(\d+)\s*(?:lbs|lb|kg|kilograms?|at\s+\d+)/i);
        if (weightMatch) weight = parseInt(weightMatch[1], 10);
        
        const setsRepsMatch = content.match(/(\d+)\s*sets?(?:\s+of\s+(\d+)\s*reps?)?/i);
        if (setsRepsMatch) {
          sets = parseInt(setsRepsMatch[1], 10);
          if (setsRepsMatch[2]) reps = parseInt(setsRepsMatch[2], 10);
        }
        
        const liftNameMatch = content.match(/(bench\s+press|squats?|deadlifts?|shoulder\s+press|bicep\s+curls?|pushups?|pullups?)/i);
        if (liftNameMatch) exerciseName = this._titleCase(liftNameMatch[1]);
      }
      
      return {
        type: 'log_workout',
        data: {
          exerciseName,
          type,
          durationMinutes: duration,
          distance,
          weight,
          sets,
          reps
        },
        confidence: 0.9
      };
    },

    parseExpense(text) {
      const lower = text.toLowerCase().trim();
      const expenseVerbMatch = lower.match(/(?:i\s+)?(?:spent|bought|paid|log\s+expense|log\s+spending|expense)\s+(.+)$/i);
      if (!expenseVerbMatch) return null;
      
      const content = expenseVerbMatch[1];
      const amountMatch = content.match(/\$?(\d+(?:\.\d+)?)(?:\s*(?:dollars?|bucks?))?/i);
      if (!amountMatch) return null;
      
      const amount = parseFloat(amountMatch[1]);
      let title = content.replace(amountMatch[0], '').trim();
      title = title.replace(/^(?:on|for|at)\s+/i, '').trim();
      
      if (!title) title = 'Unspecified Expense';
      
      let category = 'other';
      const lowerTitle = title.toLowerCase();
      
      if (lowerTitle.includes('coffee') || lowerTitle.includes('starbucks') || lowerTitle.includes('chipotle') || lowerTitle.includes('lunch') || lowerTitle.includes('dinner') || lowerTitle.includes('breakfast') || lowerTitle.includes('food') || lowerTitle.includes('grocery') || lowerTitle.includes('groceries') || lowerTitle.includes('eat') || lowerTitle.includes('restaurant') || lowerTitle.includes('boba')) {
        category = 'food';
      } else if (lowerTitle.includes('uber') || lowerTitle.includes('lyft') || lowerTitle.includes('taxi') || lowerTitle.includes('bus') || lowerTitle.includes('train') || lowerTitle.includes('gas') || lowerTitle.includes('subway ticket') || lowerTitle.includes('transport')) {
        category = 'transport';
      } else if (lowerTitle.includes('netflix') || lowerTitle.includes('spotify') || lowerTitle.includes('hulu') || lowerTitle.includes('hbo') || lowerTitle.includes('disney') || lowerTitle.includes('youtube premium') || lowerTitle.includes('icloud') || lowerTitle.includes('chatgpt') || lowerTitle.includes('subscription')) {
        category = 'subscriptions';
      } else if (lowerTitle.includes('movie') || lowerTitle.includes('cinema') || lowerTitle.includes('bowling') || lowerTitle.includes('game') || lowerTitle.includes('concert') || lowerTitle.includes('ticket') || lowerTitle.includes('steam')) {
        category = 'entertainment';
      } else if (lowerTitle.includes('amazon') || lowerTitle.includes('clothes') || lowerTitle.includes('shirt') || lowerTitle.includes('pants') || lowerTitle.includes('shoes') || lowerTitle.includes('shopping') || lowerTitle.includes('uniqlo')) {
        category = 'shopping';
      } else if (lowerTitle.includes('rent') || lowerTitle.includes('electric') || lowerTitle.includes('water bill') || lowerTitle.includes('power bill') || lowerTitle.includes('wifi') || lowerTitle.includes('internet') || lowerTitle.includes('phone bill')) {
        category = 'bills';
      } else if (lowerTitle.includes('textbook') || lowerTitle.includes('course') || lowerTitle.includes('tuition') || lowerTitle.includes('school') || lowerTitle.includes('udemy') || lowerTitle.includes('class')) {
        category = 'education';
      } else if (lowerTitle.includes('gym') || lowerTitle.includes('vitamins') || lowerTitle.includes('medicine') || lowerTitle.includes('doctor') || lowerTitle.includes('dentist') || lowerTitle.includes('health') || lowerTitle.includes('prescription')) {
        category = 'health';
      }
      
      return {
        type: 'log_expense',
        data: {
          amount,
          title: this._titleCase(title),
          category
        },
        confidence: 0.95
      };
    },

    parseIncome(text) {
      const lower = text.toLowerCase().trim();
      const incomeVerbMatch = lower.match(/(?:i\s+)?(?:earned|got\s+paid|log\s+income|income)\s+(.+)$/i);
      if (!incomeVerbMatch) return null;
      
      const content = incomeVerbMatch[1];
      const amountMatch = content.match(/\$?(\d+(?:\.\d+)?)(?:\s*(?:dollars?|bucks?))?/i);
      if (!amountMatch) return null;
      
      const amount = parseFloat(amountMatch[1]);
      let title = content.replace(amountMatch[0], '').trim();
      title = title.replace(/^(?:from|for|at)\s+/i, '').trim();
      
      if (!title) title = 'Income Source';
      
      return {
        type: 'log_income',
        data: {
          amount,
          title: this._titleCase(title)
        },
        confidence: 0.95
      };
    },

    _titleCase(str) {
      if (!str) return '';
      return str
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    },
  };

  // ═══════════════════════════════════════════
  //  ACTION EXECUTOR
  //  Runs the parsed command against LifeOS
  // ═══════════════════════════════════════════
  const ActionExecutor = {
    execute(cmd) {
      switch (cmd.type) {
        case 'schedule_event':  return this._scheduleEvent(cmd.data);
        case 'add_task':        return this._addTask(cmd.data);
        case 'remind_task':     return this._addTask({ ...cmd.data, isReminder: true });
        case 'block_focus':     return this._blockFocus(cmd.data);
        case 'bulk_reschedule': return this._bulkReschedule(cmd.data);
        case 'query_schedule':  return this._querySchedule(cmd.data);
        case 'query_goals':     return this._queryGoals();
        case 'suggest_next':    return this._suggestNext();
        case 'start_focus':     return this._startFocus();
        case 'log_habit':       return this._logHabit(cmd.data);
        case 'productivity_report': return this._productivityReport(cmd.data);
        case 'find_free_time':  return this._findFreeTime(cmd.data);
        case 'greeting':        return this._greeting();
        case 'help':            return this._help();
        case 'thanks':          return this._thanks();
        case 'clear_chat':      return this._clearChat();
        case 'log_food':        return this._logFood(cmd.data);
        case 'log_food_multi':  return this._logFoodMulti(cmd.data);
        case 'scan_food':       return this._scanFood();
        case 'log_workout':     return this._logWorkout(cmd.data);
        case 'log_water':       return this._logWater(cmd.data);
        case 'log_sleep':       return this._logSleep(cmd.data);
        case 'log_mood':        return this._logMood(cmd.data);
        case 'log_journal':     return this._logJournal(cmd.data);
        case 'log_expense':     return this._addExpenseDirect(cmd.data);
        case 'log_income':      return this._addIncomeDirect(cmd.data);
        case 'search_notes':    return this._searchNotes(cmd.data);
        case 'query_screentime': return this._queryScreentime();
        case 'query_article':   return this._queryArticle(cmd.data);
        case 'clarification_trigger': return { success: true, response: cmd.data.response };
        default:                return this._unknown();
      }
    },

    // ── Log Food ──
    _logFood({ foodName, meal, servingCount }) {
      if (typeof Food === 'undefined') return { success: false, response: "Food tracker module is currently unavailable." };
      
      const searchStr = foodName.toLowerCase();
      let matched = Food.database.find(f => f.name.toLowerCase() === searchStr);
      if (!matched) {
        matched = Food.database.find(f => f.name.toLowerCase().includes(searchStr));
      }

      if (!matched) {
        _sessionState.pendingAction = 'log_custom_food_calories';
        _sessionState.data = { foodName, meal, servingCount };
        return {
          success: true,
          response: `🍎 I couldn't find **"${foodName}"** in the food database. \n\n**How many calories** does it have? _(or type **cancel** to abort)_`
        };
      }

      const sv = servingCount || 1;
      const mealName = CommandParser._titleCase(meal || 'Snacks');
      const entry = {
        foodName: matched.name,
        servingCount: sv,
        meal: mealName,
        date: _today()
      };
      
      Food.log.add(entry);
      const totalCal = Math.round(matched.calories * sv);

      return {
        success: true,
        response: `🍎 Logged **${sv} ${matched.servingUnit}(s)** of **"${matched.name}"** (${totalCal} cal) for **${mealName}** ${matched.icon}.`,
        details: entry
      };
    },

    // ── Log Food Multi ──
    _logFoodMulti({ items, meal }) {
      if (typeof Food === 'undefined') return { success: false, response: "Food tracker module is currently unavailable." };
      
      const mealName = CommandParser._titleCase(meal || 'Snacks');
      const loggedDetails = [];
      const lines = [`🍎 Logged food items for **${mealName}**:`];
      
      items.forEach(item => {
        const { foodName, servingCount } = item;
        const searchStr = foodName.toLowerCase().trim();
        let matched = Food.database.find(f => f.name.toLowerCase() === searchStr);
        if (!matched) {
          const singular = searchStr.endsWith('es') ? searchStr.slice(0, -2) : (searchStr.endsWith('s') ? searchStr.slice(0, -1) : searchStr);
          matched = Food.database.find(f => f.name.toLowerCase().startsWith(singular) || f.name.toLowerCase().includes(singular));
        }
        if (!matched) {
          matched = Food.database.find(f => searchStr.includes(f.name.toLowerCase()));
        }
        
        const sv = servingCount || 1;
        const entry = {
          foodName: matched ? matched.name : CommandParser._titleCase(foodName),
          servingCount: sv,
          meal: mealName,
          date: _today()
        };
        
        let totalCal;
        if (matched) {
          entry.calories = Math.round(matched.calories * sv);
          entry.protein = Math.round(matched.protein * sv * 10) / 10;
          entry.carbs = Math.round(matched.carbs * sv * 10) / 10;
          entry.fat = Math.round(matched.fat * sv * 10) / 10;
          entry.fiber = Math.round(matched.fiber * sv * 10) / 10;
          entry.icon = matched.icon;
          entry.servingSize = matched.servingSize;
          entry.servingUnit = matched.servingUnit;
          totalCal = entry.calories;
        } else {
          entry.calories = Math.round(100 * sv);
          entry.protein = Math.round(2 * sv * 10) / 10;
          entry.carbs = Math.round(15 * sv * 10) / 10;
          entry.fat = Math.round(3 * sv * 10) / 10;
          entry.fiber = Math.round(1 * sv * 10) / 10;
          entry.icon = '🍽️';
          entry.servingSize = 1;
          entry.servingUnit = 'serving';
          totalCal = entry.calories;
        }
        
        Food.log.add(entry);
        loggedDetails.push(entry);
        
        const displayName = matched ? matched.name : CommandParser._titleCase(foodName);
        const displayUnit = matched ? matched.servingUnit : 'serving';
        const displayIcon = matched ? matched.icon : '🍽️';
        lines.push(`• **${sv} ${displayUnit}** of **"${displayName}"** (${totalCal} cal) ${displayIcon}`);
      });
      
      return {
        success: true,
        response: lines.join('\n'),
        details: loggedDetails
      };
    },

    // ── Scan Food (AI Photo Scanner) ──
    _scanFood() {
      if (typeof Food !== 'undefined' && Food.scanFood) {
        Food.scanFood();
        return { success: true, response: '📸 Opening the food scanner! Take a photo of your meal and I\'ll identify the items for you.' };
      }
      return { success: false, response: 'Food scanner is not available right now.' };
    },

    // ── Log Workout ──
    _logWorkout(w) {
      if (typeof Food === 'undefined') return { success: false, response: "Fitness tracker module is currently unavailable." };
      
      const res = Food.workouts.add(w);
      const icon = res.icon || '💪';
      let detailsText = `Logged **${res.exerciseName}** (${res.durationMinutes} mins, **${res.calories} cal burned** ${icon})`;
      if (res.type === 'cardio' && res.distance) {
        detailsText += ` covering **${res.distance} miles**`;
      } else if (res.type === 'strength') {
        if (res.weight) detailsText += ` at **${res.weight} lbs**`;
        if (res.sets && res.reps) detailsText += ` (${res.sets} sets x ${res.reps} reps)`;
      }
      
      return {
        success: true,
        response: `💪 ${detailsText}. Active calories burned updated!`,
        details: res
      };
    },

    // ── Log Water ──
    _logWater({ glasses }) {
      if (typeof Wellness === 'undefined') return { success: false, response: "Wellness module is currently unavailable." };
      const gls = parseInt(glasses) || 1;
      const res = Wellness.water.log(gls);
      return {
        success: true,
        response: `💧 Logged **${_p(gls, 'glass')}** of water. Today's total: **${res.glasses}/${res.goal} glasses** 🥤.`,
        details: res
      };
    },

    // ── Log Sleep ──
    _logSleep({ bedtime, wakeup, quality, hours }) {
      if (typeof Wellness === 'undefined') return { success: false, response: "Wellness module is currently unavailable." };
      let hrs = parseFloat(hours);
      let qual = parseInt(quality) || 4;
      let bed = bedtime || '23:00';
      let wake = wakeup || '07:00';

      if (isNaN(hrs)) {
        const [bh, bm] = bed.split(':').map(Number);
        const [wh, wm] = wake.split(':').map(Number);
        let diff = (wh * 60 + wm) - (bh * 60 + bm);
        if (diff < 0) diff += 24 * 60; // overnight
        hrs = +(diff / 60).toFixed(1);
      }

      Wellness.sleep.log(bed, wake, qual);
      return {
        success: true,
        response: `🛌 Logged sleep: **${hrs} hours** (Quality: **${qual}/5**). Today's averages have been updated!`,
        details: { bedtime: bed, wakeup: wake, quality: qual, hours: hrs }
      };
    },

    // ── Log Mood ──
    _logMood({ mood, note }) {
      if (typeof Wellness === 'undefined') return { success: false, response: "Wellness module is currently unavailable." };
      const res = Wellness.mood.log(mood, note || '');
      const moodEmoji = { great: '🌟', good: '🙂', okay: '😐', bad: '🙁', terrible: '😭' }[mood] || '😐';
      const notePart = note ? ` ("${note}")` : '';
      return {
        success: true,
        response: `🧠 Logged mood as **${mood}** ${moodEmoji}${notePart}. Thanks for checking in!`,
        details: res
      };
    },

    // ── Log Journal ──
    _logJournal({ content }) {
      if (typeof Wellness === 'undefined') return { success: false, response: "Wellness module is currently unavailable." };
      const entry = { content, mood: 'okay', gratitude: [], date: _today() };
      const res = Wellness.journal.add(entry);
      return {
        success: true,
        response: `📝 Journal entry logged successfully. Daily reflection added!`,
        details: res
      };
    },

    // ── Add Expense ──
    _addExpenseDirect({ title, amount, category }) {
      if (typeof Finance === 'undefined') return { success: false, response: "Finance module is currently unavailable." };
      const cat = category || 'other';
      const matchedCat = Finance.categories.find(c => c.id === cat || c.name.toLowerCase().includes(cat.toLowerCase()));
      const finalCat = matchedCat ? matchedCat.id : 'other';
      const finalCatName = matchedCat ? matchedCat.name : 'Other';
      const finalIcon = matchedCat ? matchedCat.icon : '📦';

      const txn = {
        title,
        amount,
        category: finalCat,
        type: 'expense'
      };
      Finance.transactions.add(txn);

      return {
        success: true,
        response: `✅ Logged expense of **$${amount.toFixed(2)}** for **"${title}"** under **${finalCatName}** ${finalIcon}.`,
        details: txn
      };
    },

    // ── Add Income ──
    _addIncomeDirect({ title, amount }) {
      if (typeof Finance === 'undefined') return { success: false, response: "Finance module is currently unavailable." };
      const txn = {
        title,
        amount,
        category: 'income',
        type: 'income'
      };
      Finance.transactions.add(txn);

      return {
        success: true,
        response: `💰 Logged income of **$${amount.toFixed(2)}** from **"${title}"**! Great work!`,
        details: txn
      };
    },

    // ── Search Secure Notes ──
    _searchNotes({ query }) {
      if (typeof Security === 'undefined') return { success: false, response: "Security module is currently unavailable." };
      const allNotes = Security.notes.getAll();
      if (allNotes.length === 0) {
        return { success: true, response: '🗝️ Your secure notes vault is empty.' };
      }
      const results = allNotes.filter(n =>
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.content.toLowerCase().includes(query.toLowerCase()) ||
        n.category.toLowerCase().includes(query.toLowerCase())
      );

      if (results.length === 0) {
        return { success: true, response: `🔍 No secure notes found matching **"${query}"**.` };
      }

      let lines = [`🔍 **Found ${results.length} matching secure note(s):**\n`];
      results.forEach(n => {
        lines.push(`🔑 **[${n.category}] ${n.title}**`);
        lines.push(`_${n.content.slice(0, 150)}${n.content.length > 150 ? '...' : ''}_`);
        lines.push('');
      });
      return { success: true, response: lines.join('\n') };
    },

    // ── Query Screen Time ──
    _queryScreentime() {
      if (typeof ScreenTime === 'undefined') {
        return { success: false, response: 'Screen Time module is currently unavailable.' };
      }
      const stats = ScreenTime.getStats ? ScreenTime.getStats() : null;
      if (!stats) {
        return { success: true, response: '📱 Screen Time tracking is active. Try browsing some pages to see stats build up!' };
      }
      const score = ScreenTime.calculateFocusScore ? ScreenTime.calculateFocusScore() : 75;
      const formattedTotal = _minsToStr(Math.round(stats.totalTime / 60));
      const formattedProd = _minsToStr(Math.round(stats.productiveTime / 60));

      return {
        success: true,
        response: `📱 **Your Screen Time Summary:**\n\n• Total active tracking time: **${formattedTotal}**\n• Productive time: **${formattedProd}**\n• Neutral time: **${_minsToStr(Math.round(stats.neutralTime / 60))}**\n• Distracting time: **${_minsToStr(Math.round(stats.distractingTime / 60))}**\n\n⚡ Real-time Focus Score: **${score}/100**`
      };
    },

    // ── Search and Query Curated Knowledge Article ──
    _queryArticle({ articleId }) {
      if (typeof Wellness === 'undefined' || !Wellness.reads || !Wellness.reads.library) {
        return { success: false, response: 'Curated knowledge module is currently unavailable.' };
      }
      const art = Wellness.reads.library.find(a => a.id === articleId);
      if (!art) return { success: false, response: "I couldn't load that article." };

      const categoryBadges = {
        finance: '💰 Personal Finance',
        tech: '💻 Technology',
        health: '🏋️ Health & Fitness',
        psychology: '🧠 Psychology',
        business: '🚀 Business & Startups',
        science: '🔬 Science',
        productivity: '⚡ Productivity',
        philosophy: '📜 Philosophy'
      };

      const badge = categoryBadges[art.topic] || '📚 Article';

      if (Wellness.reads.markRead) Wellness.reads.markRead(articleId);

      return {
        success: true,
        response: [
          `📖 **_${badge}_**`,
          `# **${art.title}**`,
          `_By ${art.author} · ${art.readTime} read_`,
          `\n---`,
          art.content,
          `\n---`,
          `💡 _This article was pulled from your curated Daily Reads library. Bookmarked as read!_`
        ].join('\n')
      };
    },

    _scheduleEvent({ title, time, date }) {
      const startTime = time || '09:00';
      const endHour = parseInt(startTime.split(':')[0], 10) + 1;
      const endTime = `${String(Math.min(endHour, 23)).padStart(2, '0')}:${startTime.split(':')[1]}`;

      const event = LifeOS.Events.create({
        title,
        date: date || _today(),
        startTime,
        endTime,
        category: 'personal',
        location: '',
      });

      return {
        success: true,
        response: `✅ Done! Scheduled **"${title}"** on **${_prettyDate(event.date)}** at **${_prettyTime(startTime)}**.`,
        details: event,
      };
    },

    _addTask({ title, dueDate, isReminder }) {
      const task = LifeOS.Tasks.create({
        title,
        description: isReminder ? 'Created via Secretary reminder' : '',
        status: 'not_started',
        priority: 'medium',
        category: 'personal',
        dueDate: dueDate || null,
        estimatedMinutes: 30,
        progress: 0,
      });

      const duePart = dueDate ? `, due **${_prettyDate(dueDate)}**` : '';
      const verb = isReminder ? "I'll remind you" : "I've added the task";
      return {
        success: true,
        response: `✅ ${verb} **"${title}"**${duePart}.`,
        details: task,
      };
    },

    _blockFocus({ duration, activity, date }) {
      const now = _now();
      const startHour = now.getHours() + 1;
      const startTime = `${String(Math.min(startHour, 22)).padStart(2, '0')}:00`;
      const endMins = startHour * 60 + duration;
      const endH = Math.min(Math.floor(endMins / 60), 23);
      const endM = endMins % 60;
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const event = LifeOS.Events.create({
        title: `🎯 Focus: ${activity}`,
        date: date || _today(),
        startTime,
        endTime,
        category: 'work',
        location: '',
      });

      return {
        success: true,
        response: `✅ Blocked **${_minsToStr(duration)}** for **"${activity}"** today from **${_prettyTime(startTime)}** to **${_prettyTime(endTime)}**. Added to calendar.`,
        details: event,
      };
    },

    _bulkReschedule({ targetDate }) {
      const overdue = LifeOS.Tasks.getOverdue();
      if (overdue.length === 0) {
        return {
          success: true,
          response: '🎉 Great news — no overdue tasks to reschedule!',
        };
      }

      overdue.forEach(t => {
        LifeOS.Tasks.update(t.id, { dueDate: targetDate });
      });

      return {
        success: true,
        response: `✅ Moved **${_p(overdue.length, 'overdue task')}** to **${_prettyDate(targetDate)}**.`,
        details: { count: overdue.length, targetDate },
      };
    },

    _querySchedule({ period }) {
      let dateLabel, events, tasks;

      if (period === 'tomorrow') {
        const tomorrowStr = _fmtDate(_addDays(_now(), 1));
        dateLabel = 'tomorrow';
        events = LifeOS.Events.getByDate(tomorrowStr).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        tasks = LifeOS.Tasks.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate.startsWith(tomorrowStr));
      } else if (period === 'week') {
        dateLabel = 'this week';
        events = LifeOS.Events.getUpcoming(7);
        tasks = LifeOS.Tasks.getDueThisWeek();
      } else {
        dateLabel = 'today';
        events = LifeOS.Events.getToday().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        tasks = LifeOS.Tasks.getDueToday();
      }

      let lines = [`📅 **Schedule for ${dateLabel}:**\n`];

      if (events.length === 0 && tasks.length === 0) {
        lines.push('Your schedule is clear! A perfect time to rest or work on a goal.');
        return { success: true, response: lines.join('\n') };
      }

      if (events.length > 0) {
        lines.push(`**Events (${events.length}):**`);
        events.forEach(e => {
          const time = e.startTime ? `${_prettyTime(e.startTime)} – ${_prettyTime(e.endTime)}` : 'All day';
          const loc = e.location ? ` 📍 ${e.location}` : '';
          lines.push(`• ${time} — ${e.title}${loc}`);
        });
        lines.push('');
      }

      if (tasks.length > 0) {
        lines.push(`**Tasks due (${tasks.length}):**`);
        tasks.forEach(t => {
          const pIcon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[t.priority] || '⚪';
          lines.push(`• ${pIcon} ${t.title} (${t.priority})`);
        });
      }

      return { success: true, response: lines.join('\n') };
    },

    _queryGoals() {
      const goals = LifeOS.Goals.getAll();
      if (goals.length === 0) {
        return {
          success: true,
          response: "You haven't set any goals yet. Go to Goals to set one up!",
        };
      }

      let lines = ['🎯 **Goal Progress Update:**\n'];
      const byScope = { yearly: [], monthly: [], weekly: [] };
      goals.forEach(g => {
        const scope = g.scope || 'monthly';
        if (!byScope[scope]) byScope[scope] = [];
        byScope[scope].push(g);
      });

      for (const [scope, items] of Object.entries(byScope)) {
        if (items.length === 0) continue;
        lines.push(`**${scope.charAt(0).toUpperCase() + scope.slice(1)} Goals:**`);
        items.forEach(g => {
          const bar = this._progressBar(g.progress || 0);
          const status = (g.progress || 0) >= 80 ? '🟢' : (g.progress || 0) >= 40 ? '🟡' : '🔴';
          lines.push(`${status} ${g.title}: ${bar} ${g.progress || 0}%`);
        });
        lines.push('');
      }

      const avgProgress = Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length);
      lines.push(`**Overall Avg Progress:** ${avgProgress}% across ${_p(goals.length, 'goal')}.`);

      return { success: true, response: lines.join('\n') };
    },

    _suggestNext() {
      const now = _now();
      const hour = now.getHours();

      const overdue = LifeOS.Tasks.getOverdue();
      const dueToday = LifeOS.Tasks.getDueToday();
      const allActive = LifeOS.Tasks.filter(t => t.status !== 'completed')
        .sort((a, b) => {
          const pw = { critical: 4, high: 3, medium: 2, low: 1 };
          return (pw[b.priority] || 1) - (pw[a.priority] || 1);
        });

      const habits = LifeOS.Habits.getAll();
      const unloggedHabits = habits.filter(h => !LifeOS.Habits.isCompletedToday(h.id));

      let lines = ['🤖 **My recommendation:**\n'];

      if (overdue.length > 0) {
        lines.push(`🚨 **Immediate Action:** Overdue task **"${overdue[0].title}"** (${overdue[0].priority} priority).`);
      } else if (dueToday.length > 0) {
        lines.push(`📋 **High Priority:** Task **"${dueToday[0].title}"** due today.`);
      } else if (allActive.length > 0) {
        lines.push(`📋 **Work on:** **"${allActive[0].title}"** (${allActive[0].priority} priority).`);
      } else {
        lines.push('✨ All tasks checked off! Ready to relax or plan ahead?');
      }

      if (hour >= 6 && hour < 10) {
        lines.push('\n🌅 Peak energy slot — perfect for high-focus writing or coding.');
      } else if (hour >= 14 && hour < 17) {
        lines.push('\n☕ Mid-afternoon slowdown — grab a water, walk around, or review items.');
      }

      if (unloggedHabits.length > 0) {
        lines.push(`\n💡 Uncompleted habits remaining today: ${unloggedHabits.map(h => h.title).join(', ')}.`);
      }

      return { success: true, response: lines.join('\n') };
    },

    _startFocus() {
      if (typeof App !== 'undefined' && App.navigate) {
        setTimeout(() => App.navigate('focus'), 100);
      }
      return {
        success: true,
        response: '⏱️ Let\'s start! Switching you to the **Focus Timer**. Focus in, you\'ve got this! 💪',
      };
    },

    _logHabit({ habitName }) {
      const habits = LifeOS.Habits.getAll();
      const search = habitName.toLowerCase();

      let match = habits.find(h => h.title.toLowerCase() === search);
      if (!match) match = habits.find(h => h.title.toLowerCase().includes(search));
      if (!match) match = habits.find(h => search.includes(h.title.toLowerCase().split(' ')[0]));

      if (!match) {
        const available = habits.map(h => `• ${h.icon || '•'} ${h.title}`).join('\n');
        return {
          success: false,
          response: `I couldn't find a habit matching **"${habitName}"**. Active habits:\n\n${available}`,
        };
      }

      const wasCompleted = LifeOS.Habits.isCompletedToday(match.id);
      LifeOS.Habits.log(match.id);

      if (wasCompleted) {
        return {
          success: true,
          response: `↩️ Unmarked **"${match.title}"** for today.`,
          details: { habit: match, logged: false }
        };
      }

      const streak = LifeOS.Habits.getStreak(match.id);
      const streakMsg = streak > 1 ? ` **Streak: ${streak} days** 🔥!` : '';
      return {
        success: true,
        response: `✅ Habit completed: **"${match.title}"** ${match.icon || ''}!${streakMsg}`,
        details: { habit: match, logged: true, streak }
      };
    },

    _productivityReport({ period }) {
      const lines = [];

      if (period === 'week') {
        lines.push('📊 **Weekly Productivity Report:**\n');
        const weekData = LifeOS.Analytics.getWeeklyProductivity();
        let totalTasks = 0, totalFocus = 0, totalHabits = 0;
        weekData.forEach(d => {
          totalTasks += d.tasksCompleted;
          totalFocus += d.focusMinutes;
          totalHabits += d.habitsCompleted;
        });

        lines.push(`📋 Tasks completed: **${totalTasks}**`);
        lines.push(`⏱️ Focus time: **${_minsToStr(totalFocus)}**`);
        lines.push(`🎯 Habits logged: **${totalHabits}**`);
        lines.push(`📈 Completion rate: **${LifeOS.Analytics.getCompletionRate(7)}%**`);

        const lifeScore = LifeOS.AI.calculateLifeScore();
        lines.push(`\n🏆 **Life Score:** ${lifeScore}/100`);

        const burnout = LifeOS.AI.calculateBurnoutRisk();
        const burnoutEmoji = burnout.level === 'low' ? '🟢' : burnout.level === 'moderate' ? '🟡' : '🔴';
        lines.push(`${burnoutEmoji} **Burnout Risk:** ${burnout.level} (${burnout.risk}/100)`);
      } else {
        lines.push('📊 **Today\'s Summary:**\n');
        const todayCompleted = LifeOS.Tasks.getCompletedCount(_today());
        const dueTodayCount = LifeOS.Tasks.getDueToday().length;
        const overdueCount = LifeOS.Tasks.getOverdue().length;
        const focusMin = LifeOS.FocusSessions.getTodayMinutes();
        const habits = LifeOS.Habits.getAll();
        const habitsCompleted = LifeOS.Habits.getTodayCompletedCount();

        lines.push(`📋 Tasks completed today: **${todayCompleted}** (${dueTodayCount} remaining)`);
        if (overdueCount > 0) lines.push(`⚠️ Overdue tasks: **${overdueCount}**`);
        lines.push(`⏱️ Focus logged: **${_minsToStr(focusMin)}**`);
        lines.push(`🎯 Habits logged: **${habitsCompleted}/${habits.length}**`);

        const lifeScore = LifeOS.AI.calculateLifeScore();
        lines.push(`\n🏆 **Life Score:** ${lifeScore}/100`);
      }

      return { success: true, response: lines.join('\n') };
    },

    _findFreeTime({ date }) {
      const events = LifeOS.Events.getByDate(date).sort(
        (a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00')
      );

      const freeSlots = [];
      const dayStart = 8;
      const dayEnd = 20;
      let cursor = dayStart;

      events.forEach(e => {
        if (!e.startTime) return;
        const evtStart = parseInt(e.startTime.split(':')[0], 10);
        const evtEnd = parseInt(e.endTime.split(':')[0], 10) || evtStart + 1;

        if (evtStart > cursor) {
          freeSlots.push({
            start: `${String(cursor).padStart(2, '0')}:00`,
            end: `${String(evtStart).padStart(2, '0')}:00`,
            duration: evtStart - cursor,
          });
        }
        cursor = Math.max(cursor, evtEnd);
      });

      if (cursor < dayEnd) {
        freeSlots.push({
          start: `${String(cursor).padStart(2, '0')}:00`,
          end: `${String(dayEnd).padStart(2, '0')}:00`,
          duration: dayEnd - cursor,
        });
      }

      if (freeSlots.length === 0) {
        return {
          success: true,
          response: '📅 Schedule is packed — no free slots between 8 AM and 8 PM.',
        };
      }

      let lines = ['🕐 **Free slots today:**\n'];
      freeSlots.forEach(s => {
        lines.push(`• ${_prettyTime(s.start)} – ${_prettyTime(s.end)} (${_p(s.duration, 'hour')})`);
      });

      return { success: true, response: lines.join('\n') };
    },

    _greeting() {
      const user = LifeOS.User.get();
      const firstName = (user.name || 'there').split(' ')[0];
      const tod = _timeOfDay();
      const greetings = {
        morning: [`Good morning, ${firstName}! ☀️ Ready to make today count?`, `Hey ${firstName}, morning! Let's crush today's goals.`],
        afternoon: [`Good afternoon, ${firstName}! 👋 How's productivity holding up?`, `Hey ${firstName}! Afternoon check-in — need anything?`],
        evening: [`Good evening, ${firstName}! 🌅 Need help winding down?`, `Evening, ${firstName}! Let's review today's achievements.`],
        night: [`Still working, ${firstName}? 🦉 Don't forget to get some rest!`, `Burning the midnight oil, ${firstName}? Let me know if you need anything.`]
      };
      const opts = greetings[tod] || greetings.afternoon;
      const msg = opts[Math.floor(Math.random() * opts.length)];

      const overdue = LifeOS.Tasks.getOverdue().length;
      const dueToday = LifeOS.Tasks.getDueToday().length;
      let status = '';
      if (overdue > 0) status = `\n\n⚠️ Quick note: you have **${overdue} overdue tasks**.`;
      else if (dueToday > 0) status = `\n\n📋 You have **${dueToday} tasks** due today.`;

      return { success: true, response: msg + status };
    },

    _help() {
      return {
        success: true,
        response: [
          '🤖 **AI Secretary Command Directory:**\n',
          '**🗓️ Schedule & Tasks**',
          '• "Schedule study group at 3pm tomorrow"',
          '• "Add task finish bio paper due Friday"',
          '• "Block 2 hours for design layout"',
          '• "Move overdue tasks to tomorrow"',
          '• "Remind me to submit project on Sunday"',
          '',
          '**🥗 Health & Nutrition**',
          '• "I ate 2 eggs and whole wheat bread for breakfast"',
          '• "Log oatmeal for lunch"',
          '• "Log 3 glasses of water"',
          '• "Log sleep 8 hours with quality 5"',
          '• "I feel great: got an A on my exam"',
          '• "Journal: today was extremely productive"',
          '',
          '**💰 Finance & Budgets**',
          '• "Spent $12.50 on lunch in food"',
          '• "Spent $45 on gas in transport"',
          '• "Earned $150 from coding freelance"',
          '',
          '**🔍 Analytics & Queries**',
          '• "What\'s my schedule today?"',
          '• "How am I doing on my goals?"',
          '• "How much screen time today?"',
          '• "Search notes passwords"',
          '• "Explain compound interest" — pulls from reads library',
          '• "Start focus session"',
          '• "Clear chat" — resets history',
        ].join('\n'),
      };
    },

    _thanks() {
      const replies = [
        'You\'re welcome! 😊 Let me know if you need anything else.',
        'Happy to help! 🙌',
        'Anytime! That\'s what I\'m here for. 💪'
      ];
      return {
        success: true,
        response: replies[Math.floor(Math.random() * replies.length)],
      };
    },

    _clearChat() {
      _clearHistory();
      return {
        success: true,
        response: '🗑️ Conversational history cleared. Fresh start! What can I do for you?',
      };
    },

    _unknown() {
      const fallbacks = [
        "I'm not sure I understood that. Try asking me to schedule an event, log a meal, add a task, or log an expense!",
        "Hmm, I didn't catch that command. Type **help** to see everything I can do!"
      ];
      return {
        success: false,
        response: '🤔 ' + fallbacks[Math.floor(Math.random() * fallbacks.length)],
      };
    },

    _progressBar(pct) {
      const filled = Math.round(pct / 10);
      return '█'.repeat(filled) + '░'.repeat(10 - filled);
    },
  };

  // ═══════════════════════════════════════════
  //  SMART SUGGESTIONS ENGINE
  // ═══════════════════════════════════════════
  const SmartSuggestions = {
    getCurrent() {
      const suggestions = [];
      const hour = _hour();
      const tod = _timeOfDay();

      const overdue = LifeOS.Tasks.getOverdue();
      if (overdue.length > 0) {
        suggestions.push({
          message: `You have ${_p(overdue.length, 'overdue task')}. Top priority: "${overdue[0].title}". Want to reschedule them?`,
          icon: '⚠️',
          priority: 10,
        });
      }

      if (tod === 'morning') {
        const dueToday = LifeOS.Tasks.getDueToday();
        suggestions.push({ message: `Good morning! You have ${_p(dueToday.length, 'task')} due today.`, icon: '🌅', priority: 7 });
      }

      const burnout = LifeOS.AI.calculateBurnoutRisk();
      if (burnout.level === 'high') {
        suggestions.push({
          message: '🚨 Workload is heavy! Take a short break or reschedule low-priority items.',
          icon: '🔴',
          priority: 9,
        });
      }

      suggestions.sort((a, b) => b.priority - a.priority);
      return suggestions[0] || {
        message: 'All caught up! Looking good. 🌟',
        icon: '✨',
        priority: 0,
      };
    },

    getAll() {
      const result = [];
      const overdue = LifeOS.Tasks.getOverdue();
      if (overdue.length > 0) {
        result.push({ message: `${_p(overdue.length, 'overdue task')} needs attention.`, icon: '⚠️', action: 'query_schedule' });
      }
      const dueToday = LifeOS.Tasks.getDueToday();
      if (dueToday.length > 0) {
        result.push({ message: `${_p(dueToday.length, 'task')} due today.`, icon: '📋', action: 'query_schedule' });
      }
      return result;
    }
  };

  // ── Quick Actions ──
  const QuickActions = [
    { label: '🤔 What should I do now?',  command: 'What should I work on next?' },
    { label: '📊 Summarize my day',       command: 'Summarize my day' },
    { label: '🕐 Find free time today',   command: 'Find free time today' },
    { label: '🎯 Am I on track?',         command: 'How am I doing on my goals?' },
    { label: '⏱️ Start focus session',     command: 'Start focus session' },
    { label: '📅 Today\'s schedule',       command: 'What\'s my schedule today?' },
    { label: '📅 Tomorrow\'s schedule',    command: 'What\'s my schedule tomorrow?' },
    { label: '📊 Weekly report',           command: 'Weekly productivity report' },
  ];

  // ── History Helpers ──
  function _loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function _saveHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  }

  function _clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function _addToHistory(role, content) {
    const history = _loadHistory();
    history.push({ role, content, timestamp: new Date().toISOString() });
    _saveHistory(history);
  }

  function _handleSessionState(s) {
    const cleanLower = s.trim().toLowerCase();
    
    if (cleanLower === 'cancel' || cleanLower === 'stop' || cleanLower === 'exit') {
      _sessionState = { pendingAction: null, data: {} };
      return {
        success: true,
        response: '🚫 Conversation and current command have been reset.',
        type: 'cancel'
      };
    }

    switch (_sessionState.pendingAction) {
      case 'schedule_event_title':
        _sessionState.data.title = CommandParser._titleCase(s);
        _sessionState.pendingAction = 'schedule_event_date';
        return {
          success: true,
          response: `Got it: **"${_sessionState.data.title}"**. \n\n**When should we schedule it?** (e.g. today, tomorrow, Friday, 06/25)`,
          type: 'clarification'
        };

      case 'schedule_event_date':
        const pDate = DateParser.parse(s);
        if (!pDate) {
          return {
            success: false,
            response: `I couldn't understand that date. Please try again (e.g. "tomorrow", "Friday") or type **cancel** to abort.`,
            type: 'clarification'
          };
        }
        _sessionState.data.date = pDate;
        _sessionState.pendingAction = 'schedule_event_time';
        return {
          success: true,
          response: `Date set to **${_prettyDate(pDate)}**. \n\n**At what time?** (e.g. 3:00 PM, 10:30 AM, 16:00)`,
          type: 'clarification'
        };

      case 'schedule_event_time':
        const pTime = TimeParser.parse(s);
        if (!pTime) {
          return {
            success: false,
            response: `I couldn't understand that time. Please try again (e.g. "3 PM", "10:30 AM") or type **cancel** to abort.`,
            type: 'clarification'
          };
        }
        const finalTitle = _sessionState.data.title;
        const finalDate = _sessionState.data.date;
        _sessionState = { pendingAction: null, data: {} }; // Clear state
        
        const eventRes = ActionExecutor._scheduleEvent({ title: finalTitle, date: finalDate, time: pTime });
        return {
          success: true,
          response: eventRes.response,
          type: 'schedule_event',
          data: eventRes.details
        };

      case 'add_task_title':
        _sessionState.data.title = CommandParser._titleCase(s);
        _sessionState.pendingAction = 'add_task_duedate';
        return {
          success: true,
          response: `Got it: **"${_sessionState.data.title}"**. \n\n**When is it due?** (e.g. tomorrow, Friday, or type **none** for no due date)`,
          type: 'clarification'
        };

      case 'add_task_duedate':
        let dueDate = null;
        if (cleanLower !== 'none' && cleanLower !== 'no' && cleanLower !== 'no due date') {
          dueDate = DateParser.parse(s);
          if (!dueDate) {
            return {
              success: false,
              response: `I couldn't parse that date. Please try again (e.g. "tomorrow", "Friday") or type **none**.`,
              type: 'clarification'
            };
          }
        }
        const finalTaskTitle = _sessionState.data.title;
        _sessionState = { pendingAction: null, data: {} }; // Clear state
        
        const taskRes = ActionExecutor._addTask({ title: finalTaskTitle, dueDate });
        return {
          success: true,
          response: taskRes.response,
          type: 'add_task',
          data: taskRes.details
        };

      case 'log_expense_amount':
        const amtVal = parseFloat(s.replace(/[^0-9.]/g, ''));
        if (isNaN(amtVal) || amtVal <= 0) {
          return {
            success: false,
            response: `Please enter a valid amount (e.g. 15 or 24.50).`,
            type: 'clarification'
          };
        }
        _sessionState.data.amount = amtVal;
        _sessionState.pendingAction = 'log_expense_title';
        return {
          success: true,
          response: `Amount set to **$${amtVal.toFixed(2)}**. \n\n**What was this purchase for?** (e.g. lunch, gas, rent)`,
          type: 'clarification'
        };

      case 'log_expense_title':
        _sessionState.data.title = CommandParser._titleCase(s);
        _sessionState.pendingAction = 'log_expense_category';
        const cats = Finance.categories.map(c => c.name).join(', ');
        return {
          success: true,
          response: `Description set to **"${_sessionState.data.title}"**. \n\n**Which category does this match?** \nCategories: _${cats}_`,
          type: 'clarification'
        };

      case 'log_expense_category':
        const catObj = Finance.categories.find(c => c.name.toLowerCase() === cleanLower || c.id.toLowerCase() === cleanLower || c.name.toLowerCase().includes(cleanLower));
        if (!catObj) {
          const catList = Finance.categories.map(c => `• ${c.name}`).join('\n');
          return {
            success: false,
            response: `I didn't recognize that category. Please select from one of these:\n${catList}`,
            type: 'clarification'
          };
        }
        const expenseAmt = _sessionState.data.amount;
        const expenseTitle = _sessionState.data.title;
        _sessionState = { pendingAction: null, data: {} }; // Clear state
        
        const expenseRes = ActionExecutor._addExpenseDirect({ title: expenseTitle, amount: expenseAmt, category: catObj.id });
        return {
          success: true,
          response: expenseRes.response,
          type: 'log_expense',
          data: expenseRes.details
        };

      case 'log_custom_food_calories':
        const cal = parseInt(s.replace(/[^0-9]/g, ''), 10);
        if (isNaN(cal) || cal <= 0) {
          return {
            success: false,
            response: `Please specify a valid number of calories.`,
            type: 'clarification'
          };
        }
        const foodNm = _sessionState.data.foodName;
        const foodMl = _sessionState.data.meal || 'Snacks';
        _sessionState = { pendingAction: null, data: {} }; // Clear state

        const entry = {
          foodName: foodNm,
          calories: cal,
          protein: 0,
          carbs: 0,
          fat: 0,
          meal: CommandParser._titleCase(foodMl),
          servingCount: _sessionState.data.servingCount || 1,
          date: _today()
        };
        Food.log.add(entry);
        return {
          success: true,
          response: `✅ Logged custom item **"${foodNm}"** (${cal} cal) for **${entry.meal}** 🍎.`,
          type: 'log_food',
          data: entry
        };
    }
    
    return { success: false, response: "I'm having trouble handling this step." };
  }

  // ── Public API ──
  const api = {
    processCommand(input) {
      const cmd = CommandParser.parse(input);
      const result = ActionExecutor.execute(cmd);
      return {
        type: cmd.type,
        response: result.response,
        action: cmd.type,
        data: result.details || cmd.data,
        success: result.success,
        confidence: cmd.confidence,
      };
    },

    getGreeting() {
      const user = LifeOS.User.get();
      const firstName = (user.name || 'there').split(' ')[0];
      const tod = _timeOfDay();

      const greetMap = {
        morning:   `Good morning, ${firstName}! ☀️`,
        afternoon: `Good afternoon, ${firstName}! 🌤️`,
        evening:   `Good evening, ${firstName}! 🌙`,
        night:     `Hey ${firstName}, burning the midnight oil? 🦉`,
      };

      const greeting = greetMap[tod] || greetMap.afternoon;

      const overdue = LifeOS.Tasks.getOverdue().length;
      const dueToday = LifeOS.Tasks.getDueToday().length;
      const events = LifeOS.Events.getToday().length;

      let status = '';
      if (overdue > 0) status += ` ⚠️ ${_p(overdue, 'overdue task')}.`;
      if (dueToday > 0) status += ` 📋 ${_p(dueToday, 'task')} due today.`;
      if (events > 0) status += ` 📅 ${_p(events, 'event')} scheduled.`;
      if (!status) status = ' ✨ Your schedule is clear!';

      return greeting + status;
    },

    getMorningBriefing() {
      const user = LifeOS.User.get();
      const firstName = (user.name || 'there').split(' ')[0];
      const briefing = LifeOS.AI.generateBriefing();
      const burnout = LifeOS.AI.calculateBurnoutRisk();
      const lifeScore = LifeOS.AI.calculateLifeScore();
      const procrastination = LifeOS.AI.detectProcrastination();
      const conflicts = LifeOS.AI.detectConflicts();

      const lines = [
        `☀️ **Good Morning, ${firstName}! Here's your daily briefing:**\n`,
        '---',
        '',
      ];

      lines.push('**📊 At a Glance:**');
      lines.push(`• 📋 ${_p(briefing.tasks.length, 'task')} due today`);
      lines.push(`• ⚠️ ${_p(briefing.overdue.length, 'overdue task')}`);
      lines.push(`• 📅 ${_p(briefing.events.length, 'event')} scheduled`);
      lines.push(`• 🎯 ${briefing.habitsCompleted}/${briefing.habitsCount} habits completed`);
      lines.push(`• 🏆 Life Score: ${lifeScore}/100`);
      lines.push('');

      if (briefing.events.length > 0) {
        lines.push('**📅 Today\'s Events:**');
        briefing.events
          .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
          .forEach(e => {
            const time = e.startTime ? `${_prettyTime(e.startTime)} – ${_prettyTime(e.endTime)}` : 'All day';
            lines.push(`• ${time} — ${e.title}${e.location ? ' (📍 ' + e.location + ')' : ''}`);
          });
        lines.push('');
      }

      if (briefing.tasks.length > 0) {
        lines.push('**📋 Priority Tasks for Today:**');
        briefing.tasks
          .sort((a, b) => {
            const pw = { critical: 4, high: 3, medium: 2, low: 1 };
            return (pw[b.priority] || 1) - (pw[a.priority] || 1);
          })
          .slice(0, 5)
          .forEach(t => {
            const pIcon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[t.priority] || '⚪';
            lines.push(`• ${pIcon} ${t.title} (${t.priority}${t.estimatedMinutes ? ', ~' + _minsToStr(t.estimatedMinutes) : ''})`);
          });
        lines.push('');
      }

      if (briefing.overdue.length > 0) {
        lines.push('**⚠️ Overdue — Needs Attention:**');
        briefing.overdue.slice(0, 3).forEach(t => {
          lines.push(`• "${t.title}" — was due ${_prettyDate(t.dueDate)}`);
        });
        if (briefing.overdue.length > 3) {
          lines.push(`• ... and ${briefing.overdue.length - 3} more.`);
        }
        lines.push('');
      }

      if (conflicts.length > 0) {
        lines.push('**🔴 Conflicts Detected:**');
        conflicts.forEach(c => lines.push(`• ${c.message}`));
        lines.push('');
      }

      if (procrastination.length > 0) {
        lines.push('**⏳ Procrastination Alert:**');
        procrastination.slice(0, 2).forEach(p => lines.push(`• ${p.message}`));
        lines.push('');
      }

      const burnoutEmoji = burnout.level === 'low' ? '🟢' : burnout.level === 'moderate' ? '🟡' : '🔴';
      lines.push(`**💡 Wellness:** ${burnoutEmoji} Burnout risk: ${burnout.level} (${burnout.risk}/100)`);
      lines.push(`${burnout.recommendations[0]}`);
      lines.push('');
      lines.push('---');
      lines.push('_Type a command or click a Quick Action below to get started!_');

      return lines.join('\n');
    },

    getSmartSuggestion() {
      return SmartSuggestions.getCurrent();
    },

    getSmartSuggestions() {
      return SmartSuggestions.getAll();
    },

    getProductivityReport(period = 'today') {
      const result = ActionExecutor.execute({
        type: 'productivity_report',
        data: { period },
      });
      return result.response;
    },

    executeAction(action) {
      return ActionExecutor.execute(action);
    },

    chat(message) {
      if (!message || !message.trim()) {
        return { role: 'assistant', content: 'I didn\'t catch that. Could you say something?', type: 'empty', success: false };
      }

      _addToHistory('user', message.trim());

      if (_sessionState.pendingAction) {
        const result = _handleSessionState(message.trim());
        _addToHistory('assistant', result.response);
        return {
          role: 'assistant',
          content: result.response,
          type: result.type,
          success: result.success,
          confidence: result.confidence ?? 1.0,
          data: result.data,
        };
      }

      // Always try the Next.js API first to leverage the full "thinking" companion
      return fetch('/api/secretary/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message.trim() })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('API request failed');
        }
        return response.json();
      })
      .then(data => {
        if (data && data.success) {
          const reply = data.response;
          _addToHistory('assistant', reply);

          // Execute any actions returned by the thinking companion
          if (Array.isArray(data.actions)) {
            data.actions.forEach(action => {
              try {
                console.log(`🤖 AI Companion executing action:`, action);
                const actionResult = ActionExecutor.execute({ type: action.type, data: action.data });
                if (actionResult && actionResult.success) {
                  if (typeof App !== 'undefined' && App.toast) {
                    App.toast(`✨ ${actionResult.response || 'Action executed!'}`, 'success');
                  }
                }
              } catch (actErr) {
                console.warn('Failed to execute AI Companion action:', action, actErr);
              }
            });
          }

          return {
            role: 'assistant',
            content: reply,
            type: 'gemini_response',
            success: true,
            confidence: 1.0,
            data: { actions: data.actions }
          };
        } else {
          throw new Error(data.error || 'Invalid API response');
        }
      })
      .catch(err => {
        console.warn('AI Companion API failed, falling back to local regex NLP:', err);
        const cmd = CommandParser.parse(message.trim());
        const fallbackResult = ActionExecutor.execute(cmd);
        _addToHistory('assistant', fallbackResult.response);
        return {
          role: 'assistant',
          content: fallbackResult.response,
          type: cmd.type,
          success: fallbackResult.success,
          confidence: cmd.confidence ?? 1.0,
          data: fallbackResult.details || cmd.data,
        };
      });
    },

    getHistory() {
      return _loadHistory();
    },

    clearHistory() {
      _clearHistory();
    },

    quickAction(type) {
      const map = {
        briefing: "What's my daily briefing?",
        suggest: 'What should I work on next?',
        schedule: "What's my schedule today?",
        report: 'Weekly productivity report',
        freetime: 'Find free time today',
        goals: 'How am I doing on my goals?',
        focus: 'Start focus session',
        summary: 'Summarize my day',
      };
      const cmd = map[type] || type;
      
      if (typeof App !== 'undefined' && App.addChatMessage) {
        App.addChatMessage('user', cmd);
      }
      
      const result = this.chat(cmd);
      
      if (typeof App !== 'undefined' && App.addChatMessage) {
        App.addChatMessage('assistant', result.content);
        
        if (result.success && App.navigate) {
          App.navigate(App.currentPage);
        }
      }
      return result;
    },

    getQuickActions() {
      return QuickActions;
    },

    // ── Exposed sub-modules ──
    DateParser,
    TimeParser,
    DurationParser,
    CommandParser,
    SmartSuggestions,
    QuickActions,
  };

  return api;
})();
