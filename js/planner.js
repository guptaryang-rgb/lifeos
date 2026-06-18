// ============================================================
// planner.js — Heuristic AI scheduler
// Greedy slot-finder that respects work hours, priorities,
// energy levels, and existing events. Detects conflicts.
// Mirrors the contract from PROJECT.md.
// ============================================================

const HOUR = 60 * 60 * 1000;
const MIN  = 60 * 1000;

const PRIO_WEIGHT  = { LOW: 1, MEDIUM: 2, HIGH: 4 };
const ENERGY_PREF  = {
  // Higher energy tasks prefer morning hours
  HIGH:   h => (h >= 9 && h <= 12) ? 3 : 1,
  MEDIUM: h => (h >= 9 && h <= 17) ? 2 : 1,
  LOW:    h => (h >= 14 && h <= 20) ? 2 : 1,
};

function dateAtHour(date, h, m = 0) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

// Score a slot for a task (higher is better)
function scoreSlot(slotStart, slotEnd, task, existingEvents) {
  const startHour = slotStart.getHours() + slotStart.getMinutes() / 60;

  // Priority × deadline proximity
  const hoursUntilDue = (task.dueDate - slotStart) / HOUR;
  const urgency = hoursUntilDue <= 0 ? 100 : (1 / Math.max(1, hoursUntilDue / 24)) * 10;
  const priorityScore = PRIO_WEIGHT[task.priority] * 20;

  // Energy preference
  const energyScore = ENERGY_PREF[task.energyLevel](startHour) * 6;

  // Earlier-in-day bonus for high-priority
  const earliness = (24 - startHour) * (task.priority === 'HIGH' ? 1 : 0.3);

  // Penalty: tightly sandwiched between other events
  const marginBefore = hasEventOverlap(slotStart, slotEnd, existingEvents) ? -20 : 0;

  return priorityScore + urgency + energyScore + earliness + marginBefore;
}

function hasEventOverlap(s, e, events) {
  return events.some(ev => !(ev.endTime <= s || ev.startTime >= e));
}

function hasTaskOverlap(s, e, suggestions) {
  return suggestions.some(sg => !(sg.endTime <= s || sg.startTime >= e));
}

// Find candidate slots in [startDate, startDate + 7 days]
function findSlots(startDate, workStart, workEnd, step = 30 /* min */) {
  const slots = [];
  const end = new Date(startDate);
  end.setDate(end.getDate() + 7);
  let cursor = new Date(startDate);

  while (cursor < end) {
    const day = new Date(cursor);
    let h = workStart;
    if (cursor.getTime() === startDate.getTime()) {
      // From now if today
      const now = new Date();
      h = Math.max(workStart, now.getHours() + (now.getMinutes() > step ? 1 : 0));
    }
    while (h < workEnd) {
      const s = dateAtHour(day, Math.floor(h), (h % 1) * 60);
      slots.push(s);
      h += step / 60;
    }
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }
  return slots;
}

// Main entry: generateSuggestedSchedule
export function generateSuggestedSchedule(tasks, events, workStartHour = 9, workEndHour = 22) {
  const startDate = new Date();
  const candidates = findSlots(startDate, workStartHour, workEndHour);
  const suggestions = [];
  const conflicts = [];

  // Sort tasks: HIGH prio + soonest due first
  const sorted = [...tasks].filter(t => t.status !== 'COMPLETED').sort((a, b) => {
    const pa = PRIO_WEIGHT[a.priority], pb = PRIO_WEIGHT[b.priority];
    if (pa !== pb) return pb - pa;
    return a.dueDate - b.dueDate;
  });

  for (const task of sorted) {
    const dur = task.estimatedDuration || 30;
    let placed = false;

    // Try slots in order of score
    const scored = candidates.map(s => {
      const e = new Date(s.getTime() + dur * MIN);
      return { s, e, score: scoreSlot(s, e, task, events) };
    }).sort((a, b) => b.score - a.score);

    for (const cand of scored) {
      const e = new Date(cand.s.getTime() + dur * MIN);
      if (cand.e > task.dueDate) continue; // would miss deadline
      if (hasEventOverlap(cand.s, e, events)) continue;
      if (hasTaskOverlap(cand.s, e, suggestions)) continue;
      suggestions.push({ taskId: task.id, startTime: cand.s, endTime: e });
      placed = true;
      break;
    }

    if (!placed) {
      const reason = task.dueDate < Date.now() ? 'OVERDUE'
                   : candidates.length === 0 ? 'NO_WORK_HOURS'
                   : 'WORKLOAD_TOO_HIGH';
      conflicts.push(`Task "${task.title}" could not be scheduled (${reason}).`);
    }
  }

  return { suggestions, conflicts };
}

