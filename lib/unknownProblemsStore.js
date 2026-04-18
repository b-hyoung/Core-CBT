export const UNKNOWN_PROBLEMS_STORAGE_KEY = 'quiz_unknown_problems_v1';

function safeParse(jsonText) {
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

export function makeUnknownProblemKey(sourceSessionId, sourceProblemNumber) {
  return `${String(sourceSessionId || '')}:${Number(sourceProblemNumber || 0)}`;
}

export function readUnknownProblems() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(UNKNOWN_PROBLEMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = safeParse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((it) => ({
        key: String(it?.key || makeUnknownProblemKey(it?.sourceSessionId, it?.sourceProblemNumber)),
        sourceSessionId: String(it?.sourceSessionId || ''),
        sourceProblemNumber: Number(it?.sourceProblemNumber || 0),
        sourceKey: String(it?.sourceKey || ''),
        questionText: String(it?.questionText || ''),
        sectionTitle: String(it?.sectionTitle || ''),
        updatedAt: Number(it?.updatedAt || Date.now()),
      }))
      .filter((it) => it.sourceSessionId && Number.isFinite(it.sourceProblemNumber) && it.sourceProblemNumber > 0);
  } catch {
    return [];
  }
}

export function writeUnknownProblems(items) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(UNKNOWN_PROBLEMS_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function upsertUnknownProblem(entry) {
  if (typeof window === 'undefined') return [];
  const sourceSessionId = String(entry?.sourceSessionId || '');
  const sourceProblemNumber = Number(entry?.sourceProblemNumber || 0);
  if (!sourceSessionId || !Number.isFinite(sourceProblemNumber) || sourceProblemNumber <= 0) {
    return readUnknownProblems();
  }

  const key = makeUnknownProblemKey(sourceSessionId, sourceProblemNumber);
  const nextItem = {
    key,
    sourceSessionId,
    sourceProblemNumber,
    sourceKey: String(entry?.sourceKey || ''),
    questionText: String(entry?.questionText || ''),
    sectionTitle: String(entry?.sectionTitle || ''),
    updatedAt: Date.now(),
  };

  const current = readUnknownProblems();
  const filtered = current.filter((it) => it.key !== key);
  const next = [nextItem, ...filtered].sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  writeUnknownProblems(next);
  return next;
}

export function removeUnknownProblem(sourceSessionId, sourceProblemNumber) {
  if (typeof window === 'undefined') return [];
  const key = makeUnknownProblemKey(sourceSessionId, sourceProblemNumber);
  const current = readUnknownProblems();
  const next = current.filter((it) => it.key !== key);
  writeUnknownProblems(next);
  return next;
}

