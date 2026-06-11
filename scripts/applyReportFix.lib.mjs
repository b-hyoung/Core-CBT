// CBT 신고 자동 수정: 데이터셋 JSON에서 problem_number 항목의 필드를 교체하는 순수 로직.
// I/O 없음 — GitHub Action 환경과 vitest에서 동일하게 동작해야 한다.

function findInNested(doc, listKey, problemNumber) {
  for (const block of doc) {
    const item = (block?.[listKey] ?? []).find((x) => x.problem_number === problemNumber);
    if (item) return item;
  }
  return null;
}

// Dify Code 노드는 Object 출력 타입 제약 때문에 문자열을 {value: "..."}로 래핑한다
// (docs/dify/cbt-report-judge.md 참고) — 문자열 필드는 여기서 벗긴다.
function unwrapDifyValue(newValue) {
  if (newValue && typeof newValue === 'object' && Object.keys(newValue).length === 1 && 'value' in newValue) {
    return newValue.value;
  }
  return newValue;
}

export function applyFix(doc, targetField, problemNumber, newValue) {
  if (targetField === 'comment' || targetField === 'hint') newValue = unwrapDifyValue(newValue);
  if (targetField === 'comment') {
    if (typeof newValue !== 'string' || !newValue.trim()) throw new Error('comment new_value must be a non-empty string');
    const item = findInNested(doc, 'comments', problemNumber);
    if (!item) throw new Error(`problem_number ${problemNumber} not found in comments`);
    item.comment = newValue;
    return doc;
  }
  if (targetField === 'hint') {
    if (typeof newValue !== 'string' || !newValue.trim()) throw new Error('hint new_value must be a non-empty string');
    const item = doc.find((x) => x.problem_number === problemNumber);
    if (!item) throw new Error(`problem_number ${problemNumber} not found in hints`);
    item.hint_body = newValue;
    return doc;
  }
  if (targetField === 'correct_answer_index') {
    if (!Number.isInteger(newValue?.correct_answer_index) || newValue.correct_answer_index < 0) {
      throw new Error('correct_answer_index must be a non-negative integer');
    }
    if (typeof newValue?.correct_answer_text !== 'string' || !newValue.correct_answer_text.trim()) {
      throw new Error('correct_answer_text must be a non-empty string');
    }
    const item = findInNested(doc, 'answers', problemNumber);
    if (!item) throw new Error(`problem_number ${problemNumber} not found in answers`);
    item.correct_answer_index = newValue.correct_answer_index;
    item.correct_answer_text = newValue.correct_answer_text;
    return doc;
  }
  throw new Error(`unsupported target_field: ${targetField}`);
}

const FILE_PREFIX = { comment: 'comment', hint: 'hint', correct_answer_index: 'answer' };

function containsProblem(doc, targetField, problemNumber) {
  if (targetField === 'hint') return doc.some((x) => x.problem_number === problemNumber);
  const listKey = targetField === 'comment' ? 'comments' : 'answers';
  return findInNested(doc, listKey, problemNumber) !== null;
}

export function selectTargetFile(files, targetField, problemNumber) {
  const prefix = FILE_PREFIX[targetField];
  if (!prefix) throw new Error(`unsupported target_field: ${targetField}`);
  const matches = files
    .filter((f) => f.name.startsWith(prefix) && f.name.endsWith('.json'))
    .filter((f) => containsProblem(f.doc, targetField, problemNumber));
  if (matches.length === 0) throw new Error(`no file contains problem_number ${problemNumber} for ${targetField}`);
  if (matches.length > 1) throw new Error(`ambiguous: ${matches.map((f) => f.name).join(', ')}`);
  return matches[0].name;
}
