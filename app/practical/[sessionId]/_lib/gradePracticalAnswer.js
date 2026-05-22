import { computeDiff } from './computeDiff';

const UNKNOWN_OPTION = '__UNKNOWN_OPTION__';

function getSequenceMeta(problem, correctAnswer = '') {
  const explicitInputType = String(problem?.input_type || '');
  const explicitInputLabels = Array.isArray(problem?.input_labels)
    ? problem.input_labels.map((label) => String(label ?? '').trim()).filter(Boolean)
    : [];
  const examples = String(problem?.examples ?? '');
  const questionText = String(problem?.question_text ?? '');
  const lines = examples.split(/\r?\n/);
  const markers = [];

  for (const line of lines) {
    const m = line.match(/^\s*([ㄱ-ㅎ]|[①-⑳]|\d+)\s*[.)]\s*/);
    if (m) markers.push(m[1]);
  }

  const first = markers[0] || '';
  let kind = /[ㄱ-ㅎ]/.test(first)
    ? 'korean_jamo'
    : /[①-⑳]/.test(first)
      ? 'circled'
      : /^\d+$/.test(first)
        ? 'number'
        : 'generic';

  const answerText = String(correctAnswer ?? '');
  if (kind === 'generic') {
    if (/[ㄱ-ㅎ]/.test(answerText)) kind = 'korean_jamo';
    else if (/[①-⑳]/.test(answerText)) kind = 'circled';
    else if (/\d/.test(answerText)) kind = 'number';
  }
  const asksSelectAll =
    /(모두\s*고르|모두\s*골라|옳은\s*것(?:을)?\s*모두|해당하는\s*것(?:을)?\s*모두)/.test(questionText);
  const hasSymbolListAnswer =
    /[ㄱ-ㅎ]/.test(answerText) || /[①-⑳]/.test(answerText) || /(?:^|[^\d])\d+\s*[,→\-]/.test(answerText);
  const mode = explicitInputType === 'unordered_symbol_set'
    ? 'unordered_symbol_set'
    : explicitInputType === 'ordered_sequence'
      ? 'ordered'
      : asksSelectAll && hasSymbolListAnswer
        ? 'unordered_symbol_set'
        : 'ordered';

  // When examples have no markers but we still need a token count for ordered mode,
  // fall back to counting tokens in the correct answer (e.g. "ㄱ, ㄴ, ㄷ" → 3).
  const tokensFromAnswer = String(answerText)
    .split(/[,\s→\-]+/)
    .filter(Boolean);

  return {
    count:
      mode === 'unordered_symbol_set'
        ? 1
        : Math.min(
            Math.max(
              explicitInputLabels.length || markers.length || tokensFromAnswer.length || 4,
              2,
            ),
            10,
          ),
    kind,
    mode,
    markersCount: markers.length,
  };
}

function getMultiBlankMeta(problem, correctAnswer = '') {
  const explicitInputLabels = Array.isArray(problem?.input_labels)
    ? problem.input_labels.map((label) => normalizeLabelToken(label)).filter(Boolean)
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
    const label = m.label;
    if (!answerSeen.has(label)) {
      answerSeen.add(label);
      answerLabels.push(label);
    }
  }

  if (answerLabels.length >= 2) {
    return { labels: answerLabels.slice(0, 10) };
  }

  const inferredPairLabels = inferNamedPairLabelsFromAnswer(correctAnswer);
  if (inferredPairLabels.length >= 2) {
    return { labels: inferredPairLabels.slice(0, 10) };
  }

  if (labels.length === 0) return { labels: ['①', '②'] };
  return { labels: labels.slice(0, 10) };
}

function inferNamedPairLabelsFromAnswer(value) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  if (getLabeledTokenMatches(text).length >= 2) return [];

  const parts = text
    .split(/\s*[,/|]\s*/g)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return [];

  const labels = [];
  const seen = new Set();
  for (const part of parts) {
    const m = part.match(/^([^\d,:：]+?)(?:\s*[:：]\s*|\s+\d)/);
    if (!m) return [];
    let label = String(m[1] || '')
      .replace(/\s*\((.*?)\)\s*$/g, '')
      .trim();
    if (!label) return [];
    if (label.length > 20) return [];
    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels.length >= 2 ? labels : [];
}

