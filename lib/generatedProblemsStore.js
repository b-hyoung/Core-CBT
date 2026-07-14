// lib/generatedProblemsStore.js
// Supabase 전용 스토어 (파일 폴백 없음 — dev/prod 모두 Supabase 사용)
import { practicalSessionLabel } from '@/app/practical/_lib/practicalSessions';
import { addDaysToDateString, kstTodayString, kstTomorrowString } from '@/lib/kstDate';

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

// 허브 화면용 요약: pending·done 문제들의 상태/kind/카테고리/출제일만 가볍게 조회
export async function fetchPendingSummary(userEmail) {
  if (!hasGeneratedProblemsConfig()) return [];
  const url =
    `${baseUrl()}?select=kind,due_date,status,category:problem->>category` +
    `&user_email=eq.${encodeURIComponent(userEmail)}&status=neq.discarded`;
  const response = await fetch(url, { headers: headers(), cache: 'no-store' });
  if (!response.ok) throw new Error(`generated_problems summary query failed: ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

// 아카이브: 졸업(done)한 문제들 — 나중에 다시 풀어볼 수 있게
export async function fetchDoneGeneratedProblems(userEmail) {
  if (!hasGeneratedProblemsConfig()) return [];
  const url =
    `${baseUrl()}?select=*` +
    `&user_email=eq.${encodeURIComponent(userEmail)}&status=eq.done` +
    `&order=last_result_at.desc&limit=200`;
  const response = await fetch(url, { headers: headers(), cache: 'no-store' });
  if (!response.ok) throw new Error(`generated_problems done query failed: ${response.status}`);
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

// 풀이 결과 반영 — 자동 재소환 스케줄 (확장 간격 1→3→7일, 리서치 근거):
//   틀림·모름 → 연속정답 0, 내일 재출제
//   맞힘 1회차 → 3일 뒤 자동 재등장 / 2회차 → 7일 뒤 / 3연속 → 졸업(done, 아카이브)
//   아카이브를 다시 풀다 틀리면 pending으로 재소환. attempts 컬럼 = 연속 정답 수.
// outcomes: [{ sessionId, problemNumber, isCorrect, isUnknown }] (origin 참조)
export async function applyDailyReviewOutcomes(userEmail, outcomes) {
  if (!hasGeneratedProblemsConfig()) return;
  const now = new Date().toISOString();
  for (const o of outcomes) {
    const sid = String(o?.sessionId || '').trim();
    const num = Number(o?.problemNumber);
    if (!sid || !Number.isFinite(num)) continue;
    const correct = Boolean(o?.isCorrect) && !o?.isUnknown;

    // 스트릭 계산을 위해 대상 행을 먼저 읽는다 (discarded 제외)
    const selectUrl =
      `${baseUrl()}?select=id,attempts,status` +
      `&user_email=eq.${encodeURIComponent(userEmail)}` +
      `&source_session_id=eq.${encodeURIComponent(sid)}` +
      `&source_problem_number=eq.${num}&status=neq.discarded`;
    const response = await fetch(selectUrl, { headers: headers(), cache: 'no-store' });
    if (!response.ok) continue;
    const rows = await response.json();

    for (const row of Array.isArray(rows) ? rows : []) {
      let patch;
      if (correct) {
        if (row.status !== 'pending') continue; // 아카이브 재풀이 정답 → 변화 없음
        const streak = Number(row.attempts || 0) + 1;
        patch = streak >= 3
          ? { status: 'done', attempts: streak, last_result_at: now }
          : {
              status: 'pending',
              attempts: streak,
              due_date: addDaysToDateString(kstTodayString(), streak === 1 ? 3 : 7),
              last_result_at: now,
            };
      } else {
        patch = { status: 'pending', attempts: 0, due_date: kstTomorrowString(), last_result_at: now };
      }
      await fetch(`${baseUrl()}?id=eq.${row.id}`, {
        method: 'PATCH',
        headers: headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify(patch),
      });
    }
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
