// lib/variantGeneration.js — 생성 하네스의 순수함수 계층 (OpenAI 호출은 route가 담당)
import { pickExpansionAnchors, pickCoverageAnchors } from '@/lib/conceptTags';

const normalize = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');

// ---------- 게이트 1: 스키마 + 정답 노출 + 근사중복 ----------
export function validateGeneratedProblem(gen, original) {
  if (!gen || typeof gen !== 'object') return { ok: false, reason: 'not-an-object' };
  if (!String(gen.question_text || '').trim()) return { ok: false, reason: 'question_text empty' };
  if (!String(gen.answer || '').trim()) return { ok: false, reason: 'answer empty' };
  if (!['single', 'sequence', 'multi'].includes(String(gen.input_type || 'single'))) {
    return { ok: false, reason: `input_type invalid: ${gen.input_type}` };
  }

  const answers = [String(gen.answer), ...(Array.isArray(gen.accepted_answers) ? gen.accepted_answers : [])];

  // 입력 UI는 한 줄 텍스트 — 줄바꿈이 필요한 정답은 채점 불가능하므로 거부
  for (const a of answers) {
    if (/[\r\n]/.test(String(a))) {
      return { ok: false, reason: `answer contains newline (한 줄로 입력 가능한 정답이어야 함): ${JSON.stringify(a).slice(0, 40)}` };
    }
  }

  // 정답 노출: 2글자 이상 답만 검사 (숫자 한 글자 답의 오탐 방지)
  const body = normalize(`${gen.question_text} ${gen.examples || ''}`);
  for (const a of answers) {
    const na = normalize(a);
    if (na.length >= 2 && body.includes(na)) {
      return { ok: false, reason: `answer leaked in body: ${a}` };
    }
  }

  const genText = `${gen.question_text} ${gen.examples || ''}`;
  const origText = `${original?.question_text || ''} ${original?.examples || ''}`;
  if (isNearDuplicate(genText, origText)) {
    return { ok: false, reason: 'near-duplicate of original' };
  }
  return { ok: true, reason: '' };
}

// 근사중복: 정규화 일치 또는 문자 3-gram Jaccard > 0.85
export function isNearDuplicate(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const grams = (s) => {
    const set = new Set();
    for (let i = 0; i <= s.length - 3; i += 1) set.add(s.slice(i, i + 3));
    return set;
  };
  const ga = grams(na);
  const gb = grams(nb);
  if (ga.size === 0 || gb.size === 0) return na === nb;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter += 1;
  const union = ga.size + gb.size - inter;
  return inter / union > 0.85;
}

// ---------- 인터리빙: 같은 카테고리 3연속 금지 (그리디) ----------
export function interleaveByCategory(items, random = Math.random) {
  const pool = [...items];
  // 풀을 (random 함수를 사용해) 섞기
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out = [];
  while (pool.length > 0) {
    let pickedIdx = -1;
    // 3연속을 만들지 않는 첫 번째 항목 찾기
    for (let i = 0; i < pool.length; i++) {
      const wouldCreate3 = out.length >= 2 &&
        out[out.length - 1].category === out[out.length - 2].category &&
        out[out.length - 1].category === pool[i].category;
      if (!wouldCreate3) {
        pickedIdx = i;
        break;
      }
    }
    // 찾지 못했으면 어쩔 수 없이 첫 번째
    if (pickedIdx === -1) pickedIdx = 0;
    out.push(pool.splice(pickedIdx, 1)[0]);
  }
  return out;
}

// ---------- 배치 계획: 변형 N + 확장/커버리지 ceil(N×0.25) ----------
export function planGenerationBatch({
  wrongs, pendingKeys, tagsMap, problemIndex, attemptedKeys, random = Math.random, maxAnchors = 20,
}) {
  const wrongKeys = wrongs.map((w) => `${w.sourceSessionId}:${w.sourceProblemNumber}`);

  // 변형 슬롯: pending이 없는 오답만
  const variants = wrongs
    .filter((w, i) => !pendingKeys.has(wrongKeys[i]))
    .slice(0, maxAnchors)
    .map((w) => ({
      kind: 'variant',
      key: `${w.sourceSessionId}:${w.sourceProblemNumber}`,
      sessionId: w.sourceSessionId,
      problemNumber: w.sourceProblemNumber,
      concept: tagsMap[`${w.sourceSessionId}:${w.sourceProblemNumber}`] || null,
    }));

  const extraCount = Math.ceil(variants.length * 0.25);
  if (extraCount === 0) return variants;

  // 약한 개념: 오답 빈도 내림차순
  const conceptFreq = new Map();
  for (const key of wrongKeys) {
    const c = tagsMap[key];
    if (c) conceptFreq.set(c, (conceptFreq.get(c) || 0) + 1);
  }
  const weakConcepts = [...conceptFreq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);

  const excludeKeys = new Set([...wrongKeys, ...pendingKeys, ...variants.map((v) => v.key)]);
  const expansion = pickExpansionAnchors({
    weakConcepts, problemIndex, attemptedKeys, excludeKeys, count: extraCount,
  }).map((p) => ({ ...p, kind: 'expansion' }));

  for (const e of expansion) excludeKeys.add(e.key);
  const coverage = pickCoverageAnchors({
    problemIndex, attemptedKeys, excludeKeys, count: extraCount - expansion.length, random,
  }).map((p) => ({ ...p, kind: 'coverage' }));

  return [...variants, ...expansion, ...coverage];
}

