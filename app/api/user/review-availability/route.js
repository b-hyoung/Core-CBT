import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { classifySessionId, normalizeExamType } from '@/lib/examType';
import { getUserUnknownProblems, getUserWrongProblems } from '@/lib/userProblemsStore';
import {
  readEvents,
  readProblemOutcomes,
  aggregateProblemWrongRates,
  aggregateProblemWrongRatesFromOutcomes,
  aggregateProblemUnknownRates,
  aggregateProblemUnknownRatesFromOutcomes,
} from '@/lib/analyticsStore';

export const dynamic = 'force-dynamic';

function matchesExamType(sourceSessionId, examType) {
  return classifySessionId(sourceSessionId) === examType;
}

function isWrittenUtilityCandidate(sourceSessionId) {
  const sid = String(sourceSessionId || '').trim();
  if (!sid) return false;
  if (!matchesExamType(sid, 'written')) return false;
  return sid !== 'random' && sid !== 'random22' && sid !== 'unknown';
}

async function getReviewCounts(userEmail, examType) {
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

async function getUtilityAvailability(examType) {
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

export async function GET(request) {
  const session = await auth();
  const userEmail = String(session?.user?.email || '').trim().toLowerCase();

  if (!userEmail) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const examType = normalizeExamType(searchParams.get('examType'));

  if (!['written', 'practical', 'sqld', 'aiprompt'].includes(examType)) {
    return NextResponse.json({ ok: false, message: 'invalid examType' }, { status: 400 });
  }

  try {
    const [review, utility] = await Promise.all([
      getReviewCounts(userEmail, examType),
      getUtilityAvailability(examType),
    ]);

    return NextResponse.json({
      ok: true,
      authenticated: true,
      examType,
      review,
      utility,
    });
  } catch {
    return NextResponse.json({ ok: false, message: 'failed to load availability' }, { status: 500 });
  }
}
