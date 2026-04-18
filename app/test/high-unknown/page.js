import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import Quiz from '../[sessionId]/Quiz';
import {
  readEvents,
  readProblemOutcomes,
  aggregateProblemUnknownRates,
  aggregateProblemUnknownRatesFromOutcomes,
} from '@/lib/analyticsStore';

export const dynamic = 'force-dynamic';

const SESSION_PATHS = {
  '1': ['problem2024', 'first'],
  '2': ['problem2024', 'second'],
  '3': ['problem2024', 'third'],
  '4': ['problem2024', 'second'],
  '5': ['problem2024', 'third'],
  '6': ['problem2023', 'first'],
  '7': ['problem2023', 'second'],
  '8': ['problem2023', 'third'],
  '9': ['problem2022', 'first'],
  '10': ['problem2022', 'second'],
  '11': ['problem2022', 'third'],
  '12': ['problemNow_60', 'first'],
  '100': ['problem100', 'first'],
};

const SESSION_LABELS = {
  '1': '2024-1',
  '2': '2024-2',
  '3': '2024-3',
  '4': '2024-2',
  '5': '2024-3',
  '6': '2023-1',
  '7': '2023-2',
  '8': '2023-3',
  '9': '2022-1',
  '10': '2022-2',
  '11': '2022-3',
  '12': 'NOW-60',
  '100': '100',
};

const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');

async function loadSessionDataset(sessionId) {
  const sid = String(sessionId || '').trim();

  if (sid.startsWith('pdfpack-')) {
    const slug = sid.slice('pdfpack-'.length);
    const basePath = path.join(process.cwd(), 'datasets', 'pdfPacks', slug);
    const [problemStr, answerStr, commentStr] = await Promise.all([
      fs.readFile(path.join(basePath, 'problem1.json'), 'utf8'),
      fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
      fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
    ]);
    return buildDatasetMaps(problemStr, answerStr, commentStr);
  }

  const rel = SESSION_PATHS[sid];
  if (!rel) return null;
  const basePath = path.join(process.cwd(), 'datasets', ...rel);
  const problemStr = await fs.readFile(path.join(basePath, 'problem1.json'), 'utf8').catch(async (error) => {
    if (error?.code === 'ENOENT') {
      return fs.readFile(path.join(basePath, 'problem1.temp3.json'), 'utf8');
    }
    throw error;
  });
  const [answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);
  return buildDatasetMaps(problemStr, answerStr, commentStr);
}

function buildDatasetMaps(problemStr, answerStr, commentStr) {
  const problemData = JSON.parse(stripBom(problemStr));
  const answerData = JSON.parse(stripBom(answerStr));
  const commentData = JSON.parse(stripBom(commentStr));

  const problemsByNo = new Map();
  for (const section of problemData || []) {
    for (const p of section?.problems || []) {
      problemsByNo.set(Number(p.problem_number), { ...p, sectionTitle: section.title });
    }
  }

  const answersByNo = new Map();
  for (const section of answerData || []) {
    for (const a of section?.answers || []) {
      answersByNo.set(Number(a.problem_number), String(a.correct_answer_text || ''));
    }
  }

  const commentsByNo = new Map();
  for (const section of commentData || []) {
    for (const c of section?.comments || []) {
      commentsByNo.set(Number(c.problem_number), String(c.comment ?? c.comment_text ?? ''));
    }
  }

  return { problemsByNo, answersByNo, commentsByNo };
}

function sectionTitleOf(index) {
  if (index >= 1 && index <= 20) return '정보시스템 기반 기술';
  if (index >= 21 && index <= 40) return '프로그래밍 언어 활용';
  return '데이터베이스의 활용';
}

export default async function HighUnknownRateQuizPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const initialProblemNumberRaw = Number(sp?.p);
  const initialProblemNumber = Number.isNaN(initialProblemNumberRaw) ? null : initialProblemNumberRaw;
  const shouldResume = String(sp?.resume || '') === '1';

  const problemOutcomes = await readProblemOutcomes();
  const outcomeStatsMin2 = aggregateProblemUnknownRatesFromOutcomes(problemOutcomes, { minAttempts: 2 });
  let usingMinAttempts = outcomeStatsMin2.length > 0 ? 2 : 1;
  let stats =
    outcomeStatsMin2.length > 0
      ? outcomeStatsMin2
      : aggregateProblemUnknownRatesFromOutcomes(problemOutcomes, { minAttempts: 1 });

  if (stats.length === 0) {
    const events = await readEvents();
    const legacyStatsMin2 = aggregateProblemUnknownRates(events, { minAttempts: 2 });
    usingMinAttempts = legacyStatsMin2.length > 0 ? 2 : 1;
    stats = legacyStatsMin2.length > 0 ? legacyStatsMin2 : aggregateProblemUnknownRates(events, { minAttempts: 1 });
  }

  const topCandidates = stats.slice(0, 80);
  const datasetCache = new Map();
  const picked = [];
  const answersMap = {};
  const commentsMap = {};

  for (const row of topCandidates) {
    if (picked.length >= 60) break;
    const sid = String(row.sourceSessionId || '');
    if (!sid || sid === 'random' || sid === 'random22' || sid === 'unknown') continue;

    try {
      if (!datasetCache.has(sid)) {
        const ds = await loadSessionDataset(sid);
        datasetCache.set(sid, ds || null);
      }
      const ds = datasetCache.get(sid);
      if (!ds) continue;

      const no = Number(row.sourceProblemNumber);
      const problem = ds.problemsByNo.get(no);
      if (!problem) continue;
      const answerText = ds.answersByNo.get(no) ?? '';
      const commentText = ds.commentsByNo.get(no) ?? '';

      const newNo = picked.length + 1;
      picked.push({
        problem_number: newNo,
        question_text: String(problem.question_text || ''),
        options: Array.isArray(problem.options) ? problem.options : [],
        examples: problem.examples ?? null,
        sectionTitle: sectionTitleOf(newNo),
        originSessionId: sid,
        originProblemNumber: no,
        originSourceKey: SESSION_LABELS[sid] || sid,
        unknownRatePercent: Number(row.unknownRate || 0),
        attemptCount: Number(row.attempts || 0),
        wrongCountStat: Number(row.wrong || 0),
        unknownCountStat: Number(row.unknown || 0),
      });
      answersMap[newNo] = answerText;
      commentsMap[newNo] = commentText;
    } catch {
      // keep page available even if one dataset is unreadable
    }
  }

  if (picked.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-3">모르겠어요 많이 누른 문제 풀기</h1>
          <p className="text-slate-600 mb-2">아직 문항별 모르겠어요 집계 데이터가 충분하지 않습니다.</p>
          <p className="text-sm text-slate-500 mb-6">
            시험 제출 시 문항별 결과가 누적되면 자동으로 구성됩니다. (모르겠어요 집계 데이터 없음)
          </p>
          <Link href="/test" className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700">
            회차 선택으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Quiz
      problems={picked}
      answersMap={answersMap}
      commentsMap={commentsMap}
      session={{
        title: `모르겠어요 많이 누른 문제 풀기 (${picked.length}문제)`,
        reviewOnly: true,
        lobbySubtitle: `모르겠어요 비율 상위 문항 기준 / 최소 ${usingMinAttempts}회 시도 / 총 ${picked.length}문제`,
      }}
      sessionId="high-unknown"
      initialProblemNumber={initialProblemNumber}
      shouldResume={shouldResume}
    />
  );
}
