import { describe, it, expect } from 'vitest';
import { inferAnswerFormat } from '@/app/practical/[sessionId]/_lib/inferAnswerFormat';

describe('inferAnswerFormat', () => {
  it('recognizes fixed-length uppercase English', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, 'HTTP')).toBe('영문 대문자 4글자');
  });
  it('recognizes uppercase English without fixed length', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, 'APPLICATION')).toBe('영문 대문자');
  });
  it('recognizes numeric single token', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, '4')).toBe('숫자');
  });
  it('recognizes comma or slash separated', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, 'ㄱ, ㄷ')).toBe('쉼표로 구분');
  });
  it('recognizes mixed korean and english', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, '평균/AVG')).toBe('쉼표로 구분');
  });
  it('returns fallback for multi_blank', () => {
    expect(inferAnswerFormat({ input_type: 'multi_blank' }, '① 3 ② 4')).toBe('각 라벨 옆에 답을 입력하세요');
  });
  it('returns fallback for ordered_sequence', () => {
    expect(inferAnswerFormat({ input_type: 'ordered_sequence' }, 'ㄱ, ㄴ, ㄷ')).toBe('순서대로 기호를 입력하세요');
  });
  it('returns fallback for unordered_symbol_set', () => {
    expect(inferAnswerFormat({ input_type: 'unordered_symbol_set' }, 'ㄱ, ㄷ')).toBe('옳은 기호만 골라 입력하세요');
  });
  it('returns fallback for textarea', () => {
    expect(inferAnswerFormat({ input_type: 'textarea' }, 'result')).toBe('실행 결과를 그대로 입력하세요');
  });
  it('returns empty string when nothing infers for single', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, '')).toBe('');
  });
});
