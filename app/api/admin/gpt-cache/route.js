import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { classifySessionId, normalizeExamType } from '@/lib/examType';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_GPT_CACHE_TABLE = process.env.SUPABASE_GPT_CACHE_TABLE || 'gpt_objection_cache';
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

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

function toNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getSubjectByProblemNo(no) {
  const n = Number(no);
  if (!Number.isFinite(n)) return 0;
  if (n >= 1 && n <= 20) return 1;
  if (n >= 21 && n <= 40) return 2;
  if (n >= 41 && n <= 60) return 3;
  return 0;
}

async function readAllGptCacheRows() {
  const all = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const to = from + pageSize - 1;
    const url =
      `${supabaseRestUrl()}?select=` +
      [
        'cache_key',
        'source_session_id',
        'source_problem_number',
        'user_question',
        'question_text',
        'answer',
        'selected_answer',
        'correct_answer',
        'hit_count',
        'like_count',
        'dislike_count',
        'created_at',
      ].join(',');

    const res = await fetch(url, {
      method: 'GET',
      headers: supabaseHeaders({
        Range: `${from}-${to}`,
        'Range-Unit': 'items',
      }),
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`gpt cache read failed: ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

export async function GET(request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }

  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({
        ok: true,
        summary: {
          totalRows: 0,
          totalHits: 0,
          filteredRows: 0,
          filteredHits: 0,
          subjects: [
            { subject: '1과목', rows: 0, hits: 0 },
            { subject: '2과목', rows: 0, hits: 0 },
            { subject: '3과목', rows: 0, hits: 0 },
          ],
        },
        topProblems: [],
        rows: [],
        page: 1,
        pageSize: PAGE_SIZE_DEFAULT,
        totalPages: 1,
        sortBy: 'created_at',
        sortDir: 'desc',
        filters: { sessionId: '', problemNumber: '', feedbackFilter: 'all', examType: 'all' },
      });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, toNumber(searchParams.get('page'), 1));
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, toNumber(searchParams.get('pageSize'), PAGE_SIZE_DEFAULT)));
    const sortBy = String(searchParams.get('sortBy') || 'created_at');
    const sortDir = String(searchParams.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const sessionIdFilter = String(searchParams.get('sessionId') || '').trim();
    const problemNumberFilter = String(searchParams.get('problemNumber') || '').trim();
    const feedbackFilter = String(searchParams.get('feedbackFilter') || 'all').trim() || 'all';
    const examType = normalizeExamType(searchParams.get('examType'));

    const rowsRaw = await readAllGptCacheRows();

    const normalized = rowsRaw.map((r) => ({
      cacheKey: String(r?.cache_key || ''),
      sourceSessionId: String(r?.source_session_id || ''),
      sourceProblemNumber: Number(r?.source_problem_number || 0),
      userQuestion: String(r?.user_question || ''),
      questionText: String(r?.question_text || ''),
      answer: String(r?.answer || ''),
      selectedAnswer: String(r?.selected_answer || ''),
      correctAnswer: String(r?.correct_answer || ''),
      hitCount: Math.max(0, Number(r?.hit_count || 0) || 0),
      likeCount: Math.max(0, Number(r?.like_count || 0) || 0),
      dislikeCount: Math.max(0, Number(r?.dislike_count || 0) || 0),
      createdAt: String(r?.created_at || ''),
      subject: getSubjectByProblemNo(r?.source_problem_number),
    }));

    const totalRows = normalized.length;
    const totalHits = normalized.reduce((sum, r) => sum + r.hitCount, 0);

    const filtered = normalized.filter((r) => {
      if (examType !== 'all' && classifySessionId(r.sourceSessionId) !== examType) return false;
      if (sessionIdFilter && String(r.sourceSessionId) !== sessionIdFilter) return false;
      if (problemNumberFilter && String(r.sourceProblemNumber) !== problemNumberFilter) return false;
      if (feedbackFilter === 'hasFeedback' && r.likeCount + r.dislikeCount <= 0) return false;
      if (feedbackFilter === 'liked' && !(r.likeCount > r.dislikeCount && r.likeCount > 0)) return false;
      if (feedbackFilter === 'disliked' && !(r.dislikeCount > r.likeCount && r.dislikeCount > 0)) return false;
      if (feedbackFilter === 'likeOnly' && !(r.likeCount > 0)) return false;
      if (feedbackFilter === 'dislikeOnly' && !(r.dislikeCount > 0)) return false;
      return true;
    });

    const subjects = [1, 2, 3].map((n) => {
      const subset = filtered.filter((r) => r.subject === n);
      return {
        subject: `${n}과목`,
        rows: subset.length,
        hits: subset.reduce((sum, r) => sum + r.hitCount, 0),
      };
    });

    const topMap = new Map();
    filtered.forEach((r) => {
      const key = `${r.sourceSessionId}:${r.sourceProblemNumber}`;
      if (!topMap.has(key)) {
        topMap.set(key, {
          key,
          sourceSessionId: r.sourceSessionId,
          sourceProblemNumber: r.sourceProblemNumber,
          subject: r.subject,
          cacheRows: 0,
          totalHits: 0,
          totalLike: 0,
          totalDislike: 0,
          latestCreatedAt: r.createdAt,
          sampleQuestionText: r.questionText || '',
        });
      }
      const g = topMap.get(key);
      g.cacheRows += 1;
      g.totalHits += r.hitCount;
      g.totalLike += r.likeCount;
      g.totalDislike += r.dislikeCount;
      if (String(r.createdAt || '').localeCompare(String(g.latestCreatedAt || '')) > 0) {
        g.latestCreatedAt = r.createdAt;
      }
      if (!g.sampleQuestionText && r.questionText) g.sampleQuestionText = r.questionText;
    });

    const topProblems = Array.from(topMap.values()).sort((a, b) => {
      const hitDiff = b.totalHits - a.totalHits;
      if (hitDiff !== 0) return hitDiff;
      const rowDiff = b.cacheRows - a.cacheRows;
      if (rowDiff !== 0) return rowDiff;
      return String(b.latestCreatedAt || '').localeCompare(String(a.latestCreatedAt || ''));
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    const sortedRows = [...filtered].sort((a, b) => {
      if (sortBy === 'session') {
        const d = String(a.sourceSessionId).localeCompare(String(b.sourceSessionId), 'ko') * dir;
        if (d !== 0) return d;
        return (a.sourceProblemNumber - b.sourceProblemNumber) * dir;
      }
      if (sortBy === 'problem') {
        const d = (a.sourceProblemNumber - b.sourceProblemNumber) * dir;
        if (d !== 0) return d;
        return String(a.sourceSessionId).localeCompare(String(b.sourceSessionId), 'ko') * dir;
      }
      if (sortBy === 'hits') {
        const d = (a.hitCount - b.hitCount) * dir;
        if (d !== 0) return d;
        return String(a.createdAt).localeCompare(String(b.createdAt)) * -1;
      }
      if (sortBy === 'likes') {
        const d = (a.likeCount - b.likeCount) * dir;
        if (d !== 0) return d;
        return (a.dislikeCount - b.dislikeCount) * -1;
      }
      if (sortBy === 'subject') {
        const d = (a.subject - b.subject) * dir;
        if (d !== 0) return d;
        return (a.sourceProblemNumber - b.sourceProblemNumber) * dir;
      }
      // default created_at
      return String(a.createdAt).localeCompare(String(b.createdAt)) * dir;
    });

    const filteredRows = sortedRows.length;
    const filteredHits = sortedRows.reduce((sum, r) => sum + r.hitCount, 0);
    const totalPages = Math.max(1, Math.ceil(filteredRows / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const rows = sortedRows.slice(startIdx, startIdx + pageSize);

    return NextResponse.json({
      ok: true,
      summary: {
        totalRows,
        totalHits,
        filteredRows,
        filteredHits,
        subjects,
      },
      topProblems: topProblems.slice(0, 100),
      rows,
      page: safePage,
      pageSize,
      totalPages,
      sortBy,
      sortDir,
      filters: {
        sessionId: sessionIdFilter,
        problemNumber: problemNumberFilter,
        feedbackFilter,
        examType,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: 'failed to load gpt cache admin data', detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
