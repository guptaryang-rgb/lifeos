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

  const foodLogs = await prisma.foodLog.findMany(query);
  return NextResponse.json(foodLogs);
}

export async function POST(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    if (!data.foodName || !data.date) {
      return NextResponse.json({ error: 'Missing foodName or date' }, { status: 400 });
    }

    const log = await prisma.foodLog.create({
      data: {
        id: data.id || undefined,
        foodName: data.foodName,
        calories: parseInt(data.calories) || 0,
        protein: parseFloat(data.protein) || 0,
        carbs: parseFloat(data.carbs) || 0,
        fat: parseFloat(data.fat) || 0,
        fiber: parseFloat(data.fiber) || 0,
        meal: data.meal || 'Snacks',
        servingCount: parseFloat(data.servingCount) || 1,
        date: data.date,
        user: { connect: { email } }
      }
    });

    return NextResponse.json(log);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
