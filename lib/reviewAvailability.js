import { classifySessionId } from '@/lib/examType';
import { getUserUnknownProblems, getUserWrongProblems } from '@/lib/userProblemsStore';
import {
  readEvents,
  readProblemOutcomes,
  aggregateProblemWrongRates,
  aggregateProblemWrongRatesFromOutcomes,
  aggregateProblemUnknownRates,
  aggregateProblemUnknownRatesFromOutcomes,
} from '@/lib/analyticsStore';

function matchesExamType(sourceSessionId, examType) {
  return classifySessionId(sourceSessionId) === examType;
}

function isWrittenUtilityCandidate(sourceSessionId) {
  const sid = String(sourceSessionId || '').trim();
  if (!sid) return false;
  if (!matchesExamType(sid, 'written')) return false;
  return sid !== 'random' && sid !== 'random22' && sid !== 'unknown';
}

export async function getReviewAvailabilityForUser(userEmail, examType) {
  if (!userEmail) {
    return {
      wrongCount: 0,
      unknownCount: 0,
      wrongAvailable: false,
      unknownAvailable: false,
    };
  }

  const [wrongRows, unknownRows] = await Promise.all([
    getUserWrongProblems(userEmail),
    getUserUnknownProblems(userEmail),
  ]);

  const wrongCount = wrongRows.filter((row) => matchesExamType(row.sourceSessionId, examType)).length;
  const unknownCount = unknownRows.filter((row) => matchesExamType(row.sourceSessionId, examType)).length;

  return {
    wrongCount,
    unknownCount,
    wrongAvailable: wrongCount > 0,
    unknownAvailable: unknownCount > 0,
  };
}

export async function getUtilityAvailability(examType) {
  if (examType !== 'written' && examType !== 'practical') {
    return null;
  }

  const problemOutcomes = await readProblemOutcomes();

  const wrongRowsFromOutcomesMin2 = aggregateProblemWrongRatesFromOutcomes(problemOutcomes, { minAttempts: 2 });
  const wrongRowsFromOutcomes =
    wrongRowsFromOutcomesMin2.length > 0
      ? wrongRowsFromOutcomesMin2
      : aggregateProblemWrongRatesFromOutcomes(problemOutcomes, { minAttempts: 1 });

  const unknownRowsFromOutcomesMin2 = aggregateProblemUnknownRatesFromOutcomes(problemOutcomes, { minAttempts: 2 });
  const unknownRowsFromOutcomes =
    unknownRowsFromOutcomesMin2.length > 0
      ? unknownRowsFromOutcomesMin2
      : aggregateProblemUnknownRatesFromOutcomes(problemOutcomes, { minAttempts: 1 });

  let wrongRows = wrongRowsFromOutcomes;
  let unknownRows = unknownRowsFromOutcomes;

  if (wrongRows.length === 0 || unknownRows.length === 0) {
    const events = await readEvents();
    if (wrongRows.length === 0) {
      const legacyWrongMin2 = aggregateProblemWrongRates(events, { minAttempts: 2 });
      wrongRows = legacyWrongMin2.length > 0 ? legacyWrongMin2 : aggregateProblemWrongRates(events, { minAttempts: 1 });
    }
    if (unknownRows.length === 0) {
      const legacyUnknownMin2 = aggregateProblemUnknownRates(events, { minAttempts: 2 });
      unknownRows =
        legacyUnknownMin2.length > 0
          ? legacyUnknownMin2
          : aggregateProblemUnknownRates(events, { minAttempts: 1 });
    }
  }

  const filterFn =
    examType === 'practical'
      ? (row) => matchesExamType(row?.sourceSessionId, 'practical')
      : (row) => isWrittenUtilityCandidate(row?.sourceSessionId);

  const highWrongCount = wrongRows.filter(filterFn).length;
  const highUnknownCount = unknownRows.filter(filterFn).length;

  return {
    highWrongCount,
    highUnknownCount,
    highWrongAvailable: highWrongCount > 0,
    highUnknownAvailable: highUnknownCount > 0,
  };
}
