// app/api/admin/edits/[id]/current-comment/route.js
// 선택된 edit의 현재 디스크 해설 값을 반환 — drift 감지용
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { getEditById } from '@/lib/commentEditStore';
import { readCommentFromDisk } from '@/lib/commentPath';

export const dynamic = 'force-dynamic';

export async function GET(_request, context) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const edit = await getEditById(id);
  if (!edit) {
    return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
  }

  let currentComment = '';
  try {
    currentComment = await readCommentFromDisk(edit.subject, edit.sessionKey, edit.problemNumber);
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: `disk read failed: ${err?.message || err}` },
      { status: 500 }
    );
  }

  const hasDrift = currentComment !== edit.originalComment;
  return NextResponse.json({ ok: true, currentComment, hasDrift });
}
