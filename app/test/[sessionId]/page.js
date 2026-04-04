import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import Quiz from './Quiz';

async function fetchQuizDataFromPath(basePath) {
  try {
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

    const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');
    const problemData = JSON.parse(stripBom(problemStr));
    const answerData = JSON.parse(stripBom(answerStr));
    const commentData = JSON.parse(stripBom(commentStr));

    const problems = problemData.reduce((acc, section) => {
      const withSection = section.problems.map((p) => ({ ...p, sectionTitle: section.title }));
      return acc.concat(withSection);
    }, []);

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

    return { problems, answersMap, commentsMap };
  } catch (error) {
    console.error('Failed to read quiz files:', error);
    return null;
  }
}

const sessionConfig = {
  '1': { title: '정보처리산업기사 2024년 1회', basePath: ['datasets', 'problem2024', 'first'] },
  '2': { title: '정보처리산업기사 2024년 2회', basePath: ['datasets', 'problem2024', 'second'] },
  '3': { title: '정보처리산업기사 2024년 3회', basePath: ['datasets', 'problem2024', 'third'] },
  '4': { title: '정보처리산업기사 2024년 2회', basePath: ['datasets', 'problem2024', 'second'] },
  '5': { title: '정보처리산업기사 2024년 3회', basePath: ['datasets', 'problem2024', 'third'] },
  '6': { title: '정보처리산업기사 2023년 1회', basePath: ['datasets', 'problem2023', 'first'] },
  '7': { title: '정보처리산업기사 2023년 2회', basePath: ['datasets', 'problem2023', 'second'] },
  '8': { title: '정보처리산업기사 2023년 3회', basePath: ['datasets', 'problem2023', 'third'] },
  '9': { title: '정보처리산업기사 2022년 1회', basePath: ['datasets', 'problem2022', 'first'] },
  '10': { title: '정보처리산업기사 2022년 2회', basePath: ['datasets', 'problem2022', 'second'] },
  '11': { title: '정보처리산업기사 2022년 3회', basePath: ['datasets', 'problem2022', 'third'] },
  '12': { title: '개발자가 방금만든 따끈 문제 60', basePath: ['datasets', 'problemNow_60', 'first'] },
  'sqld-2024-1': {
    title: 'SQLD 2024년 1회',
    basePath: ['datasets', 'sqld', '2024-first'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'sqld-2024-2': {
    title: 'SQLD 2024년 2회',
    basePath: ['datasets', 'sqld', '2024-second'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'sqld-2024-3': {
    title: 'SQLD 2024년 3회',
    basePath: ['datasets', 'sqld', '2024-third'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'sqld-2025-1': {
    title: 'SQLD 2025년 1회',
    basePath: ['datasets', 'sqld', '2025-first'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'sqld-2025-2': {
    title: 'SQLD 2025년 2회',
    basePath: ['datasets', 'sqld', '2025-second'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'sqld-2025-3': {
    title: 'SQLD 2025년 3회',
    basePath: ['datasets', 'sqld', '2025-third'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'aiprompt-2-1': {
    title: 'AI 프롬프트엔지니어링 2급 기출문제 A형',
    basePath: ['datasets', 'aiPromptEngineering', 'grade2-first'],
    sessionProps: {
      backHref: '/aiprompt',
      lobbySubtitle: '총 40문항 / AI 프롬프트엔지니어링 2급 (A형)',
      durationSeconds: 60 * 60,
    },
  },
  'quiz-round-3': {
    title: '누군가의 노션 정리',
    basePath: ['datasets', 'quizNow', 'round3'],
    sessionProps: {
      backHref: '/',
      lobbySubtitle: '총 25문항 / 챕터 1~5 (AI 기초, NLP, 프롬프트 엔지니어링)',
      durationSeconds: 30 * 60,
    },
  },
  'aiprompt-2-b': {
    title: 'AI 프롬프트엔지니어링 2급 기출문제 B형',
    basePath: ['datasets', 'aiPromptEngineering', 'grade2-b'],
    sessionProps: {
      backHref: '/aiprompt',
      lobbySubtitle: '총 40문항 / AI 프롬프트엔지니어링 2급 (B형)',
      durationSeconds: 60 * 60,
    },
  },
};

export default async function TestPage({ params: paramsPromise, searchParams: searchParamsPromise }) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const { sessionId } = params;
  const cfg = sessionConfig[sessionId];
  const initialProblemNumber = Number(searchParams?.p);
  const validInitialProblemNumber = Number.isNaN(initialProblemNumber) ? null : initialProblemNumber;
  const shouldResume = String(searchParams?.resume) === '1';

  if (!cfg) notFound();

  const data = await fetchQuizDataFromPath(path.join(process.cwd(), ...cfg.basePath));
  if (!data) notFound();

  return (
    <Quiz
      problems={data.problems}
      answersMap={data.answersMap}
      commentsMap={data.commentsMap}
      session={{ title: cfg.title, ...(cfg.sessionProps || {}) }}
      sessionId={sessionId}
      initialProblemNumber={validInitialProblemNumber}
      shouldResume={shouldResume}
    />
  );
}
