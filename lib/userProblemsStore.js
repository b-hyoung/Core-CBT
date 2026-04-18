import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_EVENTS_TABLE = process.env.SUPABASE_EVENTS_TABLE || 'analytics_events';
const SUPABASE_PAGE_SIZE = 1000;
const EVENTS_FILE = path.join(process.cwd(), 'data', 'analytics-events.json');

function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function fetchFromSupabase(userEmail) {
  const all = [];
  let from = 0;
  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const containsFilter = JSON.stringify({ __meta: { userEmail } });
    const url =
      `${SUPABASE_URL}/rest/v1/${SUPABASE_EVENTS_TABLE}` +
      `?select=payload,timestamp` +
      `&type=eq.finish_exam` +
      `&payload=cs.${encodeURIComponent(containsFilter)}` +
      `&order=timestamp.desc`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { ...supabaseHeaders(), Range: `${from}-${to}`, 'Range-Unit': 'items' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`supabase query failed: ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }
  return all;
}

async function fetchFromFile(userEmail) {
  try {
    const raw = await fs.readFile(EVENTS_FILE, 'utf8');
    const events = JSON.parse(raw);
    if (!Array.isArray(events)) return [];
    return events
      .filter((e) => {
        if (e.type !== 'finish_exam') return false;
        const email = String(e?.payload?.__meta?.userEmail || '').trim().toLowerCase();
        return email === userEmail;
      })
      .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
  } catch {
    return [];
  }
}

export async function fetchUserFinishEvents(userEmail) {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV !== 'development') {
    try {
      const results = await fetchFromSupabase(userEmail);
      if (results.length > 0) return results;
    } catch {
      // fallback
    }
  }
  return fetchFromFile(userEmail);
}

// 2-pass latest-wins:
//   1단계: key별 "최신" outcome만 저장 (정/오답/모름 상관없이)
//   2단계: 최신이 정답/모름이면 결과에서 제외
// 단일 pass에서 조건 걸고 삽입하면 "최근에 맞췄어도 옛날 오답이
// 올라오는" 누적 버그가 발생.
export async function getUserWrongProblems(userEmail) {
  const events = await fetchUserFinishEvents(userEmail);
  const latest = new Map();
  for (const event of events) {
    const outcomes = Array.isArray(event?.payload?.problemOutcomes) ? event.payload.problemOutcomes : [];
    for (const o of outcomes) {
      const sourceSessionId = String(o?.sessionId || '').trim();
      const sourceProblemNumber = Number(o?.problemNumber);
      if (!sourceSessionId || !Number.isFinite(sourceProblemNumber) || sourceProblemNumber <= 0) continue;
      const key = `${sourceSessionId}:${sourceProblemNumber}`;
      if (latest.has(key)) continue; // events는 desc → 먼저 본 것이 최신
      latest.set(key, { sourceSessionId, sourceProblemNumber, outcome: o });
    }
  }
  const result = [];
  for (const { sourceSessionId, sourceProblemNumber, outcome } of latest.values()) {
    if (outcome.isUnknown || outcome.isCorrect) continue;
    result.push({ sourceSessionId, sourceProblemNumber, correctAnswer: String(outcome.correctAnswer ?? '') });
  }
  return result;
}

// 가장 최근 시도 기준으로 모르겠어요 문제 목록 반환 (동일한 2-pass)
export async function getUserUnknownProblems(userEmail) {
  const events = await fetchUserFinishEvents(userEmail);
  const latest = new Map();
  for (const event of events) {
    const outcomes = Array.isArray(event?.payload?.problemOutcomes) ? event.payload.problemOutcomes : [];
    for (const o of outcomes) {
      const sourceSessionId = String(o?.sessionId || '').trim();
      const sourceProblemNumber = Number(o?.problemNumber);
      if (!sourceSessionId || !Number.isFinite(sourceProblemNumber) || sourceProblemNumber <= 0) continue;
      const key = `${sourceSessionId}:${sourceProblemNumber}`;
      if (latest.has(key)) continue;
      latest.set(key, { sourceSessionId, sourceProblemNumber, outcome: o });
    }
  }
  const result = [];
  for (const { sourceSessionId, sourceProblemNumber, outcome } of latest.values()) {
    if (!outcome.isUnknown) continue;
    result.push({ sourceSessionId, sourceProblemNumber, correctAnswer: String(outcome.correctAnswer ?? '') });
  }
  return result;
}
