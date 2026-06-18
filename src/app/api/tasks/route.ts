import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { user: { email } }
  });

  const formattedTasks = tasks.map(t => {
    let subtasks = [];
    let linkedMilestone = undefined;
    if (t.description) {
      try {
        const extra = JSON.parse(t.description);
        subtasks = extra.subtasks || [];
        linkedMilestone = extra.linkedMilestone;
      } catch (e) {}
    }
    return {
      id: t.id,
      title: t.title,
      dueDate: t.dueDate.toISOString().split('T')[0],
      priority: t.priority,
      effort: t.estimatedDuration,
      status: t.status,
      subtasks,
      linkedMilestone
    };
  });

  return NextResponse.json(formattedTasks);
}

export async function POST(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();

    if (!data.dueDate) {
      return NextResponse.json({ error: 'Missing dueDate' }, { status: 400 });
    }
    if (data.effort !== undefined && data.effort < 0) {
      return NextResponse.json({ error: 'Negative effort' }, { status: 400 });
    }

    const description = JSON.stringify({
      subtasks: data.subtasks || [],
      linkedMilestone: data.linkedMilestone || undefined
    });

    if (data.id) {
      const existing = await prisma.task.findFirst({
        where: { id: data.id, user: { email } }
      });
      if (existing) {
        const updated = await prisma.task.update({
          where: { id: data.id },
          data: {
            title: data.title || existing.title,
            dueDate: new Date(data.dueDate),
            priority: data.priority || existing.priority,
            estimatedDuration: data.effort !== undefined ? data.effort : existing.estimatedDuration,
            status: data.status || existing.status,
            description
          }
        });
        
        return NextResponse.json({
          id: updated.id,
          title: updated.title,
          dueDate: updated.dueDate.toISOString().split('T')[0],
          priority: updated.priority,
          effort: updated.estimatedDuration,
          status: updated.status,
          subtasks: data.subtasks || [],
          linkedMilestone: data.linkedMilestone
        });
      }
    }

    const newTask = await prisma.task.create({
      data: {
        id: data.id || undefined,
        title: data.title || '',
        dueDate: new Date(data.dueDate),
        priority: data.priority || 'MEDIUM',
        estimatedDuration: data.effort || 0,
        status: data.status || 'NOT_STARTED',
        energyLevel: 'MEDIUM',
        description,
        user: { connect: { email } }
      }
    });

    return NextResponse.json({
      id: newTask.id,
      title: newTask.title,
      dueDate: newTask.dueDate.toISOString().split('T')[0],
      priority: newTask.priority,
      effort: newTask.estimatedDuration,
      status: newTask.status,
      subtasks: data.subtasks || [],
      linkedMilestone: data.linkedMilestone
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const existing = await prisma.task.findFirst({
      where: { id: data.id, user: { email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    let subtasks = [];
    let linkedMilestone = undefined;
    if (existing.description) {
      try {
        const extra = JSON.parse(existing.description);
        subtasks = extra.subtasks || [];
        linkedMilestone = extra.linkedMilestone;
      } catch (e) {}
    }

    if (data.subtasks) subtasks = data.subtasks;
    if (data.linkedMilestone !== undefined) linkedMilestone = data.linkedMilestone;

    const description = JSON.stringify({ subtasks, linkedMilestone });

    const updated = await prisma.task.update({
      where: { id: data.id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        dueDate: data.dueDate !== undefined ? new Date(data.dueDate) : existing.dueDate,
        priority: data.priority !== undefined ? data.priority : existing.priority,
        estimatedDuration: data.effort !== undefined ? data.effort : existing.estimatedDuration,
        status: data.status !== undefined ? data.status : existing.status,
        description
      }
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      dueDate: updated.dueDate.toISOString().split('T')[0],
      priority: updated.priority,
      effort: updated.estimatedDuration,
      status: updated.status,
      subtasks,
      linkedMilestone
    });
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

    const existing = await prisma.task.findFirst({
      where: { id, user: { email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
