# Original User Request

## Initial Request — 2026-06-16T22:41:52Z

Build **LifeOS** — a production-ready, full-stack AI Chief of Staff web application for students and young professionals. The system actively manages a person's life through intelligent scheduling, dynamic replanning, goal tracking, habit formation, burnout prediction, and productivity analytics. It must feel premium, modern, and alive — not a simple to-do app. This is a launchable product MVP with the 6 deepest features built to production quality.

Working directory: C:\Users\gupta_ikq631n\teamwork_projects\lifeos
Integrity mode: development

## Requirements

### R1. Unified Dashboard & Daily Briefing

A stunning dark-mode dashboard with glassmorphism aesthetics, vibrant gradients, and micro-animations that serves as the central hub. It must include:
- A **Daily Briefing** panel showing today's schedule, upcoming deadlines, priority tasks, habit streaks, and an AI-generated summary of the day ahead.
- Quick-action widgets for adding tasks, starting focus sessions, and logging habits.
- Real-time stats: tasks completed, focus time, streak counts, and a "life score" metric.
- Responsive layout that works beautifully on both desktop (1440px+) and mobile (375px+) viewports.

### R2. AI Planner & Smart Calendar

An intelligent scheduling system that goes beyond static calendars:
- **Smart Calendar** with week/day/month views, drag-and-drop event management, color-coded categories (work, personal, academic, health), and time-block visualization.
- **AI Planner** that analyzes tasks by priority, deadline, estimated duration, and energy level to generate an optimal daily/weekly schedule. Uses rule-based heuristics by default (prioritization algorithms, deadline proximity scoring, workload balancing) with an optional hook for LLM API integration.
- **Dynamic Replanning**: when a task is missed, added, or rescheduled, the planner automatically suggests a revised schedule.
- **Conflict detection** that warns when the schedule is overloaded or deadlines are at risk.

### R3. Assignment Tracker & Goal System

- **Assignment Tracker**: ingest assignments with title, description, due date, course/project, estimated effort, and priority. Track status (not started, in progress, completed, overdue). Support subtasks and progress percentage.
- **Goal System**: set short-term (weekly), medium-term (monthly), and long-term (yearly) goals. Each goal has measurable milestones, progress tracking, and visual progress indicators. Goals can be linked to daily tasks so completing tasks advances goal progress automatically.
- Both systems must have filtering, sorting, and search capabilities.

### R4. Habit Tracker & Progress Analytics

- **Habit Tracker**: create habits with custom frequency (daily, weekly, specific days), track streaks, visualize completion with heat maps and streak counters. Support habit categories and reminders.
- **Progress Analytics Dashboard**: productivity charts showing focus hours over time, task completion rates, habit adherence, goal progress, and comparative weekly/monthly trends. Use interactive charts (line, bar, heatmap, radial progress).
- **Burnout Prediction**: a heuristic system that monitors workload density, missed tasks, declining habit streaks, and reduced focus time to generate a burnout risk score (0-100) with actionable recommendations.
- **Deep Work Mode**: a focus session timer (Pomodoro-style with customizable intervals) that includes a distraction blocker UI, session logging, and focus statistics.

### R5. Intelligence Layer & Data Architecture

- **Full-stack architecture**: Next.js 14+ with App Router, React Server Components where appropriate, and a PostgreSQL database via Prisma ORM.
- **API layer**: RESTful API routes for all CRUD operations with proper validation, error handling, and consistent response formats.
- **Database schema** covering: Users, Tasks, Events, Goals, Milestones, Habits, HabitLogs, FocusSessions, Analytics snapshots, and AI schedule suggestions.
- **Behavioral intelligence** (rule-based): task duration estimation based on historical data, procrastination detection (tasks untouched near deadlines), automatic priority recalculation, and optimal time-slot suggestions.
- **Authentication**: NextAuth.js with credential-based login (email/password) and session management.
- **Seed data**: include a comprehensive seed script that populates the database with realistic demo data (2+ weeks of tasks, events, habits, goals, and analytics) so the app looks alive on first launch.

## Acceptance Criteria

### Build & Launch
- [ ] `npm install` completes without errors
- [ ] `npx prisma generate` and `npx prisma db push` execute successfully
- [ ] `npx prisma db seed` populates the database with realistic demo data
- [ ] `npm run build` completes with zero errors
- [ ] `npm run dev` starts the application and the dashboard loads at localhost:3000
- [ ] All API routes return proper JSON responses with appropriate HTTP status codes

### Dashboard & Daily Briefing
- [ ] Dashboard renders with dark glassmorphism theme, gradient accents, and smooth animations
- [ ] Daily briefing panel displays today's tasks, events, habits, and an AI-generated day summary
- [ ] Dashboard is fully responsive — usable on both 1440px desktop and 375px mobile viewports
- [ ] Quick-action widgets (add task, start focus, log habit) function correctly

### AI Planner & Calendar
- [ ] Calendar displays events in day, week, and month views with color-coded categories
- [ ] Events can be created, edited, deleted, and dragged to reschedule
- [ ] AI planner generates a suggested daily schedule based on task priorities, deadlines, and estimated durations
- [ ] When a task is added or removed, the planner recalculates and offers an updated schedule
- [ ] Conflict detection alerts the user when schedule is overloaded

### Assignment Tracker & Goals
- [ ] Tasks can be created with all required fields (title, due date, priority, estimated effort, status)
- [ ] Tasks support subtasks and progress percentage tracking
- [ ] Goals can be created at weekly, monthly, and yearly scopes with milestones
- [ ] Completing linked tasks automatically updates goal progress
- [ ] Filtering, sorting, and search work across both tasks and goals

### Habits & Analytics
- [ ] Habits can be created with custom frequency and tracked daily
- [ ] Habit streaks are correctly calculated and displayed with a visual heat map
- [ ] Analytics dashboard shows interactive charts for productivity metrics
- [ ] Burnout risk score (0-100) is calculated and displayed with recommendations
- [ ] Deep work timer functions with start/pause/stop, session logging, and statistics

### Data Integrity
- [ ] Database schema includes all required tables with proper relations and constraints
- [ ] API validates input data and returns meaningful error messages for invalid requests
- [ ] Authentication flow (register, login, logout) works end-to-end
- [ ] User data is properly scoped — each user sees only their own data