// Estimate task duration based on similar past tasks
export function estimateTaskDuration(title, historicalTasks) {
  if (!historicalTasks || historicalTasks.length === 0) return 30; // default
  const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  const titleWords = new Set(norm(title));
  const matches = historicalTasks
    .map(ht => {
      const overlap = norm(ht.title).filter(w => titleWords.has(w)).length;
      return { overlap, duration: ht.actualDuration };
    })
    .filter(m => m.overlap >= 1)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 5);
  if (matches.length === 0) return 30;
  const avg = matches.reduce((s, m) => s + m.duration, 0) / matches.length;
  return Math.round(avg);
}

// Burnout risk score 0-100
export function calculateBurnoutRisk(workloadDensity, missedTaskCount, streakDeclineRate, focusTimeTrend) {
  // workloadDensity: 0..2 (typically)
  // streakDeclineRate: 0..1
  // focusTimeTrend: -1..1 (negative = declining)
  let score = 0;
  score += Math.min(40, Math.max(0, (workloadDensity - 0.7) * 50));
  score += Math.min(30, missedTaskCount * 6);
  score += Math.min(20, streakDeclineRate * 20);
  score += focusTimeTrend < 0 ? Math.min(15, -focusTimeTrend * 15) : 0;
  score = Math.round(Math.max(0, Math.min(100, score)));

  const recommendations = [];
  if (score >= 70) recommendations.push('Take a rest day this week. Reduce scheduled load by 30%.');
  if (workloadDensity > 1.0) recommendations.push('Spread high-priority tasks across multiple days instead of stacking today.');
  if (missedTaskCount >= 3) recommendations.push('Review missed tasks — are they realistic in scope or time?');
  if (streakDeclineRate > 0.3) recommendations.push('Anchor one habit at the same time daily to rebuild momentum.');
  if (focusTimeTrend < -0.2) recommendations.push('Shorten focus blocks to 25 min and add more breaks.');
  if (recommendations.length === 0) recommendations.push('Workload is healthy. Keep current cadence.');
  return { score, recommendations };
}

// Replanning: when a task is missed/rescheduled, shift others
export function replan(currentSuggestions, missedTask, allTasks, events) {
  const dur = missedTask.estimatedDuration || 30;
  const newStart = new Date(missedTask.dueDate.getTime() - 4 * HOUR);
  const newEnd = new Date(newStart.getTime() + dur * MIN);

  // Replace the missed one
  const updated = currentSuggestions.filter(s => s.taskId !== missedTask.id);
  updated.push({ taskId: missedTask.id, startTime: newStart, endTime: newEnd });

  // Detect conflicts with other suggestions / events
  const conflicts = [];
  for (const sg of updated) {
    if (hasEventOverlap(sg.startTime, sg.endTime, events)) {
      conflicts.push(`Conflict: scheduled task overlaps an existing event.`);
    }
    for (const other of updated) {
      if (other.taskId !== sg.taskId && hasTaskOverlap(sg.startTime, sg.endTime, [other])) {
        conflicts.push(`Two scheduled tasks overlap.`);
      }
    }
  }

  return { suggestions: updated, conflicts: [...new Set(conflicts)] };
}

// Heuristic: detect "procrastination" — task untouched near deadline
export function detectProcrastination(task, allTasks) {
  const hoursLeft = (task.dueDate - Date.now()) / HOUR;
  const isUntouched = !task.lastTouchedAt || (Date.now() - task.lastTouchedAt) > 12 * HOUR;
  const isImportant = task.priority === 'HIGH' || task.estimatedDuration >= 90;
  if (hoursLeft < 48 && isUntouched && isImportant) {
    return { isProcrastinating: true, suggestion: `Task "${task.title}" is due in <48h and untouched. Schedule a 25-min start now.` };
  }
  return { isProcrastinating: false };
}

// Burnout color
export function burnoutColor(score) {
  if (score < 35) return 'var(--success)';
  if (score < 65) return 'var(--warning)';
  return 'var(--danger)';
}
