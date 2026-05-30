// lib/commentEditStore.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDITS_TABLE = 'comment_edits';
const CONTRIB_TABLE = 'comment_contributors';

function hasConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function url(table) {
  return `${SUPABASE_URL}/rest/v1/${table}`;
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function toDb(edit) {
  return {
    subject: edit.subject,
    session_key: edit.sessionKey,
    problem_number: edit.problemNumber,
    original_comment: edit.originalComment,
    proposed_comment: edit.proposedComment,
    editor_user_id: edit.editorUserId,
    editor_display_name: edit.editorDisplayName,
    is_anonymous: Boolean(edit.isAnonymous),
  };
}

function fromDb(row) {
  return {
    id: row.id,
    subject: row.subject,
    sessionKey: row.session_key,
    problemNumber: row.problem_number,
    originalComment: row.original_comment,
    proposedComment: row.proposed_comment,
    finalComment: row.final_comment,
    editorUserId: row.editor_user_id,
    editorDisplayName: row.editor_display_name,
    isAnonymous: row.is_anonymous,
    status: row.status,
    discordMessageId: row.discord_message_id,
    discordChannelId: row.discord_channel_id,
    adminNote: row.admin_note,
    prNumber: row.pr_number,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    mergedAt: row.merged_at,
  };
}

export async function insertEdit(edit) {
  if (!hasConfig()) throw new Error('supabase not configured');
  const res = await fetch(url(EDITS_TABLE), {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(toDb(edit)),
  });
  if (!res.ok) throw new Error(`insertEdit failed: ${res.status}`);
  const rows = await res.json();
  return fromDb(rows[0]);
}

export async function getEditById(id) {
  if (!hasConfig()) return null;
  const res = await fetch(`${url(EDITS_TABLE)}?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`getEditById failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] ? fromDb(rows[0]) : null;
}

export async function listEditsByProblem(subject, sessionKey, problemNumber, status) {
  if (!hasConfig()) return [];
  const params = new URLSearchParams({
    subject: `eq.${subject}`,
    session_key: `eq.${sessionKey}`,
    problem_number: `eq.${problemNumber}`,
    select: '*',
    order: 'created_at.desc',
  });
  if (status) params.set('status', `eq.${status}`);
  const res = await fetch(`${url(EDITS_TABLE)}?${params}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listEditsByProblem failed: ${res.status}`);
  const rows = await res.json();
  return rows.map(fromDb);
}

export async function listAllEdits({ status, limit = 200 } = {}) {
  if (!hasConfig()) return [];
  const params = new URLSearchParams({
    select: '*',
    order: 'created_at.desc',
    limit: String(limit),
  });
  if (status) params.set('status', `eq.${status}`);
  const res = await fetch(`${url(EDITS_TABLE)}?${params}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listAllEdits failed: ${res.status}`);
  const rows = await res.json();
  return rows.map(fromDb);
}

export async function countRecentByUser(editorUserId, subject, sessionKey, problemNumber, hours = 24) {
  if (!hasConfig()) return 0;
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const params = new URLSearchParams({
    editor_user_id: `eq.${editorUserId}`,
    subject: `eq.${subject}`,
    session_key: `eq.${sessionKey}`,
    problem_number: `eq.${problemNumber}`,
    created_at: `gte.${since}`,
    select: 'id',
  });
  const res = await fetch(`${url(EDITS_TABLE)}?${params}`, {
    headers: headers({ Prefer: 'count=exact' }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`countRecentByUser failed: ${res.status}`);
  const range = res.headers.get('content-range') || '0/0';
  const total = Number(range.split('/')[1] || 0);
  return total;
}

export async function updateEdit(id, patch) {
  if (!hasConfig()) throw new Error('supabase not configured');
  const dbPatch = {};
  if ('status' in patch) dbPatch.status = patch.status;
  if ('finalComment' in patch) dbPatch.final_comment = patch.finalComment;
  if ('adminNote' in patch) dbPatch.admin_note = patch.adminNote;
  if ('discordMessageId' in patch) dbPatch.discord_message_id = patch.discordMessageId;
  if ('discordChannelId' in patch) dbPatch.discord_channel_id = patch.discordChannelId;
  if ('prNumber' in patch) dbPatch.pr_number = patch.prNumber;
  if ('decidedAt' in patch) dbPatch.decided_at = patch.decidedAt;
  if ('mergedAt' in patch) dbPatch.merged_at = patch.mergedAt;

  const res = await fetch(`${url(EDITS_TABLE)}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(dbPatch),
  });
  if (!res.ok) throw new Error(`updateEdit failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] ? fromDb(rows[0]) : null;
}

export async function listContributors(subject, sessionKey, problemNumber) {
  if (!hasConfig()) return [];
  const params = new URLSearchParams({
    subject: `eq.${subject}`,
    session_key: `eq.${sessionKey}`,
    problem_number: `eq.${problemNumber}`,
    select: 'display_name,is_anonymous,created_at,edit_id',
    order: 'created_at.asc',
  });
  const res = await fetch(`${url(CONTRIB_TABLE)}?${params}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listContributors failed: ${res.status}`);
  return await res.json();
}

export async function insertContributor({ subject, sessionKey, problemNumber, displayName, isAnonymous, editId }) {
  if (!hasConfig()) throw new Error('supabase not configured');
  const res = await fetch(url(CONTRIB_TABLE), {
    method: 'POST',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify({
      subject,
      session_key: sessionKey,
      problem_number: problemNumber,
      display_name: displayName,
      is_anonymous: isAnonymous,
      edit_id: editId,
    }),
  });
  if (!res.ok) throw new Error(`insertContributor failed: ${res.status}`);
}
