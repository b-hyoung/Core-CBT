import { describe, it, expect } from 'vitest';
import {
  validateGeneratedProblem,
  isNearDuplicate,
  interleaveByCategory,
  planGenerationBatch,
  parseModelJson,
} from '@/lib/variantGeneration';

const ORIGINAL = {
  question_text: '다음 SQL의 실행 결과를 쓰시오.',
  examples: 'SELECT 학과, COUNT(*) FROM 학생 GROUP BY 학과 HAVING COUNT(*) >= 3;',
  category: 'SQL',
};

const GOOD_GEN = {
  question_text: '다음 SQL을 실행했을 때 조회되는 부서명을 쓰시오.',
  examples: 'SELECT 부서, AVG(급여) FROM 사원 GROUP BY 부서 HAVING AVG(급여) >= 3000;',
  input_type: 'single',
  category: 'SQL',
  subcategory: 'query',
  answer: '영업',
  accepted_answers: ['영업', '영업부'],
  comment: 'HAVING은 그룹 집계 결과를 필터링한다.',
};

describe('validateGeneratedProblem', () => {
  it('정상 생성물은 통과한다', () => {
    expect(validateGeneratedProblem(GOOD_GEN, ORIGINAL).ok).toBe(true);
  });

  it('필수 필드가 비면 거부한다', () => {
    const r = validateGeneratedProblem({ ...GOOD_GEN, answer: ' ' }, ORIGINAL);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('answer');
  });

  it('정답이 문제 본문에 노출되면 거부한다', () => {
    const leaked = { ...GOOD_GEN, question_text: '정답이 영업인 이유를 쓰시오.' };
    expect(validateGeneratedProblem(leaked, ORIGINAL).ok).toBe(false);
  });

  it('한 글자 답은 노출 검사를 건너뛴다 (오탐 방지)', () => {
    const shortAns = { ...GOOD_GEN, answer: '3', accepted_answers: ['3'] };
    expect(validateGeneratedProblem(shortAns, ORIGINAL).ok).toBe(true);
  });

  it('원본과 사실상 동일하면 거부한다', () => {
    const dup = { ...GOOD_GEN, question_text: ORIGINAL.question_text, examples: ORIGINAL.examples };
    expect(validateGeneratedProblem(dup, ORIGINAL).ok).toBe(false);
  });
});

describe('isNearDuplicate', () => {
  it('공백·대소문자만 다른 텍스트는 중복이다', () => {
    expect(isNearDuplicate('SELECT  A FROM B;', 'select a from b;')).toBe(true);
  });
  it('실질적으로 다른 텍스트는 중복이 아니다', () => {
    expect(isNearDuplicate(GOOD_GEN.examples, ORIGINAL.examples)).toBe(false);
  });
});

describe('interleaveByCategory', () => {
  it('같은 카테고리가 3연속을 넘지 않게 섞는다 (가능한 경우)', () => {
    const items = [
      { category: 'SQL' }, { category: 'SQL' }, { category: 'SQL' },
      { category: 'Code' }, { category: 'Code' }, { category: '이론' },
    ];
    const out = interleaveByCategory(items, () => 0);
    expect(out.length).toBe(6);
    for (let i = 0; i < out.length - 2; i += 1) {
      const same3 =
        out[i].category === out[i + 1].category && out[i + 1].category === out[i + 2].category;
      expect(same3).toBe(false);
    }
  });
});

describe('planGenerationBatch', () => {
  it('변형 N + 확장/커버리지 ceil(N×0.25) 구성으로 계획한다', () => {
    const plan = planGenerationBatch({
      wrongs: [
        { sourceSessionId: 'a', sourceProblemNumber: 1 },
        { sourceSessionId: 'a', sourceProblemNumber: 3 },
        { sourceSessionId: 'b', sourceProblemNumber: 1 },
        { sourceSessionId: 'b', sourceProblemNumber: 2 },
      ],
      pendingKeys: new Set(['a:3']), // 이미 pending → 변형 스킵
      tagsMap: { 'a:1': 'SQL-집계그룹', 'a:3': 'SQL-조인', 'b:1': 'SQL-집계그룹', 'b:2': '이론-네트워크' },
      problemIndex: [
        { key: 'a:1', sessionId: 'a', problemNumber: 1, concept: 'SQL-집계그룹', category: 'SQL' },
        { key: 'a:2', sessionId: 'a', problemNumber: 2, concept: 'SQL-집계그룹', category: 'SQL' },
        { key: 'a:3', sessionId: 'a', problemNumber: 3, concept: 'SQL-조인', category: 'SQL' },
        { key: 'b:1', sessionId: 'b', problemNumber: 1, concept: 'SQL-집계그룹', category: 'SQL' },
        { key: 'b:2', sessionId: 'b', problemNumber: 2, concept: '이론-네트워크', category: '이론' },
        { key: 'b:3', sessionId: 'b', problemNumber: 3, concept: 'SQL-DCL권한', category: 'SQL' },
      ],
      attemptedKeys: new Set(['a:1', 'a:3', 'b:1', 'b:2']),
      random: () => 0,
    });
    const variants = plan.filter((p) => p.kind === 'variant');
    const extras = plan.filter((p) => p.kind !== 'variant');
    expect(variants.length).toBe(3); // a:3은 pending이라 제외
    expect(extras.length).toBe(1);   // ceil(3 × 0.25) = 1
    // 확장 후보: 약한 개념(집계그룹 빈도 최다)의 미시도 문제 a:2
    expect(extras[0].key).toBe('a:2');
  });
});

describe('parseModelJson', () => {
  it('코드펜스로 감싼 JSON도 파싱한다', () => {
    const text = '```json\n{"answer": "영업"}\n```';
    expect(parseModelJson(text)).toEqual({ answer: '영업' });
  });
  it('파싱 불가면 null을 반환한다', () => {
    expect(parseModelJson('말로 된 답변')).toBe(null);
  });
});
