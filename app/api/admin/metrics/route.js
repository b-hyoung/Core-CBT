import { NextResponse } from 'next/server';
import { aggregateMetrics, readEvents } from '@/lib/analyticsStore';
import { getAdminSession } from '@/lib/adminAccess';
import { classifyEventCategory, classifySessionId, normalizeExamType } from '@/lib/examType';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_GPT_CACHE_TABLE = process.env.SUPABASE_GPT_CACHE_TABLE || 'gpt_objection_cache';

function filterEventsByExamType(events, examType) {
  if (examType === 'all') return Array.isArray(events) ? events : [];
  return (Array.isArray(events) ? events : []).filter((e) => classifyEventCategory(e) === examType);
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

async function readGptFeedbackMetrics(examType = 'all') {
  if (!hasSupabaseConfig()) {
    return {
      summary: { total: 0, liked: 0, disliked: 0, netLikeRatio: 0 },
      items: [],
    };
  }

  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_GPT_CACHE_TABLE}?select=cache_key,source_session_id,source_problem_number,answer,like_count,dislike_count,hit_count,created_at&order=created_at.desc&limit=200`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`gpt feedback read failed: ${res.status}`);
  const rows = await res.json();

  const items = (Array.isArray(rows) ? rows : [])
    .map((r) => {
      const like = Number(r?.like_count || 0);
      const dislike = Number(r?.dislike_count || 0);
      return {
        cacheKey: String(r?.cache_key || ''),
        sourceSessionId: String(r?.source_session_id || ''),
        sourceProblemNumber: Number(r?.source_problem_number || 0),
        answer: String(r?.answer || ''),
        like: Number.isFinite(like) ? like : 0,
        dislike: Number.isFinite(dislike) ? dislike : 0,
        hitCount: Number(r?.hit_count || 0) || 0,
        createdAt: String(r?.created_at || ''),
      };
    })
    .filter((r) => r.like > 0 || r.dislike > 0)
    .filter((r) => {
      if (examType === 'all') return true;
      return classifySessionId(r.sourceSessionId) === examType;
    });

  const liked = items.reduce((sum, r) => sum + r.like, 0);
  const disliked = items.reduce((sum, r) => sum + r.dislike, 0);
  const total = liked + disliked;
  const netLikeRatio = total > 0 ? Math.round((liked / total) * 1000) / 10 : 0;

  return {
    summary: { total, liked, disliked, netLikeRatio },
    items: items.sort((a, b) => (b.like - b.dislike) - (a.like - a.dislike)).slice(0, 100),
  };
}

export async function GET(request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const examType = normalizeExamType(searchParams.get('examType'));
    const events = await readEvents();
    const metrics = aggregateMetrics(filterEventsByExamType(events, examType));

    let gptFeedback = { summary: { total: 0, liked: 0, disliked: 0, netLikeRatio: 0 }, items: [] };
    try {
      gptFeedback = await readGptFeedbackMetrics(examType);
    } catch {
      // keep admin dashboard available even if feedback query fails
    }

    return NextResponse.json(
      {
        ...metrics,
        gptFeedback,
        filters: { examType },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch {
    return NextResponse.json({ message: 'failed to load metrics' }, { status: 500 });
  }
}
