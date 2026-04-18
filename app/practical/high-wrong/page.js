import Link from 'next/link';
import PracticalQuizV2 from '../[sessionId]/PracticalQuizV2';
import {
  loadPracticalDatasetMaps,
  isPracticalSessionId,
  practicalSessionLabel,
} from '../_lib/practicalData';
import {
  readEvents,
  readProblemOutcomes,
  aggregateProblemWrongRates,
  aggregateProblemWrongRatesFromOutcomes,
} from '@/lib/analyticsStore';

export const dynamic = 'force-dynamic';

export default async function PracticalHighWrongPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const initialProblemNumberRaw = Number(sp?.p);
  const initialProblemNumber = Number.isNaN(initialProblemNumberRaw) ? null : initialProblemNumberRaw;
  const shouldResume = String(sp?.resume || '') === '1';

  const problemOutcomes = await readProblemOutcomes();
  const fromOutcomesMin2 = aggregateProblemWrongRatesFromOutcomes(problemOutcomes, { minAttempts: 2 });
  let usingMinAttempts = fromOutcomesMin2.length > 0 ? 2 : 1;
  let stats =
    fromOutcomesMin2.length > 0
      ? fromOutcomesMin2
      : aggregateProblemWrongRatesFromOutcomes(problemOutcomes, { minAttempts: 1 });

  if (stats.length === 0) {
    const events = await readEvents();
    const legacyMin2 = aggregateProblemWrongRates(events, { minAttempts: 2 });
    usingMinAttempts = legacyMin2.length > 0 ? 2 : 1;
    stats = legacyMin2.length > 0 ? legacyMin2 : aggregateProblemWrongRates(events, { minAttempts: 1 });
  }

  const topCandidates = stats
    .filter((row) => isPracticalSessionId(row?.sourceSessionId))
    .slice(0, 80);

  const datasetCache = new Map();
  const picked = [];
  const answersMap = {};
  const commentsMap = {};

  for (const row of topCandidates) {
    if (picked.length >= 60) break;
    const sid = String(row.sourceSessionId || '');
    if (!isPracticalSessionId(sid)) continue;

    if (!datasetCache.has(sid)) {
      datasetCache.set(sid, await loadPracticalDatasetMaps(sid));
    }
    const ds = datasetCache.get(sid);
    if (!ds) continue;

    const no = Number(row.sourceProblemNumber);
    const problem = ds.problemsByNo.get(no);
    if (!problem) continue;

    const newNo = picked.length + 1;
    picked.push({
      ...problem,
      problem_number: newNo,
      sectionTitle: '실기 오답률 상위',
      originSessionId: sid,
      originProblemNumber: no,
      originSourceKey: practicalSessionLabel(sid),
      wrongRatePercent: Number(row.wrongRate || 0),
      attemptCount: Number(row.attempts || 0),
      wrongCountStat: Number(row.wrong || 0),
      unknownCountStat: Number(row.unknown || 0),
    });
    answersMap[newNo] = String(ds.answersByNo.get(no) ?? '');
    commentsMap[newNo] = String(ds.commentsByNo.get(no) ?? '');
  }

  if (picked.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-3 text-2xl font-extrabold text-slate-900">실기 오답률 높은 문제 풀기</h1>
          <p className="mb-6 text-slate-600">아직 실기 문항별 결과 집계가 충분하지 않습니다.</p>
          <Link href="/practical" className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
            실기 회차 선택으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PracticalQuizV2
      problems={picked}
      answersMap={answersMap}
      commentsMap={commentsMap}
      session={{
        title: `실기 오답률 높은 문제 풀기 (${picked.length}문제)`,
        reviewOnly: true,
        lobbySubtitle: `오답률 상위 문항 / 최소 ${usingMinAttempts}회 시도`,
      }}
      sessionId="practical-high-wrong"
      initialProblemNumber={initialProblemNumber}
      shouldResume={shouldResume}
    />
  );
}
