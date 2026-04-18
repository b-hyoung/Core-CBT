import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_GPT_CACHE_TABLE = process.env.SUPABASE_GPT_CACHE_TABLE || 'gpt_objection_cache';

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseRestUrl() {
  return `${SUPABASE_URL}/rest/v1/${SUPABASE_GPT_CACHE_TABLE}`;
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function safeCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function readCacheByKey(cacheKey) {
  const url = `${supabaseRestUrl()}?select=cache_key,like_count,dislike_count&cache_key=eq.${encodeURIComponent(cacheKey)}&limit=1`;
  const res = await fetch(url, { method: 'GET', headers: supabaseHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`failed to read cache: ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function patchCounts(cacheKey, { likeCount, dislikeCount }) {
  const res = await fetch(`${supabaseRestUrl()}?cache_key=eq.${encodeURIComponent(cacheKey)}`, {
    method: 'PATCH',
    headers: supabaseHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify({
      like_count: likeCount,
      dislike_count: dislikeCount,
    }),
  });
  if (!res.ok) throw new Error(`failed to update feedback: ${res.status}`);
}

export async function POST(request) {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const cacheKey = String(body?.cacheKey || '').trim();
    const vote = String(body?.vote || '').trim(); // 'up' | 'down'

    if (!cacheKey || (vote !== 'up' && vote !== 'down')) {
      return NextResponse.json({ ok: false, message: 'cacheKey and vote(up|down) are required.' }, { status: 400 });
    }

    const row = await readCacheByKey(cacheKey);
    if (!row) {
      return NextResponse.json({ ok: false, message: 'cache entry not found' }, { status: 404 });
    }

    let likeCount = safeCount(row.like_count);
    let dislikeCount = safeCount(row.dislike_count);

    if (vote === 'up') likeCount += 1;
    if (vote === 'down') dislikeCount += 1;

    await patchCounts(cacheKey, { likeCount, dislikeCount });
    return NextResponse.json({
      ok: true,
      cacheKey,
      feedback: { like: likeCount, dislike: dislikeCount },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: 'failed to save gpt feedback', detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}

