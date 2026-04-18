import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, isAdmin: false }, { status: 403 });
  }
  return NextResponse.json({ ok: true, isAdmin: true });
}
