# ⚡ LifeOS — AI-Powered Life Operating System

> Your personal AI chief of staff. Manage tasks, habits, wellness, fitness,
> finances, and more — all in one beautifully crafted, offline-capable app.

![Status](https://img.shields.io/badge/status-launchable-brightgreen)
![No build](https://img.shields.io/badge/build-none-blue)
![Offline](https://img.shields.io/badge/offline-first-purple)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ What It Does

LifeOS is a 16-page single-page app that feels alive on first launch. It runs
entirely in the browser — no server, no API keys, no build step.

### Pages

| Page | What it does |
|---|---|
| **Dashboard** | Cosmic hero with your daily briefing, AI-generated headline, burnout gauge, focus sparkline |
| **Smart Calendar** | Week view with drag-and-drop, color-coded categories, conflict detection |
| **AI Planner** | Heuristic scheduler that scores slots by priority × deadline × energy × earliness |
| **Tasks** | Filterable list (Today / Upcoming / Overdue / Done) with search, add/edit modals |
| **Goals** | Goal cards with auto-progress, linked milestones you can cycle through |
| **Habits** | Streaks, 30-day rate, 12-week heatmap, mini-history per habit |
| **Deep Work** | Pomodoro timer with animated SVG ring, mode pills, session logging |
| **Study & Test** | Flashcard decks with **Leitner-box spaced repetition** (5 boxes, expanding intervals) |
| **Fitness & Nutrition** | Meals + workouts, macro donut, calorie balance |
| **Finance** | Budget by category, spending donut, recurring-expense auto-detection |
| **Wellness** | Water/sleep/mood/meditation with quick-log cards, sleep bars, mood timeline, journal |
| **Screen Time** | Productivity score, distracting-app alerts, manual logging |
| **Analytics** | Custom SVG line + bar + donut charts — no chart library |
| **Timeline** | Chronological activity stream across all data types |
| **Integrations** | Connector marketplace UI (Google Cal, Todoist, Notion, etc.) |
| **Security** | PIN lock (SHA-256 hashed), auto-lock, encrypted vault, data export/import/reset |

### 🤖 AI Secretary (FAB)

Click the floating button (bottom-right). It parses **30+ natural-language commands** with zero API calls:

```
add task: finish lab report
i spent 12 on coffee
i drank 4 glasses of water
start 25 minute focus
focus on algorithm review
i slept 7.5 hours
plan my day
how's my burnout
i did morning run
make a flashcard for: BFS vs DFS
```

It mutates your real data — adding tasks, logging habits, recording transactions, starting focus sessions.

## 🎨 Design

- **Theme:** "Cosmic Aurora" — deep-space background, animated nebula, drifting starfield
- **Accent colors:** cyan → violet → magenta gradient (no generic SaaS purple)
- **Type:** Inter for UI, JetBrains Mono for data
- **Motion:** Spring physics on every interactive element
- **A11y:** Skip-link, ARIA roles, keyboard nav, focus rings, reduced-motion support

## 🏗️ Architecture

```
lifeos/
├── index.html              ← Single shell, semantic, no inline JS
├── css/styles.css          ← Design system (1600 lines, ~40 components)
├── js/
│   ├── app.js              ← Entry: mount chrome, register routes
│   ├── store.js            ← Reactive store with localStorage persistence
│   ├── bus.js              ← Tiny event bus
│   ├── router.js           ← Hash-based router with module lifecycle
│   ├── utils.js            ← h() factory, icons, modals, toasts
│   ├── planner.js          ← Heuristic scheduler + burnout calc
│   ├── secretary.js        ← NLP command parser (no API)
│   ├── secretary-ui.js     ← FAB + chat panel
│   ├── seed.js             ← 2+ weeks of demo data
│   ├── sidebar.js          ← Sidebar + topbar + search
│   ├── toast-stack.js      ← Toast notifications
│   ├── dashboard.js        ← 16 page modules, all <300 lines each
│   ├── calendar.js planner-page.js tasks.js goals.js habits.js
│   ├── focus.js study.js food.js finance.js wellness.js
│   ├── screentime.js analytics.js timeline.js
│   ├── integrations.js security.js
├── icons/icon.svg          ← Cosmic lightning mark
├── manifest.json           ← PWA manifest
├── service-worker.js       ← Offline support
├── .github/workflows/ci.yml
├── EVALUATION.md           ← Honest assessment of the previous repo
└── README.md
```

**One coherent stack.** No parallel React/vanilla split. No empty folders pretending to be features.

## 🚀 Run It

```bash
# Any static server works:
python3 -m http.server 8765

# Or:
npx serve .
# Or:
php -S localhost:8765
```

Then open `http://localhost:8765/`. That's it.

The first run seeds 2+ weeks of realistic demo data — open the dashboard and you'll see real tasks, events, habits, focus sessions, meals, workouts, transactions, journal entries. All stored in `localStorage` under key `lifeos:v2`.

## 📱 Install as PWA

Visit it in Chrome / Edge / Safari → click the install icon → it'll launch in its own window like a native app.

## 🧠 AI Planner Heuristic

Scoring formula (higher = better slot):

```
score = priorityWeight × 20
      + (1 / max(1, hoursUntilDue / 24)) × 10   ← urgency
      + energyPreference(startHour) × 6          ← morning for HIGH energy
      + (24 - startHour) × (HIGH ? 1 : 0.3)      ← earliness
      + (conflict ? −20 : 0)                     ← overlap penalty
```

Tasks are then greedily placed into the highest-scoring free slot, skipping any that would miss a deadline.

## 🔥 Burnout Score

```
score = min(40, max(0, (workloadDensity − 0.7) × 50))   ← workload
      + min(30, missedTaskCount × 6)                    ← slippage
      + min(20, streakDeclineRate × 20)                 ← habit erosion
      + (focusTrend < 0 ? min(15, −focusTrend × 15) : 0)← focus loss
      clamped to 0–100
```

Plus contextual recommendations — see `src/lib/planner.js`.

## 🧪 Testing

```bash
# Run the CI smoke test locally:
npm install --no-save playwright
npx playwright install --with-deps chromium
python3 -m http.server 8765 &
node /path/to/smoke.cjs
```

The smoke test visits all 16 routes and asserts zero console errors.

## 📜 License

MIT — see [LICENSE](LICENSE).

## 🙌 Credits

Built as a 10x rebuild of [the original lifeos repo](https://github.com/guptaryang-rgb/lifeos) — which had an ambitious product spec but a confused two-stack architecture. See [EVALUATION.md](EVALUATION.md) for the honest assessment of what changed and why.
