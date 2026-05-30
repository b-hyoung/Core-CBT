// app/api/admin/edits/[id]/mark-merged/route.js
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { getEditById, updateEdit, insertContributor } from '@/lib/commentEditStore';

export const dynamic = 'force-dynamic';

export async function POST(_request, context) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });

  const { id } = await context.params;
  const edit = await getEditById(id);
  if (!edit) return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
  if (edit.status !== 'approved') {
    return NextResponse.json({ ok: false, message: 'not approved' }, { status: 409 });
  }
  if (edit.prNumber == null) {
    return NextResponse.json({ ok: false, message: 'not in pr yet' }, { status: 409 });
  }

  const now = new Date().toISOString();
  await updateEdit(id, { status: 'merged', mergedAt: now });
  await insertContributor({
    subject: edit.subject,
    sessionKey: edit.sessionKey,
    problemNumber: edit.problemNumber,
    displayName: edit.isAnonymous ? '익명' : edit.editorDisplayName,
    isAnonymous: edit.isAnonymous,
    editId: edit.id,
  });

  return NextResponse.json({ ok: true });
}
