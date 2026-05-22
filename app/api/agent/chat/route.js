import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8001';
const INTERNAL_SHARED_SECRET = process.env.INTERNAL_SHARED_SECRET || '';

export async function POST(request) {
  const session = await auth();
  const email = String(session?.user?.email || '').trim().toLowerCase();
  if (!email) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    const resp = await fetch(`${AGENT_API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-auth': INTERNAL_SHARED_SECRET,
        'x-user-email': email,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await resp.json();
    return Response.json(data, { status: resp.status });
  } catch (err) {
    console.error('[agent/chat] error:', err?.message || err);
    return Response.json({ error: 'agent server error', detail: String(err?.message || '') }, { status: 502 });
  }
}
