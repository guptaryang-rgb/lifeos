import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashSync } from 'bcryptjs';
import { Priority, TaskStatus, EnergyLevel, EventCategory, MilestoneStatus, HabitFrequency } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  // Require authentication
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const seed = searchParams.get('seed') === 'true';

    // 1. Clean the database
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

    // 2. Seed default users
    const hashedPassword = hashSync('password123', 10);
    
    await prisma.user.create({
      data: {
        email: 'john@example.com',
        name: 'John Doe',
        password: hashedPassword
      }
    });

    await prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Test User',
        password: hashedPassword
      }
    });

    if (seed) {
      const tasksData = [
        {
          id: 'task-1',
          title: 'Write CS101 Essay',
          dueDate: new Date('2026-06-16'),
          estimatedDuration: 120,
          priority: 'HIGH' as Priority,
          status: 'NOT_STARTED' as TaskStatus,
          energyLevel: 'MEDIUM' as EnergyLevel,
          description: JSON.stringify({ subtasks: [], linkedMilestone: undefined })
        },
        {
          id: 'task-2',
          title: 'Overdue Assignment',
          dueDate: new Date('2026-06-15'),
          estimatedDuration: 60,
          priority: 'HIGH' as Priority,
          status: 'OVERDUE' as TaskStatus,
          energyLevel: 'MEDIUM' as EnergyLevel,
          description: JSON.stringify({ subtasks: [], linkedMilestone: undefined })
        },
        {
          id: 'task-3',
          title: 'Review Notes',
          dueDate: new Date('2026-06-16'),
          estimatedDuration: 30,
          priority: 'LOW' as Priority,
          status: 'NOT_STARTED' as TaskStatus,
          energyLevel: 'MEDIUM' as EnergyLevel,
          description: JSON.stringify({ subtasks: [], linkedMilestone: undefined })
        }
      ];

      for (const t of tasksData) {
        await prisma.task.create({
          data: {
            ...t,
            user: { connect: { email: 'john@example.com' } }
          }
        });
      }

      await prisma.event.create({
        data: {
          id: 'event-1',
          title: 'Physics 101 Lecture',
          startTime: new Date('2026-06-16T14:00:00'),
          endTime: new Date('2026-06-16T16:00:00'),
          category: 'WORK' as EventCategory,
          user: { connect: { email: 'john@example.com' } }
        }
      });

      const goal1 = await prisma.goal.create({
        data: {
          id: 'goal-1',
          title: 'Cascade Goal G1',
          description: JSON.stringify({ frequency: 'MONTHLY' }),
          targetDate: new Date('2026-07-31'),
          user: { connect: { email: 'john@example.com' } }
        }
      });

      await prisma.milestone.create({
        data: {
          id: 'milestone-1',
          title: 'Milestone M1',
          targetDate: new Date('2026-07-15'),
          status: 'NOT_STARTED' as MilestoneStatus,
          goalId: goal1.id
        }
      });

      const habit = await prisma.habit.create({
        data: {
          id: 'habit-1',
          title: 'Gym',
          frequency: 'DAILY' as HabitFrequency,
          user: { connect: { email: 'john@example.com' } }
        }
      });

      const logDates = ['2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15'];
      for (const logDate of logDates) {
        await prisma.habitLog.create({
          data: {
            habitId: habit.id,
            completedAt: new Date(logDate)
          }
        });
      }
    }

    const res = NextResponse.json({ success: true });
    return res;
  } catch (e) {
    console.error('Reset error:', e);
    return NextResponse.json({ error: 'Reset Failed' }, { status: 500 });
  }
}
