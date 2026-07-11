import { describe, it, expect } from 'vitest';
import {
  aggregateProblemWrongRatesFromOutcomes,
  aggregateProblemUnknownRatesFromOutcomes,
  rankProblemWrongRatesFromStats,
  rankProblemUnknownRatesFromStats,
} from '@/lib/analyticsStore';

// problem_outcome_stats 뷰가 SQL에서 계산하는 것과 동일한 그룹핑을 재현한다.
// 뷰 행(camelCase 매핑 후)은 rank*FromStats 입력 형태가 된다.
function statsFromOutcomes(outcomes) {
  const map = new Map();
  for (const o of outcomes) {
    const sourceSessionId = String(o?.sourceSessionId || '').trim();
    const sourceProblemNumber = Number(o?.sourceProblemNumber);
    if (!sourceSessionId || !Number.isFinite(sourceProblemNumber) || sourceProblemNumber <= 0) continue;
    const key = `${sourceSessionId}:${sourceProblemNumber}`;
    if (!map.has(key)) {
      map.set(key, {
        sourceSessionId,
        sourceProblemNumber,
        attempts: 0,
        wrong: 0,
        correct: 0,
        unknown: 0,
        lastSeenAt: '',
      });
    }
    const row = map.get(key);
    row.attempts += 1;
    if (o.isCorrect) row.correct += 1;
    else row.wrong += 1;
    if (o.isUnknown) row.unknown += 1;
    const ts = String(o?.timestamp || '');
    if (ts && ts > row.lastSeenAt) row.lastSeenAt = ts;
  }
  return Array.from(map.values());
}

const outcome = (sid, num, isCorrect, isUnknown, timestamp) => ({
  sourceSessionId: sid,
  sourceProblemNumber: num,
  isCorrect,
  isUnknown,
  timestamp,
});

const FIXTURE = [
  outcome('practical-2024-1', 1, false, false, '2026-01-01T00:00:00.000Z'),
  outcome('practical-2024-1', 1, false, true, '2026-01-03T00:00:00.000Z'),
  outcome('practical-2024-1', 1, true, false, '2026-01-02T00:00:00.000Z'),
  outcome('practical-2024-1', 2, true, false, '2026-01-01T00:00:00.000Z'),
  outcome('practical-2024-2', 5, false, true, '2026-01-05T00:00:00.000Z'),
  outcome('practical-2024-2', 5, false, true, '2026-01-04T00:00:00.000Z'),
  outcome('1', 10, false, false, '2026-01-06T00:00:00.000Z'),
  // 동률 정렬 tiebreak 검증용: wrongRate 100% 동률, attempts 차이
  outcome('practical-2023-1', 3, false, false, '2026-01-07T00:00:00.000Z'),
];

describe('rankProblemWrongRatesFromStats', () => {
  it('집계 뷰 행으로부터 aggregateProblemWrongRatesFromOutcomes와 동일한 결과를 만든다', () => {
    const stats = statsFromOutcomes(FIXTURE);
    for (const minAttempts of [1, 2]) {
      expect(rankProblemWrongRatesFromStats(stats, { minAttempts })).toEqual(
        aggregateProblemWrongRatesFromOutcomes(FIXTURE, { minAttempts }),
      );
    }
  });

  it('세션 ID가 비었거나 문제 번호가 0 이하인 행은 제외한다', () => {
    const stats = [
      { sourceSessionId: '', sourceProblemNumber: 1, attempts: 3, wrong: 3, correct: 0, unknown: 0, lastSeenAt: '' },
      { sourceSessionId: 'practical-2024-1', sourceProblemNumber: 0, attempts: 3, wrong: 3, correct: 0, unknown: 0, lastSeenAt: '' },
      { sourceSessionId: 'practical-2024-1', sourceProblemNumber: 1, attempts: 2, wrong: 1, correct: 1, unknown: 0, lastSeenAt: '2026-01-01T00:00:00.000Z' },
    ];
    const rows = rankProblemWrongRatesFromStats(stats);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe('practical-2024-1:1');
    expect(rows[0].wrongRate).toBe(50);
  });

  it('빈 입력이면 빈 배열을 돌려준다', () => {
    expect(rankProblemWrongRatesFromStats([])).toEqual([]);
    expect(rankProblemWrongRatesFromStats(null)).toEqual([]);
  });
});

describe('rankProblemUnknownRatesFromStats', () => {
  it('집계 뷰 행으로부터 aggregateProblemUnknownRatesFromOutcomes와 동일한 결과를 만든다', () => {
    const stats = statsFromOutcomes(FIXTURE);
    for (const minAttempts of [1, 2]) {
      expect(rankProblemUnknownRatesFromStats(stats, { minAttempts })).toEqual(
        aggregateProblemUnknownRatesFromOutcomes(FIXTURE, { minAttempts }),
      );
    }
  });

  it('minAttempts 미만 문제는 제외한다', () => {
    const stats = statsFromOutcomes(FIXTURE);
    const rows = rankProblemUnknownRatesFromStats(stats, { minAttempts: 3 });
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe('practical-2024-1:1');
  });
});
