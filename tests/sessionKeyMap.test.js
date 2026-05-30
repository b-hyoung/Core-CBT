import { describe, it, expect } from 'vitest';
import { parseSessionId } from '@/lib/sessionKeyMap';

describe('parseSessionId', () => {
  it('maps sqld-2025-1 → { subject: "sqld", sessionKey: "2025-first" }', () => {
    expect(parseSessionId('sqld-2025-1')).toEqual({ subject: 'sqld', sessionKey: '2025-first' });
  });

  it('maps sqld-2024-2 → { subject: "sqld", sessionKey: "2024-second" }', () => {
    expect(parseSessionId('sqld-2024-2')).toEqual({ subject: 'sqld', sessionKey: '2024-second' });
  });

  it('maps sqld-2025-3 → { subject: "sqld", sessionKey: "2025-third" }', () => {
    expect(parseSessionId('sqld-2025-3')).toEqual({ subject: 'sqld', sessionKey: '2025-third' });
  });

  it('maps aiprompt-2-1 → { subject: "aiPromptEngineering", sessionKey: "grade2-first" }', () => {
    expect(parseSessionId('aiprompt-2-1')).toEqual({
      subject: 'aiPromptEngineering',
      sessionKey: 'grade2-first',
    });
  });

  it('returns null for legacy numeric sessionId "1"', () => {
    expect(parseSessionId('1')).toBeNull();
  });

  it('returns null for unknown sessionId', () => {
    expect(parseSessionId('unknown-session')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSessionId('')).toBeNull();
  });
});
