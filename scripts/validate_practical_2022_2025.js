const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BASE = path.join(ROOT, 'datasets', 'practicalIndustrial');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function flattenProblemFile(data) {
  if (!Array.isArray(data)) return [];
  if (data.length > 0 && Array.isArray(data[0]?.problems)) {
    return data.flatMap((s) => Array.isArray(s.problems) ? s.problems : []);
  }
  return data;
}

function flattenAnswerFile(data) {
  if (!Array.isArray(data)) return [];
  if (data.length > 0 && Array.isArray(data[0]?.answers)) {
    return data.flatMap((s) => Array.isArray(s.answers) ? s.answers : []);
  }
  return data;
}

function flattenCommentFile(data) {
  if (!Array.isArray(data)) return [];
  if (data.length > 0 && Array.isArray(data[0]?.comments)) {
    return data.flatMap((s) => Array.isArray(s.comments) ? s.comments : []);
  }
  return data;
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

function getLabeledTokenMatches(text) {
  const target = String(text ?? '').trim();
  if (!target) return [];
  const labelCore = '(\\([가-힣]\\)|[가나다라마바사아자차카타파하]|[①-⑳]|[ㄱ-ㅎ]|\\d+\\)|\\d+\\.)';
  const pattern = new RegExp(`(^|[\\s,\\/|])${labelCore}(?:\\s*[:：-]\\s*|\\s+(?=[^,\\/|\\s]))`, 'g');
  const matches = [];
  let m;
  while ((m = pattern.exec(target)) !== null) {
    const prefix = m[1] || '';
    matches.push({ label: m[2], index: (m.index ?? 0) + prefix.length, fullLength: m[0].length - prefix.length });
  }
  return matches;
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
    const rawValue = text.slice(start, end).trim().replace(/[,\s]+$/g, '');
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
    const rawValue = text.slice(start, end).trim().replace(/[,\s]+$/g, '');
    if (!rawValue) continue;
    const normalizedValue = normalizePracticalAnswer(rawValue);
    if (!normalizedValue) continue;
    values.push(normalizedValue);
  }
  return values.length >= 2 ? values.join('|') : null;
}

function buildAcceptedPracticalAnswers(correctAnswer) {
  const raw = String(correctAnswer ?? '').trim();
  if (!raw) return [];
  const accepted = new Set([raw]);
  const parenMatch = raw.match(/^(.+?)\s*\((.+)\)$/);
  if (parenMatch) {
    accepted.add(parenMatch[1].trim());
    accepted.add(parenMatch[2].trim());
  }
  raw.split(/\s*또는\s*/).forEach((part) => {
    if (part.trim()) accepted.add(part.trim());
  });
  return [...accepted].map(normalizePracticalAnswer).filter(Boolean);
}

function isPracticalAnswerMatch(userAnswer, correctAnswer) {
  if (userAnswer == null) return false;
  const normalizedUser = normalizePracticalAnswer(userAnswer);
  if (!normalizedUser) return false;
  const accepted = buildAcceptedPracticalAnswers(correctAnswer);
  if (accepted.includes(normalizedUser)) return true;

  const seqUser = normalizeSequenceLikeAnswer(userAnswer);
  if (seqUser) {
    const seqAccepted = new Set();
    for (const candidate of [String(correctAnswer ?? ''), ...buildAcceptedPracticalAnswers(correctAnswer)]) {
      const normalized = normalizeSequenceLikeAnswer(candidate);
      if (normalized) seqAccepted.add(normalized);
    }
    if (seqAccepted.has(seqUser)) return true;
  }

  const multiUser = normalizeLabeledMultiBlankAnswer(userAnswer);
  if (multiUser) {
    const multiAccepted = new Set();
    for (const candidate of [String(correctAnswer ?? ''), ...buildAcceptedPracticalAnswers(correctAnswer)]) {
      const normalized = normalizeLabeledMultiBlankAnswer(candidate);
      if (normalized) multiAccepted.add(normalized);
    }
    if (multiAccepted.has(multiUser)) return true;
  }

  const multiValuesUser = normalizeLabeledMultiBlankValuesOnly(userAnswer);
  if (multiValuesUser) {
    const multiValuesAccepted = new Set();
    for (const candidate of [String(correctAnswer ?? ''), ...buildAcceptedPracticalAnswers(correctAnswer)]) {
      const normalized = normalizeLabeledMultiBlankValuesOnly(candidate);
      if (normalized) multiValuesAccepted.add(normalized);
    }
    if (multiValuesAccepted.has(multiValuesUser)) return true;
  }
  return false;
}

function getSequenceMeta(problem) {
  const examples = String(problem?.examples ?? '');
  const lines = examples.split(/\r?\n/);
  const markers = [];
  for (const line of lines) {
    const m = line.match(/^\s*([ㄱ-ㅎ]|[①-⑳]|\d+)\s*[.)]\s*/);
    if (m) markers.push(m[1]);
  }
  const first = markers[0] || '';
  const kind = /[ㄱ-ㅎ]/.test(first)
    ? 'korean_jamo'
    : /[①-⑳]/.test(first)
      ? 'circled'
      : /^\d+$/.test(first)
        ? 'number'
        : 'generic';
  return { count: Math.min(Math.max(markers.length || 4, 2), 10), kind };
}

