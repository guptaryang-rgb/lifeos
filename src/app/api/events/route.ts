import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    where: { user: { email } }
  });

  return NextResponse.json(events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.startTime.toISOString().replace(/\.\d+Z$/, ''),
    end: e.endTime.toISOString().replace(/\.\d+Z$/, ''),
    category: e.category,
    color: e.category === 'WORK' ? 'blue' : e.category === 'ACADEMIC' ? 'purple' : 'green'
  })));
}

export async function POST(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    if (data.id) {
      const existing = await prisma.event.findFirst({
        where: { id: data.id, user: { email } }
      });
      if (existing) {
        const updated = await prisma.event.update({
          where: { id: data.id },
          data: {
            title: data.title || existing.title,
            startTime: data.start ? new Date(data.start) : existing.startTime,
            endTime: data.end ? new Date(data.end) : existing.endTime,
            category: data.category || existing.category
          }
        });
        return NextResponse.json({
          id: updated.id,
          title: updated.title,
          start: updated.startTime.toISOString().replace(/\.\d+Z$/, ''),
          end: updated.endTime.toISOString().replace(/\.\d+Z$/, ''),
          category: updated.category,
          color: updated.category === 'WORK' ? 'blue' : updated.category === 'ACADEMIC' ? 'purple' : 'green'
        });
      }
    }

    const created = await prisma.event.create({
      data: {
        id: data.id || undefined,
        title: data.title || '',
        startTime: new Date(data.start),
        endTime: new Date(data.end),
        category: data.category || 'WORK',
        user: { connect: { email } }
      }
    });

    return NextResponse.json({
      id: created.id,
      title: created.title,
      start: created.startTime.toISOString().replace(/\.\d+Z$/, ''),
      end: created.endTime.toISOString().replace(/\.\d+Z$/, ''),
      category: created.category,
      color: created.category === 'WORK' ? 'blue' : created.category === 'ACADEMIC' ? 'purple' : 'green'
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
    const existing = await prisma.event.findFirst({
      where: { id: data.id, user: { email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const updated = await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        startTime: data.start !== undefined ? new Date(data.start) : existing.startTime,
        endTime: data.end !== undefined ? new Date(data.end) : existing.endTime,
        category: data.category !== undefined ? data.category : existing.category
      }
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      start: updated.startTime.toISOString().replace(/\.\d+Z$/, ''),
      end: updated.endTime.toISOString().replace(/\.\d+Z$/, ''),
      category: updated.category,
      color: updated.category === 'WORK' ? 'blue' : updated.category === 'ACADEMIC' ? 'purple' : 'green'
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

    const existing = await prisma.event.findFirst({
      where: { id, user: { email } }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
