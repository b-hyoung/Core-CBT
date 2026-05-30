import { describe, it, expect } from 'vitest';
import {
  isAllowedSubject,
  isAllowedSessionKey,
  buildCommentPath,
  readCommentFromDisk,
} from '@/lib/commentPath.js';

describe('isAllowedSubject', () => {
  it('returns true for sqld', () => {
    expect(isAllowedSubject('sqld')).toBe(true);
  });

  it('returns true for problem2022', () => {
    expect(isAllowedSubject('problem2022')).toBe(true);
  });

  it('returns true for problem2025', () => {
    expect(isAllowedSubject('problem2025')).toBe(true);
  });

  it('returns true for pdfPacks', () => {
    expect(isAllowedSubject('pdfPacks')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isAllowedSubject('')).toBe(false);
  });

  it('returns false for practical', () => {
    expect(isAllowedSubject('practical')).toBe(false);
  });

  it('returns false for problem (without digits)', () => {
    expect(isAllowedSubject('problem')).toBe(false);
  });

  it('returns false for problem999 (only 3 digits)', () => {
    expect(isAllowedSubject('problem999')).toBe(false);
  });
});

describe('isAllowedSessionKey', () => {
  it('returns true for real folder sqld/2025-first', async () => {
    const result = await isAllowedSessionKey('sqld', '2025-first');
    expect(result).toBe(true);
  });

  it('returns false for path traversal ../etc', async () => {
    const result = await isAllowedSessionKey('sqld', '../etc');
    expect(result).toBe(false);
  });

  it('returns false for nonexistent session key', async () => {
    const result = await isAllowedSessionKey('sqld', 'nonexistent');
    expect(result).toBe(false);
  });
});

describe('buildCommentPath', () => {
  it('returns correct path for sqld/2025-first', () => {
    expect(buildCommentPath('sqld', '2025-first')).toBe(
      'datasets/sqld/2025-first/comment1.json'
    );
  });
});

describe('readCommentFromDisk', () => {
  it('returns a string for problem 14 (may be empty)', async () => {
    const result = await readCommentFromDisk('sqld', '2025-first', 14);
    expect(typeof result).toBe('string');
  });

  it('returns empty string for nonexistent problem 999', async () => {
    const result = await readCommentFromDisk('sqld', '2025-first', 999);
    expect(result).toBe('');
  });
});
