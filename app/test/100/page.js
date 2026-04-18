import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import Quiz from '../[sessionId]/Quiz';

async function loadData() {
  const basePath = path.join(process.cwd(), 'datasets', 'problem100', 'first');
  const [problemStr, answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'problem1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);

  const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');
  const problemData = JSON.parse(stripBom(problemStr));
  const answerData = JSON.parse(stripBom(answerStr));
  const commentData = JSON.parse(stripBom(commentStr));

  const problems = problemData.flatMap((section) =>
    (section.problems || []).map((p) => ({ ...p, sectionTitle: section.title }))
  );

  const answersMap = answerData.reduce((acc, section) => {
    (section.answers || []).forEach((a) => {
      acc[a.problem_number] = a.correct_answer_text;
    });
    return acc;
  }, {});

  const commentsMap = commentData.reduce((acc, section) => {
    (section.comments || []).forEach((c) => {
      acc[c.problem_number] = c.comment ?? '';
    });
    return acc;
  }, {});

  return { problems, answersMap, commentsMap };
}

export default async function HundredFixedPage() {
  let data;
  try {
    data = await loadData();
  } catch (error) {
    console.error('failed to load problem100:', error);
    notFound();
  }

  return (
    <Quiz
      problems={data.problems}
      answersMap={data.answersMap}
      commentsMap={data.commentsMap}
      session={{ title: '100문제 풀어보기' }}
      sessionId="100"
    />
  );
}
