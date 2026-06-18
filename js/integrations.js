/* ============================================
   LifeOS — App Integrations Hub
   Import / Export / External-App Connectors
   ============================================ */

const Integrations = (() => {
  'use strict';

  // ── Storage ──
  const IMPORT_KEY = 'lifeos_imports';

  function _getHistory() {
    try { return JSON.parse(localStorage.getItem(IMPORT_KEY)) || []; }
    catch { return []; }
  }
  function _setHistory(h) { localStorage.setItem(IMPORT_KEY, JSON.stringify(h)); }

  // ── Available Integrations ──
  const apps = [
    { id: 'google_calendar', name: 'Google Calendar', icon: '📅', color: '#4285f4', status: 'available', description: 'Import/export events via .ics files' },
    { id: 'canvas_lms',      name: 'Canvas LMS',      icon: '🎓', color: '#e13f29', status: 'available', description: 'Import assignments and deadlines' },
    { id: 'notion',          name: 'Notion',           icon: '📝', color: '#000000', status: 'available', description: 'Import tasks from Notion exports' },
    { id: 'todoist',         name: 'Todoist',          icon: '✅', color: '#e44232', status: 'available', description: 'Import tasks from CSV export' },
    { id: 'spotify',         name: 'Spotify',          icon: '🎵', color: '#1db954', status: 'available', description: 'Focus music during deep work' },
    { id: 'github',          name: 'GitHub',           icon: '💻', color: '#333',    status: 'available', description: 'Track coding activity' },
  ];

  /* ─────────────────────────────────────────────
     ICS Parser — handles VCALENDAR / VEVENT / VTIMEZONE
     Parses DTSTART / DTEND in:
       DATE only  — 20240615
       DATETIME   — 20240615T140000
       DATETIME Z — 20240615T140000Z
       VALUE=DATE — DTSTART;VALUE=DATE:20240615
     Also unfolds continuation lines (RFC 5545 §3.1).
     ───────────────────────────────────────────── */
  function _unfoldICS(raw) {
    // Lines beginning with a space or tab are continuations of the previous line
    return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
  }

  function _parseICSDate(val) {
    // val can be: "20240615", "20240615T140000", "20240615T140000Z",
    //   "TZID=America/New_York:20240615T140000"
    if (!val) return null;
    // Strip TZID= prefix if present
    const colonIdx = val.indexOf(':');
    if (val.toUpperCase().startsWith('TZID') && colonIdx !== -1) {
      val = val.substring(colonIdx + 1);
    }
    val = val.trim();

    // DATE only (8 digits)
    if (/^\d{8}$/.test(val)) {
      const y = +val.slice(0, 4), m = +val.slice(4, 6) - 1, d = +val.slice(6, 8);
      const dt = new Date(y, m, d);
      return { date: _fmtDate(dt), time: null, allDay: true, jsDate: dt };
    }
    // DATETIME (15+ chars), possibly with trailing Z
    const match = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
    if (match) {
      const [, yr, mo, dy, hh, mm, ss, utc] = match;
      const dt = utc
        ? new Date(Date.UTC(+yr, +mo - 1, +dy, +hh, +mm, +ss))
        : new Date(+yr, +mo - 1, +dy, +hh, +mm, +ss);
      return {
        date: _fmtDate(dt),
        time: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`,
        allDay: false,
        jsDate: dt,
      };
    }
    return null;
  }

  function _fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function _extractProp(lines, name) {
    // Property names can have params (e.g. DTSTART;VALUE=DATE:...)
    for (const ln of lines) {
      const upper = ln.toUpperCase();
      if (upper.startsWith(name.toUpperCase() + ':') || upper.startsWith(name.toUpperCase() + ';')) {
        // Everything after the first colon is the value
        const idx = ln.indexOf(':');
        if (idx === -1) return '';
        return ln.substring(idx + 1).trim();
      }
    }
    return '';
  }

  function _extractDateProp(lines, name) {
    for (const ln of lines) {
      const upper = ln.toUpperCase();
      if (upper.startsWith(name.toUpperCase() + ':') || upper.startsWith(name.toUpperCase() + ';')) {
        // May include params before value, e.g. DTSTART;TZID=...:20240615T140000
        const idx = ln.indexOf(':');
        if (idx === -1) return null;
        const rawVal = ln.substring(idx + 1).trim();
        // Check for TZID in the params section
        const paramSection = ln.substring(0, idx);
        const tzMatch = paramSection.match(/TZID=([^;:]+)/i);
        if (tzMatch) {
          return _parseICSDate('TZID=' + tzMatch[1] + ':' + rawVal);
        }
        return _parseICSDate(rawVal);
      }
    }
    return null;
  }

  function importICS(icsString) {
    const errors = [];
    let imported = 0;
    let skipped = 0;

    try {
      const unfolded = _unfoldICS(icsString);
      const lines = unfolded.split('\n');

      // Extract VEVENT blocks
      const events = [];
      let inEvent = false;
      let eventLines = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toUpperCase() === 'BEGIN:VEVENT') {
          inEvent = true;
          eventLines = [];
        } else if (trimmed.toUpperCase() === 'END:VEVENT') {
          inEvent = false;
          events.push(eventLines);
        } else if (inEvent) {
          eventLines.push(trimmed);
        }
      }

      if (events.length === 0) {
        errors.push('No VEVENT blocks found in the .ics file');
        return { imported: 0, skipped: 0, errors };
      }

      for (const evLines of events) {
        try {
          const summary = _extractProp(evLines, 'SUMMARY');
          if (!summary) { skipped++; continue; }

          const dtStart = _extractDateProp(evLines, 'DTSTART');
          const dtEnd   = _extractDateProp(evLines, 'DTEND');
          const location    = _extractProp(evLines, 'LOCATION');
          const description = _extractProp(evLines, 'DESCRIPTION').replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\');

          if (!dtStart) { skipped++; errors.push(`Skipped "${summary}" — could not parse DTSTART`); continue; }

          // Calculate end time (default: 1 hour later for non-all-day)
          let endTime = dtEnd ? dtEnd.time : null;
          if (!endTime && dtStart.time) {
            const parts = dtStart.time.split(':');
            endTime = `${String((+parts[0] + 1) % 24).padStart(2, '0')}:${parts[1]}`;
          }

          const eventData = {
            title: summary,
            date: dtStart.date,
            startTime: dtStart.time || '00:00',
            endTime: endTime || '23:59',
            location: location || '',
            description: description || '',
            category: 'imported',
            color: '#4285f4',
            allDay: dtStart.allDay || false,
            source: 'ics_import',
          };

          LifeOS.Events.create(eventData);
          imported++;
        } catch (e) {
          skipped++;
          errors.push(`Error parsing event: ${e.message}`);
        }
      }
    } catch (e) {
      errors.push(`ICS parse error: ${e.message}`);
    }

    if (imported > 0) logImport('ICS Calendar', imported, 'events');
    return { imported, skipped, errors };
  }

  /* ─────────────────────────────────────────────
     CSV Parser
     – Handles quoted fields, commas within quotes,
       escaped double-quotes (""), \r\n / \n / \r.
     ───────────────────────────────────────────── */
  function _parseCSVRow(row) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (inQuotes) {
        if (ch === '"') {
          // Escaped quote "" → literal "
          if (i + 1 < row.length && row[i + 1] === '"') {
            current += '"';
            i++; // skip next quote
          } else {
            inQuotes = false; // closing quote
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  }

  function _splitCSVLines(csv) {
    // Split respecting quoted fields that span multiple lines
    const lines = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
      const ch = csv[i];
      if (ch === '"') inQuotes = !inQuotes;

      if (!inQuotes && (ch === '\n' || ch === '\r')) {
        // Handle \r\n
        if (ch === '\r' && i + 1 < csv.length && csv[i + 1] === '\n') i++;
        if (current.trim()) lines.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) lines.push(current);
    return lines;
  }

  function importCSV(csvString, mapping) {
    const defaultMapping = { title: 0, description: 1, dueDate: 2, priority: 3, category: 4 };
    const map = { ...defaultMapping, ...mapping };
    const errors = [];
    let imported = 0;
    let skipped = 0;

    try {
      const rows = _splitCSVLines(csvString);
      if (rows.length === 0) {
        errors.push('CSV file is empty');
        return { imported: 0, skipped: 0, errors };
      }

      // Detect if first row is a header
      const firstRow = _parseCSVRow(rows[0]);
      const isHeader = firstRow.some(f =>
        /^(title|name|task|description|due|date|priority|category|status)$/i.test(f)
      );

      // If the first row looks like a header, try to auto-detect mapping
      let autoMap = { ...map };
      if (isHeader) {
        firstRow.forEach((header, idx) => {
          const h = header.toLowerCase().trim();
          if (/^(title|name|task)$/.test(h))                autoMap.title = idx;
          if (/^(description|details|notes|content)$/.test(h)) autoMap.description = idx;
          if (/^(due|due.?date|date|deadline)$/.test(h))    autoMap.dueDate = idx;
          if (/^(priority|urgency|importance)$/.test(h))    autoMap.priority = idx;
          if (/^(category|label|project|tag|list)$/.test(h)) autoMap.category = idx;
        });
      }

      const startIdx = isHeader ? 1 : 0;

      for (let i = startIdx; i < rows.length; i++) {
        try {
          const fields = _parseCSVRow(rows[i]);
          const title = fields[autoMap.title];
          if (!title) { skipped++; continue; }

          // Normalise priority
          let priority = (fields[autoMap.priority] || '').toLowerCase().trim();
          if (!['high', 'medium', 'low'].includes(priority)) {
            if (/^[1]$|^p1$/i.test(priority)) priority = 'high';
            else if (/^[2]$|^p2$/i.test(priority)) priority = 'medium';
            else if (/^[3-9]$|^p[3-9]$/i.test(priority)) priority = 'low';
            else priority = 'medium';
          }

          const taskData = {
            title: title,
            description: fields[autoMap.description] || '',
            dueDate: _normDate(fields[autoMap.dueDate]),
            priority: priority,
            category: fields[autoMap.category] || 'imported',
            status: 'pending',
            progress: 0,
            subtasks: [],
            source: 'csv_import',
          };

          LifeOS.Tasks.create(taskData);
          imported++;
        } catch (e) {
          skipped++;
          errors.push(`Row ${i + 1}: ${e.message}`);
        }
      }
    } catch (e) {
      errors.push(`CSV parse error: ${e.message}`);
    }

    if (imported > 0) logImport('CSV', imported, 'tasks');
    return { imported, skipped, errors };
  }

  /** Try to coerce a date-like string into YYYY-MM-DD */
  function _normDate(val) {
    if (!val) return '';
    val = val.trim();
    // Already ISO?
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
    // US format MM/DD/YYYY
    const us = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
    // Try native Date parsing
    const d = new Date(val);
    if (!isNaN(d.getTime())) return _fmtDate(d);
    return '';
  }

  /* ─────────────────────────────────────────────
     JSON Import — auto-detects tasks / events / goals
     Accepts:
       { tasks: [...], events: [...], goals: [...] }
       or a flat array of objects with a "type" field
       or a Notion-style array of page objects
     ───────────────────────────────────────────── */
  function importJSON(jsonString) {
    const errors = [];
    const types = { tasks: 0, events: 0, goals: 0 };
    let imported = 0;

    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;

      // Structured export format
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (Array.isArray(data.tasks)) {
          for (const t of data.tasks) {
            try {
              LifeOS.Tasks.create({
                title: t.title || t.name || 'Untitled',
                description: t.description || t.notes || '',
                dueDate: _normDate(t.dueDate || t.due_date || t.due || ''),
                priority: t.priority || 'medium',
                category: t.category || t.project || 'imported',
                status: t.status || t.completed ? 'completed' : 'pending',
                progress: t.progress || 0,
                subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
                source: 'json_import',
              });
              types.tasks++;
              imported++;
            } catch (e) { errors.push(`Task "${t.title}": ${e.message}`); }
          }
        }
        if (Array.isArray(data.events)) {
          for (const ev of data.events) {
            try {
              LifeOS.Events.create({
                title: ev.title || ev.name || 'Untitled',
                date: _normDate(ev.date || ev.start_date || ''),
                startTime: ev.startTime || ev.start_time || ev.time || '09:00',
                endTime: ev.endTime || ev.end_time || '10:00',
                location: ev.location || '',
                description: ev.description || '',
                category: ev.category || 'imported',
                color: ev.color || '#6c5ce7',
                source: 'json_import',
              });
              types.events++;
              imported++;
            } catch (e) { errors.push(`Event "${ev.title}": ${e.message}`); }
          }
        }
        if (Array.isArray(data.goals)) {
          for (const g of data.goals) {
            try {
              LifeOS.Goals.create({
                title: g.title || g.name || 'Untitled',
                description: g.description || '',
                scope: g.scope || 'semester',
                category: g.category || 'personal',
                progress: g.progress || 0,
                milestones: Array.isArray(g.milestones) ? g.milestones : [],
                source: 'json_import',
              });
              types.goals++;
              imported++;
            } catch (e) { errors.push(`Goal "${g.title}": ${e.message}`); }
          }
        }
      }

      // Flat array — detect by "type" field or by shape
      if (Array.isArray(data)) {
        for (const item of data) {
          try {
            const kind = (item.type || '').toLowerCase();
            if (kind === 'event' || item.startTime || item.start_time) {
              LifeOS.Events.create({
                title: item.title || item.name || 'Untitled',
                date: _normDate(item.date || ''),
                startTime: item.startTime || item.start_time || '09:00',
                endTime: item.endTime || item.end_time || '10:00',
                location: item.location || '',
                description: item.description || '',
                category: item.category || 'imported',
                color: item.color || '#6c5ce7',
                source: 'json_import',
              });
              types.events++;
            } else if (kind === 'goal' || item.milestones || item.scope) {
              LifeOS.Goals.create({
                title: item.title || item.name || 'Untitled',
                description: item.description || '',
                scope: item.scope || 'semester',
                category: item.category || 'personal',
                progress: item.progress || 0,
                milestones: Array.isArray(item.milestones) ? item.milestones : [],
                source: 'json_import',
              });
              types.goals++;
            } else {
              // Default to task
              LifeOS.Tasks.create({
                title: item.title || item.name || item.Name || 'Untitled',
                description: item.description || item.notes || '',
                dueDate: _normDate(item.dueDate || item.due_date || item.due || ''),
                priority: item.priority || 'medium',
                category: item.category || item.project || 'imported',
                status: (item.status === 'completed' || item.completed) ? 'completed' : 'pending',
                progress: item.progress || 0,
                subtasks: Array.isArray(item.subtasks) ? item.subtasks : [],
                source: 'json_import',
              });
              types.tasks++;
            }
            imported++;
          } catch (e) { errors.push(`Item "${item.title}": ${e.message}`); }
        }
      }
    } catch (e) {
      errors.push(`JSON parse error: ${e.message}`);
    }

    if (imported > 0) {
      const parts = Object.entries(types).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`);
      logImport('JSON', imported, parts.join(', '));
    }
    return { imported, types, errors };
  }

  /* ─────────────────────────────────────────────
     Canvas LMS Assignment Import (simulated)
     Expects an array of assignment-like objects.
     ───────────────────────────────────────────── */
  function importCanvasAssignments(data) {
    const errors = [];
    let imported = 0;
    let skipped = 0;

    try {
      const assignments = Array.isArray(data) ? data : (data && data.assignments ? data.assignments : []);

      for (const a of assignments) {
        try {
          const title = a.name || a.title;
          if (!title) { skipped++; continue; }

          LifeOS.Tasks.create({
            title: title,
            description: [
              a.description || '',
              a.points_possible ? `Points: ${a.points_possible}` : '',
              a.course_name ? `Course: ${a.course_name}` : '',
              a.submission_types ? `Submit via: ${Array.isArray(a.submission_types) ? a.submission_types.join(', ') : a.submission_types}` : '',
            ].filter(Boolean).join('\n'),
            dueDate: _normDate(a.due_at || a.due_date || a.dueDate || ''),
            priority: (a.points_possible && a.points_possible >= 50) ? 'high' : 'medium',
            category: a.course_name || 'Canvas',
            status: a.has_submitted_submissions ? 'completed' : 'pending',
            progress: a.has_submitted_submissions ? 100 : 0,
            subtasks: [],
            source: 'canvas_import',
            meta: {
              canvasId: a.id,
              courseId: a.course_id,
              points: a.points_possible,
              courseName: a.course_name,
            },
          });
          imported++;
        } catch (e) {
          skipped++;
          errors.push(`Assignment "${a.name}": ${e.message}`);
        }
      }
    } catch (e) {
      errors.push(`Canvas import error: ${e.message}`);
    }

    if (imported > 0) logImport('Canvas LMS', imported, 'assignments');
    return { imported, skipped, errors };
  }

  /* ═════════════════════════════════════════════
     EXPORT FUNCTIONS
     ═════════════════════════════════════════════ */

  function exportICS() {
    const events = LifeOS.Events.getAll();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LifeOS//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:LifeOS Events',
    ];

    for (const ev of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${ev.id}@lifeos`);
      lines.push(`DTSTAMP:${_toICSDateTime(new Date())}`);

      if (ev.allDay) {
        const d = (ev.date || '').replace(/-/g, '');
        lines.push(`DTSTART;VALUE=DATE:${d}`);
        // All-day events: end date is exclusive, so add 1 day
        const endDate = new Date(ev.date);
        endDate.setDate(endDate.getDate() + 1);
        lines.push(`DTEND;VALUE=DATE:${_fmtDate(endDate).replace(/-/g, '')}`);
      } else {
        lines.push(`DTSTART:${_toICSDateTime(_combineDateTime(ev.date, ev.startTime))}`);
        lines.push(`DTEND:${_toICSDateTime(_combineDateTime(ev.date, ev.endTime))}`);
      }

      lines.push(`SUMMARY:${_escICS(ev.title || '')}`);
      if (ev.description) lines.push(`DESCRIPTION:${_escICS(ev.description)}`);
      if (ev.location) lines.push(`LOCATION:${_escICS(ev.location)}`);
      if (ev.category) lines.push(`CATEGORIES:${_escICS(ev.category)}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    const content = lines.join('\r\n');
    downloadFile(content, 'lifeos-events.ics', 'text/calendar');
    return content;
  }

  function _toICSDateTime(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  function _combineDateTime(dateStr, timeStr) {
    const [y, m, d] = (dateStr || '2024-01-01').split('-').map(Number);
    const [h, min] = (timeStr || '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, h, min);
  }

  function _escICS(str) {
    return String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function exportJSON() {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      source: 'LifeOS',
      tasks: LifeOS.Tasks.getAll(),
      events: LifeOS.Events.getAll(),
      goals: LifeOS.Goals.getAll(),
      habits: LifeOS.Habits.getAll(),
      focusSessions: LifeOS.FocusSessions.getAll(),
      settings: LifeOS.Settings.get(),
      user: LifeOS.User.get(),
    };
    const content = JSON.stringify(data, null, 2);
    downloadFile(content, 'lifeos-export.json', 'application/json');
    return content;
  }

  function exportCSV(dataType = 'tasks') {
    let rows = [];
    let filename = 'lifeos-export.csv';

    switch (dataType) {
      case 'tasks': {
        const tasks = LifeOS.Tasks.getAll();
        rows.push(['Title', 'Description', 'Due Date', 'Priority', 'Category', 'Status', 'Progress', 'Created At']);
        for (const t of tasks) {
          rows.push([
            _csvField(t.title), _csvField(t.description), t.dueDate || '',
            t.priority || '', t.category || '', t.status || '',
            String(t.progress || 0), t.createdAt || '',
          ]);
        }
        filename = 'lifeos-tasks.csv';
        break;
      }
      case 'events': {
        const events = LifeOS.Events.getAll();
        rows.push(['Title', 'Date', 'Start Time', 'End Time', 'Location', 'Description', 'Category']);
        for (const e of events) {
          rows.push([
            _csvField(e.title), e.date || '', e.startTime || '', e.endTime || '',
            _csvField(e.location), _csvField(e.description), e.category || '',
          ]);
        }
        filename = 'lifeos-events.csv';
        break;
      }
      case 'goals': {
        const goals = LifeOS.Goals.getAll();
        rows.push(['Title', 'Description', 'Scope', 'Category', 'Progress', 'Created At']);
        for (const g of goals) {
          rows.push([
            _csvField(g.title), _csvField(g.description), g.scope || '',
            g.category || '', String(g.progress || 0), g.createdAt || '',
          ]);
        }
        filename = 'lifeos-goals.csv';
        break;
      }
      default:
        return '';
    }

    const content = rows.map(r => r.join(',')).join('\r\n');
    downloadFile(content, filename, 'text/csv');
    return content;
  }

  function _csvField(val) {
    const s = String(val || '');
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  /* ─────────────────────────────────────────────
     Weekly Report — HTML with inline CSS
     ───────────────────────────────────────────── */
  function exportWeeklyReport() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const startStr = _fmtDate(weekStart);
    const endStr = _fmtDate(weekEnd);

    // Gather data
    const allTasks = LifeOS.Tasks.getAll();
    const completedTasks = allTasks.filter(t => t.completedAt && t.completedAt >= startStr && t.completedAt <= endStr + 'T23:59:59');
    const pendingTasks = allTasks.filter(t => t.status !== 'completed');
    const overdueTasks = allTasks.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate < startStr);
    const events = LifeOS.Events.getByDateRange(startStr, endStr);
    const habits = LifeOS.Habits.getAll();
    const goals = LifeOS.Goals.getAll();
    const focusSessions = LifeOS.FocusSessions.getByDateRange(startStr, endStr);
    const totalFocusMin = focusSessions.reduce((s, f) => s + (f.duration || 0), 0);
    const focusHrs = (totalFocusMin / 60).toFixed(1);
    const userName = LifeOS.User.getName();

    // Per-day focus breakdown
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyFocus = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const ds = _fmtDate(d);
      const mins = focusSessions.filter(f => f.date === ds).reduce((s, f) => s + (f.duration || 0), 0);
      dailyFocus.push({ day: dayNames[d.getDay()], mins });
    }
    const maxFocus = Math.max(...dailyFocus.map(d => d.mins), 1);

    // Format date range
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#6c5ce7 0%,#a855f7 50%,#ec4899 100%);border-radius:16px;padding:32px;color:#fff;text-align:center;">
    <div style="font-size:14px;text-transform:uppercase;letter-spacing:2px;opacity:0.85;margin-bottom:8px;">LifeOS Weekly Report</div>
    <div style="font-size:28px;font-weight:700;margin-bottom:4px;">${escHtml(userName)}'s Week</div>
    <div style="font-size:14px;opacity:0.8;">${fmt(weekStart)} — ${fmt(weekEnd)}</div>
  </div>

  <!-- Stats Cards -->
  <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;">
    <div style="flex:1;min-width:120px;background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="font-size:32px;font-weight:800;color:#6c5ce7;">${completedTasks.length}</div>
      <div style="font-size:12px;color:#666;margin-top:4px;">Tasks Done</div>
    </div>
    <div style="flex:1;min-width:120px;background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="font-size:32px;font-weight:800;color:#1db954;">${focusHrs}h</div>
      <div style="font-size:12px;color:#666;margin-top:4px;">Focus Time</div>
    </div>
    <div style="flex:1;min-width:120px;background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="font-size:32px;font-weight:800;color:#e17055;">${events.length}</div>
      <div style="font-size:12px;color:#666;margin-top:4px;">Events</div>
    </div>
    <div style="flex:1;min-width:120px;background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="font-size:32px;font-weight:800;color:#fdcb6e;">${focusSessions.length}</div>
      <div style="font-size:12px;color:#666;margin-top:4px;">Focus Sessions</div>
    </div>
  </div>

  <!-- Focus Breakdown -->
  <div style="background:#fff;border-radius:12px;padding:24px;margin-top:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="font-size:16px;font-weight:700;margin-bottom:16px;color:#2d3436;">⏱️ Daily Focus Breakdown</div>
    ${dailyFocus.map(d => `
    <div style="display:flex;align-items:center;margin-bottom:8px;">
      <div style="width:36px;font-size:12px;font-weight:600;color:#636e72;">${d.day}</div>
      <div style="flex:1;height:20px;background:#f0f0f0;border-radius:10px;overflow:hidden;">
        <div style="height:100%;width:${Math.round((d.mins / maxFocus) * 100)}%;background:linear-gradient(90deg,#6c5ce7,#a855f7);border-radius:10px;transition:width 0.3s;"></div>
      </div>
      <div style="width:50px;text-align:right;font-size:12px;font-weight:600;color:#636e72;">${d.mins}m</div>
    </div>`).join('')}
  </div>

  <!-- Completed Tasks -->
  <div style="background:#fff;border-radius:12px;padding:24px;margin-top:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="font-size:16px;font-weight:700;margin-bottom:16px;color:#2d3436;">✅ Completed Tasks (${completedTasks.length})</div>
    ${completedTasks.length === 0 ? '<div style="color:#b2bec3;font-style:italic;font-size:14px;">No tasks completed this week.</div>' :
      completedTasks.slice(0, 15).map(t => `
    <div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;">
      <div style="width:20px;height:20px;border-radius:50%;background:#00b894;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">✓</div>
      <div style="margin-left:12px;flex:1;">
        <div style="font-size:14px;font-weight:500;color:#2d3436;">${escHtml(t.title)}</div>
        <div style="font-size:11px;color:#b2bec3;">${t.category || 'General'}${t.priority === 'high' ? ' • 🔴 High Priority' : ''}</div>
      </div>
    </div>`).join('')}
    ${completedTasks.length > 15 ? `<div style="font-size:12px;color:#636e72;margin-top:8px;">...and ${completedTasks.length - 15} more</div>` : ''}
  </div>

  <!-- Habit Streaks -->
  ${habits.length > 0 ? `
  <div style="background:#fff;border-radius:12px;padding:24px;margin-top:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="font-size:16px;font-weight:700;margin-bottom:16px;color:#2d3436;">🔥 Habit Streaks</div>
    ${habits.map(h => {
      const streak = LifeOS.Habits.getStreak(h.id);
      const rate = LifeOS.Habits.getCompletionRate(h.id, 7);
      return `
    <div style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0;">
      <div style="font-size:22px;width:36px;text-align:center;">${h.icon || '⭐'}</div>
      <div style="flex:1;margin-left:8px;">
        <div style="font-size:14px;font-weight:600;color:#2d3436;">${escHtml(h.title)}</div>
        <div style="font-size:12px;color:#636e72;">${streak} day streak • ${rate}% this week</div>
      </div>
      <div style="font-size:20px;font-weight:800;color:${streak >= 7 ? '#00b894' : streak >= 3 ? '#fdcb6e' : '#dfe6e9'};">${streak}🔥</div>
    </div>`;
    }).join('')}
  </div>` : ''}

  <!-- Goals Progress -->
  ${goals.length > 0 ? `
  <div style="background:#fff;border-radius:12px;padding:24px;margin-top:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="font-size:16px;font-weight:700;margin-bottom:16px;color:#2d3436;">🎯 Goals Progress</div>
    ${goals.map(g => `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:14px;font-weight:500;color:#2d3436;">${escHtml(g.title)}</span>
        <span style="font-size:13px;font-weight:700;color:#6c5ce7;">${g.progress || 0}%</span>
      </div>
      <div style="height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${g.progress || 0}%;background:linear-gradient(90deg,#6c5ce7,#a855f7);border-radius:4px;"></div>
      </div>
    </div>`).join('')}
  </div>` : ''}

  <!-- Pending / Overdue Alert -->
  ${(pendingTasks.length > 0 || overdueTasks.length > 0) ? `
  <div style="background:linear-gradient(135deg,#ffeaa7 0%,#fab1a0 100%);border-radius:12px;padding:20px;margin-top:16px;">
    <div style="font-size:15px;font-weight:700;color:#2d3436;margin-bottom:4px;">⚠️ Needs Attention</div>
    <div style="font-size:13px;color:#636e72;">
      ${pendingTasks.length} task${pendingTasks.length !== 1 ? 's' : ''} still pending
      ${overdueTasks.length > 0 ? ` • <span style="color:#d63031;font-weight:600;">${overdueTasks.length} overdue</span>` : ''}
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div style="text-align:center;padding:24px 0 8px;color:#b2bec3;font-size:12px;">
    Generated by <strong>LifeOS</strong> on ${fmt(now)}<br>
    Keep building momentum 💪
  </div>

</div>
</body>
</html>`;

    downloadFile(html, `lifeos-weekly-${startStr}.html`, 'text/html');
    return html;
  }

  /* ═════════════════════════════════════════════
     FILE HANDLERS
     ═════════════════════════════════════════════ */

  function openFilePicker(accept, callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => callback(reader.result, file.name);
      reader.onerror = () => {
        if (typeof App !== 'undefined' && App.toast) App.toast('Failed to read file', 'error');
      };
      reader.readAsText(file);
      // Cleanup
      document.body.removeChild(input);
    });
    document.body.appendChild(input);
    input.click();
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  }

  /* ═════════════════════════════════════════════
     SPOTIFY INTEGRATION
     ═════════════════════════════════════════════ */
  const spotify = {
    playlists: [
      { name: 'Deep Focus',     uri: '37i9dQZF1DWZeKCadgRdKQ', cover: '🎵' },
      { name: 'Lo-Fi Beats',    uri: '37i9dQZF1DWWQRwui0ExPn', cover: '🎶' },
      { name: 'Peaceful Piano',  uri: '37i9dQZF1DX4sWSpwq3LiO', cover: '🎹' },
      { name: 'Brain Food',     uri: '37i9dQZF1DWXLeA8Omikj7', cover: '🧠' },
      { name: 'Nature Sounds',  uri: '37i9dQZF1DX4PP3DA4J0N8', cover: '🌿' },
    ],

    getEmbedUrl(uri) {
      return `https://open.spotify.com/embed/playlist/${uri}?utm_source=generator&theme=0`;
    },

    renderPlayer(containerId, uri) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = `<iframe
        style="border-radius:12px;border:none;width:100%;height:352px;"
        src="${this.getEmbedUrl(uri)}"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Spotify Player"></iframe>`;
    },
  };

  /* ═════════════════════════════════════════════
     CONNECTION STATUS / IMPORT HISTORY
     ═════════════════════════════════════════════ */

  function getConnectedApps() {
    const history = _getHistory();
    const sourceMap = {};
    for (const entry of history) {
      if (!sourceMap[entry.source]) {
        sourceMap[entry.source] = { source: entry.source, imports: 0, lastImport: entry.timestamp, totalItems: 0 };
      }
      sourceMap[entry.source].imports++;
      sourceMap[entry.source].totalItems += entry.count;
      if (entry.timestamp > sourceMap[entry.source].lastImport) {
        sourceMap[entry.source].lastImport = entry.timestamp;
      }
    }
    return Object.values(sourceMap);
  }

  function getImportHistory() {
    return _getHistory().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  function logImport(source, count, type) {
    const history = _getHistory();
    history.push({
      id: 'imp_' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      source,
      count,
      type,
    });
    _setHistory(history);
  }

  /* ═════════════════════════════════════════════
     RENDER — Full integrations page
     ═════════════════════════════════════════════ */

  function render(container) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;

    const history = getImportHistory();

    el.innerHTML = `
    <div style="max-width:960px;margin:0 auto;">

      <!-- Page Header -->
      <div style="margin-bottom:28px;">
        <h1 style="font-size:28px;font-weight:800;color:var(--text-primary,#2d3436);margin:0 0 6px;">🔗 Integrations Hub</h1>
        <p style="color:var(--text-secondary,#636e72);margin:0;font-size:15px;">Connect, import and export your data with external apps.</p>
      </div>

      <!-- App Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:32px;">
        ${apps.map(app => `
        <div class="integration-card" data-app="${app.id}"
             style="background:var(--card-bg,#fff);border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.06);
                    border:1px solid var(--border-color,#eee);cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
            <div style="width:48px;height:48px;border-radius:12px;background:${app.color}22;display:flex;align-items:center;
                        justify-content:center;font-size:24px;">${app.icon}</div>
            <div>
              <div style="font-weight:700;font-size:16px;color:var(--text-primary,#2d3436);">${escHtml(app.name)}</div>
              <div style="font-size:12px;color:var(--text-secondary,#636e72);">${escHtml(app.description)}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            ${_appButtons(app)}
          </div>
        </div>`).join('')}
      </div>

      <!-- Export Section -->
      <div style="background:var(--card-bg,#fff);border-radius:14px;padding:24px;margin-bottom:24px;
                  box-shadow:0 2px 12px rgba(0,0,0,0.06);border:1px solid var(--border-color,#eee);">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 16px;color:var(--text-primary,#2d3436);">📤 Export Data</h2>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="integ-export-json" style="${_btnStyle('#6c5ce7')}">💾 Export All (JSON)</button>
          <button id="integ-export-ics"  style="${_btnStyle('#4285f4')}">📅 Export Events (ICS)</button>
          <button id="integ-export-csv-tasks" style="${_btnStyle('#00b894')}">📋 Export Tasks (CSV)</button>
          <button id="integ-export-csv-events" style="${_btnStyle('#e17055')}">📆 Export Events (CSV)</button>
          <button id="integ-export-csv-goals" style="${_btnStyle('#fdcb6e')}">🎯 Export Goals (CSV)</button>
          <button id="integ-export-report" style="${_btnStyle('#a855f7')}">📊 Weekly Report (HTML)</button>
        </div>
      </div>

      <!-- Spotify Section -->
      <div style="background:var(--card-bg,#fff);border-radius:14px;padding:24px;margin-bottom:24px;
                  box-shadow:0 2px 12px rgba(0,0,0,0.06);border:1px solid var(--border-color,#eee);">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 4px;color:var(--text-primary,#2d3436);">🎵 Focus Music</h2>
        <p style="color:var(--text-secondary,#636e72);font-size:13px;margin:0 0 16px;">Pick a playlist to stay in the zone.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:16px;">
          ${spotify.playlists.map((pl, i) => `
          <button class="spotify-pick" data-idx="${i}"
                  style="background:linear-gradient(135deg,#191414 0%,#1db954 120%);color:#fff;border:none;border-radius:12px;
                         padding:16px;text-align:center;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;">
            <div style="font-size:32px;margin-bottom:8px;">${pl.cover}</div>
            <div style="font-size:13px;font-weight:600;">${escHtml(pl.name)}</div>
          </button>`).join('')}
        </div>
        <div id="spotify-player-container"></div>
      </div>

      <!-- Import History -->
      <div style="background:var(--card-bg,#fff);border-radius:14px;padding:24px;
                  box-shadow:0 2px 12px rgba(0,0,0,0.06);border:1px solid var(--border-color,#eee);">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 16px;color:var(--text-primary,#2d3436);">📜 Import History</h2>
        ${history.length === 0
          ? '<div style="color:var(--text-secondary,#b2bec3);font-style:italic;font-size:14px;">No imports yet. Use the cards above to import data from your favourite apps.</div>'
          : `<div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="text-align:left;border-bottom:2px solid var(--border-color,#eee);">
                  <th style="padding:8px 12px;font-weight:600;color:var(--text-secondary,#636e72);">Date</th>
                  <th style="padding:8px 12px;font-weight:600;color:var(--text-secondary,#636e72);">Source</th>
                  <th style="padding:8px 12px;font-weight:600;color:var(--text-secondary,#636e72);">Items</th>
                  <th style="padding:8px 12px;font-weight:600;color:var(--text-secondary,#636e72);">Type</th>
                </tr>
              </thead>
              <tbody>
                ${history.slice(0, 20).map(h => `
                <tr style="border-bottom:1px solid var(--border-color,#f0f0f0);">
                  <td style="padding:8px 12px;white-space:nowrap;">${_fmtTimestamp(h.timestamp)}</td>
                  <td style="padding:8px 12px;font-weight:600;">${escHtml(h.source)}</td>
                  <td style="padding:8px 12px;">${h.count}</td>
                  <td style="padding:8px 12px;">${escHtml(h.type)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`
        }
      </div>

    </div>`;

    // ── Event listeners ──
    _bindCardEvents(el);
    _bindExportButtons(el);
    _bindSpotifyButtons(el);

    // Hover effects for cards
    el.querySelectorAll('.integration-card').forEach(card => {
      card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-3px)'; card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; card.style.boxShadow = ''; });
    });

    // Spotify button hover
    el.querySelectorAll('.spotify-pick').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; btn.style.boxShadow = '0 4px 16px rgba(29,185,84,0.35)'; });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; btn.style.boxShadow = ''; });
    });
  }

  /* ── Render helpers ── */

  function _btnStyle(color) {
    return `background:${color};color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:opacity 0.2s;`;
  }

  function _appButtons(app) {
    switch (app.id) {
      case 'google_calendar':
        return `<button class="import-btn" data-action="import-ics" style="${_btnStyle(app.color)}">Import .ics</button>
                <button class="export-btn" data-action="export-ics" style="${_btnStyle('#636e72')}">Export .ics</button>`;
      case 'canvas_lms':
        return `<button class="import-btn" data-action="import-canvas" style="${_btnStyle(app.color)}">Import JSON</button>`;
      case 'notion':
        return `<button class="import-btn" data-action="import-json" style="${_btnStyle(app.color)}">Import JSON</button>`;
      case 'todoist':
        return `<button class="import-btn" data-action="import-csv" style="${_btnStyle(app.color)}">Import CSV</button>`;
      case 'spotify':
        return `<button class="import-btn" onclick="document.querySelector('.spotify-pick')?.scrollIntoView({behavior:'smooth'})" style="${_btnStyle(app.color)}">Browse Playlists</button>`;
      case 'github':
        return `<button class="import-btn" data-action="import-json" style="${_btnStyle(app.color)}">Import JSON</button>`;
      default:
        return `<button class="import-btn" data-action="import-json" style="${_btnStyle(app.color)}">Import</button>`;
    }
  }

  function _fmtTimestamp(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
             ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  /* ── Bind interactive events ── */

  function _bindCardEvents(root) {
    root.querySelectorAll('[data-action="import-ics"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openFilePicker('.ics', (content, name) => {
          const result = importICS(content);
          _showImportResult(result, name);
        });
      });
    });

    root.querySelectorAll('[data-action="export-ics"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportICS();
        if (typeof App !== 'undefined' && App.toast) App.toast('Events exported as .ics ✓');
      });
    });

    root.querySelectorAll('[data-action="import-csv"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openFilePicker('.csv', (content, name) => {
          const result = importCSV(content);
          _showImportResult(result, name);
        });
      });
    });

    root.querySelectorAll('[data-action="import-json"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openFilePicker('.json', (content, name) => {
          const result = importJSON(content);
          _showImportResult(result, name);
        });
      });
    });

    root.querySelectorAll('[data-action="import-canvas"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openFilePicker('.json', (content, name) => {
          try {
            const data = JSON.parse(content);
            const result = importCanvasAssignments(data);
            _showImportResult(result, name);
          } catch (err) {
            _showImportResult({ imported: 0, skipped: 0, errors: [err.message] }, name);
          }
        });
      });
    });
  }

  function _bindExportButtons(root) {
    const on = (id, fn) => { const el = root.querySelector('#' + id); if (el) el.addEventListener('click', fn); };
    on('integ-export-json',       () => { exportJSON();          _toast('All data exported as JSON ✓'); });
    on('integ-export-ics',        () => { exportICS();           _toast('Events exported as ICS ✓'); });
    on('integ-export-csv-tasks',  () => { exportCSV('tasks');    _toast('Tasks exported as CSV ✓'); });
    on('integ-export-csv-events', () => { exportCSV('events');   _toast('Events exported as CSV ✓'); });
    on('integ-export-csv-goals',  () => { exportCSV('goals');    _toast('Goals exported as CSV ✓'); });
    on('integ-export-report',     () => { exportWeeklyReport(); _toast('Weekly report exported ✓'); });
  }

  function _bindSpotifyButtons(root) {
    root.querySelectorAll('.spotify-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const pl = spotify.playlists[idx];
        if (!pl) return;
        // Highlight active
        root.querySelectorAll('.spotify-pick').forEach(b => {
          b.style.outline = 'none';
        });
        btn.style.outline = '3px solid #1db954';
        btn.style.outlineOffset = '2px';
        spotify.renderPlayer('spotify-player-container', pl.uri);
      });
    });
  }

  function _toast(msg, type) {
    if (typeof App !== 'undefined' && App.toast) App.toast(msg, type);
  }

  function _showImportResult(result, filename) {
    const imported = result.imported || 0;
    const skipped = result.skipped || 0;
    const errors = result.errors || [];
    const types = result.types || {};

    let msg = `📥 Imported ${imported} item${imported !== 1 ? 's' : ''} from ${escHtml(filename || 'file')}`;
    if (skipped > 0) msg += ` (${skipped} skipped)`;

    if (Object.keys(types).length > 0) {
      const parts = Object.entries(types).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`);
      if (parts.length) msg += ` — ${parts.join(', ')}`;
    }

    if (errors.length > 0) {
      msg += `\n⚠️ ${errors.length} error${errors.length !== 1 ? 's' : ''}`;
      console.warn('[Integrations] Import errors:', errors);
    }

    _toast(imported > 0 ? msg : `⚠️ No items imported. ${errors[0] || ''}`, imported > 0 ? 'success' : 'warning');

    // Re-render the page to update import history
    const pageEl = document.getElementById('page-integrations') || document.querySelector('[data-integrations-root]');
    if (pageEl) render(pageEl);
  }

  /* ═════════════════════════════════════════════
     PUBLIC API
     ═════════════════════════════════════════════ */
  return {
    apps,
    importICS,
    importCSV,
    importJSON,
    importCanvasAssignments,
    exportICS,
    exportJSON,
    exportCSV,
    exportWeeklyReport,
    openFilePicker,
    downloadFile,
    spotify,
    getConnectedApps,
    getImportHistory,
    logImport,
    render,
  };
})();
