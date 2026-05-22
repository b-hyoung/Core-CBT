import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8001';
const INTERNAL_SHARED_SECRET = process.env.INTERNAL_SHARED_SECRET || '';

async function getEmail() {
  const session = await auth();
  return String(session?.user?.email || '').trim().toLowerCase();
}

export async function GET(request, { params: paramsPromise }) {
  const email = await getEmail();
  if (!email) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const params = await paramsPromise;
  const { sessionId, problemNumber } = params;

  const resp = await fetch(`${AGENT_API_URL}/session/${sessionId}/${problemNumber}`, {
    headers: {
      'x-internal-auth': INTERNAL_SHARED_SECRET,
      'x-user-email': email,
    },
  });

  const data = await resp.json();
  return Response.json(data, { status: resp.status });
}

export async function DELETE(request, { params: paramsPromise }) {
  const email = await getEmail();
  if (!email) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const params = await paramsPromise;
  const { sessionId, problemNumber } = params;

  const resp = await fetch(`${AGENT_API_URL}/session/${sessionId}/${problemNumber}`, {
    method: 'DELETE',
    headers: {
      'x-internal-auth': INTERNAL_SHARED_SECRET,
      'x-user-email': email,
    },
  });

  const data = await resp.json();
  return Response.json(data, { status: resp.status });
}
