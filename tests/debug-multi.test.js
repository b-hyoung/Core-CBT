import { describe, it } from 'vitest';
import { gradePracticalAnswer } from '@/app/practical/[sessionId]/_lib/gradePracticalAnswer';

describe('debug 2022-second #12', () => {
  const problem = {
    problem_number: 12,
    input_type: 'multi_blank',
    question_text: '인터넷 프로토콜에 대한 다음 설명에서 괄호에 들어갈 알맞은 답을 영문 약어로 쓰시오.',
    examples: '(가) : 파일 전송 프로토콜(FTP)을 지원\n\n(나) : 간이 파일 전송 프로토콜(TFTP)',
    accepted_answers: [],
  };
  const correctAnswer = '(가): TCP, (나): UDP';

  for (const userAnswer of [
    '가: TCP / 나: UDP',
    '(가): TCP / (나): UDP',
    '(가): TCP, (나): UDP',
    '가: TCP 나: UDP',
  ]) {
    it(`ua="${userAnswer}"`, () => {
      const r = gradePracticalAnswer({ userAnswer, correctAnswer, problem });
      console.log('INPUT:', userAnswer);
      console.log('matched:', r.matched, 'reasons:', r.reasons);
      console.log('fieldResults:', JSON.stringify(r.fieldResults));
    });
  }
});
