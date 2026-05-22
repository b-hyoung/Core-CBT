import { auth } from '@/auth';
import { computeUserTopicStats } from '@/lib/topicStatsStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const email = String(session?.user?.email || '').trim().toLowerCase();
  if (!email) {
    return Response.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }
  try {
    const stats = await computeUserTopicStats(email);
    return Response.json({ ok: true, stats });
  } catch (e) {
    return Response.json({ ok: false, message: String(e?.message || e) }, { status: 500 });
  }
}
