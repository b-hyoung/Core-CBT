import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import {
  upsertHintOverride,
  deleteHintOverride,
  listHintOverrides,
} from '@/app/practical/[sessionId]/_lib/fetchHintOverrides';
import { PRACTICAL_SESSION_CONFIG } from '@/app/practical/_lib/practicalData';

const HINT_MAX_LEN = 200;

function validSessionId(sessionId) {
  return Object.prototype.hasOwnProperty.call(PRACTICAL_SESSION_CONFIG, String(sessionId));
}

export async function GET(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId') || '';
  const rows = await listHintOverrides(sessionId);
  return NextResponse.json({ rows });
}

export async function PUT(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const sessionId = String(body?.sessionId || '');
  const problemNumber = Number(body?.problemNumber);
  const hintText = String(body?.hintText || '').trim();
  if (!validSessionId(sessionId))
    return NextResponse.json({ error: 'invalid sessionId' }, { status: 400 });
  if (!Number.isInteger(problemNumber) || problemNumber <= 0)
    return NextResponse.json({ error: 'invalid problemNumber' }, { status: 400 });
  if (!hintText || hintText.length > HINT_MAX_LEN)
    return NextResponse.json({ error: 'invalid hintText' }, { status: 400 });
  try {
    await upsertHintOverride({
      sessionId,
      problemNumber,
      hintText,
      updatedBy: String(session?.user?.email || ''),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const sessionId = String(body?.sessionId || '');
  const problemNumber = Number(body?.problemNumber);
  if (!validSessionId(sessionId))
    return NextResponse.json({ error: 'invalid sessionId' }, { status: 400 });
  if (!Number.isInteger(problemNumber) || problemNumber <= 0)
    return NextResponse.json({ error: 'invalid problemNumber' }, { status: 400 });
  try {
    await deleteHintOverride({ sessionId, problemNumber });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
