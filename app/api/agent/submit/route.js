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

  const resp = await fetch(`${AGENT_API_URL}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-auth': INTERNAL_SHARED_SECRET,
      'x-user-email': email,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  return Response.json(data, { status: resp.status });
}