// ---------- 프롬프트 ----------
export function buildGeneratorPrompt({ original, answer, comment, concept, failureReasons = [] }) {
  return [
    '당신은 정보처리산업기사 실기 문제 출제자입니다. 아래 원본 문제의 "변형"을 1개 만드세요.',
    '',
    '규칙:',
    `- 측정 개념(${concept || '원본과 동일 개념'})은 반드시 유지`,
    '- 표면(테이블명·컬럼·값·소재)과 구조(함수·조건 등)는 다양하게 변경 — 원본을 외운 사람이 못 풀고, 개념을 아는 사람만 풀 수 있게',
    '- 난이도는 원본과 동급 (더 쉽게 만들지 말 것)',
    '- 정답이 문제 본문이나 보기에 절대 드러나지 않게',
    '- 실제로 풀 수 있는 완결된 문제여야 함 (SQL이면 보기의 테이블 데이터로 정답이 유일하게 결정되어야 함)',
    '- examples 서식: 테이블은 각 행을 "값1 | 값2 | 값3" 파이프 구분(첫 행 = 컬럼명, |---| 구분선 금지), 코드/SQL은 코드만 담긴 단락으로, 설명 텍스트는 빈 줄로 구분한 별도 단락으로 작성',
    '- 정답(answer, accepted_answers)은 줄바꿈 없는 한 줄이어야 함 — 여러 줄이 출력되는 문제라면 question_text에 "각 줄의 값을 공백으로 구분해 한 줄로 쓰시오"를 명시하고 answer도 공백 구분 한 줄로 작성 (answer_format_hint에도 예시 표기)',
    '',
    '아래 JSON 형식으로만 출력 (설명 금지):',
    '{"question_text": "...", "examples": "...(코드/테이블/보기, 없으면 빈 문자열)", "input_type": "single", "category": "...", "subcategory": "...", "answer": "...", "accepted_answers": ["...", "동의어/허용표기"], "comment": "왜 이 답인지 1~3문장 해설"}',
    '',
    '[원본 문제]', String(original.question_text || ''),
    '[원본 보기/코드]', String(original.examples || '없음'),
    `[원본 정답] ${String(answer || '')}`,
    '[원본 해설]', String(comment || '없음'),
    ...(failureReasons.length > 0
      ? ['', '[이전 생성 실패 사유 — 반드시 해결할 것]', ...failureReasons.map((r) => `- ${r}`)]
      : []),
  ].join('\n');
}

export function buildJudgePrompt({ gen, original, answer }) {
  return [
    '당신은 시험 문제 품질 심사관입니다. 아래 "생성 문제"를 회의적으로 심사하세요.',
    '확신이 없으면 false를 주세요.',
    '',
    '심사 기준 (각각 true/false):',
    '- concept_same: 원본과 같은 개념을 측정하는가',
    '- answer_correct: 제시된 정답이 문제 조건에서 유일하고 실제로 옳은가 (SQL이면 직접 계산해볼 것)',
    '- no_leak: 정답이 문제 본문·보기에 드러나지 않는가',
    '- difficulty_ok: 원본과 비슷한 난이도인가 (현저히 쉬우면 false)',
    '',
    'JSON만 출력: {"concept_same": bool, "answer_correct": bool, "no_leak": bool, "difficulty_ok": bool, "reason": "실패 시 구체 사유"}',
    '',
    '[원본 문제]', String(original.question_text || ''),
    '[원본 보기]', String(original.examples || '없음'),
    `[원본 정답] ${String(answer || '')}`,
    '',
    '[생성 문제]', String(gen.question_text || ''),
    '[생성 보기]', String(gen.examples || '없음'),
    `[생성 정답] ${String(gen.answer || '')} (허용: ${(gen.accepted_answers || []).join(', ')})`,
  ].join('\n');
}

// 모델 출력에서 JSON 추출 (코드펜스 허용)
export function parseModelJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
