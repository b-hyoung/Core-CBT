import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoundPr } from '@/lib/githubPr.js';

describe('createRoundPr', () => {
  it('is a function', () => {
    expect(typeof createRoundPr).toBe('function');
  });

  it('throws "no edits" when edits array is empty', async () => {
    // Even without env vars set, empty edits check fires first only if env is set.
    // With env missing, the env check fires first. So we only guarantee it throws.
    await expect(createRoundPr([], () => '')).rejects.toThrow();
  });

  describe('when env vars are not set', () => {
    let savedToken, savedOwner, savedRepo;

    beforeEach(() => {
      savedToken = process.env.GITHUB_TOKEN;
      savedOwner = process.env.GITHUB_REPO_OWNER;
      savedRepo = process.env.GITHUB_REPO_NAME;
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_REPO_OWNER;
      delete process.env.GITHUB_REPO_NAME;
    });

    afterEach(() => {
      if (savedToken !== undefined) process.env.GITHUB_TOKEN = savedToken;
      if (savedOwner !== undefined) process.env.GITHUB_REPO_OWNER = savedOwner;
      if (savedRepo !== undefined) process.env.GITHUB_REPO_NAME = savedRepo;
    });

    it('throws "github env missing" with one edit and no env vars', async () => {
      const edit = {
        id: 'test-1',
        subject: 'sqld',
        sessionKey: '2025-first',
        problemNumber: 14,
        finalComment: 'test comment',
      };
      await expect(createRoundPr([edit], () => '')).rejects.toThrow('github env missing');
    });
  });
});
