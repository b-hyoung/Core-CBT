// app/api/admin/edits/[id]/resend-notify/route.js
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { getEditById, updateEdit } from '@/lib/commentEditStore';
import { notifyNewEdit } from '@/lib/discordNotify';
import { buildProblemUrl } from '@/lib/problemUrlMap';

export const dynamic = 'force-dynamic';

export async function POST(_request, context) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const edit = await getEditById(id);
  if (!edit) {
    return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
  }
  if (edit.status !== 'pending') {
    return NextResponse.json({ ok: false, message: 'not pending' }, { status: 409 });
  }

  const problemUrl = buildProblemUrl(edit.subject, edit.sessionKey, edit.problemNumber);
  const { messageId, channelId } = await notifyNewEdit(edit, problemUrl);

  if (!messageId) {
    return NextResponse.json(
      { ok: false, message: 'webhook failed — check DISCORD_WEBHOOK_URL' },
      { status: 502 }
    );
  }

  await updateEdit(id, { discordMessageId: messageId, discordChannelId: channelId });
  return NextResponse.json({ ok: true, messageId });
}
