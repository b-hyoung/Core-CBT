import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import Quiz from './Quiz';
import { OBJECTIVE_SESSION_CONFIG } from '@/lib/objectiveSessionCatalog';

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

    const stripBom = (value) => String(value || '').replace(/^\uFEFF/, '');
    const problemData = JSON.parse(stripBom(problemStr));
    const answerData = JSON.parse(stripBom(answerStr));
    const commentData = JSON.parse(stripBom(commentStr));

    const problems = problemData.reduce((accumulator, section) => {
      const withSection = section.problems.map((problem) => ({ ...problem, sectionTitle: section.title }));
      return accumulator.concat(withSection);
    }, []);

    const answersMap = answerData.reduce((accumulator, section) => {
      section.answers.forEach((answer) => {
        accumulator[answer.problem_number] = answer.correct_answer_text;
      });
      return accumulator;
    }, {});

    const commentsMap = commentData.reduce((accumulator, section) => {
      section.comments.forEach((comment) => {
        accumulator[comment.problem_number] = comment.comment ?? comment.comment_text ?? '';
      });
      return accumulator;
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
  '12': { title: '개발자가 방금 만든 따끈 문제 60', basePath: ['datasets', 'problemNow_60', 'first'] },
  ...OBJECTIVE_SESSION_CONFIG,
};

export default async function TestPage({ params: paramsPromise, searchParams: searchParamsPromise }) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const { sessionId } = params;
  const config = sessionConfig[sessionId];
  const initialProblemNumber = Number(searchParams?.p);
  const validInitialProblemNumber = Number.isNaN(initialProblemNumber) ? null : initialProblemNumber;
  const shouldResume = String(searchParams?.resume) === '1';

  if (!config) notFound();

  const data = await fetchQuizDataFromPath(path.join(process.cwd(), ...config.basePath));
  if (!data) notFound();

  return (
    <Quiz
      problems={data.problems}
      answersMap={data.answersMap}
      commentsMap={data.commentsMap}
      session={{ title: config.title, ...(config.sessionProps || {}) }}
      sessionId={sessionId}
      initialProblemNumber={validInitialProblemNumber}
      shouldResume={shouldResume}
    />
  );
}
