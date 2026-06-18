import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const goals = await prisma.goal.findMany({
    where: { user: { email } },
    include: { milestones: true }
  });

  return NextResponse.json(goals.map(g => {
    let frequency = 'WEEKLY';
    if (g.description) {
      try {
        const extra = JSON.parse(g.description);
        frequency = extra.frequency || 'WEEKLY';
      } catch(e) {}
    }
    return {
      id: g.id,
      title: g.title,
      frequency,
      due: g.targetDate.toISOString().split('T')[0],
      milestones: g.milestones.map(m => ({
        id: m.id,
        title: m.title,
        due: m.targetDate.toISOString().split('T')[0],
        completed: m.status === 'COMPLETED'
      }))
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
      const existing = await prisma.goal.findFirst({
        where: { id: data.id, user: { email } }
      });
      if (existing) {
        const updated = await prisma.goal.update({
          where: { id: data.id },
          data: {
            title: data.title || existing.title,
            targetDate: data.due ? new Date(data.due) : existing.targetDate,
            description: JSON.stringify({ frequency: data.frequency || 'WEEKLY' })
          }
        });

        if (data.milestones) {
          await prisma.milestone.deleteMany({ where: { goalId: data.id } });
          for (const m of data.milestones) {
            await prisma.milestone.create({
              data: {
                id: m.id || undefined,
                title: m.title,
                targetDate: new Date(m.due),
                status: m.completed ? 'COMPLETED' : 'NOT_STARTED',
                goalId: data.id
              }
            });
          }
        }
        
        const goalWithMilestones = await prisma.goal.findUnique({
          where: { id: data.id },
          include: { milestones: true }
        });

        return NextResponse.json({
          id: goalWithMilestones!.id,
          title: goalWithMilestones!.title,
          frequency: data.frequency || 'WEEKLY',
          due: goalWithMilestones!.targetDate.toISOString().split('T')[0],
          milestones: goalWithMilestones!.milestones.map(m => ({
            id: m.id,
            title: m.title,
            due: m.targetDate.toISOString().split('T')[0],
            completed: m.status === 'COMPLETED'
          }))
        });
      }
    }

    const created = await prisma.goal.create({
      data: {
        id: data.id || undefined,
        title: data.title || '',
        targetDate: new Date(data.due),
        description: JSON.stringify({ frequency: data.frequency || 'WEEKLY' }),
        user: { connect: { email } }
      }
    });

    if (data.milestones) {
      for (const m of data.milestones) {
        await prisma.milestone.create({
          data: {
            id: m.id || undefined,
            title: m.title,
            targetDate: new Date(m.due),
            status: m.completed ? 'COMPLETED' : 'NOT_STARTED',
            goalId: created.id
          }
        });
      }
    }

    const goalWithMilestones = await prisma.goal.findUnique({
      where: { id: created.id },
      include: { milestones: true }
    });

    return NextResponse.json({
      id: goalWithMilestones!.id,
      title: goalWithMilestones!.title,
      frequency: data.frequency || 'WEEKLY',
      due: goalWithMilestones!.targetDate.toISOString().split('T')[0],
      milestones: goalWithMilestones!.milestones.map(m => ({
        id: m.id,
        title: m.title,
        due: m.targetDate.toISOString().split('T')[0],
        completed: m.status === 'COMPLETED'
      }))
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
    const existing = await prisma.goal.findFirst({
      where: { id: data.id, user: { email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const updated = await prisma.goal.update({
      where: { id: data.id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        targetDate: data.due !== undefined ? new Date(data.due) : existing.targetDate,
        description: data.frequency !== undefined ? JSON.stringify({ frequency: data.frequency }) : existing.description
      }
    });
    
    if (data.milestones) {
      await prisma.milestone.deleteMany({ where: { goalId: data.id } });
      for (const m of data.milestones) {
        await prisma.milestone.create({
          data: {
            id: m.id || undefined,
            title: m.title,
            targetDate: new Date(m.due),
            status: m.completed ? 'COMPLETED' : 'NOT_STARTED',
            goalId: data.id
          }
        });
      }
    }

    const goalWithMilestones = await prisma.goal.findUnique({
      where: { id: data.id },
      include: { milestones: true }
    });

    let frequency = 'WEEKLY';
    if (goalWithMilestones!.description) {
      try {
        const extra = JSON.parse(goalWithMilestones!.description);
        frequency = extra.frequency || 'WEEKLY';
      } catch(e) {}
    }

    return NextResponse.json({
      id: goalWithMilestones!.id,
      title: goalWithMilestones!.title,
      frequency,
      due: goalWithMilestones!.targetDate.toISOString().split('T')[0],
      milestones: goalWithMilestones!.milestones.map(m => ({
        id: m.id,
        title: m.title,
        due: m.targetDate.toISOString().split('T')[0],
        completed: m.status === 'COMPLETED'
      }))
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

    const existing = await prisma.goal.findFirst({
      where: { id, user: { email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
