import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchUserFinishEvents } from '@/lib/userProblemsStore';

export const dynamic = 'force-dynamic';

const SESSION_LABELS = {
  '1': '2024-1회', '2': '2024-2회', '3': '2024-3회',
  '4': '2024-2회', '5': '2024-3회',
  '6': '2023-1회', '7': '2023-2회', '8': '2023-3회',
  '9': '2022-1회', '10': '2022-2회', '11': '2022-3회',
  '12': 'NOW-60', '100': '100문제',
  'pdfpack-industrial-2025-1': '2025-1회',
  'pdfpack-industrial-2025-2': '2025-2회',
  'pdfpack-industrial-2025-3': '2025-3회',
};

const SUBJECT_NAMES = {
  1: '1과목', 2: '2과목', 3: '3과목',
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  const userEmail = session.user.email.trim().toLowerCase();
  const events = await fetchUserFinishEvents(userEmail);

  // 시간순 정렬 (오래된 것 → 최신)
  const sorted = [...events].sort((a, b) =>
    String(a.timestamp || '').localeCompare(String(b.timestamp || ''))
  );

  // ── 1. 시험별 점수 히스토리 ──
  const history = sorted.map((e, i) => {
    const p = e.payload || {};
    const total = Object.values(p.subjectTotalCounts || {}).reduce((s, v) => s + Number(v), 0) || 60;
    const correct = Number(p.totalCorrect || 0);
    const score = Math.round((correct / total) * 100);
    const sessionId = String(e.sessionId || '');
    return {
      index: i + 1,
      label: SESSION_LABELS[sessionId] || sessionId,
      sessionId,
      score,
      correct,
      total,
      isPass: Boolean(p.isOverallPass),
      timestamp: String(e.timestamp || '').slice(0, 10),
    };
  });

  // ── 2. 과목별 평균 정답률 ──
  const subjectAgg = {};
  for (const e of sorted) {
    const counts = e.payload?.subjectCorrectCounts || {};
    const totals = e.payload?.subjectTotalCounts || {};
    for (const [key, correct] of Object.entries(counts)) {
      const no = Number(key);
      const total = Number(totals[key] || 20);
      if (!subjectAgg[no]) subjectAgg[no] = { correct: 0, total: 0 };
      subjectAgg[no].correct += Number(correct);
      subjectAgg[no].total += total;
    }
  }
  const subjectAvg = Object.entries(subjectAgg)
    .map(([no, { correct, total }]) => ({
      subject: SUBJECT_NAMES[Number(no)] || `${no}과목`,
      no: Number(no),
      rate: total > 0 ? Math.round((correct / total) * 100) : 0,
      correct,
      total,
    }))
    .sort((a, b) => a.no - b.no);

  // ── 3. 과목별 시험별 추이 ──
  const subjectTrend = sorted.map((e, i) => {
    const counts = e.payload?.subjectCorrectCounts || {};
    const totals = e.payload?.subjectTotalCounts || {};
    const sessionId = String(e.sessionId || '');
    const row = {
      index: i + 1,
      label: SESSION_LABELS[sessionId] || sessionId,
    };
    for (const [key, correct] of Object.entries(counts)) {
      const total = Number(totals[key] || 20);
      row[SUBJECT_NAMES[Number(key)] || `${key}과목`] = total > 0
        ? Math.round((Number(correct) / total) * 100)
        : 0;
    }
    return row;
  });

  // ── 4. 요약 KPI ──
  const totalExams = history.length;
  const passCount = history.filter((h) => h.isPass).length;
  const avgScore = totalExams > 0
    ? Math.round(history.reduce((s, h) => s + h.score, 0) / totalExams)
    : 0;
  const wrongTotal = sorted.reduce((s, e) => {
    const outcomes = e.payload?.problemOutcomes || [];
    return s + outcomes.filter((o) => !o.isCorrect && !o.isUnknown).length;
  }, 0);
  const unknownTotal = sorted.reduce((s, e) => {
    const outcomes = e.payload?.problemOutcomes || [];
    return s + outcomes.filter((o) => o.isUnknown).length;
  }, 0);
  const weakestSubject = subjectAvg.length > 0
    ? subjectAvg.reduce((a, b) => (a.rate < b.rate ? a : b))
    : null;

  return NextResponse.json({
    ok: true,
    kpi: {
      totalExams,
      passCount,
      passRate: totalExams > 0 ? Math.round((passCount / totalExams) * 100) : 0,
      avgScore,
      wrongTotal,
      unknownTotal,
      weakestSubject: weakestSubject?.subject || null,
      weakestRate: weakestSubject?.rate ?? null,
    },
    history,
    subjectAvg,
    subjectTrend,
  });
}
