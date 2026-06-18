// ============================================================
// secretary.js — NLP-style command parser for the AI secretary
// No external API required. Pattern-matches 30+ commands.
// ============================================================
import { store, uid, today, fmtTime, isToday } from './store.js';
import { toast } from './bus.js';
import { generateSuggestedSchedule, estimateTaskDuration } from './planner.js';

// Intent patterns: each returns a normalized action
const PATTERNS = [
  // --- Tasks ---
  { test: /^add (?:a )?task[: ]+(.+)/i, intent: 'add_task', extract: m => ({ title: m[1].trim() }) },
  { test: /^(?:remind me to|create (?:a )?task to|need to|i need to|have to|i have to)\s+(.+)/i,
    intent: 'add_task', extract: m => ({ title: m[1].trim() }) },
  { test: /^mark (.+?) (?:as )?done/i, intent: 'done_task', extract: m => ({ title: m[1].trim() }) },
  { test: /^delete (?:the )?task (.+)/i, intent: 'delete_task', extract: m => ({ title: m[1].trim() }) },
  { test: /^what(?:'s| is) on my (?:plate|list|agenda)/i, intent: 'list_tasks' },
  { test: /^show (?:me )?(?:my )?tasks/i, intent: 'list_tasks' },

  // --- Events ---
  { test: /^schedule (.+?) (?:at|on) (.+)/i, intent: 'add_event', extract: m => ({ title: m[1].trim(), when: m[2].trim() }) },
  { test: /^(?:meeting|appointment) (.+?) (?:at|on) (.+)/i, intent: 'add_event', extract: m => ({ title: m[1].trim() + ' meeting', when: m[2].trim() }) },
  { test: /^add (?:an )?event[: ]+(.+?)(?: (?:at|on) (.+))?$/i, intent: 'add_event', extract: m => ({ title: m[1].trim(), when: m[2]?.trim() }) },

  // --- Habits ---
  { test: /^i (?:did|completed|finished) (?:my )?(.+?)(?: habit)?$/i, intent: 'log_habit', extract: m => ({ name: m[1].trim() }) },
  { test: /^(?:log|complete|check off) (.+)/i, intent: 'log_habit', extract: m => ({ name: m[1].trim() }) },

  // --- Finance ---
  { test: /^i (?:spent|paid|bought) (.+?)(?: for)? \$?(\d+(?:\.\d{1,2})?)/i, intent: 'add_transaction',
    extract: m => ({ description: m[1].trim(), amount: parseFloat(m[2]) }) },
  { test: /^(?:spent|paid|bought|expense) (.+?)\s+\$?(\d+(?:\.\d{1,2})?)/i, intent: 'add_transaction',
    extract: m => ({ description: m[1].trim(), amount: parseFloat(m[2]) }) },
  { test: /^show (?:me )?(?:my )?(?:spending|expenses|budget)/i, intent: 'show_finance' },

  // --- Food / Fitness ---
  { test: /^i (?:ate|had|consumed) (.+)/i, intent: 'log_food', extract: m => ({ name: m[1].trim() }) },
  { test: /^(?:log|add) (?:food|meal)[: ]+(.+)/i, intent: 'log_food', extract: m => ({ name: m[1].trim() }) },
  { test: /^i (?:worked out|exercised|ran|lifted|did)(?: (.+))?/i, intent: 'log_workout', extract: m => ({ activity: (m[1] || 'workout').trim() }) },

  // --- Wellness ---
  { test: /^i (?:drank|had) (\d+) (?:cups|glasses) of water/i, intent: 'log_water', extract: m => ({ glasses: parseInt(m[1]) }) },
  { test: /^i slept (\d+(?:\.\d+)?) hours/i, intent: 'log_sleep', extract: m => ({ hours: parseFloat(m[1]) }) },
  { test: /^(?:my mood is|i feel|i'm feeling) (.+)/i, intent: 'log_mood', extract: m => ({ note: m[1].trim() }) },
  { test: /^(?:journal|wrote|note|diary)[: ]+(.+)/i, intent: 'log_journal', extract: m => ({ body: m[1].trim() }) },

  // --- Focus ---
  { test: /^(?:start|begin) (?:a )?(?:focus|pomodoro|session)/i, intent: 'start_focus' },
  { test: /^(?:start|begin) (?:a )?(\d+) minute focus/i, intent: 'start_focus', extract: m => ({ duration: parseInt(m[1]) }) },
  { test: /^focus (?:on )?(.+)/i, intent: 'start_focus_task', extract: m => ({ title: m[1].trim() }) },

  // --- Goals ---
  { test: /^set (?:a )?goal[: ]+(.+)/i, intent: 'add_goal', extract: m => ({ title: m[1].trim() }) },
  { test: /^(?:my goal is|i want to|goal[: ]+)(.+)/i, intent: 'add_goal', extract: m => ({ title: m[1].trim() }) },

  // --- Planning ---
  { test: /^(?:plan|schedule|organize) (?:my )?(?:day|week|tomorrow)/i, intent: 'plan_day' },
  { test: /^replan/i, intent: 'replan' },
  { test: /^how'?s my (?:burnout|stress|load|workload)/i, intent: 'burnout' },
  { test: /^burnout/i, intent: 'burnout' },

  // --- Study ---
  { test: /^(?:study|review) (.+)/i, intent: 'study_topic', extract: m => ({ topic: m[1].trim() }) },
  { test: /^make (?:a )?flashcard (?:for|about)[: ]+(.+)/i, intent: 'add_flashcard', extract: m => ({ front: m[1].trim() }) },

  // --- Help / misc ---
  { test: /^(?:help|what can you do|commands)/i, intent: 'help' },
  { test: /^thanks|thank you/i, intent: 'thanks' },
  { test: /^hello|hi|hey/i, intent: 'greet' },
];

const RESPONSES = {
  greet: ["Hey. What can I handle for you?", "Hi. Ready when you are.", "Hello — let's get things done."],
  thanks: ["Anytime.", "You got it.", "👍"],
  help: [
    "I can add tasks, log habits, track spending, log meals and workouts, start focus sessions, plan your day, and answer burnout questions. Try: <em>\"add task: finish lab report\"</em> or <em>\"i spent 12 on coffee\"</em>."
  ],
};

// Public entry — parse and execute
export async function processCommand(rawInput) {
  const input = (rawInput || '').trim();
  if (!input) return { ok: false, message: 'Empty command.' };

  for (const p of PATTERNS) {
    const m = p.test.exec(input);
    if (!m) continue;
    const data = p.extract ? p.extract(m) : {};
    try {
      const result = await execute(p.intent, data, input);
      return result;
    } catch (e) {
      console.error(e);
      return { ok: false, message: `Something went wrong: ${e.message}` };
    }
  }

  // Fallback: check if the user is asking a conversational question or showing emotion
  const clean = input.toLowerCase().trim();
  const greetingWords = ['hello', 'hi', 'hey', 'greetings', 'whats up', 'sup', 'yo'];
  const emotionWords = ['feel', 'sad', 'happy', 'tired', 'stressed', 'anxious', 'lonely', 'bored', 'depressed', 'excited', 'mad', 'angry'];
  const questionWords = ['how', 'what', 'why', 'who', 'where', 'can you', 'could you', 'will you', 'do you', 'are you', 'tell me'];
  
  if (
    greetingWords.some(w => clean.startsWith(w) || clean.includes(' ' + w)) ||
    emotionWords.some(w => clean.includes(w)) ||
    questionWords.some(w => clean.startsWith(w)) ||
    clean.endsWith('?') ||
    clean.length < 10
  ) {
    return { ok: true, message: generateCompanionResponse(input) };
  }

  // Fallback: treat as a task
  return execute('add_task', { title: input }, input);
}

// Intent executors
async function execute(intent, data, raw) {
  const todayStr = today().toISOString().slice(0, 10);
  switch (intent) {
    case 'add_task': {
      const task = {
        id: uid(),
        title: data.title,
        description: '',
        dueDate: new Date(Date.now() + 24 * 3600 * 1000),
        estimatedDuration: 30,
        priority: 'MEDIUM',
        energyLevel: 'MEDIUM',
        status: 'NOT_STARTED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: store.get('user')?.id || 'me',
        lastTouchedAt: null,
      };
      store.push('tasks', task);
      toast({ kind: 'success', title: 'Task added', body: data.title });
      return { ok: true, message: `Added task: <strong>${escapeHtml(data.title)}</strong>. Due tomorrow by default.` };
    }
    case 'done_task': {
      const t = findTaskByTitle(data.title);
      if (!t) return { ok: false, message: `Couldn't find a task matching "${escapeHtml(data.title)}".` };
      store.patch('tasks', t.id, { status: 'COMPLETED', completedAt: Date.now() });
      toast({ kind: 'success', title: 'Done!', body: t.title });
      return { ok: true, message: `Marked <strong>${escapeHtml(t.title)}</strong> as done. 🎉` };
    }
    case 'delete_task': {
      const t = findTaskByTitle(data.title);
      if (!t) return { ok: false, message: `Couldn't find that task.` };
      store.remove('tasks', t.id);
      toast({ kind: 'info', title: 'Removed', body: t.title });
      return { ok: true, message: `Removed <strong>${escapeHtml(t.title)}</strong>.` };
    }
    case 'list_tasks': {
      const tasks = store.get('tasks').filter(t => t.status !== 'COMPLETED');
      if (tasks.length === 0) return { ok: true, message: 'Your plate is clean. Nothing open.' };
      const top = tasks.slice(0, 5).map(t => `• ${escapeHtml(t.title)}`).join('<br>');
      return { ok: true, message: `You have <strong>${tasks.length}</strong> open task${tasks.length === 1 ? '' : 's'}:<br>${top}` };
    }
    case 'add_event': {
      const start = parseWhen(data.when) || new Date(Date.now() + 3600 * 1000);
      const event = {
        id: uid(),
        title: data.title,
        startTime: start,
        endTime: new Date(start.getTime() + 60 * 60 * 1000),
        category: detectCategory(data.title),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      store.push('events', event);
      toast({ kind: 'success', title: 'Event scheduled', body: `${event.title} at ${fmtTime(start)}` });
      return { ok: true, message: `Scheduled <strong>${escapeHtml(event.title)}</strong> for ${fmtTime(start)}.` };
    }
    case 'log_habit': {
      const habits = store.get('habits') || [];
      let habit = habits.find(h => h.title.toLowerCase().includes(data.name.toLowerCase()));
      if (!habit) {
        habit = { id: uid(), title: data.name, frequency: 'DAILY', createdAt: Date.now() };
        store.push('habits', habit);
      }
      const log = { id: uid(), habitId: habit.id, completedAt: new Date() };
      store.push('habitLogs', log);
      toast({ kind: 'success', title: 'Habit logged', body: habit.title });
      return { ok: true, message: `Logged <strong>${escapeHtml(habit.title)}</strong>. 🔥` };
    }
    case 'add_transaction': {
      const t = {
        id: uid(),
        amount: data.amount,
        description: data.description,
        category: guessCategory(data.description),
        date: new Date(),
        recurring: false,
      };
      store.push('transactions', t);
      toast({ kind: 'info', title: 'Logged expense', body: `$${data.amount} — ${t.category}` });
      return { ok: true, message: `Logged <strong>$${data.amount.toFixed(2)}</strong> for ${escapeHtml(data.description)} (${t.category}).` };
    }
    case 'show_finance': {
      const tx = store.get('transactions') || [];
      const total = tx.reduce((s, t) => s + t.amount, 0);
      return { ok: true, message: `Total tracked spend: <strong>$${total.toFixed(2)}</strong> across ${tx.length} transaction${tx.length === 1 ? '' : 's'}.` };
    }
    case 'log_food': {
      const nutrition = estimateNutrition(data.name);
      const log = {
        id: uid(), foodName: data.name, meal: 'snack',
        servingCount: 1, ...nutrition, date: new Date(), createdAt: Date.now(),
      };
      store.push('foodLogs', log);
      toast({ kind: 'info', title: 'Meal logged', body: `${data.name} — ${nutrition.calories} kcal` });
      return { ok: true, message: `Logged <strong>${escapeHtml(data.name)}</strong>: ${nutrition.calories} kcal, ${nutrition.protein}g protein.` };
    }
    case 'log_workout': {
      const w = {
        id: uid(), exerciseName: data.activity, type: 'cardio',
        durationMinutes: 30, calories: 200, date: new Date(), createdAt: Date.now(),
      };
      store.push('workouts', w);
      toast({ kind: 'success', title: 'Workout logged', body: w.exerciseName });
      return { ok: true, message: `Logged <strong>${escapeHtml(w.exerciseName)}</strong> (~30 min, 200 kcal).` };
    }
    case 'log_water': {
      const arr = store.get('wellness.water') || [];
      const existing = arr.find(w => w.date === todayStr);
      if (existing) {
        existing.glasses += data.glasses;
        store.set('wellness.water', [...arr]);
      } else {
        store.push('wellness.water', { date: todayStr, glasses: data.glasses });
      }
      toast({ kind: 'info', title: 'Hydration', body: `+${data.glasses} glasses` });
      return { ok: true, message: `Added <strong>${data.glasses}</strong> glasses. Stay hydrated 💧` };
    }
    case 'log_sleep': {
      const arr = store.get('wellness.sleep') || [];
      arr.unshift({ date: todayStr, hours: data.hours, quality: data.hours >= 7 ? 'good' : 'tired' });
      store.set('wellness.sleep', arr.slice(0, 60));
      return { ok: true, message: `Logged <strong>${data.hours}h</strong> of sleep.` };
    }
    case 'log_mood': {
      const arr = store.get('wellness.mood') || [];
      arr.unshift({ id: uid(), date: todayStr, score: 5, note: data.note });
      store.set('wellness.mood', arr.slice(0, 60));
      return { ok: true, message: `Mood noted: <em>${escapeHtml(data.note)}</em>` };
    }
    case 'log_journal': {
      const arr = store.get('wellness.journal') || [];
      arr.unshift({ id: uid(), date: new Date(), title: data.body.slice(0, 60), body: data.body });
      store.set('wellness.journal', arr.slice(0, 100));
      return { ok: true, message: `Journal entry saved.` };
    }
    case 'start_focus':
    case 'start_focus_task': {
      const dur = data.duration || 25;
      // Navigate to focus page
      location.hash = 'focus';
      setTimeout(() => window.dispatchEvent(new CustomEvent('lifeos:focus-start', { detail: { duration: dur, taskTitle: data.title } })), 100);
      return { ok: true, message: `Starting a <strong>${dur}-minute</strong> focus session${data.title ? ` on <em>${escapeHtml(data.title)}</em>` : ''}.` };
    }
    case 'add_goal': {
      const goal = {
        id: uid(), title: data.title, description: '',
        targetDate: new Date(Date.now() + 30 * 86400000),
        progress: 0, createdAt: Date.now(),
      };
      store.push('goals', goal);
      toast({ kind: 'success', title: 'Goal set', body: data.title });
      return { ok: true, message: `Goal set: <strong>${escapeHtml(data.title)}</strong>. 30-day default target.` };
    }
    case 'plan_day': {
      location.hash = 'planner';
      return { ok: true, message: `Opening the AI Planner. I'll suggest slots for your top priorities.` };
    }
    case 'replan': {
      location.hash = 'planner';
      return { ok: true, message: `Replanning — looking for conflicts and overdue items.` };
    }
    case 'burnout': {
      const tasks = store.get('tasks') || [];
      const habits = store.get('habits') || [];
      const sessions = store.get('focusSessions') || [];
      const workload = tasks.filter(t => t.status !== 'COMPLETED').length;
      const missed = tasks.filter(t => t.status === 'OVERDUE').length;
      const recentSessions = sessions.filter(s => Date.now() - s.startTime < 7 * 86400000);
      const trend = recentSessions.length > 0 ? 0.1 : -0.3;
      const score = Math.min(100, workload * 4 + missed * 8 + 10);
      const level = score < 35 ? 'low' : score < 65 ? 'moderate' : 'high';
      return { ok: true, message: `Burnout risk: <strong>${score}/100 (${level})</strong>. You have ${workload} open tasks and ${missed} overdue.` };
    }
    case 'study_topic': {
      location.hash = 'study';
      return { ok: true, message: `Opening study tools for <strong>${escapeHtml(data.topic)}</strong>.` };
    }
    case 'add_flashcard': {
      const decks = store.get('study.decks') || [];
      let deck = decks[0];
      if (!deck) {
        deck = { id: uid(), name: 'Quick Notes', cards: [] };
        store.push('study.decks', deck);
      }
      const currentDecks = store.get('study.decks') || [];
      const idx = currentDecks.findIndex(d => d.id === deck.id);
      const card = { id: uid(), front: data.front, back: '(tap to add answer)', lastReview: null, nextReview: Date.now(), box: 0 };
      store.update(`study.decks.${idx}.cards`, cards => [...cards, card]);
      return { ok: true, message: `Added a flashcard: <strong>${escapeHtml(data.front)}</strong>.` };
    }
    case 'help': {
      return { ok: true, message: RESPONSES.help[0] };
    }
    case 'thanks': {
      return { ok: true, message: pickRandom(RESPONSES.thanks) };
    }
    case 'greet': {
      return { ok: true, message: pickRandom(RESPONSES.greet) };
    }
    default:
      return { ok: false, message: "I didn't catch that. Try a different phrasing." };
  }
}

function generateCompanionResponse(input) {
  const clean = input.toLowerCase();
  
  // 1. Status query
  if (clean.includes('progress') || clean.includes('how am i doing') || clean.includes('my status') || clean.includes('today')) {
    const tasks = store.get('tasks') || [];
    const openTasks = tasks.filter(t => t.status !== 'COMPLETED');
    const doneTasksToday = tasks.filter(t => t.status === 'COMPLETED' && isToday(t.completedAt));
    const habits = store.get('habits') || [];
    const logs = store.get('habitLogs') || [];
    const completedHabitsToday = habits.filter(h => logs.some(l => l.habitId === h.id && isToday(l.completedAt)));
    
    let report = "Let's check in on your day:<br>";
    if (doneTasksToday.length > 0) {
      report += `• You finished <strong>${doneTasksToday.length}</strong> task${doneTasksToday.length === 1 ? '' : 's'} today! Great work.<br>`;
    } else {
      report += `• You haven't finished any tasks yet today. Let's start with a small one!<br>`;
    }
    
    if (completedHabitsToday.length > 0) {
      report += `• You've kept up with <strong>${completedHabitsToday.length}</strong> habit${completedHabitsToday.length === 1 ? '' : 's'} today. Keep the streak going! 🔥<br>`;
    } else if (habits.length > 0) {
      report += `• You have <strong>${habits.length}</strong> habits to log today. Don't forget them!<br>`;
    }
    
    if (openTasks.length > 0) {
      report += `• You have <strong>${openTasks.length}</strong> open task${openTasks.length === 1 ? '' : 's'} remaining.`;
    } else {
      report += `• Your task list is completely clear! What an amazing feeling.`;
    }
    
    return report;
  }
  
  // 2. Next task query
  if (clean.includes('what should i do') || clean.includes('what\'s next') || clean.includes('next task') || clean.includes('focus next')) {
    const tasks = store.get('tasks') || [];
    const openTasks = tasks.filter(t => t.status !== 'COMPLETED');
    if (openTasks.length === 0) {
      return "You don't have any pending tasks right now. You're completely free to relax, or plan a new goal!";
    }
    
    const sorted = openTasks.sort((a, b) => {
      const prio = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (prio[b.priority] || 2) - (prio[a.priority] || 2);
    });
    
    const next = sorted[0];
    return `I suggest working on: <strong>${escapeHtml(next.title)}</strong> (Priority: ${next.priority}).<br>Shall we start a 25-minute focus session for it? Just type <em>\"focus on ${escapeHtml(next.title)}\"</em>!`;
  }
  
  // 3. Emotion-specific responses
  if (clean.includes('tired') || clean.includes('exhausted') || clean.includes('sleepy')) {
    return "If you're feeling tired, make sure you take a quick screen-break. Go grab some water 💧 or check the Wellness module for some quick stretches or a breathing exercise. Your health is the number one priority!";
  }
  
  if (clean.includes('stressed') || clean.includes('anxious') || clean.includes('overwhelmed') || clean.includes('burnout')) {
    const tasks = store.get('tasks') || [];
    const openCount = tasks.filter(t => t.status !== 'COMPLETED').length;
    let msg = "It's completely okay to feel overwhelmed. When you have too much on your plate, try breaking tasks into tiny, 10-minute micro-steps.";
    if (openCount > 5) {
      msg += ` I see you have ${openCount} open tasks. Would you like me to open the AI Planner to help organize them and suggest a manageable schedule?`;
    }
    return msg;
  }
  
  if (clean.includes('sad') || clean.includes('lonely') || clean.includes('depressed') || clean.includes('down')) {
    return "I'm sorry you're feeling down. Remember that progress isn't linear, and it's okay to have off days. Go easy on yourself today. Take a walk, listen to a favorite song, or write down your thoughts in the Wellness Journal.";
  }
  
  if (clean.includes('happy') || clean.includes('excited') || clean.includes('good') || clean.includes('great')) {
    return "That's wonderful to hear! I'm glad you're in a good headspace. Let's carry this positive energy into whatever you work on next! 🌟";
  }

  if (clean.includes('bored') || clean.includes('nothing to do')) {
    return "Boredom is the perfect space for creativity! You could log a quick workout (type <em>\"i worked out\"</em>), do a 10-minute meditation, review your flashcards (type <em>\"study\"</em>), or write a journal entry.";
  }
  
  // 4. Questions about the AI
  if (clean.includes('who are you') || clean.includes('your name') || clean.includes('what are you')) {
    return "I am your LifeOS Companion and AI Secretary! I'm here to manage your tasks, track your health, keep your budget, and help you build positive daily habits. I work fully offline to keep your data private.";
  }
  
  if (clean.includes('thank') || clean.includes('thanks')) {
    return pickRandom(["Anytime! Let's keep making progress.", "You got it! I'm here to help.", "No problem at all! 👍"]);
  }

  if (clean.includes('how are you')) {
    return "I'm running perfectly and ready to keep you organized! How is your day going?";
  }

  // 5. Default conversational responses
  const fallbacks = [
    "I'm here for you! If you want to add a task, try saying <em>\"add task: [title]\"</em>. Otherwise, tell me how your day is going!",
    "That sounds interesting. As your companion, I'm here to support your daily flow. Shall we organize a focus session or check your schedule?",
    "Got it. Remember you can log your food (e.g. <em>\"i ate salad\"</em>) or drinks (e.g. <em>\"i drank 3 cups of water\"</em>) at any time to keep your body in tip-top shape!",
    "I'm listening. If there's something you need to do, type it in and I'll track it for you. Or type <em>\"plan my day\"</em> to check your agenda.",
    "Interesting! Remember to take regular breaks if you're working hard. What should we tackle next?"
  ];
  
  return pickRandom(fallbacks);
}

function findTaskByTitle(query) {
  const tasks = store.get('tasks') || [];
  const q = query.toLowerCase();
  return tasks.find(t => t.title.toLowerCase().includes(q) || q.includes(t.title.toLowerCase()));
}

function detectCategory(text) {
  const t = text.toLowerCase();
  if (/(meeting|work|standup|sync|call|interview)/.test(t)) return 'WORK';
  if (/(class|lecture|study|exam|lab)/.test(t)) return 'ACADEMIC';
  if (/(gym|run|workout|yoga|meditation|doctor)/.test(t)) return 'HEALTH';
  return 'PERSONAL';
}

function guessCategory(text) {
  const t = text.toLowerCase();
  if (/(coffee|restaurant|lunch|dinner|breakfast|food|burger|pizza)/.test(t)) return 'food';
  if (/(uber|taxi|gas|transit|bus|train|flight)/.test(t)) return 'transport';
  if (/(movie|netflix|concert|game|bar|club)/.test(t)) return 'entertainment';
  if (/(amazon|clothes|shoes|shop)/.test(t)) return 'shopping';
  if (/(rent|electric|internet|phone bill|water)/.test(t)) return 'bills';
  if (/(book|course|tuition|class)/.test(t)) return 'education';
  return 'other';
}

// Tiny offline nutrition estimate (rough but plausible)
function estimateNutrition(name) {
  const t = name.toLowerCase();
  const table = [
    { k: ['pizza'], c: 285, p: 12, ca: 36, f: 10, fi: 2.5 },
    { k: ['burger'], c: 354, p: 20, ca: 29, f: 17, fi: 1 },
    { k: ['salad'], c: 120, p: 5,  ca: 12, f: 6,  fi: 3 },
    { k: ['coffee'], c: 5,   p: 0,  ca: 1,  f: 0,  fi: 0 },
    { k: ['sandwich'], c: 350, p: 18, ca: 40, f: 14, fi: 4 },
    { k: ['pasta'],   c: 400, p: 14, ca: 70, f: 8,  fi: 4 },
    { k: ['rice'],    c: 200, p: 4,  ca: 45, f: 0,  fi: 1 },
    { k: ['chicken'], c: 250, p: 30, ca: 0,  f: 11, fi: 0 },
    { k: ['egg','eggs'], c: 155, p: 13, ca: 1, f: 11, fi: 0 },
    { k: ['banana'],  c: 105, p: 1,  ca: 27, f: 0,  fi: 3 },
    { k: ['apple'],   c: 95,  p: 0,  ca: 25, f: 0,  fi: 4 },
  ];
  for (const r of table) if (r.k.some(k => t.includes(k))) return { calories: r.c, protein: r.p, carbs: r.ca, fat: r.f, fiber: r.fi };
  return { calories: 250, protein: 8, carbs: 30, fat: 10, fiber: 2 };
}

function parseWhen(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  const now = new Date();
  const timeMatch = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  let hour = 9, minute = 0;
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    if (timeMatch[3] === 'pm' && hour < 12) hour += 12;
    if (timeMatch[3] === 'am' && hour === 12) hour = 0;
  }
  const date = new Date(now);
  if (/tomorrow/.test(t)) date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
