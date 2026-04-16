import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

const EVENTS_FILE = path.join(process.cwd(), 'data', 'analytics-events.json');

async function setEvents(events) {
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2));
}

const baseMeta = (userEmail) => ({ __meta: { userEmail, ipAddress: '::1', ipSource: 'x-forwarded-for' } });

function makeFinishEvent({ timestamp, userEmail, outcomes }) {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type: 'finish_exam',
    clientId: 'test-client',
    sessionId: 'practical-industrial-2022-3',
    payload: {
      ...baseMeta(userEmail),
      problemOutcomes: outcomes,
    },
    path: '/practical/practical-industrial-2022-3',
    timestamp,
    userAgent: 'test',
  };
}

describe('getUserWrongProblems - latest-wins logic', () => {
  let originalEvents;
  beforeEach(async () => {
    try { originalEvents = await fs.readFile(EVENTS_FILE, 'utf8'); } catch { originalEvents = '[]'; }
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  });
  afterEach(async () => {
    await fs.writeFile(EVENTS_FILE, originalEvents);
    vi.unstubAllEnvs();
  });

  it('problem re-answered CORRECTLY in latest event should NOT appear in wrong list', async () => {
    const { getUserWrongProblems } = await import('@/lib/userProblemsStore');
    const userEmail = 'testuser@test.com';
    const events = [
      makeFinishEvent({
        timestamp: '2026-04-15T10:00:00.000Z',
        userEmail,
        outcomes: [
          {
            sessionId: 'practical-industrial-2022-3',
            problemNumber: 2,
            selectedAnswer: '아몰랑',
            correctAnswer: '① 회복 ② 동시성 제어',
            isCorrect: false,
            isUnknown: false,
          },
        ],
      }),
      makeFinishEvent({
        timestamp: '2026-04-16T10:00:00.000Z',
        userEmail,
        outcomes: [
          {
            sessionId: 'practical-industrial-2022-3',
            problemNumber: 2,
            selectedAnswer: '① 회복 ② 동시성 제어',
            correctAnswer: '① 회복 ② 동시성 제어',
            isCorrect: true,
            isUnknown: false,
          },
        ],
      }),
    ];
    await setEvents(events);
    const wrong = await getUserWrongProblems(userEmail);
    const hit = wrong.find(
      (w) => w.sourceSessionId === 'practical-industrial-2022-3' && w.sourceProblemNumber === 2,
    );
    expect(hit, 'correctly re-answered problem must not be in wrong list').toBeUndefined();
  });

  it('problem wrong in older event AND wrong in newer event should appear once', async () => {
    const { getUserWrongProblems } = await import('@/lib/userProblemsStore');
    const userEmail = 'testuser@test.com';
    const events = [
      makeFinishEvent({
        timestamp: '2026-04-15T10:00:00.000Z',
        userEmail,
        outcomes: [
          {
            sessionId: 'practical-industrial-2022-3',
            problemNumber: 3,
            selectedAnswer: 'wrong1',
            correctAnswer: '00001011',
            isCorrect: false,
            isUnknown: false,
          },
        ],
      }),
      makeFinishEvent({
        timestamp: '2026-04-16T10:00:00.000Z',
        userEmail,
        outcomes: [
          {
            sessionId: 'practical-industrial-2022-3',
            problemNumber: 3,
            selectedAnswer: 'wrong2',
            correctAnswer: '00001011',
            isCorrect: false,
            isUnknown: false,
          },
        ],
      }),
    ];
    await setEvents(events);
    const wrong = await getUserWrongProblems(userEmail);
    const hits = wrong.filter(
      (w) => w.sourceSessionId === 'practical-industrial-2022-3' && w.sourceProblemNumber === 3,
    );
    expect(hits.length).toBe(1);
  });

  it('missing isCorrect field (legacy event) does NOT leak correct problem into wrong list when newer event marks correct', async () => {
    const { getUserWrongProblems } = await import('@/lib/userProblemsStore');
    const userEmail = 'testuser@test.com';
    const events = [
      // older legacy event without isCorrect field
      makeFinishEvent({
        timestamp: '2026-04-15T10:00:00.000Z',
        userEmail,
        outcomes: [
          {
            sessionId: 'practical-industrial-2022-3',
            problemNumber: 4,
            selectedAnswer: 'wrong',
            correctAnswer: '네트워크 계층(Network Layer)',
            // isCorrect missing
          },
        ],
      }),
      // newer event: correct
      makeFinishEvent({
        timestamp: '2026-04-16T10:00:00.000Z',
        userEmail,
        outcomes: [
          {
            sessionId: 'practical-industrial-2022-3',
            problemNumber: 4,
            selectedAnswer: '네트워크 계층',
            correctAnswer: '네트워크 계층(Network Layer)',
            isCorrect: true,
            isUnknown: false,
          },
        ],
      }),
    ];
    await setEvents(events);
    const wrong = await getUserWrongProblems(userEmail);
    const hit = wrong.find(
      (w) => w.sourceSessionId === 'practical-industrial-2022-3' && w.sourceProblemNumber === 4,
    );
    expect(hit).toBeUndefined();
  });
});