function getMultiBlankMeta(problem, correctAnswer = '') {
  const source = `${String(problem?.question_text ?? '')}\n${String(problem?.examples ?? '')}`;
  const lines = source.split(/\r?\n/);
  const labels = [];
  const seen = new Set();
  for (const line of lines) {
    const m = line.match(/^\s*(\([가-힣]\)|[①-⑳]|[ㄱ-ㅎ]|\d+\)|\d+\.)\s*/);
    if (!m) continue;
    const label = m[1];
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
  if (answerLabels.length >= 2) return { labels: answerLabels.slice(0, 10) };
  if (labels.length === 0) return { labels: ['①', '②'] };
  return { labels: labels.slice(0, 10) };
}

function extractSequenceTokens(value) {
  const raw = String(value ?? '');
  const byJamo = raw.match(/[ㄱ-ㅎ]/g);
  if (byJamo && byJamo.length >= 2) return byJamo;
  const byCircled = raw.match(/[①-⑳]/g);
  if (byCircled && byCircled.length >= 2) return byCircled;
  const byNum = raw.match(/\d+/g);
  if (byNum && byNum.length >= 2) return byNum;
  return [];
}

function extractLabeledValues(value) {
  const text = String(value ?? '').trim();
  const matches = getLabeledTokenMatches(text);
  if (matches.length < 2) return [];
  const values = [];
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + matches[i].fullLength;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const v = text.slice(start, end).trim().replace(/[,\s]+$/g, '');
    values.push(v);
  }
  return values;
}

function simulateUiAnswer(problem, correctAnswer) {
  const type = String(problem.input_type || 'single');
  if (type === 'sequence') {
    const tokens = extractSequenceTokens(correctAnswer);
    return tokens.length ? tokens.join('-') : correctAnswer;
  }
  if (type === 'multi_blank') {
    const values = extractLabeledValues(correctAnswer);
    const labels = getMultiBlankMeta(problem, correctAnswer).labels;
    if (values.length >= 2) {
      return labels.map((label, i) => `${label} ${String(values[i] || '').trim()}`.trim()).join(' ');
    }
    return correctAnswer;
  }
  return correctAnswer;
}

function textHasBad(str) {
  const s = String(str ?? '');
  return s.includes('\uFFFD') || /\?{3,}/.test(s);
}

function collectPracticalSets() {
  return fs.readdirSync(BASE, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function main() {
  const sets = collectPracticalSets();
  const failures = [];
  const warnings = [];
  const dupMap = new Map();
  let totalProblems = 0;

  for (const setName of sets) {
    const dir = path.join(BASE, setName);
    const problems = flattenProblemFile(readJson(path.join(dir, 'problem1.json')));
    const answers = flattenAnswerFile(readJson(path.join(dir, 'answer1.json')));
    const comments = flattenCommentFile(readJson(path.join(dir, 'comment1.json')));

    if (!(problems.length === answers.length && answers.length === comments.length)) {
      failures.push({ setName, type: 'count_mismatch', counts: [problems.length, answers.length, comments.length] });
    }

    const answerMap = new Map(answers.map((a) => [String(a.problem_number), String(a.correct_answer_text ?? '')]));
    const commentMap = new Map(comments.map((c) => [String(c.problem_number), String(c.comment ?? '')]));

    for (const p of problems) {
      totalProblems += 1;
      const pn = String(p.problem_number);
      const q = String(p.question_text ?? '');
      const ex = String(p.examples ?? '');
      const ans = answerMap.get(pn) || '';
      const com = commentMap.get(pn) || '';
      const type = String(p.input_type || '');
      const hint = String(p.answer_format_hint || '');

      if (!type) failures.push({ setName, pn, type: 'missing_input_type' });
      if (Array.isArray(p.options) && p.options.length) failures.push({ setName, pn, type: 'options_leak' });
      if (!ans.trim()) failures.push({ setName, pn, type: 'missing_answer' });
      if (textHasBad(q) || textHasBad(ex) || textHasBad(ans) || textHasBad(com)) {
        failures.push({ setName, pn, type: 'bad_text', q, ex, ans, com });
      }

      if (hint && normalizePracticalAnswer(hint).includes(normalizePracticalAnswer(ans)) && normalizePracticalAnswer(ans).length >= 2) {
        failures.push({ setName, pn, type: 'hint_leaks_answer', hint, ans });
      }

      const simulated = simulateUiAnswer(p, ans);
      const ok = isPracticalAnswerMatch(simulated, ans);
      if (!ok) {
        failures.push({ setName, pn, type: 'matcher_fail', inputType: type, ans, simulated });
      }

      const key = normalizePracticalAnswer(`${q}\n${ex}`);
      if (key) {
        const row = dupMap.get(key) || [];
        row.push({ setName, pn, type, hint, ans });
        dupMap.set(key, row);
      }
    }
  }

  for (const [_, list] of dupMap) {
    if (list.length < 2) continue;
    const typeSet = new Set(list.map((v) => v.type));
    if (typeSet.size > 1) {
      warnings.push({ type: 'duplicate_input_type_mismatch', list });
    }
  }

  console.log(`Practical sets: ${sets.length}`);
  console.log(`Total problems: ${totalProblems}`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (failures.length) {
    console.log('\n[FAILURES]');
    for (const f of failures.slice(0, 200)) {
      console.log(JSON.stringify(f, null, 2));
    }
  }
  if (warnings.length) {
    console.log('\n[WARNINGS]');
    for (const w of warnings.slice(0, 50)) {
      console.log(JSON.stringify(w, null, 2));
    }
  }

  if (failures.length) process.exitCode = 1;
}

main();
