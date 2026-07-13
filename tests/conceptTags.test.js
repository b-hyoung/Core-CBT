import { describe, it, expect } from 'vitest';
import { pickExpansionAnchors, pickCoverageAnchors } from '@/lib/conceptTags';

// problemIndex: 기출 전체 [{ key, sessionId, problemNumber, concept, category }]
const INDEX = [
  { key: 'a:1', sessionId: 'a', problemNumber: 1, concept: 'SQL-집계그룹', category: 'SQL' },
  { key: 'a:2', sessionId: 'a', problemNumber: 2, concept: 'SQL-집계그룹', category: 'SQL' },
  { key: 'a:3', sessionId: 'a', problemNumber: 3, concept: 'SQL-DCL권한', category: 'SQL' },
  { key: 'b:1', sessionId: 'b', problemNumber: 1, concept: 'SQL-조인', category: 'SQL' },
  { key: 'b:2', sessionId: 'b', problemNumber: 2, concept: '이론-네트워크', category: '이론' },
];

describe('pickExpansionAnchors', () => {
  it('약한 개념의 미시도 문제를 뽑는다 (오답 원본·pending 제외)', () => {
    const picked = pickExpansionAnchors({
      weakConcepts: ['SQL-집계그룹'],
      problemIndex: INDEX,
      attemptedKeys: new Set(['a:1']),   // a:1은 이미 풀었음(오답)
      excludeKeys: new Set(['a:1']),     // 오답 원본은 변형 슬롯이 담당
      count: 2,
    });
    // 같은 개념(집계그룹)의 안 푼 문제는 a:2 뿐
    expect(picked.map((p) => p.key)).toEqual(['a:2']);
  });
});

describe('pickCoverageAnchors', () => {
  it('한 번도 시도 안 한 개념을 우선한다', () => {
    const picked = pickCoverageAnchors({
      problemIndex: INDEX,
      attemptedKeys: new Set(['a:1', 'a:2']), // 집계그룹은 시도됨
      excludeKeys: new Set(),
      count: 2,
      random: () => 0, // 결정론적 테스트용
    });
    const concepts = picked.map((p) => p.concept);
    // 미시도 개념(DCL권한, 조인, 이론-네트워크)에서만 뽑힘
    expect(concepts).not.toContain('SQL-집계그룹');
    expect(picked.length).toBe(2);
  });

  it('개념당 1문제씩 라운드로빈으로 뽑는다', () => {
    const picked = pickCoverageAnchors({
      problemIndex: INDEX,
      attemptedKeys: new Set(),
      excludeKeys: new Set(),
      count: 3,
      random: () => 0,
    });
    const conceptSet = new Set(picked.map((p) => p.concept));
    expect(conceptSet.size).toBe(3); // 서로 다른 개념 3개
  });
});
