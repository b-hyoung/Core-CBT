import fs from 'fs/promises';
import path from 'path';
import { PRACTICAL_SESSION_CONFIG, isPracticalSessionId, practicalSessionLabel } from './practicalSessions';
import { fetchHintOverrides } from '../[sessionId]/_lib/fetchHintOverrides';

const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');

const SYNTHETIC_SESSIONS = new Set([
  'random',
  '100',
  'random22',
  'high-wrong',
  'high-unknown',
  'my-wrong',
  'my-unknown',
]);

export { PRACTICAL_SESSION_CONFIG, isPracticalSessionId, practicalSessionLabel };

async function readPracticalFiles(basePath) {
  const [problemStr, answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'problem1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);
  // hint1.json is optional — not every session has one yet.
  let hintData = [];
  try {
    const hintStr = await fs.readFile(path.join(basePath, 'hint1.json'), 'utf8');
    hintData = JSON.parse(stripBom(hintStr));
  } catch {
    hintData = [];
  }
  return {
    problemData: JSON.parse(stripBom(problemStr)),
    answerData: JSON.parse(stripBom(answerStr)),
    commentData: JSON.parse(stripBom(commentStr)),
    hintData,
  };
}

export async function loadPracticalDatasetMaps(sessionId) {
  const cfg = PRACTICAL_SESSION_CONFIG[String(sessionId || '')];
  if (!cfg) return null;

  const basePath = path.join(process.cwd(), ...cfg.basePath);
  const { problemData, answerData, commentData, hintData } = await readPracticalFiles(basePath);

  const hintsByNo = new Map();
  for (const entry of hintData || []) {
    if (!entry) continue;
    const no = Number(entry.problem_number);
    const body = String(entry.hint_body || entry.hint || '').trim();
    if (Number.isFinite(no) && body) hintsByNo.set(no, body);
  }

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
        hint_body: hintsByNo.get(no) || null,
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

  const rawProblems = [...maps.problemsByNo.values()].sort(
    (a, b) => Number(a.problem_number) - Number(b.problem_number),
  );
  const answersMap = {};
  const commentsMap = {};

  for (const [no, answer] of maps.answersByNo.entries()) answersMap[no] = answer;
  for (const [no, comment] of maps.commentsByNo.entries()) commentsMap[no] = comment;

  const isSynthetic = SYNTHETIC_SESSIONS.has(String(sessionId));
  const lookupIds = isSynthetic
    ? Array.from(new Set(rawProblems.map((p) => p.source_session_id).filter(Boolean)))
    : [String(sessionId)];
  const overrides = await fetchHintOverrides(lookupIds);

  const problems = rawProblems.map((p) => {
    const sid = isSynthetic ? String(p.source_session_id || '') : String(sessionId);
    const pnum = isSynthetic
      ? Number(p.source_problem_number || p.problem_number)
      : Number(p.problem_number);
    const override = overrides.get(`${sid}:${pnum}`);
    return {
      ...p,
      answer_format_hint: override ?? p.answer_format_hint ?? null,
      hint_source: override ? 'override' : p.answer_format_hint ? 'dataset' : null,
    };
  });

  return { problems, answersMap, commentsMap, config: maps.config };
}
