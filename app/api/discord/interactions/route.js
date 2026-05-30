// app/api/discord/interactions/route.js
import { NextResponse } from 'next/server';
import { verifyDiscordSignature } from '@/lib/discordVerify';
import { getEditById, updateEdit } from '@/lib/commentEditStore';

export const dynamic = 'force-dynamic';

const INTERACTION_PING = 1;
const INTERACTION_COMPONENT = 3;
const RESPONSE_PONG = 1;
const RESPONSE_UPDATE_MESSAGE = 7;
const RESPONSE_CHANNEL_MESSAGE = 4;
const FLAG_EPHEMERAL = 64;

export async function POST(request) {
  const signature = request.headers.get('x-signature-ed25519') || '';
  const timestamp = request.headers.get('x-signature-timestamp') || '';
  const rawBody = await request.text();

  const valid = await verifyDiscordSignature({ signature, timestamp, body: rawBody });
  if (!valid) {
    return new NextResponse('invalid request signature', { status: 401 });
  }

  let body;
  try { body = JSON.parse(rawBody); } catch { return new NextResponse('bad json', { status: 400 }); }

  if (body?.type === INTERACTION_PING) {
    return NextResponse.json({ type: RESPONSE_PONG });
  }

  if (body?.type !== INTERACTION_COMPONENT) {
    return NextResponse.json({ type: RESPONSE_CHANNEL_MESSAGE, data: { content: 'unsupported', flags: FLAG_EPHEMERAL } });
  }

  const customId = String(body?.data?.custom_id || '');
  const m = /^edit:(approve|reject):(.+)$/.exec(customId);
  if (!m) {
    return NextResponse.json({ type: RESPONSE_CHANNEL_MESSAGE, data: { content: 'unknown action', flags: FLAG_EPHEMERAL } });
  }
  const [, action, editId] = m;

  const edit = await getEditById(editId);
  if (!edit) {
    return NextResponse.json({ type: RESPONSE_CHANNEL_MESSAGE, data: { content: '요청을 찾을 수 없어요.', flags: FLAG_EPHEMERAL } });
  }
  if (edit.status !== 'pending') {
    return NextResponse.json({ type: RESPONSE_CHANNEL_MESSAGE, data: { content: `이미 처리됨 (${edit.status}).`, flags: FLAG_EPHEMERAL } });
  }

  const now = new Date().toISOString();
  let resultLabel;
  if (action === 'approve') {
    await updateEdit(editId, { status: 'approved', finalComment: edit.proposedComment, decidedAt: now });
    resultLabel = '수락 완료';
  } else {
    await updateEdit(editId, { status: 'rejected', decidedAt: now });
    resultLabel = '거부됨';
  }

  const submitter = edit.isAnonymous ? '익명' : edit.editorDisplayName;
  return NextResponse.json({
    type: RESPONSE_UPDATE_MESSAGE,
    data: {
      embeds: [
        {
          title: `📝 해설 수정 제안 — ${resultLabel}`,
          description: `**${edit.subject}** · ${edit.sessionKey} · ${edit.problemNumber}번\n제출자: ${submitter}`,
          color: action === 'approve' ? 0x10b981 : 0xef4444,
        },
      ],
      components: [],
    },
  });
}
