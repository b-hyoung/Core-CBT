import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { normalizeExamType } from '@/lib/examType';
import { getReviewAvailabilityForUser, getUtilityAvailability } from '@/lib/reviewAvailability';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await auth();
  const userEmail = String(session?.user?.email || '').trim().toLowerCase();

  if (!userEmail) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const examType = normalizeExamType(searchParams.get('examType'));

  if (!['written', 'practical', 'sqld', 'aiprompt'].includes(examType)) {
    return NextResponse.json({ ok: false, message: 'invalid examType' }, { status: 400 });
  }

  try {
    const [review, utility] = await Promise.all([
      getReviewAvailabilityForUser(userEmail, examType),
      getUtilityAvailability(examType),
    ]);

    return NextResponse.json({
      ok: true,
      authenticated: true,
      examType,
      review,
      utility,
    });
  } catch {
    return NextResponse.json({ ok: false, message: 'failed to load availability' }, { status: 500 });
  }
}
