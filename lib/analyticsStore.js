import fs from 'fs/promises';
import path from 'path';
import { classifyEventCategory } from '@/lib/examType';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'analytics-events.json');
const PROBLEM_OUTCOMES_FILE = path.join(DATA_DIR, 'problem-outcomes.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_EVENTS_TABLE = process.env.SUPABASE_EVENTS_TABLE || 'analytics_events';
const SUPABASE_PROBLEM_OUTCOMES_TABLE = process.env.SUPABASE_PROBLEM_OUTCOMES_TABLE || 'problem_outcomes';
const SUPABASE_PAGE_SIZE = 1000;

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseRestUrl() {
  return `${SUPABASE_URL}/rest/v1/${SUPABASE_EVENTS_TABLE}`;
}

function supabaseProblemOutcomesRestUrl() {
  return `${SUPABASE_URL}/rest/v1/${SUPABASE_PROBLEM_OUTCOMES_TABLE}`;
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function toDbEvent(event) {
  return {
    id: event.id,
    type: event.type,
    client_id: event.clientId,
    session_id: event.sessionId,
    payload: event.payload ?? {},
    path: event.path,
    timestamp: event.timestamp,
    user_agent: event.userAgent,
  };
}

function fromDbEvent(row) {
  return {
    id: row.id,
    type: row.type,
    clientId: row.client_id,
    sessionId: row.session_id,
    payload: row.payload ?? {},
    path: row.path,
    timestamp: row.timestamp,
    userAgent: row.user_agent,
  };
}

function toDbProblemOutcome(row) {
  return {
    id: row.id,
    event_id: row.eventId,
    client_id: row.clientId,
    session_id: row.sessionId,
    source_session_id: row.sourceSessionId,
    source_problem_number: row.sourceProblemNumber,
    local_problem_number: row.localProblemNumber,
    selected_answer: row.selectedAnswer,
    correct_answer: row.correctAnswer,
    is_correct: row.isCorrect,
    is_unknown: row.isUnknown,
    timestamp: row.timestamp,
  };
}

function fromDbProblemOutcome(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    clientId: row.client_id,
    sessionId: row.session_id,
    sourceSessionId: row.source_session_id,
    sourceProblemNumber: row.source_problem_number,
    localProblemNumber: row.local_problem_number,
    selectedAnswer: row.selected_answer,
    correctAnswer: row.correct_answer,
    isCorrect: row.is_correct,
    isUnknown: row.is_unknown,
    timestamp: row.timestamp,
  };
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(EVENTS_FILE);
  } catch {
    await fs.writeFile(EVENTS_FILE, '[]', 'utf8');
  }
}

async function ensureProblemOutcomesStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PROBLEM_OUTCOMES_FILE);
  } catch {
    await fs.writeFile(PROBLEM_OUTCOMES_FILE, '[]', 'utf8');
  }
}

