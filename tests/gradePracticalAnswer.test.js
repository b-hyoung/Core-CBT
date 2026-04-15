import { describe, it, expect } from 'vitest';
import { gradePracticalAnswer } from '@/app/practical/[sessionId]/_lib/gradePracticalAnswer';

const problem = (over = {}) => ({
  input_type: 'single',
  accepted_answers: [],
  examples: '',
  question_text: '',
  input_labels: undefined,
  ...over,
});

describe('gradePracticalAnswer - single', () => {
  it('exact match', () => {
    const r = gradePracticalAnswer({ userAnswer: 'HTTP', correctAnswer: 'HTTP', problem: problem() });
    expect(r.matched).toBe(true);
    expect(r.reasons).toContain('exact');
  });
  it('case insensitive', () => {
    const r = gradePracticalAnswer({ userAnswer: 'http', correctAnswer: 'HTTP', problem: problem() });
    expect(r.matched).toBe(true);
    expect(r.reasons).toContain('case_insensitive');
  });
  it('whitespace ignored', () => {
    const r = gradePracticalAnswer({ userAnswer: '  H T T P ', correctAnswer: 'HTTP', problem: problem() });
    expect(r.matched).toBe(true);
    expect(r.reasons).toEqual(expect.arrayContaining(['whitespace_ignored']));
  });
  it('accepted_alternative', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'HyperText Transfer Protocol',
      correctAnswer: 'HTTP',
      problem: problem({ accepted_answers: ['HyperText Transfer Protocol'] }),
    });
    expect(r.matched).toBe(true);
    expect(r.reasons).toContain('accepted_alternative');
  });
  it('no match', () => {
    const r = gradePracticalAnswer({ userAnswer: 'FTP', correctAnswer: 'HTTP', problem: problem() });
    expect(r.matched).toBe(false);
    expect(r.reasons).toEqual([]);
  });
  it('rejects UNKNOWN_OPTION', () => {
    const r = gradePracticalAnswer({ userAnswer: '__UNKNOWN_OPTION__', correctAnswer: 'HTTP', problem: problem() });
    expect(r.matched).toBe(false);
  });
});

describe('P1 grading fixes', () => {
  it('#4 multi_blank label boundary: does not confuse 가 with 가격', () => {
    const r = gradePracticalAnswer({
      userAnswer: '가: 가격 나: 수량',
      correctAnswer: '가: 가격 나: 수량',
      problem: { input_type: 'multi_blank', accepted_answers: [], input_labels: ['가', '나'], examples: '', question_text: '' },
    });
    expect(r.matched).toBe(true);
  });

  it('#5 ordered_sequence derives count from correct answer when examples have no markers', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'ㄱ, ㄴ',
      correctAnswer: 'ㄱ, ㄴ',
      problem: { input_type: 'ordered_sequence', accepted_answers: [], examples: '', question_text: '' },
    });
    expect(r.matched).toBe(true);
  });

  it('#6 multi_blank parses labels without surrounding whitespace (카디널리티:4)', () => {
    const r = gradePracticalAnswer({
      userAnswer: '차수:3,카디널리티:4',
      correctAnswer: '차수: 3 카디널리티: 4',
      problem: { input_type: 'multi_blank', accepted_answers: [], input_labels: ['차수', '카디널리티'], examples: '', question_text: '' },
    });
    expect(r.matched).toBe(true);
  });

  it('#8 buildAcceptedPracticalAnswers does not split SQL subqueries', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'SELECT * FROM (SELECT id FROM t)',
      correctAnswer: 'SELECT * FROM (SELECT id FROM t)',
      problem: { input_type: 'textarea', accepted_answers: [], examples: '', question_text: '' },
    });
    expect(r.matched).toBe(true);
    expect(r.reasons).toContain('exact');
  });
});

describe('gradePracticalAnswer - fieldResults & diff', () => {
  it('produces per-label results for multi_blank', () => {
    const r = gradePracticalAnswer({
      userAnswer: '① 3 ② 5',
      correctAnswer: '① 3 ② 4',
      problem: { input_type: 'multi_blank', accepted_answers: [], input_labels: ['①', '②'], examples: '', question_text: '' },
    });
    expect(r.fieldResults).toHaveLength(2);
    expect(r.fieldResults[0]).toMatchObject({ label: '①', matched: true });
    expect(r.fieldResults[1]).toMatchObject({ label: '②', matched: false });
  });

  it('produces per-slot results for ordered_sequence', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'ㄱ, ㄷ, ㄴ',
      correctAnswer: 'ㄱ, ㄴ, ㄷ',
      problem: { input_type: 'ordered_sequence', accepted_answers: [], examples: '', question_text: '' },
    });
    expect(r.fieldResults).toHaveLength(3);
    expect(r.fieldResults[0].matched).toBe(true);
    expect(r.fieldResults[1].matched).toBe(false);
    expect(r.fieldResults[2].matched).toBe(false);
  });

  it('includes diff for single', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'HTTPS',
      correctAnswer: 'HTTP',
      problem: { input_type: 'single', accepted_answers: [], examples: '', question_text: '' },
    });
    expect(r.diff).toBeDefined();
    expect(r.diff.segments.some((s) => s.type !== 'equal')).toBe(true);
  });

  it('includes diff for textarea', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'result',
      correctAnswer: 'result2',
      problem: { input_type: 'textarea', accepted_answers: [], examples: '', question_text: '' },
    });
    expect(r.diff).toBeDefined();
  });

  it('omits diff for multi_blank', () => {
    const r = gradePracticalAnswer({
      userAnswer: '가: 1 나: 2',
      correctAnswer: '가: 1 나: 2',
      problem: { input_type: 'multi_blank', accepted_answers: [], input_labels: ['가', '나'], examples: '', question_text: '' },
    });
    expect(r.diff).toBeUndefined();
  });
});

describe('gradePracticalAnswer - unordered_symbol_set', () => {
  it('matches regardless of order', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'ㄴ, ㄱ',
      correctAnswer: 'ㄱ, ㄴ',
      problem: problem({ input_type: 'unordered_symbol_set' }),
    });
    expect(r.matched).toBe(true);
    expect(r.reasons).toContain('order_independent');
  });
  it('rejects with extra symbol', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'ㄱ, ㄴ, ㄷ',
      correctAnswer: 'ㄱ, ㄴ',
      problem: problem({ input_type: 'unordered_symbol_set' }),
    });
    expect(r.matched).toBe(false);
  });
});
