// app/api/edits/[key]/route.js
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listContributors, listEditsByProblem } from '@/lib/commentEditStore';
import { isAllowedSubject, isAllowedSessionKey } from '@/lib/commentPath';

export const dynamic = 'force-dynamic';

export async function GET(_request, context) {
  const { key } = await context.params;
  const decoded = decodeURIComponent(String(key || ''));
  const parts = decoded.split(':');
  if (parts.length !== 3) {
    return NextResponse.json({ ok: false, message: 'bad key' }, { status: 400 });
  }
  const [subject, sessionKey, problemNumberRaw] = parts;
  const problemNumber = Number(problemNumberRaw);
  if (!isAllowedSubject(subject) || !Number.isFinite(problemNumber)) {
    return NextResponse.json({ ok: false, message: 'invalid' }, { status: 400 });
  }
  if (!(await isAllowedSessionKey(subject, sessionKey))) {
    return NextResponse.json({ ok: false, message: 'invalid sessionKey' }, { status: 400 });
  }

  const session = await auth();
  const contributors = await listContributors(subject, sessionKey, problemNumber);

  let myPending = null;
  if (session?.user?.id) {
    const mine = await listEditsByProblem(subject, sessionKey, problemNumber, 'pending');
    myPending = mine.find((e) => e.editorUserId === session.user.id) || null;
  }

  return NextResponse.json({
    ok: true,
    contributors: contributors.map((c) => ({
      displayName: c.is_anonymous ? '익명' : c.display_name,
      createdAt: c.created_at,
    })),
    myPending: myPending ? { id: myPending.id, createdAt: myPending.createdAt } : null,
  });
}