function parsePracticalSymbolChoices(problem) {
  const questionText = String(problem?.question_text ?? '');
  const examples = String(problem?.examples ?? '');
  if (!examples.trim()) return [];
  if (!/[<＜]보기[>＞]/.test(examples) && !/보기/.test(questionText)) return [];

  const choices = [];
  const seenLabels = new Set();
  for (const line of examples.split(/\r?\n/)) {
    const m = line.match(/^\s*([ㄱ-ㅎ]|[①-⑳])\s*[.)]?\s*(.+?)\s*$/);
    if (!m) continue;
    const label = m[1];
    const text = String(m[2] || '').trim();
    if (!text) continue;
    if (/^<\s*보기\s*>$/i.test(text)) continue;
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);
    choices.push({
      label,
      text,
      fullText: `${label}. ${text}`,
      altText: `${label} ${text}`,
    });
  }
  return choices.length >= 2 ? choices : [];
}

function splitSequenceDraft(value, count) {
  const tokens = String(value ?? '')
    .split(/\s*(?:->|→|-|,|\/)\s*/g)
    .map((v) => v.trim())
    .filter(Boolean);
  return Array.from({ length: count }, (_, idx) => tokens[idx] || '');
}

function splitMultiBlankDraft(value, labels) {
  const text = String(value ?? '');
  if (!text.trim()) return labels.map(() => '');

  const escaped = labels
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(^|[\\s,\\/|])(${escaped.join('|')})(?:\\s*[:：-]\\s*|\\s+(?=[^,\\/|\\s]))`, 'g');
  const matches = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const prefix = m[1] || '';
    matches.push({
      label: m[2],
      index: (m.index ?? 0) + prefix.length,
      fullLength: m[0].length - prefix.length,
    });
  }
  if (matches.length > 0) {
    const result = labels.map(() => '');
    for (let i = 0; i < matches.length; i++) {
      const label = matches[i].label;
      const start = matches[i].index + matches[i].fullLength;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const idx = labels.indexOf(label);
      if (idx >= 0) {
        result[idx] = text
          .slice(start, end)
          .trim()
          .replace(/^[-:：]\s*/, '')
          .replace(/\s*(?:\/|,|\|)\s*$/g, '');
      }
    }
    return result;
  }

  const tokens = text
    .split(/\s*(?:\/|,|\|)\s*/g)
    .map((v) => v.trim())
    .filter(Boolean);
  return labels.map((_, idx) => tokens[idx] || '');
}

function sanitizeSequenceToken(value, kind) {
  const rawOriginal = String(value ?? '').replace(/\s+/g, '');
  if (!rawOriginal) return '';

  if (kind === 'korean_jamo') {
    const m = rawOriginal.match(/[ㄱ-ㅎ]/);
    if (m) return m[0];

    const compatibilityMap = {
      '\u1100': 'ㄱ', '\u1101': 'ㄲ', '\u1102': 'ㄴ', '\u1103': 'ㄷ', '\u1104': 'ㄸ',
      '\u1105': 'ㄹ', '\u1106': 'ㅁ', '\u1107': 'ㅂ', '\u1108': 'ㅃ', '\u1109': 'ㅅ',
      '\u110A': 'ㅆ', '\u110B': 'ㅇ', '\u110C': 'ㅈ', '\u110D': 'ㅉ', '\u110E': 'ㅊ',
      '\u110F': 'ㅋ', '\u1110': 'ㅌ', '\u1111': 'ㅍ', '\u1112': 'ㅎ',
    };
    for (const ch of rawOriginal.normalize('NFD')) {
      if (compatibilityMap[ch]) return compatibilityMap[ch];
    }
    return '';
  }
  if (kind === 'circled') {
    const m = rawOriginal.match(/[①-⑳]/);
    if (m) return m[0];
    const digit = rawOriginal.normalize('NFKC').match(/\d+/)?.[0];
    const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
    if (!digit) return '';
    const n = Number(digit);
    return Number.isInteger(n) && n >= 1 && n <= 20 ? circled[n - 1] : '';
  }
  if (kind === 'number') {
    const m = rawOriginal.normalize('NFKC').match(/\d+/);
    return m ? m[0].slice(0, 2) : '';
  }
  return rawOriginal.normalize('NFKC').slice(0, 4);
}

function normalizePracticalAnswer(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeLabelToken(label) {
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

function getLabeledTokenMatches(text) {
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

function normalizeSequenceLikeAnswer(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const arrowNormalized = raw.replace(/->/g, '→');

  if (/[ㄱ-ㅎ]/.test(arrowNormalized)) {
    const cleaned = arrowNormalized.replace(/\s+/g, '');
    if (/^[ㄱ-ㅎ,./→\-]+$/.test(cleaned)) {
      const tokens = cleaned.match(/[ㄱ-ㅎ]/g) || [];
      return tokens.length >= 2 ? tokens.join('-') : null;
    }
  }

  if (/[①-⑳]/.test(arrowNormalized)) {
    const cleaned = arrowNormalized.replace(/\s+/g, '');
    if (/^[①-⑳,./→\-]+$/.test(cleaned)) {
      const tokens = cleaned.match(/[①-⑳]/g) || [];
      return tokens.length >= 2 ? tokens.join('-') : null;
    }
  }

  const compact = arrowNormalized.replace(/\s+/g, '');
  if (/^\d+(?:[,./→\-]\d+)+$/.test(compact)) {
    const tokens = compact.match(/\d+/g) || [];
    return tokens.length >= 2 ? tokens.join('-') : null;
  }

  return null;
}

function normalizeUnorderedSymbolSetAnswer(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const text = raw.replace(/->/g, '→').replace(/\s+/g, '');

  if (/[ㄱ-ㅎ]/.test(text) && /^[ㄱ-ㅎ,./→\-]+$/.test(text)) {
    const tokens = [...new Set(text.match(/[ㄱ-ㅎ]/g) || [])].sort();
    return tokens.length >= 1 ? tokens.join('|') : null;
  }
  if (/[①-⑳]/.test(text) && /^[①-⑳,./→\-]+$/.test(text)) {
    const tokens = [...new Set(text.match(/[①-⑳]/g) || [])].sort();
    return tokens.length >= 1 ? tokens.join('|') : null;
  }
  if (/^\d+(?:[,./→\-]\d+)+$/.test(text) || /^\d+$/.test(text)) {
    const tokens = [...new Set(text.match(/\d+/g) || [])].sort((a, b) => Number(a) - Number(b));
    return tokens.length >= 1 ? tokens.join('|') : null;
  }

  return null;
}

function normalizeLabeledMultiBlankAnswer(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const matches = getLabeledTokenMatches(text);
  if (matches.length < 2) return null;

  const pairs = [];
  const seenLabels = new Set();
  for (let i = 0; i < matches.length; i++) {
    const label = matches[i].label;
    if (seenLabels.has(label)) return null;
    seenLabels.add(label);
    const start = (matches[i].index ?? 0) + matches[i].fullLength;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const rawValue = text.slice(start, end).trim().replace(/[,\s/|]+$/g, '');
    if (!rawValue) continue;
    const normalizedValue = normalizePracticalAnswer(rawValue);
    if (!normalizedValue) continue;
    pairs.push(`${label}:${normalizedValue}`);
  }

  return pairs.length >= 2 ? pairs.join('|') : null;
}

function normalizeLabeledMultiBlankValuesOnly(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const matches = getLabeledTokenMatches(text);
  if (matches.length < 2) return null;

  const values = [];
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + matches[i].fullLength;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const rawValue = text.slice(start, end).trim().replace(/[,\s/|]+$/g, '');
    if (!rawValue) continue;
    const normalizedValue = normalizePracticalAnswer(rawValue);
    if (!normalizedValue) continue;
    values.push(normalizedValue);
  }
  return values.length >= 2 ? values.join('|') : null;
}

function parseLabeledMultiBlankValues(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const matches = getLabeledTokenMatches(text);
  if (matches.length < 2) return null;

  const values = [];
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + matches[i].fullLength;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const rawValue = text.slice(start, end).trim().replace(/[,\s/|]+$/g, '');
    if (!rawValue) continue;
    values.push(rawValue);
  }
  return values.length >= 2 ? values : null;
}

function isLabelBoundaryChar(ch) {
  if (!ch) return true;
  return !/[A-Za-z0-9가-힣]/.test(ch);
}

function findLabelWithBoundary(text, label, fromIndex) {
  // Find `label` in `text` starting at `fromIndex`, but only count occurrences
  // where the character immediately before the label is a boundary (separator
  // or start-of-string). Prevents a label like "가" from matching inside a
  // value like "가격".
  let searchFrom = Math.max(0, fromIndex);
  while (searchFrom <= text.length) {
    const idx = text.indexOf(label, searchFrom);
    if (idx < 0) return -1;
    const prevCh = idx === 0 ? '' : text[idx - 1];
    if (isLabelBoundaryChar(prevCh)) return idx;
    searchFrom = idx + 1;
  }
  return -1;
}

function parseLabeledMultiBlankValuesByKnownLabels(value, labels) {
  if (!Array.isArray(labels) || labels.length < 2) return null;
  const text = String(value ?? '');
  if (!text.trim()) return null;

  const values = [];
  let searchFrom = 0;

  for (let i = 0; i < labels.length; i++) {
    const label = String(labels[i] ?? '');
    if (!label) return null;

    const labelIndex = findLabelWithBoundary(text, label, searchFrom);
    if (labelIndex < 0) return null;

    let valueStart = labelIndex + label.length;
    while (valueStart < text.length && /[\s:：\-.)]/.test(text[valueStart])) valueStart += 1;

    let valueEnd = text.length;
    if (i + 1 < labels.length) {
      const nextLabel = String(labels[i + 1] ?? '');
      const nextIndex = findLabelWithBoundary(text, nextLabel, valueStart);
      if (nextIndex < 0) return null;
      valueEnd = nextIndex;
      searchFrom = nextIndex;
    } else {
      searchFrom = valueStart;
    }

    const raw = text
      .slice(valueStart, valueEnd)
      .trim()
      // Strip leading separators (comma / slash / pipe / open paren).
      .replace(/^[,\/|(]+\s*/g, '')
      // Strip trailing separators — including "(" which is often the
      // opening of the next label like "(나)".
      .replace(/[,\s/|(]+$/g, '');
    values.push(raw);
  }

  if (values.filter(Boolean).length >= labels.length) return values;

  const parts = splitMultiBlankDraft(text, labels).map((v) => String(v ?? '').trim());
  if (parts.filter(Boolean).length < labels.length) return null;
  return parts.map((v) => v.replace(/[,\s/|]+$/g, ''));
}

function buildFlexibleFieldVariants(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return new Set();
  const normalizedRaw = normalizePracticalAnswer(raw);
  const variants = new Set([normalizedRaw]);

  const text = raw.normalize('NFKC').trim();
  const colonIdx = text.search(/[:：]/);
  const head = colonIdx >= 0 ? text.slice(0, colonIdx).trim() : text;
  const tail = colonIdx >= 0 ? text.slice(colonIdx + 1).trim() : '';

  const headNorm = normalizePracticalAnswer(head);
  if (headNorm) variants.add(headNorm);

  const parenMatch = head.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) {
    const left = normalizePracticalAnswer(parenMatch[1]);
    const right = normalizePracticalAnswer(parenMatch[2]);
    if (left) variants.add(left);
    if (right) variants.add(right);
    if (tail) {
      const tailNorm = normalizePracticalAnswer(tail);
      if (left && tailNorm) variants.add(`${left}: ${tailNorm}`);
      if (right && tailNorm) variants.add(`${right}: ${tailNorm}`);
    }
  }

  if (tail) {
    const tailNorm = normalizePracticalAnswer(tail);
    if (headNorm && tailNorm) variants.add(`${headNorm}: ${tailNorm}`);
  }

  for (const part of text.split(/\s*또는\s*/)) {
    const p = normalizePracticalAnswer(part);
    if (p) variants.add(p);
  }

  return variants;
}

function normalizeCommaSeparatedTermSet(value) {
  const text = String(value ?? '').trim();
  if (!text.includes(',')) return null;
  const tokens = text
    .split(',')
    .map((part) => normalizePracticalAnswer(part).replace(/[.)]+$/g, '').trim())
    .filter(Boolean);
  if (tokens.length < 2) return null;
  return [...new Set(tokens)].sort().join('|');
}

function isEquivalentMultiBlankFieldValue(userValue, correctValue) {
  const userVariants = buildFlexibleFieldVariants(userValue);
  const correctVariants = buildFlexibleFieldVariants(correctValue);
  if (userVariants.size === 0 || correctVariants.size === 0) return false;
  for (const v of userVariants) {
    if (correctVariants.has(v)) return true;
  }

  const userCommaSet = normalizeCommaSeparatedTermSet(userValue);
  const correctCommaSet = normalizeCommaSeparatedTermSet(correctValue);
  if (userCommaSet && correctCommaSet && userCommaSet === correctCommaSet) return true;

  const userSymbolSet = normalizeUnorderedSymbolSetAnswer(userValue);
  const correctSymbolSet = normalizeUnorderedSymbolSetAnswer(correctValue);
  if (userSymbolSet && correctSymbolSet && userSymbolSet === correctSymbolSet) return true;

  return false;
}

function buildAcceptedPracticalAnswers(correctAnswer, problem = null) {
  const raw = String(correctAnswer ?? '').trim();
  const accepted = new Set();
  if (raw) accepted.add(raw);

  const explicitAccepted = Array.isArray(problem?.accepted_answers)
    ? problem.accepted_answers
    : [];
  for (const candidate of explicitAccepted) {
    const t = String(candidate ?? '').trim();
    if (t) accepted.add(t);
  }

  if (!raw) {
    return [...accepted].map(normalizePracticalAnswer).filter(Boolean);
  }

  // Split "head (tail)" into two accepted forms, but only when both sides are
  // "simple" content (no nested parens) so SQL subqueries like
  // "SELECT * FROM (SELECT ...)" aren't blown up into misleading candidates.
  const parenMatch = raw.match(/^([^()]+?)\s*\(([^()]+)\)$/);
  if (parenMatch) {
    accepted.add(parenMatch[1].trim());
    accepted.add(parenMatch[2].trim());
  }

  const singleLabeledValues = parseLabeledMultiBlankValues(raw);
  if (singleLabeledValues && singleLabeledValues.length === 1) {
    accepted.add(String(singleLabeledValues[0] ?? '').trim());
  }
  const singleLeadingLabel = raw.match(/^\s*(\([^)]+\)|[①-⑳]|\d+[.)]|[ㄱ-ㅎ가-힣][.:)]?)\s+(.+?)\s*$/);
  if (singleLeadingLabel && singleLeadingLabel[2]) {
    accepted.add(String(singleLeadingLabel[2]).trim());
  }

  raw.split(/\s*또는\s*/).forEach((part) => {
    if (part.trim()) accepted.add(part.trim());
  });

  const symbolChoices = parsePracticalSymbolChoices(problem);
  if (symbolChoices.length > 0) {
    const rawNorm = normalizePracticalAnswer(raw);
    for (const choice of symbolChoices) {
      const labelNorm = normalizePracticalAnswer(choice.label);
      const fullNorm = normalizePracticalAnswer(choice.fullText);
      const altNorm = normalizePracticalAnswer(choice.altText);
      const textNorm = normalizePracticalAnswer(choice.text);
      const isMatch =
        rawNorm === labelNorm ||
        rawNorm === fullNorm ||
        rawNorm === altNorm ||
        rawNorm === textNorm;
      if (!isMatch) continue;
      accepted.add(choice.label);
      accepted.add(choice.fullText);
      accepted.add(choice.altText);
      accepted.add(choice.text);
      accepted.add(`${choice.label}. ${choice.text}`);
      accepted.add(`${choice.label}) ${choice.text}`);
      accepted.add(`${choice.label}: ${choice.text}`);
      break;
    }
  }

  return [...accepted].map(normalizePracticalAnswer).filter(Boolean);
}

function isPracticalAnswerMatch(userAnswer, correctAnswer, problem = null) {
  if (userAnswer == null || userAnswer === UNKNOWN_OPTION) return false;
  const normalizedUser = normalizePracticalAnswer(userAnswer);
  if (!normalizedUser) return false;
  const accepted = buildAcceptedPracticalAnswers(correctAnswer, problem);
  if (accepted.includes(normalizedUser)) return true;

  const practicalType = String(problem?.input_type || '');
  const isExplicitSequenceType =
    practicalType === 'ordered_sequence' || practicalType === 'unordered_symbol_set';
  const seqMetaForProblem =
    (practicalType === 'sequence' || isExplicitSequenceType) ? getSequenceMeta(problem, correctAnswer) : null;

  if (seqMetaForProblem?.mode === 'unordered_symbol_set') {
    const setUser = normalizeUnorderedSymbolSetAnswer(userAnswer);
    if (setUser) {
      const setAccepted = new Set();
      for (const candidate of [String(correctAnswer ?? ''), ...buildAcceptedPracticalAnswers(correctAnswer, problem)]) {
        const normalized = normalizeUnorderedSymbolSetAnswer(candidate);
        if (normalized) setAccepted.add(normalized);
      }
      if (setAccepted.has(setUser)) return true;
    }
  }

  const seqUser = normalizeSequenceLikeAnswer(userAnswer);
  if (seqUser) {
    const seqAccepted = new Set();
    for (const candidate of [String(correctAnswer ?? ''), ...buildAcceptedPracticalAnswers(correctAnswer, problem)]) {
      const normalized = normalizeSequenceLikeAnswer(candidate);
      if (normalized) seqAccepted.add(normalized);
    }
    if (seqAccepted.has(seqUser)) return true;
  }

  const multiUser = normalizeLabeledMultiBlankAnswer(userAnswer);
  if (multiUser) {
    const multiAccepted = new Set();
    for (const candidate of [String(correctAnswer ?? ''), ...buildAcceptedPracticalAnswers(correctAnswer, problem)]) {
      const normalized = normalizeLabeledMultiBlankAnswer(candidate);
      if (normalized) multiAccepted.add(normalized);
    }
    if (multiAccepted.has(multiUser)) return true;
  }

  const multiValuesUser = normalizeLabeledMultiBlankValuesOnly(userAnswer);
  if (multiValuesUser) {
    const multiValuesAccepted = new Set();
    for (const candidate of [String(correctAnswer ?? ''), ...buildAcceptedPracticalAnswers(correctAnswer, problem)]) {
      const normalized = normalizeLabeledMultiBlankValuesOnly(candidate);
      if (normalized) multiValuesAccepted.add(normalized);
    }
    if (multiValuesAccepted.has(multiValuesUser)) return true;
  }

  const parsedUserMulti = parseLabeledMultiBlankValues(userAnswer);
  if (parsedUserMulti) {
    const candidates = [String(correctAnswer ?? ''), ...buildAcceptedPracticalAnswers(correctAnswer, problem)];
    for (const candidate of candidates) {
      const parsedCorrectMulti = parseLabeledMultiBlankValues(candidate);
      if (!parsedCorrectMulti || parsedCorrectMulti.length !== parsedUserMulti.length) continue;
      const allMatched = parsedUserMulti.every((uv, idx) =>
        isEquivalentMultiBlankFieldValue(uv, parsedCorrectMulti[idx])
      );
      if (allMatched) return true;
    }
  }

  const knownMultiLabels = getMultiBlankMeta(problem, correctAnswer)?.labels || [];
  if (knownMultiLabels.length >= 2) {
    const userKnownValues = parseLabeledMultiBlankValuesByKnownLabels(userAnswer, knownMultiLabels);
    if (userKnownValues) {
      const candidates = [String(correctAnswer ?? ''), ...buildAcceptedPracticalAnswers(correctAnswer, problem)];
      for (const candidate of candidates) {
        const correctKnownValues = parseLabeledMultiBlankValuesByKnownLabels(candidate, knownMultiLabels);
        if (!correctKnownValues || correctKnownValues.length !== userKnownValues.length) continue;
        const allMatched = userKnownValues.every((uv, idx) =>
          isEquivalentMultiBlankFieldValue(uv, correctKnownValues[idx])
        );
        if (allMatched) return true;
      }
    }
  }

  return false;
}

function parseLabeledAnswerPairs(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  const tokens = getLabeledTokenMatches(raw);
  if (tokens.length < 2) return null;
  const pairs = [];
  for (let i = 0; i < tokens.length; i++) {
    const start = tokens[i].index + tokens[i].fullLength;
    const end = i + 1 < tokens.length ? tokens[i + 1].index : raw.length;
    const value = raw
      .slice(start, end)
      .trim()
      .replace(/^[-:：]\s*/, '')
      .replace(/[,\/|]\s*$/g, '')
      .trim();
    if (value) pairs.push({ label: tokens[i].label, value });
  }
  return pairs.length >= 2 ? pairs : null;
}

function addReason(arr, reason) {
  if (!arr.includes(reason)) arr.push(reason);
}

function matchWithReasons(userAnswer, correctAnswer, problem) {
  const reasons = [];
  if (userAnswer === null || userAnswer === UNKNOWN_OPTION) return { matched: false, reasons };

  const rawUser = String(userAnswer ?? '').trim();
  const rawCorrect = String(correctAnswer ?? '').trim();
  if (!rawUser) return { matched: false, reasons };

  if (rawUser === rawCorrect) {
    addReason(reasons, 'exact');
    return { matched: true, reasons };
  }

  if (rawUser.toLowerCase() === rawCorrect.toLowerCase()) {
    addReason(reasons, 'case_insensitive');
    return { matched: true, reasons };
  }

  const nu = normalizePracticalAnswer(rawUser);
  const nc = normalizePracticalAnswer(rawCorrect);
  if (nu && nu === nc) {
    addReason(reasons, 'whitespace_ignored');
    addReason(reasons, 'punctuation_ignored');
    return { matched: true, reasons };
  }

  const stripAll = (s) => String(s ?? '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  const su = stripAll(rawUser);
  const sc = stripAll(rawCorrect);
  if (su && su === sc) {
    addReason(reasons, 'whitespace_ignored');
    return { matched: true, reasons };
  }

  const accepted = buildAcceptedPracticalAnswers(rawCorrect, problem);
  for (const candidate of accepted) {
    if (normalizePracticalAnswer(candidate) === nu) {
      addReason(reasons, 'accepted_alternative');
      return { matched: true, reasons };
    }
  }

  const inputType = String(problem?.input_type || '');
  if (inputType === 'unordered_symbol_set' || /(모두\s*고르|모두\s*골라)/.test(String(problem?.question_text || ''))) {
    const ua = normalizeUnorderedSymbolSetAnswer(rawUser);
    const ca = normalizeUnorderedSymbolSetAnswer(rawCorrect);
    if (ua && ua === ca) {
      addReason(reasons, 'order_independent');
      return { matched: true, reasons };
    }
  }

  if (inputType === 'ordered_sequence') {
    const ua = normalizeSequenceLikeAnswer(rawUser);
    const ca = normalizeSequenceLikeAnswer(rawCorrect);
    if (ua && ua === ca) {
      addReason(reasons, 'label_normalized');
      return { matched: true, reasons };
    }
  }

  if (inputType === 'multi_blank') {
    const ua = normalizeLabeledMultiBlankAnswer(rawUser);
    const ca = normalizeLabeledMultiBlankAnswer(rawCorrect);
    if (ua && ua === ca) {
      addReason(reasons, 'label_normalized');
      return { matched: true, reasons };
    }
    const uv = normalizeLabeledMultiBlankValuesOnly(rawUser);
    const cv = normalizeLabeledMultiBlankValuesOnly(rawCorrect);
    if (uv && uv === cv) {
      addReason(reasons, 'label_normalized');
      return { matched: true, reasons };
    }
  }

  // Fall back to legacy matcher to preserve any edge case we didn't enumerate.
  if (isPracticalAnswerMatch(rawUser, rawCorrect, problem)) {
    addReason(reasons, 'accepted_alternative');
    return { matched: true, reasons };
  }

  return { matched: false, reasons: [] };
}

function computeFieldResults(userAnswer, correctAnswer, problem) {
  const inputType = String(problem?.input_type || '');
  if (inputType === 'multi_blank') {
    const explicitLabels = Array.isArray(problem?.input_labels) && problem.input_labels.length
      ? problem.input_labels.map((l) => String(l ?? '').trim()).filter(Boolean)
      : [];
    const labels = explicitLabels.length
      ? explicitLabels
      : getMultiBlankMeta(problem, correctAnswer)?.labels || [];
    if (!labels.length) return undefined;
    const userValues = parseLabeledMultiBlankValuesByKnownLabels(String(userAnswer || ''), labels);
    const correctValues = parseLabeledMultiBlankValuesByKnownLabels(String(correctAnswer || ''), labels);
    if (!userValues && !correctValues) return undefined;
    return labels.map((label, idx) => {
      const u = String((userValues || [])[idx] ?? '').trim();
      const c = String((correctValues || [])[idx] ?? '').trim();
      const sub = matchWithReasons(u, c, { input_type: 'single', accepted_answers: [] });
      return { label, userValue: u, correctValue: c, matched: sub.matched, reasons: sub.reasons };
    });
  }
  if (inputType === 'ordered_sequence') {
    const splitSeq = (v) => {
      const normalized = normalizeSequenceLikeAnswer(String(v || ''));
      if (normalized) return normalized.split('-').map((s) => s.trim()).filter(Boolean);
      // Fallback: raw token split if normalization returned null
      return String(v || '')
        .split(/[,\s→/\-]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    };
    const userTokens = splitSeq(userAnswer);
    const correctTokens = splitSeq(correctAnswer);
    const count = Math.max(userTokens.length, correctTokens.length);
    if (count === 0) return undefined;
    return Array.from({ length: count }).map((_, idx) => {
      const u = userTokens[idx] || '';
      const c = correctTokens[idx] || '';
      const matched = u !== '' && u === c;
      return {
        label: String(idx + 1),
        userValue: u,
        correctValue: c,
        matched,
        reasons: matched ? ['exact'] : [],
      };
    });
  }
  return undefined;
}

function computeMaybeDiff(userAnswer, correctAnswer, inputType) {
  if (inputType !== 'single' && inputType !== 'textarea') return undefined;
  return computeDiff(String(userAnswer ?? ''), String(correctAnswer ?? ''));
}

export function gradePracticalAnswer({ userAnswer, correctAnswer, problem }) {
  const base = matchWithReasons(userAnswer, correctAnswer, problem);
  const inputType = String(problem?.input_type || 'single');
  const fieldResults = computeFieldResults(userAnswer, correctAnswer, problem);
  const diff = computeMaybeDiff(userAnswer, correctAnswer, inputType);
  return { ...base, fieldResults, diff };
}

export { isPracticalAnswerMatch };
