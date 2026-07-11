import fs from 'fs/promises';
import path from 'path';
import { classifySessionId } from '@/lib/examType';

const ROUND_TO_FOLDER = { '1': 'first', '2': 'second', '3': 'third' };

// originSessionId가 random/high-wrong/high-unknown/random22-* 처럼
// 집합형(aggregate) 라벨이면 데이터셋 경로를 정할 수 없다.
// 그런 경우엔 호출 측이 출제 시점에 sourceSessionId로 풀어주기 때문에
// 여기서는 raw key만 받아 매핑한다.
const WRITTEN_SESSION_PATHS = {
  '1': ['problem2024', 'first'],
  '2': ['problem2024', 'second'],
  '3': ['problem2024', 'third'],
  // 기존 라벨 중복: 4→2024-2, 5→2024-3 (route.js의 SESSION_LABELS 와 정합)
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

function resolveSqldPath(sid) {
  const m = sid.match(/^sqld-(\d{4})-(\d)$/);
  if (!m) return null;
  const folder = ROUND_TO_FOLDER[m[2]];
  if (!folder) return null;
  return ['datasets', 'sqld', `${m[1]}-${folder}`];
}

function resolvePracticalPath(sid) {
  const m = sid.match(/^practical-industrial-(\d{4})-(\d)$/);
  if (!m) return null;
  const folder = ROUND_TO_FOLDER[m[2]];
  if (!folder) return null;
  return ['datasets', 'practicalIndustrial', `${m[1]}-${folder}`];
}

function resolveAiPromptPath(sid) {
  if (sid === 'aiprompt-2-1') return ['datasets', 'aiPromptEngineering', 'grade2-first'];
  if (sid === 'aiprompt-2-b') return ['datasets', 'aiPromptEngineering', 'grade2-b'];
  if (sid === 'quiz-round-3') return ['datasets', 'quizNow', 'round3'];
  return null;
}

function resolvePdfPackPath(sid) {
  if (!sid.startsWith('pdfpack-')) return null;
  const slug = sid.slice('pdfpack-'.length);
  if (!slug) return null;
  return ['datasets', 'pdfPacks', slug];
}

export function resolveDatasetPath(sessionId) {
  const sid = String(sessionId || '').trim();
  if (!sid) return null;

  if (sid.startsWith('sqld-')) return resolveSqldPath(sid);
  if (sid.startsWith('practical-industrial-')) return resolvePracticalPath(sid);
  if (sid.startsWith('aiprompt-') || sid === 'quiz-round-3') return resolveAiPromptPath(sid);
  if (sid.startsWith('pdfpack-')) return resolvePdfPackPath(sid);

  const written = WRITTEN_SESSION_PATHS[sid];
  if (written) return ['datasets', ...written];

  // TODO: random / random22-* / high-wrong / high-unknown 같은 집합형 라벨은
  // origin 풀이 책임이 호출자(데이터셋 빌더)에 있다. 도달하면 null.
  return null;
}

async function readJsonFile(absPath) {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    return JSON.parse(String(raw).replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function findEntryByProblemNumber(sections, key, problemNumber) {
  if (!Array.isArray(sections)) return null;
  for (const section of sections) {
    const list = Array.isArray(section?.[key]) ? section[key] : [];
    const hit = list.find((item) => Number(item?.problem_number) === Number(problemNumber));
    if (hit) return hit;
  }
  return null;
}

export async function loadProblemFull(sessionId, problemNumber) {
  const rel = resolveDatasetPath(sessionId);
  if (!rel) return null;
  const n = Number(problemNumber);
  if (!Number.isFinite(n) || n <= 0) return null;

  const baseAbs = path.join(process.cwd(), ...rel);
  const [problemData, answerData, commentData] = await Promise.all([
    readJsonFile(path.join(baseAbs, 'problem1.json')),
    readJsonFile(path.join(baseAbs, 'answer1.json')),
    readJsonFile(path.join(baseAbs, 'comment1.json')),
  ]);

  if (!problemData && !answerData && !commentData) return null;

  const problemEntry = findEntryByProblemNumber(problemData, 'problems', n);
  const answerEntry = findEntryByProblemNumber(answerData, 'answers', n);
  const commentEntry = findEntryByProblemNumber(commentData, 'comments', n);

  if (!problemEntry && !answerEntry && !commentEntry) return null;

  return {
    question_text: problemEntry?.question_text ?? null,
    options: Array.isArray(problemEntry?.options) ? problemEntry.options : null,
    correct_answer_index:
      typeof answerEntry?.correct_answer_index === 'number'
        ? answerEntry.correct_answer_index
        : null,
    correct_answer_text: answerEntry?.correct_answer_text ?? null,
    current_comment: commentEntry?.comment ?? null,
    dataset_path: rel.join('/'),
    exam_type: classifySessionId(sessionId) || null,
  };
}
