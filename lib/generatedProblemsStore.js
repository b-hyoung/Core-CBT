// lib/generatedProblemsStore.js
// Supabase 전용 스토어 (파일 폴백 없음 — dev/prod 모두 Supabase 사용)
import { practicalSessionLabel } from '@/app/practical/_lib/practicalSessions';
import { kstTomorrowString } from '@/lib/kstDate';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = 'generated_problems';

export function hasGeneratedProblemsConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function baseUrl() {
  return `${SUPABASE_URL}/rest/v1/${TABLE}`;
}

export async function insertGeneratedProblems(rows) {
  if (!hasGeneratedProblemsConfig() || rows.length === 0) return 0;
  const response = await fetch(baseUrl(), {
    method: 'POST',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`generated_problems insert failed: ${response.status}`);
  return rows.length;
}

export async function fetchDueGeneratedProblems(userEmail, dateStr) {
  if (!hasGeneratedProblemsConfig()) return [];
  const url =
    `${baseUrl()}?select=*` +
    `&user_email=eq.${encodeURIComponent(userEmail)}` +
    `&status=eq.pending&due_date=lte.${dateStr}` +
    `&order=created_at.asc`;
  const response = await fetch(url, { headers: headers(), cache: 'no-store' });
  if (!response.ok) throw new Error(`generated_problems due query failed: ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

// 중복 생성 방지: pending 상태인 origin 키 집합
export async function fetchPendingOriginKeys(userEmail) {
  if (!hasGeneratedProblemsConfig()) return new Set();
  const url =
    `${baseUrl()}?select=source_session_id,source_problem_number` +
    `&user_email=eq.${encodeURIComponent(userEmail)}&status=eq.pending`;
  const response = await fetch(url, { headers: headers(), cache: 'no-store' });
  if (!response.ok) throw new Error(`generated_problems pending query failed: ${response.status}`);
  const rows = await response.json();
  return new Set(
    (Array.isArray(rows) ? rows : []).map(
      (r) => `${r.source_session_id}:${r.source_problem_number}`,
    ),
  );
}

// 풀이 결과 반영: 맞힘 → done / 틀림·모름 → 내일 재출제
// outcomes: [{ sessionId, problemNumber, isCorrect, isUnknown }] (origin 참조)
export async function applyDailyReviewOutcomes(userEmail, outcomes) {
  if (!hasGeneratedProblemsConfig()) return;
  for (const o of outcomes) {
    const sid = String(o?.sessionId || '').trim();
    const num = Number(o?.problemNumber);
    if (!sid || !Number.isFinite(num)) continue;
    const patch = o?.isCorrect
      ? { status: 'done', last_result_at: new Date().toISOString() }
      : { due_date: kstTomorrowString(), last_result_at: new Date().toISOString() };
    const url =
      `${baseUrl()}?user_email=eq.${encodeURIComponent(userEmail)}` +
      `&source_session_id=eq.${encodeURIComponent(sid)}` +
      `&source_problem_number=eq.${num}&status=eq.pending`;
    await fetch(url, { method: 'PATCH', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(patch) });
  }
}

export async function discardPendingByOrigin(userEmail, sourceSessionId, sourceProblemNumber) {
  if (!hasGeneratedProblemsConfig()) return;
  const url =
    `${baseUrl()}?user_email=eq.${encodeURIComponent(userEmail)}` +
    `&source_session_id=eq.${encodeURIComponent(String(sourceSessionId))}` +
    `&source_problem_number=eq.${Number(sourceProblemNumber)}&status=eq.pending`;
  await fetch(url, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ status: 'discarded', last_result_at: new Date().toISOString() }),
  });
}

// row → PracticalQuizV2 주입용 문제 객체 (high-wrong/page.js 패턴과 동일 shape)
export function toQuizProblem(row, displayNumber) {
  const accepted = Array.isArray(row.accepted_answers) && row.accepted_answers.length > 0
    ? row.accepted_answers.map(String)
    : [String(row.answer)];
  return {
    ...(row.problem || {}),
    problem_number: displayNumber,
    accepted_answers: accepted,
    sectionTitle: '오늘의 복습',
    originSessionId: row.source_session_id,
    originProblemNumber: Number(row.source_problem_number),
    originSourceKey: practicalSessionLabel(row.source_session_id),
  };
}
