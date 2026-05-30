// app/api/edits/route.js
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAllowedSubject, isAllowedSessionKey, readCommentFromDisk } from '@/lib/commentPath';
import { insertEdit, countRecentByUser } from '@/lib/commentEditStore';

export const dynamic = 'force-dynamic';

function sanitizeText(s) {
  return String(s || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'invalid json' }, { status: 400 });
  }

  const subject = String(body?.subject || '').trim();
  const sessionKey = String(body?.sessionKey || '').trim();
  const problemNumber = Number(body?.problemNumber);
  const proposed = sanitizeText(body?.proposed);
  const isAnonymous = Boolean(body?.isAnonymous);

  if (!isAllowedSubject(subject)) {
    return NextResponse.json({ ok: false, message: 'invalid subject' }, { status: 400 });
  }
  if (!(await isAllowedSessionKey(subject, sessionKey))) {
    return NextResponse.json({ ok: false, message: 'invalid sessionKey' }, { status: 400 });
  }
  if (!Number.isFinite(problemNumber) || problemNumber <= 0) {
    return NextResponse.json({ ok: false, message: 'invalid problemNumber' }, { status: 400 });
  }
  if (proposed.length < 10 || proposed.length > 1000) {
    return NextResponse.json({ ok: false, message: 'proposed must be 10~1000 chars' }, { status: 400 });
  }

  const recent = await countRecentByUser(session.user.id, subject, sessionKey, problemNumber);
  if (recent > 0) {
    return NextResponse.json({ ok: false, message: 'rate_limited' }, { status: 429 });
  }

  const original = await readCommentFromDisk(subject, sessionKey, problemNumber);

  const editorDisplayName = String(session.user.name || session.user.email || session.user.id);

  const inserted = await insertEdit({
    subject,
    sessionKey,
    problemNumber,
    originalComment: original,
    proposedComment: proposed,
    editorUserId: session.user.id,
    editorDisplayName,
    isAnonymous,
  });

  // Discord notify는 Task 13에서 추가. 지금은 그냥 id 반환.
  return NextResponse.json({ ok: true, id: inserted.id });
}
