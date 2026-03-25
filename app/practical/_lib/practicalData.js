import fs from 'fs/promises';
import path from 'path';
import { PRACTICAL_SESSION_CONFIG, isPracticalSessionId, practicalSessionLabel } from './practicalSessions';

const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');

export { PRACTICAL_SESSION_CONFIG, isPracticalSessionId, practicalSessionLabel };

async function readPracticalFiles(basePath) {
  const [problemStr, answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'problem1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);
  return {
    problemData: JSON.parse(stripBom(problemStr)),
    answerData: JSON.parse(stripBom(answerStr)),
    commentData: JSON.parse(stripBom(commentStr)),
  };
}

export async function loadPracticalDatasetMaps(sessionId) {
  const cfg = PRACTICAL_SESSION_CONFIG[String(sessionId || '')];
  if (!cfg) return null;

  const basePath = path.join(process.cwd(), ...cfg.basePath);
  const { problemData, answerData, commentData } = await readPracticalFiles(basePath);

  const answerRecordsMap = new Map();
  for (const section of answerData || []) {
    for (const a of section?.answers || []) {
      const correctText = Array.isArray(a.correct_answer_text) ? a.correct_answer_text : [String(a.correct_answer_text ?? '')];
      answerRecordsMap.set(Number(a.problem_number), {
        correct_answer_text: correctText[0],
        accepted_answers: [
          ...correctText,
          ...(Array.isArray(a.accepted_answers) ? a.accepted_answers.map(String) : [])
        ].filter(Boolean),
      });
    }
  }

  const problemsByNo = new Map();
  for (const section of problemData || []) {
    for (const p of section?.problems || []) {
      const no = Number(p.problem_number);
      const answerRecord = answerRecordsMap.get(no);
      problemsByNo.set(no, {
        ...p,
        sectionTitle: section.title,
        accepted_answers:
          Array.isArray(p?.accepted_answers) && p.accepted_answers.length > 0
            ? p.accepted_answers
            : (answerRecord?.accepted_answers || []),
      });
    }
  }

  const answersByNo = new Map();
  for (const [no, record] of answerRecordsMap.entries()) {
    answersByNo.set(no, String(record?.correct_answer_text ?? ''));
  }

  const commentsByNo = new Map();
  for (const section of commentData || []) {
    for (const c of section?.comments || []) {
      commentsByNo.set(Number(c.problem_number), String(c.comment ?? c.comment_text ?? ''));
    }
  }

  return { config: cfg, problemsByNo, answersByNo, commentsByNo };
}

export async function loadPracticalQuizData(sessionId) {
  const maps = await loadPracticalDatasetMaps(sessionId);
  if (!maps) return null;

  const problems = [...maps.problemsByNo.values()].sort((a, b) => Number(a.problem_number) - Number(b.problem_number));
  const answersMap = {};
  const commentsMap = {};

  for (const [no, answer] of maps.answersByNo.entries()) answersMap[no] = answer;
  for (const [no, comment] of maps.commentsByNo.entries()) commentsMap[no] = comment;

  return { problems, answersMap, commentsMap, config: maps.config };
}
