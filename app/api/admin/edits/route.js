// app/api/admin/edits/route.js
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { listAllEdits } from '@/lib/commentEditStore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const edits = await listAllEdits({ status, limit: 200 });

  const roundReadyCount = (await listAllEdits({ status: 'approved', limit: 500 }))
    .filter((e) => e.prNumber == null).length;

  return NextResponse.json({ ok: true, edits, roundReadyCount });
}
