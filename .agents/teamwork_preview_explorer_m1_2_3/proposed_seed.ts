import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // 1. CLEAN DATABASE (in reverse dependency order to avoid foreign key constraints)
  console.log("Cleaning database...");
  await prisma.scheduleSuggestion.deleteMany();
  await prisma.focusSession.deleteMany();
  await prisma.habitLog.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.event.deleteMany();
  await prisma.task.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.analyticsSnapshot.deleteMany();
  await prisma.user.deleteMany();
  console.log("Database cleaned.");

  // 2. CREATE DEFAULT USER
  console.log("Creating default user...");
  // Hash password using bcryptjs
  const hashedPassword = await bcrypt.hash("password123", 10);
  
  const user = await prisma.user.create({
    data: {
      email: "user@example.com",
      password: hashedPassword,
      name: "Test User",
    },
  });
  const userId = user.id;
  console.log(`Default user created: ${user.email} (ID: ${userId})`);

  // Define date anchors relative to the Playwright E2E fixed test clock (June 16, 2026)
  const baseDate = new Date("2026-06-16T12:00:00Z");

  // Helper to generate dates relative to the base date
  const getRelativeDate = (daysOffset: number, hoursOffset: number = 0, minutesOffset: number = 0) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + daysOffset);
    d.setHours(d.getHours() + hoursOffset);
    d.setMinutes(d.getMinutes() + minutesOffset);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  };

  // 3. SEED GOALS & MILESTONES
  console.log("Seeding goals and milestones...");
  
  const rustGoal = await prisma.goal.create({
    data: {
      userId,
      title: "Learn Rust Programming",
      description: "Master Rust syntax and build high-performance backend systems.",
      targetDate: getRelativeDate(30), // 30 days in the future
      progress: 33, // 1 of 3 milestones completed
      milestones: {
        create: [
          {
            title: "Complete Rust Book syntax",
            status: "COMPLETED",
            targetDate: getRelativeDate(-8),
          },
          {
            title: "Build command-line tool",
            status: "IN_PROGRESS",
            targetDate: getRelativeDate(6),
          },
          {
            title: "Deploy web server",
            status: "NOT_STARTED",
            targetDate: getRelativeDate(20),
          },
        ],
      },
    },
    include: { milestones: true },
  });

  const portfolioGoal = await prisma.goal.create({
    data: {
      userId,
      title: "Launch Portfolio Website",
      description: "Design and build a responsive glassmorphic dark-mode web portfolio.",
      targetDate: getRelativeDate(14), // 14 days in the future
      progress: 33, // 1 of 3 milestones completed
      milestones: {
        create: [
          {
            title: "Design wireframes",
            status: "COMPLETED",
            targetDate: getRelativeDate(-6),
          },
          {
            title: "Implement glassmorphic landing page",
            status: "IN_PROGRESS",
            targetDate: getRelativeDate(4),
          },
          {
            title: "Configure domain and deploy to Vercel",
            status: "NOT_STARTED",
            targetDate: getRelativeDate(13),
          },
        ],
      },
    },
    include: { milestones: true },
  });

  console.log("Goals and milestones seeded successfully.");

  // 4. SEED TASKS
  console.log("Seeding tasks...");

  // We will map task titles to created task records to link to Focus Sessions and Suggestions
  const createdTasks: Record<string, string> = {};

  const tasksData = [
    // Past Completed Tasks (June 2 to June 15)
    {
      title: "Read Chapter 1-5 of Rust Book",
      description: "Understand variables, ownership, mutability, and structs.",
      dueDate: getRelativeDate(-10),
      estimatedDuration: 120,
      priority: "MEDIUM",
      energyLevel: "MEDIUM",
      status: "COMPLETED",
    },
    {
      title: "Sketch Homepage Layouts",
      description: "Draw wireframes on paper for desktop and mobile layouts.",
      dueDate: getRelativeDate(-7),
      estimatedDuration: 90,
      priority: "HIGH",
      energyLevel: "MEDIUM",
      status: "COMPLETED",
    },
    {
      title: "Setup Github Repository",
      description: "Initialize repository with readme, license, and gitignore.",
      dueDate: getRelativeDate(-12),
      estimatedDuration: 30,
      priority: "LOW",
      energyLevel: "LOW",
      status: "COMPLETED",
    },
    {
      title: "Weekly grocery shopping",
      description: "Buy fruits, veggies, proteins, and milk.",
      dueDate: getRelativeDate(-9),
      estimatedDuration: 60,
      priority: "LOW",
      energyLevel: "LOW",
      status: "COMPLETED",
    },
    {
      title: "Write blog post draft",
      description: "Draft a post about learning Rust as a web developer.",
      dueDate: getRelativeDate(-4),
      estimatedDuration: 90,
      priority: "MEDIUM",
      energyLevel: "MEDIUM",
      status: "COMPLETED",
    },
    {
      title: "Workout session A",
      description: "Push day: chest, shoulders, triceps.",
      dueDate: getRelativeDate(-3),
      estimatedDuration: 60,
      priority: "LOW",
      energyLevel: "HIGH",
      status: "COMPLETED",
    },
    {
      title: "Fix git issue #12",
      description: "Resolve merge conflicts in main branch.",
      dueDate: getRelativeDate(-2),
      estimatedDuration: 45,
      priority: "HIGH",
      energyLevel: "HIGH",
      status: "COMPLETED",
    },
    // Past Overdue Tasks (Due in the past, but NOT completed)
    {
      title: "Review CS101 Lecture Notes",
      description: "Review dynamic programming and recursion principles.",
      dueDate: getRelativeDate(-2),
      estimatedDuration: 60,
      priority: "HIGH",
      energyLevel: "LOW",
      status: "OVERDUE",
    },
    {
      title: "Update resume references",
      description: "Get confirmation from previous employer and update references list.",
      dueDate: getRelativeDate(-5),
      estimatedDuration: 45,
      priority: "MEDIUM",
      energyLevel: "LOW",
      status: "OVERDUE",
    },
    // Today's Tasks (June 16)
    {
      title: "Implement glassmorphic navbar",
      description: "Build navbar component with glassmorphism blur and active route highlighting.",
      dueDate: getRelativeDate(0),
      estimatedDuration: 120,
      priority: "HIGH",
      energyLevel: "HIGH",
      status: "IN_PROGRESS",
    },
    {
      title: "Buy groceries",
      description: "Pick up weekly groceries from the supermarket.",
      dueDate: getRelativeDate(0),
      estimatedDuration: 30,
      priority: "LOW",
      energyLevel: "LOW",
      status: "NOT_STARTED",
    },
    {
      title: "Completed Morning Workout",
      description: "Leg day: squats, lunges, and calf raises.",
      dueDate: getRelativeDate(0),
      estimatedDuration: 60,
      priority: "LOW",
      energyLevel: "HIGH",
      status: "COMPLETED",
    },
    // Future Tasks (June 17+)
    {
      title: "Implement project section details",
      description: "Create project card components with dynamic tag badges and GitHub links.",
      dueDate: getRelativeDate(2),
      estimatedDuration: 180,
      priority: "HIGH",
      energyLevel: "HIGH",
      status: "NOT_STARTED",
    },
    {
      title: "Build CLI arguments parser in Rust",
      description: "Implement CLI argument parsing library using clap package.",
      dueDate: getRelativeDate(3),
      estimatedDuration: 120,
      priority: "MEDIUM",
      energyLevel: "HIGH",
      status: "NOT_STARTED",
    },
    {
      title: "Clean apartment",
      description: "Vacuum, dust, wash dishes, and clean bathroom.",
      dueDate: getRelativeDate(4),
      estimatedDuration: 90,
      priority: "LOW",
      energyLevel: "MEDIUM",
      status: "NOT_STARTED",
    },
    {
      title: "Doctor checkup",
      description: "Routine annual physical exam at clinical center.",
      dueDate: getRelativeDate(5),
      estimatedDuration: 60,
      priority: "MEDIUM",
      energyLevel: "LOW",
      status: "NOT_STARTED",
    }
  ];

  for (const t of tasksData) {
    const task = await prisma.task.create({
      data: {
        userId,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate,
        estimatedDuration: t.estimatedDuration,
        priority: t.priority,
        energyLevel: t.energyLevel,
        status: t.status,
      },
    });
    createdTasks[t.title] = task.id;
  }
  console.log("Tasks seeded successfully.");

  // 5. SEED CALENDAR EVENTS
  console.log("Seeding calendar events...");
  
  const eventsData = [
    // Historical Classes/Work Events (June 2 to June 15)
    // Week 1 weekdays
    { title: "Physics 101 Lecture", start: getRelativeDate(-14, 14, 0), end: getRelativeDate(-14, 16, 0), category: "ACADEMIC" },
    { title: "Work Team Sync", start: getRelativeDate(-13, 10, 0), end: getRelativeDate(-13, 11, 30), category: "WORK" },
    { title: "Physics 101 Lecture", start: getRelativeDate(-12, 14, 0), end: getRelativeDate(-12, 16, 0), category: "ACADEMIC" },
    { title: "Work Team Sync", start: getRelativeDate(-11, 10, 0), end: getRelativeDate(-11, 11, 30), category: "WORK" },
    // Week 1 weekends
    { title: "Dinner with friends", start: getRelativeDate(-10, 19, 0), end: getRelativeDate(-10, 21, 30), category: "PERSONAL" },
    { title: "Gym Session", start: getRelativeDate(-9, 16, 0), end: getRelativeDate(-9, 17, 30), category: "PERSONAL" },
    
    // Week 2 weekdays
    { title: "CS101 Lab", start: getRelativeDate(-8, 13, 0), end: getRelativeDate(-8, 15, 0), category: "ACADEMIC" },
    { title: "Physics 101 Lecture", start: getRelativeDate(-7, 14, 0), end: getRelativeDate(-7, 16, 0), category: "ACADEMIC" },
    { title: "Work Team Sync", start: getRelativeDate(-6, 10, 0), end: getRelativeDate(-6, 11, 30), category: "WORK" },
    { title: "Physics 101 Lecture", start: getRelativeDate(-5, 14, 0), end: getRelativeDate(-5, 16, 0), category: "ACADEMIC" },
    { title: "Work Team Sync", start: getRelativeDate(-4, 10, 0), end: getRelativeDate(-4, 11, 30), category: "WORK" },
    // Week 2 weekends
    { title: "Dinner with friends", start: getRelativeDate(-3, 19, 0), end: getRelativeDate(-3, 21, 30), category: "PERSONAL" },
    { title: "Gym Session", start: getRelativeDate(-2, 16, 0), end: getRelativeDate(-2, 17, 30), category: "PERSONAL" },
    { title: "CS101 Lab", start: getRelativeDate(-1, 13, 0), end: getRelativeDate(-1, 15, 0), category: "ACADEMIC" },
    
    // Today's Events (June 16)
    { title: "Dentist Appointment", start: getRelativeDate(0, 9, 30), end: getRelativeDate(0, 10, 30), category: "HEALTH" },
    { title: "Physics 101 Lecture", start: getRelativeDate(0, 14, 0), end: getRelativeDate(0, 16, 0), category: "ACADEMIC" },
    
    // Future Events
    { title: "Work Team Sync", start: getRelativeDate(1, 10, 0), end: getRelativeDate(1, 11, 30), category: "WORK" },
    { title: "Project Review Meeting", start: getRelativeDate(2, 13, 0), end: getRelativeDate(2, 14, 0), category: "WORK" },
  ];

  for (const e of eventsData) {
    await prisma.event.create({
      data: {
        userId,
        title: e.title,
        startTime: e.start,
        endTime: e.end,
        category: e.category,
      },
    });
  }
  console.log("Calendar events seeded successfully.");

  // 6. SEED HABITS & HABIT LOGS
  console.log("Seeding habits and logs...");
  
  const habitsData = [
    { title: "Code Daily", frequency: "DAILY" },
    { title: "Drink 8 glasses of water", frequency: "DAILY" },
    { title: "Weekly House Cleaning", frequency: "WEEKLY" }
  ];

  for (const h of habitsData) {
    const habit = await prisma.habit.create({
      data: {
        userId,
        title: h.title,
        frequency: h.frequency,
      },
    });

    // Generate historical completions for the past 14 days (June 2 to June 15)
    if (h.title === "Code Daily") {
      // Completed most days to show a consistent streak, with a couple of rest days
      const activeDays = [-14, -13, -12, -11, -9, -8, -7, -5, -4, -3, -2, -1];
      for (const offset of activeDays) {
        await prisma.habitLog.create({
          data: {
            habitId: habit.id,
            completedAt: getRelativeDate(offset, 18, 0), // completed at 6:00 PM
          },
        });
      }
    } else if (h.title === "Drink 8 glasses of water") {
      // Perfect streak for the past 14 days
      for (let offset = -14; offset <= -1; offset++) {
        await prisma.habitLog.create({
          data: {
            habitId: habit.id,
            completedAt: getRelativeDate(offset, 21, 0), // completed at 9:00 PM
          },
        });
      }
    } else if (h.title === "Weekly House Cleaning") {
      // Cleaned on both Sundays in the past 14 days
      const sundays = [-9, -2]; // June 7 and June 14
      for (const offset of sundays) {
        await prisma.habitLog.create({
          data: {
            habitId: habit.id,
            completedAt: getRelativeDate(offset, 11, 0), // completed Sunday morning at 11:00 AM
          },
        });
      }
    }
  }
  console.log("Habits and logs seeded successfully.");

  // 7. SEED FOCUS SESSIONS
  console.log("Seeding focus sessions...");
  
  const focusSessionsData = [
    // Historical focus sessions linked to completed tasks
    {
      startTime: getRelativeDate(-12, 14, 0),
      endTime: getRelativeDate(-12, 14, 30),
      duration: 30,
      taskTitle: "Setup Github Repository",
    },
    {
      startTime: getRelativeDate(-10, 16, 0),
      endTime: getRelativeDate(-10, 18, 0),
      duration: 120,
      taskTitle: "Read Chapter 1-5 of Rust Book",
    },
    {
      startTime: getRelativeDate(-7, 10, 0),
      endTime: getRelativeDate(-7, 11, 30),
      duration: 90,
      taskTitle: "Sketch Homepage Layouts",
    },
    {
      startTime: getRelativeDate(-4, 15, 0),
      endTime: getRelativeDate(-4, 16, 30),
      duration: 90,
      taskTitle: "Write blog post draft",
    },
    {
      startTime: getRelativeDate(-3, 8, 0),
      endTime: getRelativeDate(-3, 9, 0),
      duration: 60,
      taskTitle: "Workout session A",
    },
    {
      startTime: getRelativeDate(-2, 10, 0),
      endTime: getRelativeDate(-2, 10, 45),
      duration: 45,
      taskTitle: "Fix git issue #12",
    },
    
    // Unlinked focus sessions (representing general focus time)
    {
      startTime: getRelativeDate(-13, 15, 0),
      endTime: getRelativeDate(-13, 16, 0),
      duration: 60,
      taskTitle: null,
    },
    {
      startTime: getRelativeDate(-8, 9, 0),
      endTime: getRelativeDate(-8, 10, 30),
      duration: 90,
      taskTitle: null,
    },
    {
      startTime: getRelativeDate(-5, 11, 0),
      endTime: getRelativeDate(-5, 12, 0),
      duration: 60,
      taskTitle: null,
    },
    
    // Today's completed focus session (June 16)
    {
      startTime: getRelativeDate(0, 11, 0),
      endTime: getRelativeDate(0, 12, 0),
      duration: 60,
      taskTitle: "Implement glassmorphic navbar",
    }
  ];

  for (const fs of focusSessionsData) {
    const taskId = fs.taskTitle ? createdTasks[fs.taskTitle] : null;
    await prisma.focusSession.create({
      data: {
        userId,
        startTime: fs.startTime,
        endTime: fs.endTime,
        duration: fs.duration,
        taskId: taskId,
      },
    });
  }
  console.log("Focus sessions seeded successfully.");

  // 8. SEED ANALYTICS SNAPSHOTS (14 historical days)
  console.log("Seeding analytics snapshots...");
  
  const snapshotsData = [
    // Pre-calculated stats representing typical trends over the past 2 weeks
    { offset: -14, workload: 0.25, missed: 0, decline: 0.0, trend: 0.0, burnout: 20 },
    { offset: -13, workload: 0.38, missed: 0, decline: 0.0, trend: 0.1, burnout: 25 },
    { offset: -12, workload: 0.50, missed: 0, decline: 0.0, trend: 0.2, burnout: 30 },
    { offset: -11, workload: 0.63, missed: 0, decline: 0.0, trend: 0.15, burnout: 35 },
    { offset: -10, workload: 0.20, missed: 0, decline: 0.3, trend: -0.5, burnout: 28 }, // weekend
    { offset: -9, workload: 0.15, missed: 0, decline: 0.0, trend: -0.2, burnout: 25 },  // weekend
    { offset: -8, workload: 0.75, missed: 1, decline: 0.0, trend: 0.4, burnout: 55 },   // heavy start of week
    { offset: -7, workload: 0.88, missed: 1, decline: 0.0, trend: 0.6, burnout: 75 },   // rising workload density
    { offset: -6, workload: 0.88, missed: 2, decline: 0.3, trend: 0.3, burnout: 85 },   // peak stress (burnout spike)
    { offset: -5, workload: 0.63, missed: 1, decline: 0.0, trend: -0.1, burnout: 72 },  // recovery begins
    { offset: -4, workload: 0.50, missed: 0, decline: 0.0, trend: -0.2, burnout: 60 },
    { offset: -3, workload: 0.25, missed: 0, decline: 0.0, trend: -0.6, burnout: 45 },  // weekend recovery
    { offset: -2, workload: 0.20, missed: 0, decline: 0.0, trend: -0.1, burnout: 38 },  // weekend recovery
    { offset: -1, workload: 0.38, missed: 0, decline: 0.0, trend: 0.3, burnout: 30 },   // fully recovered state
  ];

  for (const ss of snapshotsData) {
    const snapshotDate = getRelativeDate(ss.offset);
    // Ensure date matches midnight for uniqueness constraint
    snapshotDate.setHours(0, 0, 0, 0);

    await prisma.analyticsSnapshot.create({
      data: {
        userId,
        date: snapshotDate,
        workloadDensity: ss.workload,
        missedTaskCount: ss.missed,
        streakDeclineRate: ss.decline,
        focusTimeTrend: ss.trend,
        burnoutRiskScore: ss.burnout,
      },
    });
  }
  console.log("Analytics snapshots seeded successfully.");

  // 9. SEED SCHEDULE SUGGESTIONS
  console.log("Seeding schedule suggestions...");
  
  const suggestionsData = [
    // Suggestions for active tasks today and tomorrow
    { taskTitle: "Implement glassmorphic navbar", start: getRelativeDate(0, 13, 0), end: getRelativeDate(0, 15, 0) }, // June 16, 1:00 PM - 3:00 PM
    { taskTitle: "Buy groceries", start: getRelativeDate(0, 17, 0), end: getRelativeDate(0, 17, 30) }, // June 16, 5:00 PM - 5:30 PM
    { taskTitle: "Implement project section details", start: getRelativeDate(1, 9, 0), end: getRelativeDate(1, 12, 0) }, // June 17, 9:00 AM - 12:00 PM
  ];

  for (const sug of suggestionsData) {
    const taskId = createdTasks[sug.taskTitle];
    if (taskId) {
      await prisma.scheduleSuggestion.create({
        data: {
          userId,
          taskId,
          startTime: sug.start,
          endTime: sug.end,
        },
      });
    }
  }
  console.log("Schedule suggestions seeded successfully.");

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during database seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
