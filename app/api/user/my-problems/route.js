import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_EVENTS_TABLE = process.env.SUPABASE_EVENTS_TABLE || 'analytics_events';
const SUPABASE_PAGE_SIZE = 1000;
const EVENTS_FILE = path.join(process.cwd(), 'data', 'analytics-events.json');

function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function fetchUserFinishEventsFromSupabase(userEmail) {
  const all = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const containsFilter = JSON.stringify({ __meta: { userEmail: userEmail } });
    const url =
      `${SUPABASE_URL}/rest/v1/${SUPABASE_EVENTS_TABLE}` +
      `?select=payload,timestamp` +
      `&type=eq.finish_exam` +
      `&payload=cs.${encodeURIComponent(containsFilter)}` +
      `&order=timestamp.desc`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...supabaseHeaders(),
        Range: `${from}-${to}`,
        'Range-Unit': 'items',
      },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`supabase query failed: ${response.status}`);

    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return all;
}

async function fetchUserFinishEventsFromFile(userEmail) {
  try {
    const raw = await fs.readFile(EVENTS_FILE, 'utf8');
    const events = JSON.parse(raw);
    if (!Array.isArray(events)) return [];
    return events
      .filter((e) => {
        if (e.type !== 'finish_exam') return false;
        const email = String(e?.payload?.__meta?.userEmail || '').trim().toLowerCase();
        return email === userEmail;
      })
      .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
  } catch {
    return [];
  }
}

async function fetchUserFinishEvents(userEmail) {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV !== 'development') {
    try {
      const results = await fetchUserFinishEventsFromSupabase(userEmail);
      if (results.length > 0) return results;
    } catch {
      // fallback to local file
    }
  }
  return fetchUserFinishEventsFromFile(userEmail);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  const userEmail = session.user.email.trim().toLowerCase();

  try {
    const events = await fetchUserFinishEvents(userEmail);

    // events are desc by timestamp → first occurrence per key = most recent attempt
    const wrongMap = new Map();
    const unknownMap = new Map();

    for (const event of events) {
      const outcomes = Array.isArray(event?.payload?.problemOutcomes)
        ? event.payload.problemOutcomes
        : [];

      for (const o of outcomes) {
        const sourceSessionId = String(o?.sessionId || '').trim();
        const sourceProblemNumber = Number(o?.problemNumber);
        if (!sourceSessionId || !Number.isFinite(sourceProblemNumber) || sourceProblemNumber <= 0)
          continue;

        const key = `${sourceSessionId}:${sourceProblemNumber}`;

        if (o.isUnknown) {
          if (!unknownMap.has(key)) {
            unknownMap.set(key, {
              key,
              sourceSessionId,
              sourceProblemNumber,
              selectedAnswer: String(o.selectedAnswer ?? ''),
              correctAnswer: String(o.correctAnswer ?? ''),
              timestamp: event.timestamp,
            });
          }
        } else if (!o.isCorrect) {
          if (!wrongMap.has(key)) {
            wrongMap.set(key, {
              key,
              sourceSessionId,
              sourceProblemNumber,
              selectedAnswer: String(o.selectedAnswer ?? ''),
              correctAnswer: String(o.correctAnswer ?? ''),
              timestamp: event.timestamp,
            });
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      wrong: Array.from(wrongMap.values()),
      unknown: Array.from(unknownMap.values()),
    });
  } catch {
    return NextResponse.json({ ok: false, message: 'failed to load problems' }, { status: 500 });
  }
}
