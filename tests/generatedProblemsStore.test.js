import { describe, it, expect } from 'vitest';
import { toQuizProblem } from '@/lib/generatedProblemsStore';

const ROW = {
  id: 'uuid-1',
  user_email: 'me@test.com',
  source_session_id: 'practical-industrial-2024-1',
  source_problem_number: 7,
  kind: 'variant',
  concept_tag: 'SQL-집계그룹',
  problem: {
    question_text: '다음 SQL의 실행 결과를 쓰시오.',
    examples: 'SELECT 부서, AVG(급여) FROM 사원 GROUP BY 부서;',
    input_type: 'single',
    category: 'SQL',
    subcategory: 'query',
  },
  answer: '영업',
  accepted_answers: ['영업', '영업부'],
  comment: 'GROUP BY는 부서별로 묶는다.',
};

describe('toQuizProblem', () => {
  it('row를 PracticalQuizV2 주입용 문제 객체로 변환한다', () => {
    const p = toQuizProblem(ROW, 3);
    expect(p.problem_number).toBe(3);
    expect(p.question_text).toBe(ROW.problem.question_text);
    expect(p.accepted_answers).toEqual(['영업', '영업부']);
    expect(p.originSessionId).toBe('practical-industrial-2024-1');
    expect(p.originProblemNumber).toBe(7);
    expect(p.sectionTitle).toBe('오늘의 복습');
    expect(p.category).toBe('SQL');
  });

  it('accepted_answers가 비어 있으면 answer로 채운다', () => {
    const p = toQuizProblem({ ...ROW, accepted_answers: [] }, 1);
    expect(p.accepted_answers).toEqual(['영업']);
  });
});
