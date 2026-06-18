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

  const txs = await prisma.transaction.findMany(query);
  return NextResponse.json(txs);
}

export async function POST(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    if (!data.title || !data.amount || !data.date) {
      return NextResponse.json({ error: 'Missing title, amount or date' }, { status: 400 });
    }

    const tx = await prisma.transaction.create({
      data: {
        id: data.id || undefined,
        title: data.title,
        amount: parseFloat(data.amount) || 0,
        category: data.category || 'other',
        type: data.type || 'expense',
        date: data.date,
        user: { connect: { email } }
      }
    });

    return NextResponse.json(tx);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
