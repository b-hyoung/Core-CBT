// lib/discordNotify.js
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const SITE_BASE_URL = process.env.SITE_BASE_URL || '';

function truncate(s, n) {
  const str = String(s || '');
  return str.length <= n ? str : str.slice(0, n - 1) + '…';
}

export async function notifyNewEdit(edit, problemUrl) {
  if (!WEBHOOK_URL) {
    return { messageId: null, channelId: null };
  }
  const adminUrl = `${SITE_BASE_URL}/admin/edits?focus=${edit.id}`;
  const submitter = edit.isAnonymous ? '익명' : edit.editorDisplayName;

  const payload = {
    embeds: [
      {
        title: '📝 해설 수정 제안',
        description: `**${edit.subject}** · ${edit.sessionKey} · ${edit.problemNumber}번\n제출자: ${submitter}`,
        fields: [
          { name: '원본', value: '```' + truncate(edit.originalComment || '(없음)', 900) + '```' },
          { name: '제안', value: '```' + truncate(edit.proposedComment, 900) + '```' },
        ],
        color: 0x0ea5e9,
        timestamp: edit.createdAt,
      },
    ],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: '수락', custom_id: `edit:approve:${edit.id}` },
          { type: 2, style: 4, label: '거부', custom_id: `edit:reject:${edit.id}` },
          { type: 2, style: 5, label: '문제 보기', url: problemUrl || adminUrl },
          { type: 2, style: 5, label: '사이트에서 편집', url: adminUrl },
        ],
      },
    ],
  };

  const res = await fetch(`${WEBHOOK_URL}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return { messageId: null, channelId: null };
  }
  const data = await res.json().catch(() => ({}));
  return { messageId: data?.id || null, channelId: data?.channel_id || null };
}

export async function updateInteractionMessage({ channelId, messageId, resultLabel, edit }) {
  if (!BOT_TOKEN || !channelId || !messageId) return;
  const submitter = edit.isAnonymous ? '익명' : edit.editorDisplayName;
  const payload = {
    embeds: [
      {
        title: `📝 해설 수정 제안 — ${resultLabel}`,
        description: `**${edit.subject}** · ${edit.sessionKey} · ${edit.problemNumber}번\n제출자: ${submitter}`,
        color: resultLabel === '수락 완료' ? 0x10b981 : resultLabel === '거부됨' ? 0xef4444 : 0x64748b,
      },
    ],
    components: [],
  };
  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${BOT_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
}
