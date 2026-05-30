// app/api/admin/edits/[id]/decide/route.js
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { getEditById, updateEdit } from '@/lib/commentEditStore';
import { updateInteractionMessage } from '@/lib/discordNotify';

export const dynamic = 'force-dynamic';

export async function POST(request, context) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || '');
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ ok: false, message: 'invalid action' }, { status: 400 });
  }

  const edit = await getEditById(id);
  if (!edit) return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
  if (edit.status !== 'pending') {
    return NextResponse.json({ ok: false, message: 'already decided' }, { status: 409 });
  }

  const now = new Date().toISOString();
  if (action === 'approve') {
    const finalComment = body?.finalComment != null && String(body.finalComment).trim().length >= 10
      ? String(body.finalComment).trim()
      : edit.proposedComment;
    await updateEdit(id, { status: 'approved', finalComment, decidedAt: now });
  } else {
    const adminNote = body?.adminNote ? String(body.adminNote) : null;
    await updateEdit(id, { status: 'rejected', adminNote, decidedAt: now });
  }

  // Discord 메시지 업데이트 (Task 10)
  if (edit.discordMessageId && edit.discordChannelId) {
    await updateInteractionMessage({
      channelId: edit.discordChannelId,
      messageId: edit.discordMessageId,
      resultLabel: action === 'approve' ? '수락 완료' : '거부됨',
      edit,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
