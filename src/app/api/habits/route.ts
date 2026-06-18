import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

function calculateStreak(logs: string[]): number {
  if (!logs || logs.length === 0) return 0;
  const sortedDates = Array.from(new Set(logs))
    .map(d => new Date(d).toISOString().split('T')[0])
    .sort((a, b) => b.localeCompare(a));
    
  let streak = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0;
  }
  
  let expectedDate = new Date(sortedDates[0]);
  for (const dateStr of sortedDates) {
    const d = new Date(dateStr);
    const diffTime = Math.abs(expectedDate.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      streak++;
      expectedDate = d;
    } else {
      break;
    }
  }
  return streak;
}

export async function GET(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const habits = await prisma.habit.findMany({
    where: { user: { email } },
    include: { logs: true }
  });

  return NextResponse.json(habits.map(h => {
    const logs = h.logs.map(l => l.completedAt.toISOString().split('T')[0]);
    return {
      id: h.id,
      title: h.title,
      frequency: h.frequency,
      streak: calculateStreak(logs),
      logs
    };
  }));
}

export async function POST(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    if (data.id) {
      const existing = await prisma.habit.findFirst({
        where: { id: data.id, user: { email } }
      });
      if (existing) {
        if (data.title || data.frequency) {
          await prisma.habit.update({
            where: { id: data.id },
            data: {
              title: data.title || existing.title,
              frequency: data.frequency || existing.frequency
            }
          });
        }

        if (data.logs) {
          await prisma.habitLog.deleteMany({ where: { habitId: data.id } });
          for (const dateStr of data.logs) {
            await prisma.habitLog.create({
              data: {
                habitId: data.id,
                completedAt: new Date(dateStr)
              }
            });
          }
        }

        const updated = await prisma.habit.findUnique({
          where: { id: data.id },
          include: { logs: true }
        });

        const logs = updated!.logs.map(l => l.completedAt.toISOString().split('T')[0]);
        return NextResponse.json({
          id: updated!.id,
          title: updated!.title,
          frequency: updated!.frequency,
          streak: calculateStreak(logs),
          logs
        });
      }
    }

    const created = await prisma.habit.create({
      data: {
        id: data.id || undefined,
        title: data.title || '',
        frequency: data.frequency || 'DAILY',
        user: { connect: { email } }
      }
    });

    return NextResponse.json({
      id: created.id,
      title: created.title,
      frequency: created.frequency,
      streak: 0,
      logs: []
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const existing = await prisma.habit.findFirst({
      where: { id, user: { email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    await prisma.habit.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
