import fs from 'fs/promises';
import path from 'path';

const SUPPORTED_YEARS = new Set(['2022', '2023', '2024', '2025']);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sectionTitleOf(subject) {
  if (subject === 1) return '정보시스템 기반 기술';
  if (subject === 2) return '프로그래밍 언어 활용';
  return '데이터베이스의 활용';
}

function shuffledOptionsAndAnswer(options, answerText) {
  const withIndex = (options || []).map((text, idx) => ({ text, idx }));
  const shuffled = shuffle(withIndex);
  return {
    options: shuffled.map((x) => x.text),
    answerText,
  };
}

export function isSupportedRandom22Year(year) {
  return SUPPORTED_YEARS.has(String(year));
}

export async function buildRandomOptionYearQuiz(year) {
  const yearKey = String(year);
  if (!isSupportedRandom22Year(yearKey)) {
    throw new Error(`Unsupported random22 year: ${yearKey}`);
  }

  const filePath = path.join(process.cwd(), 'datasets', 'randomOptionShuffle', `year${yearKey}.json`);
  const raw = await fs.readFile(filePath, 'utf8');
  const payload = JSON.parse(String(raw).replace(/^\uFEFF/, ''));
  const items = Array.isArray(payload?.items) ? payload.items : [];

  const selectedBySubject = { 1: [], 2: [], 3: [] };

  for (const subject of [1, 2, 3]) {
    const pool = items.filter((p) => Number(p.subject) === subject);
    if (pool.length < 20) {
      throw new Error(`Not enough questions for ${yearKey} subject ${subject}: ${pool.length}`);
    }
    selectedBySubject[subject] = shuffle(pool).slice(0, 20);
  }

  const ordered = [
    ...shuffle(selectedBySubject[1]),
    ...shuffle(selectedBySubject[2]),
    ...shuffle(selectedBySubject[3]),
  ];

  const problems = [];
  const answersMap = {};
  const commentsMap = {};

  ordered.forEach((item, idx) => {
    const newNo = idx + 1;
    const subject = idx < 20 ? 1 : idx < 40 ? 2 : 3;
    const { options, answerText } = shuffledOptionsAndAnswer(item.options, item.answer_text);

    problems.push({
      problem_number: newNo,
      question_text: `[보기셔플][${item.sourceKey}] ${item.question_text}`,
      options,
      examples: item.examples || null,
      sectionTitle: sectionTitleOf(subject),
      originSessionId: item.sourceSessionId,
      originProblemNumber: item.problem_number,
      originSourceKey: item.sourceKey,
    });
    answersMap[newNo] = answerText;
    commentsMap[newNo] = item.comment_text || '';
  });

  const modeLabel = yearKey === '2025' ? '2025 산업기사' : `${yearKey}년`;
  return {
    session: { title: `랜덤보기22 (${modeLabel} 문제+보기 셔플)` },
    problems,
    answersMap,
    commentsMap,
  };
}
