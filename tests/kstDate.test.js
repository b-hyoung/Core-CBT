import { describe, it, expect } from 'vitest';
import { kstDateString, addDaysToDateString } from '@/lib/kstDate';

describe('kstDate', () => {
  it('UTC 자정 직전 시각을 KST 날짜로 변환한다 (UTC+9)', () => {
    // 2026-07-13T16:00:00Z == 2026-07-14T01:00 KST
    expect(kstDateString(new Date('2026-07-13T16:00:00Z'))).toBe('2026-07-14');
    // 2026-07-13T14:59:00Z == 2026-07-13T23:59 KST
    expect(kstDateString(new Date('2026-07-13T14:59:00Z'))).toBe('2026-07-13');
  });

  it('날짜 문자열에 일수를 더한다', () => {
    expect(addDaysToDateString('2026-07-13', 1)).toBe('2026-07-14');
    expect(addDaysToDateString('2026-07-31', 1)).toBe('2026-08-01');
  });
});
