/**
 * multi_blank 입력 관련 공용 유틸리티.
 *
 * PracticalQuiz.js 에서 추출. 코치 solve 등 여러 곳에서 재사용.
 */

export function normalizeLabelToken(label) {
  const raw = String(label ?? '').trim();
  if (!raw) return raw;
  const koreanParen = raw.match(/^\(([가-힣])\)$/);
  if (koreanParen) return koreanParen[1];
  const koreanDot = raw.match(/^([가-힣])\.$/);
  if (koreanDot) return koreanDot[1];
  if (/^[가-힣]$/.test(raw)) return raw;
  const numParen = raw.match(/^\((\d+)\)$/);
  if (numParen) return numParen[1];
  const numDot = raw.match(/^(\d+)[.)]$/);
  if (numDot) return numDot[1];
  if (/^\d+$/.test(raw)) return raw;
  return raw;
}

export function getLabeledTokenMatches(text) {
  const target = String(text ?? '').trim();
  if (!target) return [];
  const labelCore =
    '(\\([가-힣]\\)|[가-힣]\\.|\\(\\d+\\)|[가나다라마바사아자차카타파하]|[①-⑳]|[ㄱ-ㅎ]|\\d+\\)|\\d+\\.)';
  const pattern = new RegExp(`(^|[\\s,\\/|])${labelCore}(?:\\s*[:：-]\\s*|\\s+(?=[^,\\/|\\s]))`, 'g');
  const matches = [];
  let m;
  while ((m = pattern.exec(target)) !== null) {
    const prefix = m[1] || '';
    matches.push({
      label: normalizeLabelToken(m[2]),
      index: (m.index ?? 0) + prefix.length,
      fullLength: m[0].length - prefix.length,
    });
  }
  return matches;
}

function inferNamedPairLabelsFromAnswer(value) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  if (getLabeledTokenMatches(text).length >= 2) return [];
  const parts = text.split(/\s*[,/|]\s*/g).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return [];
  const labels = [];
  const seen = new Set();
  for (const part of parts) {
    const m = part.match(/^([^\d,:：]+?)(?:\s*[:：]\s*|\s+\d)/);
    if (!m) return [];
    let label = String(m[1] || '').replace(/\s*\((.*?)\)\s*$/g, '').trim();
    if (!label || label.length > 20) return [];
    if (!seen.has(label)) { seen.add(label); labels.push(label); }
  }
  return labels.length >= 2 ? labels : [];
}

/**
 * 문제와 정답으로부터 multi_blank 라벨 목록을 추출.
 * @returns {{ labels: string[] } | null}
 */
export function getMultiBlankMeta(problem, correctAnswer = '') {
  const explicitInputLabels = Array.isArray(problem?.input_labels)
    ? problem.input_labels.map((l) => normalizeLabelToken(l)).filter(Boolean)
    : [];
  if (explicitInputLabels.length >= 2) {
    return { labels: [...new Set(explicitInputLabels)].slice(0, 10) };
  }

  const source = `${String(problem?.question_text ?? '')}\n${String(problem?.examples ?? '')}`;
  const lines = source.split(/\r?\n/);
  const labels = [];
  const seen = new Set();
  for (const line of lines) {
    const m = line.match(/^\s*(\([가-힣]\)|[가-힣]\.|[①-⑳]|[ㄱ-ㅎ]|\d+\)|\d+\.)\s*/);
    if (!m) continue;
    const label = normalizeLabelToken(m[1]);
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }

  const answerLabels = [];
  const answerSeen = new Set();
  for (const m of getLabeledTokenMatches(String(correctAnswer ?? ''))) {
    if (!answerSeen.has(m.label)) { answerSeen.add(m.label); answerLabels.push(m.label); }
  }
  if (answerLabels.length >= 2) return { labels: answerLabels.slice(0, 10) };

  const inferredPairLabels = inferNamedPairLabelsFromAnswer(correctAnswer);
  if (inferredPairLabels.length >= 2) return { labels: inferredPairLabels.slice(0, 10) };

  if (labels.length === 0) return { labels: ['①', '②'] };
  return { labels: labels.slice(0, 10) };
}

/**
 * multi_blank 입력값을 라벨 기준으로 분리.
 */
export function splitMultiBlankDraft(value, labels) {
  const text = String(value ?? '');
  if (!text.trim()) return labels.map(() => '');

  const escaped = labels.slice().sort((a, b) => b.length - a.length)
    .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(^|[\\s,\\/|])(${escaped.join('|')})(?:\\s*[:：-]\\s*|\\s+(?=[^,\\/|\\s]))`, 'g');
  const matches = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const prefix = m[1] || '';
    matches.push({ label: m[2], index: (m.index ?? 0) + prefix.length, fullLength: m[0].length - prefix.length });
  }
  if (matches.length > 0) {
    const result = labels.map(() => '');
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i].fullLength;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const idx = labels.indexOf(matches[i].label);
      if (idx >= 0) result[idx] = text.slice(start, end).trim().replace(/^[-:：]\s*/, '').replace(/\s*(?:\/|,|\|)\s*$/g, '');
    }
    return result;
  }

  const tokens = text.split(/\s*(?:\/|,|\|)\s*/g).map((v) => v.trim()).filter(Boolean);
  return labels.map((_, idx) => tokens[idx] || '');
}

/**
 * multi_blank 답안을 라벨:값 형태 문자열로 조합.
 */
export function joinMultiBlankAnswer(labels, values) {
  return labels.map((label, i) => `${label}: ${values[i] || ''}`).join(' / ');
}
