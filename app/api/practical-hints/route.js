import { NextResponse } from 'next/server';
import { listHintOverrides } from '@/app/practical/[sessionId]/_lib/fetchHintOverrides';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ hints: {} });
  const rows = await listHintOverrides(sessionId);
  const hints = {};
  for (const r of rows) hints[r.problem_number] = r.hint_text;
  return NextResponse.json({ hints });
}
