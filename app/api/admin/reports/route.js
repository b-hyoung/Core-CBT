import { NextResponse } from 'next/server';
import { deleteReportEvents } from '@/lib/analyticsStore';
import { getAdminSession } from '@/lib/adminAccess';

export const dynamic = 'force-dynamic';

export async function DELETE(request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const all = Boolean(body?.all);
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    if (!all && ids.length === 0) {
      return NextResponse.json({ ok: false, message: 'ids or all is required' }, { status: 400 });
    }

    const deleted = await deleteReportEvents({ ids, all });
    return NextResponse.json({ ok: true, deleted });
  } catch {
    return NextResponse.json({ ok: false, message: 'failed to delete reports' }, { status: 500 });
  }
}
