import { describe, it, expect } from 'vitest';
import { computeDiff } from '@/app/practical/[sessionId]/_lib/computeDiff';

describe('computeDiff', () => {
  it('returns a single equal segment when strings are identical', () => {
    const result = computeDiff('HTTP', 'HTTP');
    expect(result.segments).toEqual([{ type: 'equal', text: 'HTTP' }]);
  });

  it('marks removed and added segments on mismatch', () => {
    const result = computeDiff('HTTPS', 'HTTP');
    const types = result.segments.map((s) => s.type);
    expect(types).toContain('equal');
    expect(types).toContain('removed');
  });

  it('handles empty user answer', () => {
    const result = computeDiff('', 'HTTP');
    expect(result.segments).toEqual([{ type: 'added', text: 'HTTP' }]);
  });

  it('falls back to word granularity over 200 chars', () => {
    const long = 'x'.repeat(250);
    const result = computeDiff(long, long);
    expect(result.granularity).toBe('word');
  });

  it('uses char granularity for short inputs', () => {
    const result = computeDiff('abc', 'abd');
    expect(result.granularity).toBe('char');
  });
});
