import fs from 'fs/promises';
import path from 'path';
import { OBJECTIVE_SESSION_CONFIG } from '@/lib/objectiveSessionCatalog';

const stripBom = (value) => String(value || '').replace(/^\uFEFF/, '');

function buildDatasetMaps(problemStr, answerStr, commentStr) {
  const problemData = JSON.parse(stripBom(problemStr));
  const answerData = JSON.parse(stripBom(answerStr));
  const commentData = JSON.parse(stripBom(commentStr));

  const problemsByNo = new Map();
  for (const section of problemData || []) {
    for (const problem of section?.problems || []) {
      problemsByNo.set(Number(problem.problem_number), {
        ...problem,
        sectionTitle: section.title,
      });
    }
  }

  const answersByNo = new Map();
  const acceptedAnswersByNo = new Map();
  for (const section of answerData || []) {
    for (const answer of section?.answers || []) {
      answersByNo.set(Number(answer.problem_number), String(answer.correct_answer_text || ''));
      if (Array.isArray(answer.accepted_answers) && answer.accepted_answers.length > 0) {
        acceptedAnswersByNo.set(Number(answer.problem_number), answer.accepted_answers);
      }
    }
  }

  const commentsByNo = new Map();
  for (const section of commentData || []) {
    for (const comment of section?.comments || []) {
      commentsByNo.set(Number(comment.problem_number), String(comment.comment ?? comment.comment_text ?? ''));
    }
  }

  return { problemsByNo, answersByNo, acceptedAnswersByNo, commentsByNo };
}

export async function loadObjectiveDatasetMaps(sessionId) {
  const config = OBJECTIVE_SESSION_CONFIG[String(sessionId || '')];
  if (!config) return null;

  const basePath = path.join(process.cwd(), ...config.basePath);
  const [problemStr, answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'problem1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);

  return buildDatasetMaps(problemStr, answerStr, commentStr);
}
