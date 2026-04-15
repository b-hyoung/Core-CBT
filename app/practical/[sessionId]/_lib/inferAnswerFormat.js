const FALLBACKS = {
  multi_blank: '각 라벨 옆에 답을 입력하세요',
  ordered_sequence: '순서대로 기호를 입력하세요',
  unordered_symbol_set: '옳은 기호만 골라 입력하세요',
  textarea: '실행 결과를 그대로 입력하세요',
  single: '',
};

function inferSingleToken(answer) {
  const trimmed = String(answer || '').trim();
  if (!trimmed) return '';
  if (/[,/]/.test(trimmed)) return '쉼표로 구분';
  const hasKor = /[가-힣]/.test(trimmed);
  const hasEng = /[A-Za-z]/.test(trimmed);
  if (hasKor && hasEng) return '한글 또는 영문 약어 모두 인정';
  if (/^[A-Z]+$/.test(trimmed)) {
    return trimmed.length <= 6 ? `영문 대문자 ${trimmed.length}글자` : '영문 대문자';
  }
  if (/^\d+$/.test(trimmed)) return '숫자';
  return '';
}

export function inferAnswerFormat(problem, correctAnswer) {
  const inputType = String(problem?.input_type || 'single');
  if (inputType === 'single') {
    const result = inferSingleToken(correctAnswer);
    return result || FALLBACKS.single;
  }
  return FALLBACKS[inputType] ?? '';
}
