import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { notFound } from 'next/navigation';
import Quiz from '../[sessionId]/Quiz';

export const dynamic = 'force-dynamic';

const SOURCES = [
  { key: 'NOW-60', sessionId: '12', basePath: ['datasets', 'problemNow_60', 'first'] },
  { key: '2025I-1', sessionId: 'pdfpack-industrial-2025-1', basePath: ['datasets', 'pdfPacks', 'industrial-2025-1'] },
  { key: '2025I-2', sessionId: 'pdfpack-industrial-2025-2', basePath: ['datasets', 'pdfPacks', 'industrial-2025-2'] },
  { key: '2025I-3', sessionId: 'pdfpack-industrial-2025-3', basePath: ['datasets', 'pdfPacks', 'industrial-2025-3'] },
  { key: '2024-1', sessionId: '1', basePath: ['datasets', 'problem2024', 'first'] },
  { key: '2024-2', sessionId: '2', basePath: ['datasets', 'problem2024', 'second'] },
  { key: '2024-3', sessionId: '3', basePath: ['datasets', 'problem2024', 'third'] },
  { key: '2023-1', sessionId: '6', basePath: ['datasets', 'problem2023', 'first'] },
  { key: '2023-2', sessionId: '7', basePath: ['datasets', 'problem2023', 'second'] },
  { key: '2023-3', sessionId: '8', basePath: ['datasets', 'problem2023', 'third'] },
  { key: '2022-1', sessionId: '9', basePath: ['datasets', 'problem2022', 'first'] },
  { key: '2022-2', sessionId: '10', basePath: ['datasets', 'problem2022', 'second'] },
  { key: '2022-3', sessionId: '11', basePath: ['datasets', 'problem2022', 'third'] },
];

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

function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function subjectOf(problemNumber) {
  if (problemNumber >= 1 && problemNumber <= 20) return 1;
  if (problemNumber >= 21 && problemNumber <= 40) return 2;
  return 3;
}

function sectionTitleOf(subject) {
  if (subject === 1) return '정보시스템 기반 기술';
  if (subject === 2) return '프로그래밍 언어 활용';
  return '데이터베이스의 활용';
}

async function readSessionData(source) {
  const basePath = path.join(process.cwd(), ...source.basePath);
  const problemStr = await fs
    .readFile(path.join(basePath, 'problem1.json'), 'utf8')
    .catch(async (error) => {
      if (error?.code === 'ENOENT') {
        return fs.readFile(path.join(basePath, 'problem1.temp3.json'), 'utf8');
      }
      throw error;
    });
  const [answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);

  const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');
  const problemData = JSON.parse(stripBom(problemStr));
  const answerData = JSON.parse(stripBom(answerStr));
  const commentData = JSON.parse(stripBom(commentStr));

  const answersMap = answerData.reduce((acc, section) => {
    section.answers.forEach((a) => {
      acc[a.problem_number] = a.correct_answer_text;
    });
    return acc;
  }, {});

  const commentsMap = commentData.reduce((acc, section) => {
    section.comments.forEach((c) => {
      acc[c.problem_number] = c.comment ?? c.comment_text ?? '';
    });
    return acc;
  }, {});

  const flatProblems = problemData.flatMap((section) => section.problems);

  return flatProblems.map((p) => ({
    sourceKey: source.key,
    sourceSessionId: source.sessionId,
    problem_number: p.problem_number,
    question_text: p.question_text,
    options: p.options,
    examples: p.examples || null,
    answer_text: answersMap[p.problem_number],
    comment_text: commentsMap[p.problem_number] ?? '',
  }));
}

async function buildRandomQuizData(seedValue) {
  const rnd = createSeededRandom(seedValue);
  const allBySession = await Promise.all(SOURCES.map(readSessionData));
  const bySessionMap = {};
  SOURCES.forEach((s, idx) => {
    bySessionMap[s.key] = allBySession[idx];
  });

  const selectedBySubject = { 1: [], 2: [], 3: [] };

  for (const subject of [1, 2, 3]) {
    const pickedSessions = shuffle(SOURCES, rnd).slice(0, 4);
    for (const src of pickedSessions) {
      const pool = bySessionMap[src.key].filter((p) => subjectOf(p.problem_number) === subject);
      if (pool.length < 5) {
        throw new Error(`Not enough questions in ${src.key} subject ${subject}`);
      }
      selectedBySubject[subject].push(...shuffle(pool, rnd).slice(0, 5));
    }
  }

  const ordered = [
    ...shuffle(selectedBySubject[1], rnd),
    ...shuffle(selectedBySubject[2], rnd),
    ...shuffle(selectedBySubject[3], rnd),
  ];

  const problems = [];
  const answersMap = {};
  const commentsMap = {};

  ordered.forEach((item, idx) => {
    const newNo = idx + 1;
    const subject = idx < 20 ? 1 : idx < 40 ? 2 : 3;
    problems.push({
      problem_number: newNo,
      question_text: `[${item.sourceKey}] ${item.question_text}`,
      options: item.options,
      examples: item.examples || null,
      sectionTitle: sectionTitleOf(subject),
      originSessionId: item.sourceSessionId,
      originProblemNumber: item.problem_number,
      originSourceKey: item.sourceKey,
    });
    answersMap[newNo] = item.answer_text;
    commentsMap[newNo] = item.comment_text;
  });

  return { problems, answersMap, commentsMap, seed: String(seedValue) };
}

export default async function RandomTestPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const shouldResume = String(searchParams?.resume) === '1';
  const initialProblemNumber = Number(searchParams?.p);
  const validInitialProblemNumber = Number.isNaN(initialProblemNumber) ? null : initialProblemNumber;
  const seed = String(searchParams?.seed || randomUUID());

  let data;
  try {
    data = await buildRandomQuizData(seed);
  } catch (error) {
    console.error('Failed to build random quiz:', error);
    notFound();
  }
  const session = { title: '랜덤풀기 (회차별 5문항 x 4회차)' };
  return (
    <Quiz
      problems={data.problems}
      answersMap={data.answersMap}
      commentsMap={data.commentsMap}
      session={session}
      sessionId="random"
      initialProblemNumber={validInitialProblemNumber}
      shouldResume={shouldResume}
      resumeToken={data.seed}
    />
  );
}
