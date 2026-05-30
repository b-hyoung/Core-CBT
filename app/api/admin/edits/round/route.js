import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { listAllEdits, updateEdit } from '@/lib/commentEditStore';
import { createRoundPr } from '@/lib/githubPr';
import { buildCommentPath } from '@/lib/commentPath';

export const dynamic = 'force-dynamic';

export async function POST() {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });

  const approved = (await listAllEdits({ status: 'approved', limit: 500 }))
    .filter((e) => e.prNumber == null);
  if (approved.length === 0) {
    return NextResponse.json({ ok: false, message: 'no approved edits' }, { status: 409 });
  }

  let result;
  try {
    result = await createRoundPr(approved, buildCommentPath);
  } catch (err) {
    return NextResponse.json({ ok: false, message: String(err?.message || err) }, { status: 500 });
  }

  await Promise.all(approved.map((e) => updateEdit(e.id, { prNumber: result.prNumber })));

  return NextResponse.json({ ok: true, prNumber: result.prNumber, prUrl: result.prUrl });
}
