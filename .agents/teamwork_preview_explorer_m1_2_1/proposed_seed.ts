import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Deterministic anchor date representing "today" (June 16, 2026 at 12:00 UTC)
const BASE_DATE = new Date("2026-06-16T12:00:00Z");

/**
 * Generates a Date object relative to the BASE_DATE.
 * Ensures UTC time consistency.
 * 
 * @param daysOffset Days to add (positive) or subtract (negative) from today
 * @param hours UTC hour of the day
 * @param minutes UTC minutes of the hour
 */
function getRelativeDate(daysOffset: number, hours: number, minutes: number = 0): Date {
  const date = new Date(BASE_DATE);
  date.setUTCDate(date.getUTCDate() + daysOffset);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}

async function main() {
  console.log("Starting database cleanup...");

  // 1. Delete all existing records in dependency-safe order
  await prisma.scheduleSuggestion.deleteMany({});
  await prisma.focusSession.deleteMany({});
  await prisma.habitLog.deleteMany({});
  await prisma.habit.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.analyticsSnapshot.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Database cleanup complete. Starting seeding...");

  // 2. Create the default test user
  const hashedPassword = bcrypt.hashSync("password123", 10);
  const user = await prisma.user.create({
    data: {
      email: "user@example.com",
      password: hashedPassword,
      name: "Test User",
    },
  });
  console.log(`Created default user: ${user.email}`);

  // 3. Create Goals & Milestones
  console.log("Seeding Goals and Milestones...");
  
  // Goal 1: Next.js Mastery
  const goal1 = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Master Next.js & TypeScript",
      description: "Build high-performance web applications with Next.js App Router and TypeScript",
      targetDate: getRelativeDate(30, 12), // 30 days from now
      progress: 60,
    },
  });

  const m1_1 = await prisma.milestone.create({
    data: {
      goalId: goal1.id,
      title: "Complete official Next.js tutorial",
      status: "COMPLETED",
      targetDate: getRelativeDate(-8, 12),
    },
  });

  const m1_2 = await prisma.milestone.create({
    data: {
      goalId: goal1.id,
      title: "Build a full-stack CRUD application",
      status: "IN_PROGRESS",
      targetDate: getRelativeDate(6, 12),
    },
  });

  const m1_3 = await prisma.milestone.create({
    data: {
      goalId: goal1.id,
      title: "Deploy to Vercel and optimize SEO",
      status: "NOT_STARTED",
      targetDate: getRelativeDate(24, 12),
    },
  });

  // Goal 2: Marathon Training
  const goal2 = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Run a 10K Marathon",
      description: "Train consistently to run a 10K marathon under 55 minutes",
      targetDate: getRelativeDate(60, 12), // 60 days from now
      progress: 33,
    },
  });

  const m2_1 = await prisma.milestone.create({
    data: {
      goalId: goal2.id,
      title: "Run 5K without stopping",
      status: "COMPLETED",
      targetDate: getRelativeDate(-5, 12),
    },
  });

  const m2_2 = await prisma.milestone.create({
    data: {
      goalId: goal2.id,
      title: "Increase weekly distance to 20K",
      status: "IN_PROGRESS",
      targetDate: getRelativeDate(14, 12),
    },
  });

  const m2_3 = await prisma.milestone.create({
    data: {
      goalId: goal2.id,
      title: "Complete 10K trial run",
      status: "NOT_STARTED",
      targetDate: getRelativeDate(55, 12),
    },
  });

  // Goal 3: Sleep Hygiene
  const goal3 = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Improve Sleep Hygiene",
      description: "Develop healthy evening habits to improve sleep quality and daily energy",
      targetDate: getRelativeDate(14, 12), // 14 days from now
      progress: 80,
    },
  });

  const m3_1 = await prisma.milestone.create({
    data: {
      goalId: goal3.id,
      title: "Set up no-screens-after-9pm rule",
      status: "COMPLETED",
      targetDate: getRelativeDate(-6, 12),
    },
  });

  const m3_2 = await prisma.milestone.create({
    data: {
      goalId: goal3.id,
      title: "Maintain 7-8 hours sleep for 10 days",
      status: "COMPLETED",
      targetDate: getRelativeDate(-1, 12),
    },
  });

  console.log("Seeding Tasks...");
  // 4. Create Tasks (completed, overdue, in_progress, not_started)
  // Historical Tasks
  const task1 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Setup Next.js project skeleton",
      description: "Initialize Next.js project with Tailwind CSS, TypeScript, and ESLint",
      dueDate: getRelativeDate(-14, 17),
      estimatedDuration: 60,
      priority: "HIGH",
      energyLevel: "MEDIUM",
      status: "COMPLETED",
      createdAt: getRelativeDate(-14, 9),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Read Next.js routing documentation",
      description: "Study Next.js 14+ App Router routing concepts, layouts, and templates",
      dueDate: getRelativeDate(-13, 17),
      estimatedDuration: 45,
      priority: "MEDIUM",
      energyLevel: "LOW",
      status: "COMPLETED",
      createdAt: getRelativeDate(-13, 9),
    },
  });

  const task3 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Run 3K trail",
      description: "Slow recovery trail run in the local park",
      dueDate: getRelativeDate(-12, 17),
      estimatedDuration: 30,
      priority: "LOW",
      energyLevel: "HIGH",
      status: "COMPLETED",
      createdAt: getRelativeDate(-12, 9),
    },
  });

  const task4 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Design PostgreSQL schema draft",
      description: "Draw out the database ER diagram and plan schemas for users, tasks, and habits",
      dueDate: getRelativeDate(-11, 17),
      estimatedDuration: 90,
      priority: "HIGH",
      energyLevel: "HIGH",
      status: "COMPLETED",
      createdAt: getRelativeDate(-11, 9),
    },
  });

  const task5 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Configure ESLint and Prettier",
      description: "Integrate linting guidelines and auto-formatting rules to match project standards",
      dueDate: getRelativeDate(-10, 17),
      estimatedDuration: 30,
      priority: "LOW",
      energyLevel: "LOW",
      status: "COMPLETED",
      createdAt: getRelativeDate(-10, 9),
    },
  });

  const task6 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Run 4K run",
      description: "Interval training run targeting a 5:30/km pace",
      dueDate: getRelativeDate(-9, 17),
      estimatedDuration: 35,
      priority: "LOW",
      energyLevel: "HIGH",
      status: "COMPLETED",
      createdAt: getRelativeDate(-9, 9),
    },
  });

  const task7 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Create database migrations",
      description: "Initialize Prisma migration and deploy schema to the SQLite dev database",
      dueDate: getRelativeDate(-8, 17),
      estimatedDuration: 60,
      priority: "MEDIUM",
      energyLevel: "MEDIUM",
      status: "COMPLETED",
      createdAt: getRelativeDate(-8, 9),
    },
  });

  const task8 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Implement authentication routes",
      description: "Configure NextAuth.js credentials provider, sign-in endpoints, and session check helper",
      dueDate: getRelativeDate(-7, 17),
      estimatedDuration: 120,
      priority: "HIGH",
      energyLevel: "HIGH",
      status: "COMPLETED",
      createdAt: getRelativeDate(-7, 9),
    },
  });

  const task9 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Test auth flow with mock user",
      description: "Manually log in and register to verify cookies, protected route redirects, and token parsing",
      dueDate: getRelativeDate(-6, 17),
      estimatedDuration: 45,
      priority: "MEDIUM",
      energyLevel: "LOW",
      status: "COMPLETED",
      createdAt: getRelativeDate(-6, 9),
    },
  });

  const task10 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Run 5K trial run",
      description: "Targeting a steady pace marathon test run. Goal is no stopping.",
      dueDate: getRelativeDate(-5, 17),
      estimatedDuration: 45,
      priority: "HIGH",
      energyLevel: "HIGH",
      status: "COMPLETED",
      createdAt: getRelativeDate(-5, 9),
    },
  });
  // Link to marathon milestone m2_1
  await prisma.milestone.update({
    where: { id: m2_1.id },
    data: { status: "COMPLETED" },
  });

  const task11 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Create layout wrappers for dashboard",
      description: "Code responsive grid panels and dark-mode glassmorphic sidebar layout",
      dueDate: getRelativeDate(-4, 17),
      estimatedDuration: 90,
      priority: "HIGH",
      energyLevel: "MEDIUM",
      status: "COMPLETED",
      createdAt: getRelativeDate(-4, 9),
    },
  });

  const task12 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Implement sidebar navigation UI",
      description: "Create interactive navigation links with active routing indicators and hover states",
      dueDate: getRelativeDate(-3, 17),
      estimatedDuration: 60,
      priority: "MEDIUM",
      energyLevel: "LOW",
      status: "COMPLETED",
      createdAt: getRelativeDate(-3, 9),
    },
  });

  const task13 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Design glassmorphic card primitives",
      description: "Build clean, reusable cards with background blur and gradient borders using Tailwind CSS",
      dueDate: getRelativeDate(-2, 17),
      estimatedDuration: 90,
      priority: "MEDIUM",
      energyLevel: "MEDIUM",
      status: "COMPLETED",
      createdAt: getRelativeDate(-2, 9),
    },
  });

  const task14 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Submit timesheet for freelance work",
      description: "Compile and submit invoice timesheet for May contract deliverables",
      dueDate: getRelativeDate(-2, 17),
      estimatedDuration: 30,
      priority: "HIGH",
      energyLevel: "LOW",
      status: "OVERDUE",
      createdAt: getRelativeDate(-3, 9),
    },
  });

  const task15 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Connect dashboard page to database client",
      description: "Fetch task summary and event list directly from Prisma on the dashboard server route",
      dueDate: getRelativeDate(-1, 17),
      estimatedDuration: 60,
      priority: "HIGH",
      energyLevel: "HIGH",
      status: "COMPLETED",
      createdAt: getRelativeDate(-2, 9),
    },
  });

  const task16 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Update project readme instructions",
      description: "Document project setup commands, database migrations, and testing strategies",
      dueDate: getRelativeDate(-1, 17),
      estimatedDuration: 30,
      priority: "LOW",
      energyLevel: "LOW",
      status: "COMPLETED",
      createdAt: getRelativeDate(-1, 9),
    },
  });

  // Current / Active Tasks
  const task17 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Integrate daily briefing API",
      description: "Add a REST endpoint to fetch summarized daily stats, habits, and AI planning summaries",
      dueDate: getRelativeDate(0, 18), // Today
      estimatedDuration: 120,
      priority: "HIGH",
      energyLevel: "HIGH",
      status: "IN_PROGRESS",
      createdAt: getRelativeDate(-1, 15),
    },
  });

  const task18 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Fix Tailwind color configuration bugs",
      description: "Resolve light-opacity background issues on cards by configuring proper glassmorphic extensions",
      dueDate: getRelativeDate(0, 20), // Today
      estimatedDuration: 45,
      priority: "MEDIUM",
      energyLevel: "LOW",
      status: "NOT_STARTED",
      createdAt: getRelativeDate(0, 9),
    },
  });

  // Future Tasks
  const task19 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Create Calendar page UI skeleton",
      description: "Design the calendar layout supporting day, week, and month views",
      dueDate: getRelativeDate(1, 17), // Tomorrow
      estimatedDuration: 90,
      priority: "HIGH",
      energyLevel: "MEDIUM",
      status: "NOT_STARTED",
      createdAt: getRelativeDate(0, 14),
    },
  });

  const task20 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Implement time-blocking drag-and-drop",
      description: "Integrate react-dnd or native pointer events for moving calendar blocks to update task dates",
      dueDate: getRelativeDate(2, 17),
      estimatedDuration: 150,
      priority: "HIGH",
      energyLevel: "HIGH",
      status: "NOT_STARTED",
      createdAt: getRelativeDate(0, 15),
    },
  });

  const task21 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Set up weekly review form",
      description: "Design questions evaluating focus sessions, workload density, and habit compliance",
      dueDate: getRelativeDate(3, 17),
      estimatedDuration: 60,
      priority: "LOW",
      energyLevel: "LOW",
      status: "NOT_STARTED",
      createdAt: getRelativeDate(0, 16),
    },
  });

  const task22 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Write unit tests for planning heuristics",
      description: "Test the AI scheduler algorithm for overlapping events, overload warning limits, and priority shifts",
      dueDate: getRelativeDate(4, 17),
      estimatedDuration: 120,
      priority: "MEDIUM",
      energyLevel: "HIGH",
      status: "NOT_STARTED",
      createdAt: getRelativeDate(0, 16),
    },
  });

  const task23 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Run 6K run",
      description: "Long steady run at marathon pace",
      dueDate: getRelativeDate(5, 17),
      estimatedDuration: 50,
      priority: "MEDIUM",
      energyLevel: "HIGH",
      status: "NOT_STARTED",
      createdAt: getRelativeDate(0, 17),
    },
  });

  const task24 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Refactor API routes validation",
      description: "Use Zod schemas to validate payload structures on tasks, events, and focus endpoints",
      dueDate: getRelativeDate(6, 17),
      estimatedDuration: 90,
      priority: "LOW",
      energyLevel: "MEDIUM",
      status: "NOT_STARTED",
      createdAt: getRelativeDate(0, 18),
    },
  });

  const task25 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Deploy preview build to Vercel",
      description: "Link GitHub repository, add configuration env variables, and run production build sanity check",
      dueDate: getRelativeDate(7, 17),
      estimatedDuration: 60,
      priority: "HIGH",
      energyLevel: "LOW",
      status: "NOT_STARTED",
      createdAt: getRelativeDate(0, 18),
    },
  });

  console.log("Seeding Events...");
  // 5. Create Events
  // Category values: WORK, PERSONAL, ACADEMIC, HEALTH
  const eventsData = [];

  // Recurring Daily Mon-Fri Work Standups (10:00 - 10:30 UTC) for 14 days in past, plus 7 days in future
  for (let i = -14; i <= 7; i++) {
    const standupDate = getRelativeDate(i, 10, 0);
    const dayOfWeek = standupDate.getUTCDay();
    // Only Mon-Fri (1 = Monday, 5 = Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      eventsData.push({
        userId: user.id,
        title: "Daily Standup",
        category: "WORK",
        startTime: getRelativeDate(i, 10, 0),
        endTime: getRelativeDate(i, 10, 30),
      });
    }
  }

  // Add specific historical events
  eventsData.push(
    {
      userId: user.id,
      title: "Dinner with Sarah",
      category: "PERSONAL",
      startTime: getRelativeDate(-12, 18, 0),
      endTime: getRelativeDate(-12, 19, 30),
    },
    {
      userId: user.id,
      title: "Next.js Study Session",
      category: "ACADEMIC",
      startTime: getRelativeDate(-10, 14, 0),
      endTime: getRelativeDate(-10, 16, 0),
    },
    {
      userId: user.id,
      title: "Morning Cardio Workout",
      category: "HEALTH",
      startTime: getRelativeDate(-8, 7, 0),
      endTime: getRelativeDate(-8, 8, 0),
    },
    {
      userId: user.id,
      title: "Database Tuning Lecture",
      category: "ACADEMIC",
      startTime: getRelativeDate(-5, 15, 0),
      endTime: getRelativeDate(-5, 17, 0),
    },
    {
      userId: user.id,
      title: "Sunday Family Lunch",
      category: "PERSONAL",
      startTime: getRelativeDate(-2, 12, 0),
      endTime: getRelativeDate(-2, 14, 0),
    },
    // Today's event
    {
      userId: user.id,
      title: "Dentist Appointment",
      category: "HEALTH",
      startTime: getRelativeDate(0, 14, 0),
      endTime: getRelativeDate(0, 15, 0),
    },
    // Future events
    {
      userId: user.id,
      title: "Next.js Workshop",
      category: "ACADEMIC",
      startTime: getRelativeDate(1, 13, 0),
      endTime: getRelativeDate(1, 14, 30),
    },
    {
      userId: user.id,
      title: "Friday Movie Night",
      category: "PERSONAL",
      startTime: getRelativeDate(3, 18, 0),
      endTime: getRelativeDate(3, 21, 0),
    },
    {
      userId: user.id,
      title: "Sunday Long Run",
      category: "HEALTH",
      startTime: getRelativeDate(5, 8, 0),
      endTime: getRelativeDate(5, 9, 30),
    }
  );

  for (const event of eventsData) {
    await prisma.event.create({ data: event });
  }

  console.log("Seeding Habits...");
  // 6. Create Habits and HabitLogs (Consistent Streaks)
  const habit1 = await prisma.habit.create({
    data: {
      userId: user.id,
      title: "Daily Meditation",
      frequency: "DAILY",
    },
  });

  const habit2 = await prisma.habit.create({
    data: {
      userId: user.id,
      title: "Read 10 Pages",
      frequency: "DAILY",
    },
  });

  const habit3 = await prisma.habit.create({
    data: {
      userId: user.id,
      title: "Weekly Review",
      frequency: "WEEKLY",
    },
  });

  // Log Daily Meditation: Completed 13/14 days, including today. Last missed was 8 days ago (day -8).
  // This creates a solid 8-day streak (days -7, -6, -5, -4, -3, -2, -1, 0)
  const habit1Completions = [-14, -13, -12, -11, -10, -9, -7, -6, -5, -4, -3, -2, -1, 0];
  for (const dayOffset of habit1Completions) {
    await prisma.habitLog.create({
      data: {
        habitId: habit1.id,
        completedAt: getRelativeDate(dayOffset, 8, 0), // Completed in morning at 8:00
      },
    });
  }

  // Log Read 10 Pages: Completed 11/14 days. Missed days: -11, -7.
  // Last completed: yesterday (day -1). Active streak is 5 days (days -5, -4, -3, -2, -1)
  const habit2Completions = [-14, -13, -12, -10, -9, -8, -6, -5, -4, -3, -2, -1];
  for (const dayOffset of habit2Completions) {
    await prisma.habitLog.create({
      data: {
        habitId: habit2.id,
        completedAt: getRelativeDate(dayOffset, 21, 30), // Completed in evening at 21:30
      },
    });
  }

  // Log Weekly Review: Completed on Sundays of last week (day -9, June 7) and two weeks ago (day -16, May 31)
  const habit3Completions = [-16, -9];
  for (const dayOffset of habit3Completions) {
    await prisma.habitLog.create({
      data: {
        habitId: habit3.id,
        completedAt: getRelativeDate(dayOffset, 17, 0), // Completed Sunday afternoon at 17:00
      },
    });
  }

  console.log("Seeding Focus Sessions...");
  // 7. Create Focus Sessions (linked to tasks, realistic durations)
  const focusSessions = [
    {
      userId: user.id,
      taskId: task1.id, // Setup Next.js project skeleton
      startTime: getRelativeDate(-14, 14, 0),
      endTime: getRelativeDate(-14, 14, 50),
      duration: 50,
      createdAt: getRelativeDate(-14, 14, 50),
    },
    {
      userId: user.id,
      taskId: task4.id, // Design PostgreSQL ERD (Session 1)
      startTime: getRelativeDate(-11, 11, 0),
      endTime: getRelativeDate(-11, 11, 45),
      duration: 45,
      createdAt: getRelativeDate(-11, 11, 45),
    },
    {
      userId: user.id,
      taskId: task4.id, // Design PostgreSQL ERD (Session 2)
      startTime: getRelativeDate(-11, 13, 0),
      endTime: getRelativeDate(-11, 13, 45),
      duration: 45,
      createdAt: getRelativeDate(-11, 13, 45),
    },
    {
      userId: user.id,
      taskId: task8.id, // Implement auth routes (Session 1)
      startTime: getRelativeDate(-7, 9, 0),
      endTime: getRelativeDate(-7, 10, 0),
      duration: 60,
      createdAt: getRelativeDate(-7, 10, 0),
    },
    {
      userId: user.id,
      taskId: task8.id, // Implement auth routes (Session 2)
      startTime: getRelativeDate(-7, 14, 0),
      endTime: getRelativeDate(-7, 14, 50),
      duration: 50,
      createdAt: getRelativeDate(-7, 14, 50),
    },
    {
      userId: user.id,
      taskId: task11.id, // Create layout wrappers
      startTime: getRelativeDate(-4, 15, 30),
      endTime: getRelativeDate(-4, 17, 0),
      duration: 90,
      createdAt: getRelativeDate(-4, 17, 0),
    },
    {
      userId: user.id,
      taskId: task15.id, // Connect dashboard to DB client
      startTime: getRelativeDate(-1, 16, 0),
      endTime: getRelativeDate(-1, 17, 0),
      duration: 60,
      createdAt: getRelativeDate(-1, 17, 0),
    },
    {
      userId: user.id,
      taskId: task17.id, // Integrate daily briefing API (active today)
      startTime: getRelativeDate(0, 10, 45),
      endTime: getRelativeDate(0, 11, 30),
      duration: 45,
      createdAt: getRelativeDate(0, 11, 30),
    },
  ];

  for (const session of focusSessions) {
    await prisma.focusSession.create({ data: session });
  }

  console.log("Seeding Analytics Snapshots...");
  // 8. Create AnalyticsSnapshots (Historical daily trends for the last 14 days)
  // Let's create a realistic story:
  // - Days -14 to -10: Initial setup, high energy, positive focus trend, low/medium burnout (30-40)
  // - Days -9 to -5: Solid habit streak, consistent focus time, low missed tasks, stable burnout (40-45)
  // - Days -4 to -2: High workload density (working on complex layouts/cards), missed timesheet task, habit completion slightly delayed. Burnout peaks at 72.
  // - Day -1: Lower workload density, good focus, burnout risk begins resolving (65)
  const snapshots = [
    {
      userId: user.id,
      date: getRelativeDate(-14, 0, 0),
      workloadDensity: 0.25,
      missedTaskCount: 0,
      streakDeclineRate: 0.0,
      focusTimeTrend: 0.15,
      burnoutRiskScore: 32.5,
    },
    {
      userId: user.id,
      date: getRelativeDate(-13, 0, 0),
      workloadDensity: 0.3,
      missedTaskCount: 0,
      streakDeclineRate: 0.0,
      focusTimeTrend: 0.1,
      burnoutRiskScore: 35.0,
    },
    {
      userId: user.id,
      date: getRelativeDate(-12, 0, 0),
      workloadDensity: 0.28,
      missedTaskCount: 0,
      streakDeclineRate: 0.0,
      focusTimeTrend: 0.05,
      burnoutRiskScore: 34.0,
    },
    {
      userId: user.id,
      date: getRelativeDate(-11, 0, 0),
      workloadDensity: 0.45,
      missedTaskCount: 0,
      streakDeclineRate: 0.0,
      focusTimeTrend: 0.25,
      burnoutRiskScore: 40.5,
    },
    {
      userId: user.id,
      date: getRelativeDate(-10, 0, 0),
      workloadDensity: 0.35,
      missedTaskCount: 0,
      streakDeclineRate: 0.0,
      focusTimeTrend: 0.18,
      burnoutRiskScore: 38.0,
    },
    {
      userId: user.id,
      date: getRelativeDate(-9, 0, 0),
      workloadDensity: 0.4,
      missedTaskCount: 0,
      streakDeclineRate: 0.05,
      focusTimeTrend: 0.12,
      burnoutRiskScore: 42.0,
    },
    {
      userId: user.id,
      date: getRelativeDate(-8, 0, 0),
      workloadDensity: 0.42,
      missedTaskCount: 0,
      streakDeclineRate: 0.07,
      focusTimeTrend: 0.05,
      burnoutRiskScore: 44.5,
    },
    {
      userId: user.id,
      date: getRelativeDate(-7, 0, 0),
      workloadDensity: 0.55,
      missedTaskCount: 0,
      streakDeclineRate: 0.0,
      focusTimeTrend: 0.28,
      burnoutRiskScore: 48.0,
    },
    {
      userId: user.id,
      date: getRelativeDate(-6, 0, 0),
      workloadDensity: 0.48,
      missedTaskCount: 0,
      streakDeclineRate: 0.0,
      focusTimeTrend: 0.15,
      burnoutRiskScore: 46.5,
    },
    {
      userId: user.id,
      date: getRelativeDate(-5, 0, 0),
      workloadDensity: 0.52,
      missedTaskCount: 0,
      streakDeclineRate: 0.0,
      focusTimeTrend: 0.2,
      burnoutRiskScore: 49.0,
    },
    {
      userId: user.id,
      date: getRelativeDate(-4, 0, 0),
      workloadDensity: 0.78, // High pressure layout design work
      missedTaskCount: 0,
      streakDeclineRate: 0.08,
      focusTimeTrend: 0.35,
      burnoutRiskScore: 68.5,
    },
    {
      userId: user.id,
      date: getRelativeDate(-3, 0, 0),
      workloadDensity: 0.82,
      missedTaskCount: 0,
      streakDeclineRate: 0.1,
      focusTimeTrend: 0.22,
      burnoutRiskScore: 72.0, // Peak burnout risk score
    },
    {
      userId: user.id,
      date: getRelativeDate(-2, 0, 0),
      workloadDensity: 0.75,
      missedTaskCount: 1, // Missed the freelance timesheet deadline
      streakDeclineRate: 0.15,
      focusTimeTrend: 0.08,
      burnoutRiskScore: 71.5,
    },
    {
      userId: user.id,
      date: getRelativeDate(-1, 0, 0),
      workloadDensity: 0.45,
      missedTaskCount: 1, // Overdue task still pending
      streakDeclineRate: 0.08,
      focusTimeTrend: -0.15, // Focus hours dropped relative to heavy days
      burnoutRiskScore: 64.0,
    },
  ];

  for (const snapshot of snapshots) {
    await prisma.analyticsSnapshot.create({ data: snapshot });
  }

  console.log("Seeding Schedule Suggestions...");
  // 9. Create ScheduleSuggestions (AI planner recommendations for active tasks)
  // Let's create suggestions for three future tasks
  const suggestions = [
    {
      userId: user.id,
      taskId: task18.id, // Fix Tailwind color configuration bugs
      startTime: getRelativeDate(0, 18, 30), // Suggest today from 18:30 to 19:15
      endTime: getRelativeDate(0, 19, 15),
    },
    {
      userId: user.id,
      taskId: task19.id, // Create Calendar page UI skeleton
      startTime: getRelativeDate(1, 9, 30), // Suggest tomorrow morning from 09:30 to 11:00
      endTime: getRelativeDate(1, 11, 0),
    },
    {
      userId: user.id,
      taskId: task20.id, // Implement time-blocking drag-and-drop
      startTime: getRelativeDate(2, 13, 0), // Suggest day 2 afternoon from 13:00 to 15:30
      endTime: getRelativeDate(2, 15, 30),
    },
  ];

  for (const suggestion of suggestions) {
    await prisma.scheduleSuggestion.create({ data: suggestion });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error during database seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
