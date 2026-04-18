import { randomUUID } from 'crypto';
import { notFound } from 'next/navigation';
import PracticalQuizV2 from '../[sessionId]/PracticalQuizV2';
import {
  PRACTICAL_SESSION_CONFIG,
  loadPracticalDatasetMaps,
  practicalSessionLabel,
} from '../_lib/practicalData';

export const dynamic = 'force-dynamic';

const PRACTICAL_SOURCES = Object.keys(PRACTICAL_SESSION_CONFIG).map((id) => ({ id }));

function stringToSeed(value) {
  const text = String(value || 'seed');
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRandom(seedValue) {
  let t = stringToSeed(seedValue);
  return () => {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function buildPracticalRandomQuiz(seedValue) {
  const rnd = createSeededRandom(seedValue);
  const datasetEntries = await Promise.all(
    PRACTICAL_SOURCES.map(async ({ id }) => ({ id, ds: await loadPracticalDatasetMaps(id) }))
  );

  const pool = [];
  for (const { id, ds } of datasetEntries) {
    if (!ds) continue;
    for (const [no, problem] of ds.problemsByNo.entries()) {
      pool.push({
        sourceSessionId: id,
        sourceProblemNumber: no,
        sourceKey: practicalSessionLabel(id),
        problem,
        answer: ds.answersByNo.get(no) ?? '',
        comment: ds.commentsByNo.get(no) ?? '',
      });
    }
  }

  if (pool.length === 0) return null;

  const picked = shuffle(pool, rnd).slice(0, Math.min(60, pool.length));
  const problems = [];
  const answersMap = {};
  const commentsMap = {};

  picked.forEach((item, idx) => {
    const newNo = idx + 1;
    problems.push({
      ...item.problem,
      problem_number: newNo,
      question_text: `[${item.sourceKey}] ${String(item.problem.question_text || '')}`,
      sectionTitle: '실기 랜덤',
      originSessionId: item.sourceSessionId,
      originProblemNumber: item.sourceProblemNumber,
      originSourceKey: item.sourceKey,
    });
    answersMap[newNo] = String(item.answer ?? '');
    commentsMap[newNo] = String(item.comment ?? '');
  });

  return { problems, answersMap, commentsMap, seed: String(seedValue) };
}

export default async function PracticalRandomPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const shouldResume = String(searchParams?.resume) === '1';
  const initialProblemNumber = Number(searchParams?.p);
  const validInitialProblemNumber = Number.isNaN(initialProblemNumber) ? null : initialProblemNumber;
  const seed = String(searchParams?.seed || randomUUID());

  const data = await buildPracticalRandomQuiz(seed);
  if (!data) notFound();

  return (
    <PracticalQuizV2
      problems={data.problems}
      answersMap={data.answersMap}
      commentsMap={data.commentsMap}
      session={{
        title: `실기 랜덤풀기 (${data.problems.length}문제)`,
        reviewOnly: true,
        lobbySubtitle: '실기 전체 회차에서 랜덤 추출',
      }}
      sessionId="practical-random"
      initialProblemNumber={validInitialProblemNumber}
      shouldResume={shouldResume}
      resumeToken={data.seed}
    />
  );
}
