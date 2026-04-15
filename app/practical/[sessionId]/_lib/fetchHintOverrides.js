const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = process.env.SUPABASE_HINT_OVERRIDES_TABLE || 'practical_hint_overrides';

function hasConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function headers() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

function restUrl(path = '') {
  return `${SUPABASE_URL}/rest/v1/${TABLE}${path}`;
}

/**
 * @param {string|string[]} sessionIds
 * @returns {Promise<Map<string, string>>} Map keyed by `${sessionId}:${problemNumber}` → hintText
 */
export async function fetchHintOverrides(sessionIds) {
  if (!hasConfig()) return new Map();
  const ids = Array.isArray(sessionIds) ? sessionIds.filter(Boolean) : [sessionIds].filter(Boolean);
  if (!ids.length) return new Map();
  const inClause = ids.map((s) => `"${s}"`).join(',');
  const url = `${restUrl()}?session_id=in.(${inClause})&select=session_id,problem_number,hint_text`;
  try {
    const res = await fetch(url, { headers: headers(), cache: 'no-store' });
    if (!res.ok) return new Map();
    const rows = await res.json();
    const map = new Map();
    for (const row of rows) {
      map.set(`${row.session_id}:${row.problem_number}`, row.hint_text);
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function upsertHintOverride({ sessionId, problemNumber, hintText, updatedBy }) {
  if (!hasConfig()) throw new Error('Supabase not configured');
  const url = `${restUrl()}?on_conflict=session_id,problem_number`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([
      {
        session_id: sessionId,
        problem_number: problemNumber,
        hint_text: hintText,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
    ]),
  });
  if (!res.ok) throw new Error(`upsert failed: ${res.status}`);
  return res.json();
}

export async function deleteHintOverride({ sessionId, problemNumber }) {
  if (!hasConfig()) throw new Error('Supabase not configured');
  const url = `${restUrl()}?session_id=eq.${encodeURIComponent(sessionId)}&problem_number=eq.${problemNumber}`;
  const res = await fetch(url, { method: 'DELETE', headers: headers() });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
  return true;
}

export async function listHintOverrides(sessionId) {
  if (!hasConfig()) return [];
  const where = sessionId ? `?session_id=eq.${encodeURIComponent(sessionId)}&` : '?';
  const url = `${restUrl()}${where}select=session_id,problem_number,hint_text,updated_at,updated_by&order=updated_at.desc&limit=500`;
  try {
    const res = await fetch(url, { headers: headers(), cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
