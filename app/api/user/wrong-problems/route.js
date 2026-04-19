import { auth } from '@/auth';
import { getUserWrongProblemsByCategory } from '@/lib/wrongProblemsStore';

export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = new Set(['SQL', 'Code']);

export async function GET(request) {
  const session = await auth();
  const email = String(session?.user?.email || '').trim().toLowerCase();
  if (!email) {
    return Response.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  if (!category || !ALLOWED_CATEGORIES.has(category)) {
    return Response.json(
      { ok: false, message: `category must be one of ${[...ALLOWED_CATEGORIES].join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const rows = await getUserWrongProblemsByCategory(email, category);
    return Response.json({ ok: true, rows });
  } catch (e) {
    return Response.json({ ok: false, message: String(e?.message || e) }, { status: 500 });
  }
}
