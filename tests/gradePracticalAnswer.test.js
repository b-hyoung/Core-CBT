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
