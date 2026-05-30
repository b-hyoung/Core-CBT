import { describe, it, expect } from 'vitest';
import * as store from '@/lib/commentEditStore';

describe('commentEditStore — exported function smoke test', () => {
  const expectedFunctions = [
    'insertEdit',
    'getEditById',
    'listEditsByProblem',
    'listAllEdits',
    'countRecentByUser',
    'updateEdit',
    'listContributors',
    'insertContributor',
  ];

  for (const name of expectedFunctions) {
    it(`exports ${name} as a function`, () => {
      expect(typeof store[name]).toBe('function');
    });
  }
});
