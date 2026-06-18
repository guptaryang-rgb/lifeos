import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const focus = await prisma.focusSession.findMany({
    where: { user: { email } }
  });

  return NextResponse.json(focus.map(f => ({
    id: f.id,
    duration: f.duration,
    timestamp: f.startTime.toISOString(),
    taskId: f.taskId || undefined
  })));
}

export async function POST(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    if (data.duration !== undefined && data.duration <= 0) {
      return NextResponse.json({ error: 'Zero/negative duration' }, { status: 400 });
    }

    const startTime = data.timestamp ? new Date(data.timestamp) : new Date();
    const duration = data.duration || 25;
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const created = await prisma.focusSession.create({
      data: {
        id: data.id || undefined,
        duration,
        startTime,
        endTime,
        taskId: data.taskId || undefined,
        user: { connect: { email } }
      }
    });

    return NextResponse.json({
      id: created.id,
      duration: created.duration,
      timestamp: created.startTime.toISOString(),
      taskId: created.taskId || undefined
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
