import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { notFound } from 'next/navigation';
import Quiz from '@/app/test/[sessionId]/Quiz';

export const dynamic = 'force-dynamic';

const SOURCES = [
  { key: 'A형', sessionId: 'aiprompt-2-1', basePath: ['datasets', 'aiPromptEngineering', 'grade2-first'] },
  { key: 'B형', sessionId: 'aiprompt-2-b', basePath: ['datasets', 'aiPromptEngineering', 'grade2-b'] },
];

function createSeededRandom(seedValue) {
  const text = String(seedValue || 'seed');
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let t = h >>> 0;
  t += 0x6D2B79F5;
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

async function readSourceData(source) {
  const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');
  const basePath = path.join(process.cwd(), ...source.basePath);
  const [problemStr, answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'problem1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);

  const problemData = JSON.parse(stripBom(problemStr));
  const answerData = JSON.parse(stripBom(answerStr));
  const commentData = JSON.parse(stripBom(commentStr));

  const answersMap = {};
  const acceptedAnswersMap = {};
  for (const section of answerData) {
    for (const a of section.answers) {
      answersMap[a.problem_number] = a.correct_answer_text;
      if (Array.isArray(a.accepted_answers) && a.accepted_answers.length > 0) {
        acceptedAnswersMap[a.problem_number] = a.accepted_answers;
      }
    }
  }

  const commentsMap = {};
  for (const section of commentData) {
    for (const c of section.comments) {
      commentsMap[c.problem_number] = c.comment ?? c.comment_text ?? '';
    }
  }

  const flatProblems = problemData.flatMap((section) => section.problems);

  return flatProblems.map((p) => ({
    sourceKey: source.key,
    sourceSessionId: source.sessionId,
    problem_number: p.problem_number,
    question_text: p.question_text,
    options: p.options || [],
    examples: p.examples || null,
    image_url: p.image_url || null,
    answer_text: answersMap[p.problem_number],
    accepted_answers: acceptedAnswersMap[p.problem_number] || null,
    comment_text: commentsMap[p.problem_number] ?? '',
  }));
}

function shuffleOptions(problem, correctAnswerText, rnd) {
  if (!Array.isArray(problem.options) || problem.options.length === 0) {
    return { options: problem.options, answer_text: correctAnswerText };
  }
  const shuffled = shuffle(problem.options, rnd);
  return { options: shuffled, answer_text: correctAnswerText };
}

async function buildRandomQuizData(seedValue) {
  const rnd = createSeededRandom(seedValue);
  const allSources = await Promise.all(SOURCES.map(readSourceData));
  const pool = allSources.flat();

  const picked = shuffle(pool, rnd).slice(0, 40);

  const problems = [];
  const answersMap = {};
  const acceptedAnswersMap = {};
  const commentsMap = {};

  picked.forEach((item, idx) => {
    const newNo = idx + 1;
    const { options, answer_text } = shuffleOptions(item, item.answer_text, rnd);

    problems.push({
      problem_number: newNo,
      question_text: `[${item.sourceKey}] ${item.question_text}`,
      options,
      examples: item.examples,
      image_url: item.image_url,
      sectionTitle: 'AI 프롬프트엔지니어링',
      originSessionId: item.sourceSessionId,
      originProblemNumber: item.problem_number,
      originSourceKey: item.sourceKey,
    });
    answersMap[newNo] = answer_text;
    if (item.accepted_answers) {
      acceptedAnswersMap[newNo] = item.accepted_answers;
    }
    commentsMap[newNo] = item.comment_text;
  });

  return { problems, answersMap, acceptedAnswersMap, commentsMap, seed: String(seedValue) };
}

export default async function AiPromptRandomPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const shouldResume = String(searchParams?.resume) === '1';
  const initialProblemNumber = Number(searchParams?.p);
  const validInitialProblemNumber = Number.isNaN(initialProblemNumber) ? null : initialProblemNumber;
  const seed = String(searchParams?.seed || randomUUID());

  let data;
  try {
    data = await buildRandomQuizData(seed);
  } catch (error) {
    console.error('Failed to build AI prompt random quiz:', error);
    notFound();
  }

  return (
    <Quiz
      problems={data.problems}
      answersMap={data.answersMap}
      acceptedAnswersMap={data.acceptedAnswersMap}
      commentsMap={data.commentsMap}
      session={{
        title: 'AI 프롬프트엔지니어링 A+B 혼합 랜덤',
        backHref: '/aiprompt',
        lobbySubtitle: 'A형+B형 80문항 중 40문항 랜덤 추출 / 보기 셔플',
        examProfile: {
          totalPassMin: 28,
          subjects: [],
        },
      }}
      sessionId="aiprompt-random"
      initialProblemNumber={validInitialProblemNumber}
      shouldResume={shouldResume}
      resumeToken={data.seed}
    />
  );
}
