import { describe, it, expect } from 'vitest';
import { applyFix, selectTargetFile } from '../scripts/applyReportFix.lib.mjs';

const commentDoc = [{ title: 't', comments: [{ problem_number: 7, comment: 'old' }] }];
const hintDoc = [{ problem_number: 7, hint_body: 'old hint' }];
const answerDoc = [{ title: 't', answers: [{ problem_number: 7, correct_answer_index: 0, correct_answer_text: 'A' }] }];

describe('applyFix', () => {
  it('comment 필드를 교체한다', () => {
    const out = applyFix(structuredClone(commentDoc), 'comment', 7, '새 해설');
    expect(out[0].comments[0].comment).toBe('새 해설');
  });

  it('hint_body 필드를 교체한다 (평면 배열)', () => {
    const out = applyFix(structuredClone(hintDoc), 'hint', 7, '새 힌트');
    expect(out[0].hint_body).toBe('새 힌트');
  });

  it('정답은 index와 text를 함께 교체한다', () => {
    const out = applyFix(structuredClone(answerDoc), 'correct_answer_index', 7,
      { correct_answer_index: 2, correct_answer_text: 'C' });
    expect(out[0].answers[0].correct_answer_index).toBe(2);
    expect(out[0].answers[0].correct_answer_text).toBe('C');
  });

  it('Dify가 {value: ...}로 래핑한 comment를 벗겨서 적용한다', () => {
    const out = applyFix(structuredClone(commentDoc), 'comment', 7, { value: '래핑된 해설' });
    expect(out[0].comments[0].comment).toBe('래핑된 해설');
  });

  it('Dify가 {value: ...}로 래핑한 hint를 벗겨서 적용한다', () => {
    const out = applyFix(structuredClone(hintDoc), 'hint', 7, { value: '래핑된 힌트' });
    expect(out[0].hint_body).toBe('래핑된 힌트');
  });

  it('problem_number가 없으면 throw', () => {
    expect(() => applyFix(structuredClone(commentDoc), 'comment', 99, 'x')).toThrow(/not found/);
  });

  it('comment에 문자열이 아닌 값이 오면 throw', () => {
    expect(() => applyFix(structuredClone(commentDoc), 'comment', 7, { a: 1 })).toThrow(/string/);
  });

  it('정답 new_value에 index가 정수가 아니면 throw', () => {
    expect(() => applyFix(structuredClone(answerDoc), 'correct_answer_index', 7,
      { correct_answer_index: '2', correct_answer_text: 'C' })).toThrow(/integer/);
  });

  it('지원하지 않는 target_field면 throw', () => {
    expect(() => applyFix(structuredClone(commentDoc), 'question_text', 7, 'x')).toThrow(/unsupported/);
  });
});

describe('selectTargetFile', () => {
  it('problem_number를 포함한 파일 하나를 고른다', () => {
    const files = [
      { name: 'comment1.json', doc: commentDoc },
      { name: 'comment2.json', doc: [{ title: 't', comments: [{ problem_number: 80, comment: 'x' }] }] },
    ];
    expect(selectTargetFile(files, 'comment', 7)).toBe('comment1.json');
  });

  it('해당 문항을 포함한 파일이 없으면 throw', () => {
    expect(() => selectTargetFile([{ name: 'comment1.json', doc: commentDoc }], 'comment', 99))
      .toThrow(/no file contains/);
  });
});
