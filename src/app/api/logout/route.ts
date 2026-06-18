import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('session');
  res.cookies.delete('next-auth.session-token');
  res.cookies.delete('__Secure-next-auth.session-token');
  return res;
}
