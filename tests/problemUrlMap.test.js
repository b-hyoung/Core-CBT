import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// SITE_BASE_URL is read at call-time (not module-load-time), so vi.stubEnv works.

describe('buildProblemUrl', () => {
  const BASE = 'https://example.com';

  beforeEach(() => {
    vi.stubEnv('SITE_BASE_URL', BASE);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds URL for known sqld session (sqld / 2025-first → sqld-2025-1)', async () => {
    const { buildProblemUrl } = await import('@/lib/problemUrlMap');
    const url = buildProblemUrl('sqld', '2025-first', 7);
    expect(url).toBe(`${BASE}/test/sqld-2025-1?problem=7`);
  });

  it('builds URL for another sqld session (sqld / 2024-second → sqld-2024-2)', async () => {
    const { buildProblemUrl } = await import('@/lib/problemUrlMap');
    const url = buildProblemUrl('sqld', '2024-second', 23);
    expect(url).toBe(`${BASE}/test/sqld-2024-2?problem=23`);
  });

  it('builds URL for aiprompt session (aiPromptEngineering / grade2-first → aiprompt-2-1)', async () => {
    const { buildProblemUrl } = await import('@/lib/problemUrlMap');
    const url = buildProblemUrl('aiPromptEngineering', 'grade2-first', 5);
    expect(url).toBe(`${BASE}/test/aiprompt-2-1?problem=5`);
  });

  it('builds pdf-pack URL for pdfPacks subject', async () => {
    const { buildProblemUrl } = await import('@/lib/problemUrlMap');
    const url = buildProblemUrl('pdfPacks', 'some-pack', 3);
    expect(url).toBe(`${BASE}/test/pdf-pack/some-pack/quiz?problem=3`);
  });

  it('returns fallback /test URL for unknown (subject, sessionKey)', async () => {
    const { buildProblemUrl } = await import('@/lib/problemUrlMap');
    const url = buildProblemUrl('unknownSubject', 'unknown-key', 1);
    expect(url).toBe(`${BASE}/test`);
  });

  it('returns empty string when SITE_BASE_URL is not set', async () => {
    vi.stubEnv('SITE_BASE_URL', '');
    const { buildProblemUrl } = await import('@/lib/problemUrlMap');
    const url = buildProblemUrl('sqld', '2025-first', 1);
    expect(url).toBe('');
  });
});