async function readEventsFromFileStore() {
  await ensureStore();
  const raw = await fs.readFile(EVENTS_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readEventsFromSupabase() {
  const all = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const response = await fetch(`${supabaseRestUrl()}?select=*&order=timestamp.asc`, {
      method: 'GET',
      headers: supabaseHeaders({
        Range: `${from}-${to}`,
        'Range-Unit': 'items',
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`supabase read failed: ${response.status}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch.map(fromDbEvent));
    if (batch.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return all;
}

async function readProblemOutcomesFromSupabase() {
  const all = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const response = await fetch(`${supabaseProblemOutcomesRestUrl()}?select=*&order=timestamp.asc`, {
      method: 'GET',
      headers: supabaseHeaders({
        Range: `${from}-${to}`,
        'Range-Unit': 'items',
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`supabase problem_outcomes read failed: ${response.status}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch.map(fromDbProblemOutcome));
    if (batch.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return all;
}

async function appendEventToSupabase(event) {
  const response = await fetch(supabaseRestUrl(), {
    method: 'POST',
    headers: supabaseHeaders({
      Prefer: 'return=minimal',
    }),
    body: JSON.stringify(toDbEvent(event)),
  });

  if (!response.ok) {
    throw new Error(`supabase write failed: ${response.status}`);
  }
}

function extractProblemOutcomesFromEvent(event) {
  if (String(event?.type || '') !== 'finish_exam') return [];
  const outcomes = Array.isArray(event?.payload?.problemOutcomes) ? event.payload.problemOutcomes : [];
  if (!outcomes.length) return [];

  return outcomes
    .map((o, idx) => {
      const sourceSessionId = String(o?.sessionId || '').trim();
      const sourceProblemNumber = Number(o?.problemNumber);
      if (!sourceSessionId || !Number.isFinite(sourceProblemNumber) || sourceProblemNumber <= 0) return null;
      return {
        id: `${String(event.id)}:${idx + 1}`,
        eventId: String(event.id || ''),
        clientId: String(event.clientId || ''),
        sessionId: event.sessionId != null ? String(event.sessionId) : '',
        sourceSessionId,
        sourceProblemNumber,
        localProblemNumber: Number(o?.localProblemNumber || 0) || 0,
        selectedAnswer: String(o?.selectedAnswer ?? ''),
        correctAnswer: String(o?.correctAnswer ?? ''),
        isCorrect: Boolean(o?.isCorrect),
        isUnknown: Boolean(o?.isUnknown),
        timestamp: String(event.timestamp || new Date().toISOString()),
      };
    })
    .filter(Boolean);
}

async function appendProblemOutcomesToSupabase(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const response = await fetch(supabaseProblemOutcomesRestUrl(), {
    method: 'POST',
    headers: supabaseHeaders({
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    }),
    body: JSON.stringify(rows.map(toDbProblemOutcome)),
  });
  if (!response.ok) {
    throw new Error(`supabase problem_outcomes write failed: ${response.status}`);
  }
}

async function readProblemOutcomesFromFileStore() {
  await ensureProblemOutcomesStore();
  const raw = await fs.readFile(PROBLEM_OUTCOMES_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendProblemOutcomesToFileStore(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const prev = await readProblemOutcomesFromFileStore();
  prev.push(...rows);
  await fs.writeFile(PROBLEM_OUTCOMES_FILE, JSON.stringify(prev, null, 2), 'utf8');
}

export async function readEvents() {
  if (hasSupabaseConfig()) {
    try {
      return await readEventsFromSupabase();
    } catch {
      // Fall back to local file store when Supabase is unavailable.
    }
  }
  return readEventsFromFileStore();
}

export async function readProblemOutcomes() {
  if (hasSupabaseConfig()) {
    try {
      return await readProblemOutcomesFromSupabase();
    } catch {
      // Fall back to local file store when Supabase is unavailable.
    }
  }
  return readProblemOutcomesFromFileStore();
}

export async function appendEvent(event) {
  const problemOutcomes = extractProblemOutcomesFromEvent(event);
  if (hasSupabaseConfig()) {
    try {
      await appendEventToSupabase(event);
      if (problemOutcomes.length > 0) {
        try {
          await appendProblemOutcomesToSupabase(problemOutcomes);
        } catch {
          // Keep analytics ingestion available even if outcome table write fails.
        }
      }
      return;
    } catch {
      // Fall back to local file store when Supabase is unavailable.
    }
  }

  const events = await readEventsFromFileStore();
  events.push(event);
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
  if (problemOutcomes.length > 0) {
    await appendProblemOutcomesToFileStore(problemOutcomes);
  }
}

async function deleteReportEventsInSupabase({ ids = [], all = false } = {}) {
  if (!hasSupabaseConfig()) return 0;

  const headers = supabaseHeaders({
    Prefer: 'return=representation',
  });

  if (all) {
    const response = await fetch(`${supabaseRestUrl()}?type=eq.report_problem&select=id`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error(`supabase delete(all) failed: ${response.status}`);
    const rows = await response.json().catch(() => []);
    return Array.isArray(rows) ? rows.length : 0;
  }

  const cleanIds = [...new Set((ids || []).map((x) => String(x).trim()).filter(Boolean))];
  if (cleanIds.length === 0) return 0;

  const chunkSize = 100;
  let deleted = 0;
  for (let i = 0; i < cleanIds.length; i += chunkSize) {
    const chunk = cleanIds.slice(i, i + chunkSize);
    const inFilter = chunk.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(',');
    const response = await fetch(
      `${supabaseRestUrl()}?type=eq.report_problem&id=in.(${encodeURIComponent(inFilter)})&select=id`,
      {
        method: 'DELETE',
        headers,
      }
    );
    if (!response.ok) throw new Error(`supabase delete(ids) failed: ${response.status}`);
    const rows = await response.json().catch(() => []);
    deleted += Array.isArray(rows) ? rows.length : 0;
  }
  return deleted;
}

async function deleteReportEventsInFileStore({ ids = [], all = false } = {}) {
  const events = await readEventsFromFileStore();
  const before = events.length;
  const idSet = new Set((ids || []).map((x) => String(x).trim()).filter(Boolean));

  const filtered = events.filter((e) => {
    if (e.type !== 'report_problem') return true;
    if (all) return false;
    if (idSet.size === 0) return true;
    return !idSet.has(String(e.id));
  });

  await fs.writeFile(EVENTS_FILE, JSON.stringify(filtered, null, 2), 'utf8');
  return before - filtered.length;
}

export async function deleteReportEvents({ ids = [], all = false } = {}) {
  if (hasSupabaseConfig()) {
    try {
      return await deleteReportEventsInSupabase({ ids, all });
    } catch {
      // Fall back to local store when Supabase is unavailable.
    }
  }
  return deleteReportEventsInFileStore({ ids, all });
}

function dateKey(iso) {
  return String(iso || '').slice(0, 10);
}

function recentDates(days) {
  const list = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    list.push(d.toISOString().slice(0, 10));
  }
  return list;
}

function getEventUserKey(event) {
  const email = String(event?.payload?.__meta?.userEmail || event?.payload?.userEmail || '').trim().toLowerCase();
  if (email) return { key: `email:${email}`, email, clientId: String(event?.clientId || '').trim() };
  const clientId = String(event?.clientId || '').trim();
  if (clientId) return { key: `client:${clientId}`, email: '', clientId };
  return { key: '', email: '', clientId: '' };
}

function buildThemeUsage(events) {
  const all = Array.isArray(events) ? events : [];
  const themeEvents = all.filter((e) => String(e?.type || '') === 'theme_change');
  const latestByUser = new Map();

  for (const event of themeEvents) {
    const { key, email, clientId } = getEventUserKey(event);
    if (!key) continue;
    const current = latestByUser.get(key);
    const nextTimestamp = String(event?.timestamp || '');
    if (current && String(current.timestamp || '') > nextTimestamp) continue;
    latestByUser.set(key, {
      userKey: key,
      email,
      clientId,
      themeId: String(event?.payload?.themeId || 'sky').trim() || 'sky',
      customColor: String(event?.payload?.customColor || '').trim(),
      path: String(event?.path || '').trim(),
      timestamp: nextTimestamp,
    });
  }

  const users = Array.from(latestByUser.values()).sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
  const themeCounts = new Map();
  const customCounts = new Map();

  for (const row of users) {
    themeCounts.set(row.themeId, (themeCounts.get(row.themeId) || 0) + 1);
    if (row.themeId === 'custom' && row.customColor) {
      customCounts.set(row.customColor, (customCounts.get(row.customColor) || 0) + 1);
    }
  }

  return {
    totalThemeEvents: themeEvents.length,
    users,
    currentThemes: Array.from(themeCounts.entries())
      .map(([themeId, count]) => ({ themeId, count }))
      .sort((a, b) => b.count - a.count || String(a.themeId).localeCompare(String(b.themeId))),
    currentCustomColors: Array.from(customCounts.entries())
      .map(([color, count]) => ({ color, count }))
      .sort((a, b) => b.count - a.count || String(a.color).localeCompare(String(b.color))),
  };
}

export function aggregateMetrics(events, options = {}) {
  const all = Array.isArray(events) ? events : [];
  const themeUsage = buildThemeUsage(options.allEvents || all);
  const visits = all.filter((e) => e.type === 'visit_test');
  const starts = all.filter((e) => e.type === 'start_exam');
  const finishes = all.filter((e) => e.type === 'finish_exam');
  const reports = all.filter((e) => e.type === 'report_problem');

  const visitorSet = new Set(all.map((e) => e.clientId).filter(Boolean));
  const googleUserSet = new Set(
    all
      .map((e) => String(e?.payload?.__meta?.userEmail || e?.payload?.userEmail || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const finishedUserSet = new Set(finishes.map((e) => e.clientId).filter(Boolean));
  const passCount = finishes.filter((e) => e.payload?.isOverallPass).length;

  const funnel = [
    { name: '방문', value: visitorSet.size },
    { name: '시험 시작', value: starts.length },
    { name: '완료', value: finishes.length },
    { name: '합격', value: passCount },
  ];

  const completionRate = starts.length > 0 ? (finishes.length / starts.length) * 100 : 0;
  const passRate = finishes.length > 0 ? (passCount / finishes.length) * 100 : 0;

  const dates = recentDates(14);
  const dayMap = new Map(
    dates.map((d) => [d, { date: d.slice(5), 방문: 0, 완료: 0, 합격률: 0, _finish: 0, _pass: 0 }])
  );

  visits.forEach((e) => {
    const key = dateKey(e.timestamp);
    const row = dayMap.get(key);
    if (row) row.방문 += 1;
  });

  finishes.forEach((e) => {
    const key = dateKey(e.timestamp);
    const row = dayMap.get(key);
    if (!row) return;
    row.완료 += 1;
    row._finish += 1;
    if (e.payload?.isOverallPass) row._pass += 1;
  });

  const dailyTrend = Array.from(dayMap.values()).map((r) => ({
    date: r.date,
    방문: r.방문,
    완료: r.완료,
    합격률: r._finish > 0 ? Number(((r._pass / r._finish) * 100).toFixed(1)) : 0,
  }));

  const sessionMap = new Map();
  starts.forEach((e) => {
    const key = String(e.sessionId || 'unknown');
    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        session: key,
        examType: classifyEventCategory(e) || 'written',
        시작: 0,
        완료: 0,
        합격률: 0,
        _pass: 0,
      });
    }
    sessionMap.get(key).시작 += 1;
  });

  finishes.forEach((e) => {
    const key = String(e.sessionId || 'unknown');
    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        session: key,
        examType: classifyEventCategory(e) || 'written',
        시작: 0,
        완료: 0,
        합격률: 0,
        _pass: 0,
      });
    }
    const row = sessionMap.get(key);
    row.완료 += 1;
    if (e.payload?.isOverallPass) row._pass += 1;
  });

  const sessionStats = Array.from(sessionMap.values())
    .map((r) => ({
      session: r.session,
      examType: r.examType,
      시작: r.시작,
      완료: r.완료,
      합격률: r.완료 > 0 ? Number(((r._pass / r.완료) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => a.session.localeCompare(b.session, 'ko'));

  const subjectAgg = new Map();
  finishes.forEach((e) => {
    const scores = e.payload?.subjectCorrectCounts;
    if (!scores || typeof scores !== 'object') return;

    const totalsRaw = e.payload?.subjectTotalCounts;
    const examType = classifyEventCategory(e) || 'written';

    Object.entries(scores).forEach(([subjectKey, scoreRaw]) => {
      const subjectNo = Number(subjectKey);
      const correct = Number(scoreRaw);
      if (!Number.isFinite(subjectNo) || !Number.isFinite(correct)) return;

      const totalFromPayload = Number(totalsRaw?.[subjectKey]);
      const total = Number.isFinite(totalFromPayload) && totalFromPayload > 0 ? totalFromPayload : 20;
      const aggKey = `${examType}:${subjectNo}`;
      if (!subjectAgg.has(aggKey)) {
        subjectAgg.set(aggKey, {
          examType,
          subjectNo,
          correctSum: 0,
          totalSum: 0,
        });
      }
      const row = subjectAgg.get(aggKey);
      row.correctSum += correct;
      row.totalSum += total;
    });
  });

  const subjectAverages = Array.from(subjectAgg.values())
    .map((r) => ({
      examType: r.examType,
      subject: `${r.subjectNo}과목`,
      정답률: r.totalSum > 0 ? Number(((r.correctSum / r.totalSum) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => {
      const typeCmp = String(a.examType).localeCompare(String(b.examType), 'ko');
      if (typeCmp !== 0) return typeCmp;
      return String(a.subject).localeCompare(String(b.subject), 'ko');
    });

  const reasonCount = new Map();
  reports.forEach((e) => {
    const reason = String(e.payload?.reason || '기타');
    reasonCount.set(reason, (reasonCount.get(reason) || 0) + 1);
  });

  const reportReasons = Array.from(reasonCount.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const recentReports = reports
    .slice(-100)
    .reverse()
    .map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      sessionId: e.sessionId || '-',
      problemNumber: e.payload?.problemNumber ?? '-',
      reason: e.payload?.reason || '-',
      questionText: e.payload?.questionText || '',
      originSessionId: e.payload?.originSessionId || '',
      originProblemNumber: e.payload?.originProblemNumber ?? '',
      originSourceKey: e.payload?.originSourceKey || '',
    }));

  return {
    kpis: {
      visitors: visitorSet.size,
      googleUsers: googleUserSet.size,
      visitorsPlusGoogle: visitorSet.size + googleUserSet.size,
      completedUsers: finishedUserSet.size,
      completionRate: Number(completionRate.toFixed(1)),
      passRate: Number(passRate.toFixed(1)),
      totalStarts: starts.length,
      totalFinishes: finishes.length,
    },
    funnel,
    dailyTrend,
    sessionStats,
    subjectAverages,
    reportReasons,
    recentReports,
    themeUsage,
  };
}

export function aggregateProblemWrongRates(events, options = {}) {
  const all = Array.isArray(events) ? events : [];
  const minAttempts = Math.max(1, Number(options.minAttempts || 1));
  const finishes = all.filter((e) => e.type === 'finish_exam');
  const map = new Map();

  for (const e of finishes) {
    const outcomes = Array.isArray(e?.payload?.problemOutcomes) ? e.payload.problemOutcomes : [];
    for (const o of outcomes) {
      const sourceSessionId = String(o?.sessionId || '').trim();
      const sourceProblemNumber = Number(o?.problemNumber);
      if (!sourceSessionId || !Number.isFinite(sourceProblemNumber) || sourceProblemNumber <= 0) continue;

      const key = `${sourceSessionId}:${sourceProblemNumber}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          sourceSessionId,
          sourceProblemNumber,
          attempts: 0,
          wrong: 0,
          correct: 0,
          unknown: 0,
          lastSeenAt: '',
        });
      }

      const row = map.get(key);
      row.attempts += 1;
      const isCorrect = Boolean(o?.isCorrect);
      if (isCorrect) row.correct += 1;
      else row.wrong += 1;
      if (Boolean(o?.isUnknown)) row.unknown += 1;

      const ts = String(e?.timestamp || '');
      if (ts && ts > row.lastSeenAt) row.lastSeenAt = ts;
    }
  }

  return Array.from(map.values())
    .map((r) => ({
      ...r,
      wrongRate: r.attempts > 0 ? Number(((r.wrong / r.attempts) * 100).toFixed(1)) : 0,
      correctRate: r.attempts > 0 ? Number(((r.correct / r.attempts) * 100).toFixed(1)) : 0,
    }))
    .filter((r) => r.attempts >= minAttempts)
    .sort((a, b) => {
      if (b.wrongRate !== a.wrongRate) return b.wrongRate - a.wrongRate;
      if (b.attempts !== a.attempts) return b.attempts - a.attempts;
      if (b.unknown !== a.unknown) return b.unknown - a.unknown;
      return String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''));
    });
}

export function aggregateProblemWrongRatesFromOutcomes(problemOutcomes, options = {}) {
  const rows = Array.isArray(problemOutcomes) ? problemOutcomes : [];
  const minAttempts = Math.max(1, Number(options.minAttempts || 1));
  const map = new Map();

  for (const o of rows) {
    const sourceSessionId = String(o?.sourceSessionId || '').trim();
    const sourceProblemNumber = Number(o?.sourceProblemNumber);
    if (!sourceSessionId || !Number.isFinite(sourceProblemNumber) || sourceProblemNumber <= 0) continue;

    const key = `${sourceSessionId}:${sourceProblemNumber}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        sourceSessionId,
        sourceProblemNumber,
        attempts: 0,
        wrong: 0,
        correct: 0,
        unknown: 0,
        lastSeenAt: '',
      });
    }

    const row = map.get(key);
    row.attempts += 1;
    const isCorrect = Boolean(o?.isCorrect);
    if (isCorrect) row.correct += 1;
    else row.wrong += 1;
    if (Boolean(o?.isUnknown)) row.unknown += 1;

    const ts = String(o?.timestamp || '');
    if (ts && ts > row.lastSeenAt) row.lastSeenAt = ts;
  }

  return Array.from(map.values())
    .map((r) => ({
      ...r,
      wrongRate: r.attempts > 0 ? Number(((r.wrong / r.attempts) * 100).toFixed(1)) : 0,
      correctRate: r.attempts > 0 ? Number(((r.correct / r.attempts) * 100).toFixed(1)) : 0,
    }))
    .filter((r) => r.attempts >= minAttempts)
    .sort((a, b) => {
      if (b.wrongRate !== a.wrongRate) return b.wrongRate - a.wrongRate;
      if (b.attempts !== a.attempts) return b.attempts - a.attempts;
      if (b.unknown !== a.unknown) return b.unknown - a.unknown;
      return String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''));
    });
}

export function aggregateProblemUnknownRates(events, options = {}) {
  const all = Array.isArray(events) ? events : [];
  const minAttempts = Math.max(1, Number(options.minAttempts || 1));
  const finishes = all.filter((e) => e.type === 'finish_exam');
  const map = new Map();

  for (const e of finishes) {
    const outcomes = Array.isArray(e?.payload?.problemOutcomes) ? e.payload.problemOutcomes : [];
    for (const o of outcomes) {
      const sourceSessionId = String(o?.sessionId || '').trim();
      const sourceProblemNumber = Number(o?.problemNumber);
      if (!sourceSessionId || !Number.isFinite(sourceProblemNumber) || sourceProblemNumber <= 0) continue;

      const key = `${sourceSessionId}:${sourceProblemNumber}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          sourceSessionId,
          sourceProblemNumber,
          attempts: 0,
          wrong: 0,
          correct: 0,
          unknown: 0,
          lastSeenAt: '',
        });
      }

      const row = map.get(key);
      row.attempts += 1;
      const isCorrect = Boolean(o?.isCorrect);
      if (isCorrect) row.correct += 1;
      else row.wrong += 1;
      if (Boolean(o?.isUnknown)) row.unknown += 1;

      const ts = String(e?.timestamp || '');
      if (ts && ts > row.lastSeenAt) row.lastSeenAt = ts;
    }
  }

  return Array.from(map.values())
    .map((r) => ({
      ...r,
      wrongRate: r.attempts > 0 ? Number(((r.wrong / r.attempts) * 100).toFixed(1)) : 0,
      correctRate: r.attempts > 0 ? Number(((r.correct / r.attempts) * 100).toFixed(1)) : 0,
      unknownRate: r.attempts > 0 ? Number(((r.unknown / r.attempts) * 100).toFixed(1)) : 0,
    }))
    .filter((r) => r.attempts >= minAttempts)
    .sort((a, b) => {
      if (b.unknownRate !== a.unknownRate) return b.unknownRate - a.unknownRate;
      if (b.attempts !== a.attempts) return b.attempts - a.attempts;
      if (b.wrongRate !== a.wrongRate) return b.wrongRate - a.wrongRate;
      return String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''));
    });
}

export function aggregateProblemUnknownRatesFromOutcomes(problemOutcomes, options = {}) {
  const rows = Array.isArray(problemOutcomes) ? problemOutcomes : [];
  const minAttempts = Math.max(1, Number(options.minAttempts || 1));
  const map = new Map();

  for (const o of rows) {
    const sourceSessionId = String(o?.sourceSessionId || '').trim();
    const sourceProblemNumber = Number(o?.sourceProblemNumber);
    if (!sourceSessionId || !Number.isFinite(sourceProblemNumber) || sourceProblemNumber <= 0) continue;

    const key = `${sourceSessionId}:${sourceProblemNumber}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        sourceSessionId,
        sourceProblemNumber,
        attempts: 0,
        wrong: 0,
        correct: 0,
        unknown: 0,
        lastSeenAt: '',
      });
    }

    const row = map.get(key);
    row.attempts += 1;
    const isCorrect = Boolean(o?.isCorrect);
    if (isCorrect) row.correct += 1;
    else row.wrong += 1;
    if (Boolean(o?.isUnknown)) row.unknown += 1;

    const ts = String(o?.timestamp || '');
    if (ts && ts > row.lastSeenAt) row.lastSeenAt = ts;
  }

  return Array.from(map.values())
    .map((r) => ({
      ...r,
      wrongRate: r.attempts > 0 ? Number(((r.wrong / r.attempts) * 100).toFixed(1)) : 0,
      correctRate: r.attempts > 0 ? Number(((r.correct / r.attempts) * 100).toFixed(1)) : 0,
      unknownRate: r.attempts > 0 ? Number(((r.unknown / r.attempts) * 100).toFixed(1)) : 0,
    }))
    .filter((r) => r.attempts >= minAttempts)
    .sort((a, b) => {
      if (b.unknownRate !== a.unknownRate) return b.unknownRate - a.unknownRate;
      if (b.attempts !== a.attempts) return b.attempts - a.attempts;
      if (b.wrongRate !== a.wrongRate) return b.wrongRate - a.wrongRate;
      return String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''));
    });
}
