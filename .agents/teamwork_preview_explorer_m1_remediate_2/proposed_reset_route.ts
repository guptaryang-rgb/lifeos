import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const seed = searchParams.get("seed") === "true";

  // Check if prisma is using the in-memory fallback
  if ("store" in (prisma as any)) {
    const mock = prisma as any;
    mock.store = {
      user: [],
      task: [],
      event: [],
      goal: [],
      milestone: [],
      habit: [],
      habitLog: [],
      focusSession: [],
      analyticsSnapshot: [],
      scheduleSuggestion: []
    };
    
    // Seed default user
    mock.store.user.push({
      id: "john-doe-id",
      email: "john@example.com",
      password: "$2a$12$b6d7.JkUqG10D5t91V6V8u32P5L4L4f.J.r9P2D0U3w6YqUv6Qv2G", // hashed "password123"
      name: "John Doe",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (seed) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      mock.store.task.push({
        id: "task-overdue",
        title: "Overdue Assignment",
        dueDate: new Date(yesterday),
        estimatedDuration: 180,
        priority: "HIGH",
        energyLevel: "MEDIUM",
        status: "OVERDUE",
        userId: "john-doe-id"
      });

      mock.store.task.push({
        id: "task-essay",
        title: "Write CS101 Essay",
        dueDate: new Date(today),
        estimatedDuration: 120,
        priority: "HIGH",
        energyLevel: "HIGH",
        status: "IN_PROGRESS",
        userId: "john-doe-id"
      });

      mock.store.task.push({
        id: "task-notes",
        title: "Review Notes",
        dueDate: new Date(today),
        estimatedDuration: 30,
        priority: "LOW",
        energyLevel: "LOW",
        status: "NOT_STARTED",
        userId: "john-doe-id"
      });

      mock.store.event.push({
        id: "event-physics",
        title: "Physics 101 Lecture",
        startTime: new Date(`${today}T14:00:00`),
        endTime: new Date(`${today}T16:00:00`),
        category: "WORK",
        userId: "john-doe-id"
      });

      mock.store.habit.push({
        id: "habit-code",
        title: "Code Daily",
        frequency: "DAILY",
        userId: "john-doe-id"
      });

      mock.store.habit.push({
        id: "habit-hydrate",
        title: "Hydrate",
        frequency: "DAILY",
        userId: "john-doe-id"
      });
    }
  } else {
    // Real PostgreSQL: clean and seed database
    try {
      // Truncate tables in order of dependency
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "ScheduleSuggestion", "AnalyticsSnapshot", "FocusSession", "HabitLog", "Habit", "Milestone", "Goal", "Event", "Task", "User" CASCADE;`
      );
    } catch (err) {
      console.error("Database truncation failed, attempting deletion instead:", err);
      // Fallback deletion
      await prisma.scheduleSuggestion.deleteMany({});
      await prisma.analyticsSnapshot.deleteMany({});
      await prisma.focusSession.deleteMany({});
      await prisma.habitLog.deleteMany({});
      await prisma.habit.deleteMany({});
      await prisma.milestone.deleteMany({});
      await prisma.goal.deleteMany({});
      await prisma.event.deleteMany({});
      await prisma.task.deleteMany({});
      await prisma.user.deleteMany({});
    }
    
    // Seed default user
    await prisma.user.create({
      data: {
        id: "john-doe-id",
        email: "john@example.com",
        password: "$2a$12$b6d7.JkUqG10D5t91V6V8u32P5L4L4f.J.r9P2D0U3w6YqUv6Qv2G",
        name: "John Doe"
      }
    });

    if (seed) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      await prisma.task.createMany({
        data: [
          {
            id: "task-overdue",
            title: "Overdue Assignment",
            dueDate: new Date(yesterday),
            estimatedDuration: 180,
            priority: "HIGH",
            energyLevel: "MEDIUM",
            status: "OVERDUE",
            userId: "john-doe-id"
          },
          {
            id: "task-essay",
            title: "Write CS101 Essay",
            dueDate: new Date(today),
            estimatedDuration: 120,
            priority: "HIGH",
            energyLevel: "HIGH",
            status: "IN_PROGRESS",
            userId: "john-doe-id"
          },
          {
            id: "task-notes",
            title: "Review Notes",
            dueDate: new Date(today),
            estimatedDuration: 30,
            priority: "LOW",
            energyLevel: "LOW",
            status: "NOT_STARTED",
            userId: "john-doe-id"
          }
        ]
      });

      await prisma.event.create({
        data: {
          id: "event-physics",
          title: "Physics 101 Lecture",
          startTime: new Date(`${today}T14:00:00`),
          endTime: new Date(`${today}T16:00:00`),
          category: "WORK",
          userId: "john-doe-id"
        }
      });

      await prisma.habit.createMany({
        data: [
          {
            id: "habit-code",
            title: "Code Daily",
            frequency: "DAILY",
            userId: "john-doe-id"
          },
          {
            id: "habit-hydrate",
            title: "Hydrate",
            frequency: "DAILY",
            userId: "john-doe-id"
          }
        ]
      });
    }
  }

  return NextResponse.json({ success: true, message: `Database reset (seeded: ${seed})` });
}
