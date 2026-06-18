import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  const query: any = {
    where: {
      user: { email }
    }
  };

  if (date) {
    query.where.date = date;
  }

  const workouts = await prisma.workout.findMany(query);
  return NextResponse.json(workouts);
}

export async function POST(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    if (!data.exerciseName || !data.date) {
      return NextResponse.json({ error: 'Missing exerciseName or date' }, { status: 400 });
    }

    const log = await prisma.workout.create({
      data: {
        id: data.id || undefined,
        exerciseName: data.exerciseName,
        type: data.type || 'cardio',
        durationMinutes: parseInt(data.durationMinutes) || 0,
        distance: data.distance !== undefined && data.distance !== null ? parseFloat(data.distance) : null,
        weight: data.weight !== undefined && data.weight !== null ? parseInt(data.weight) : null,
        sets: data.sets !== undefined && data.sets !== null ? parseInt(data.sets) : null,
        reps: data.reps !== undefined && data.reps !== null ? parseInt(data.reps) : null,
        calories: parseInt(data.calories) || 0,
        date: data.date,
        user: { connect: { email } }
      }
    });

    return NextResponse.json(log);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
