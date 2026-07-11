import { auth } from '@/auth';
import PracticalSelectionPageClient from './PracticalSelectionPageClient';
import { getReviewAvailabilityForUser } from '@/lib/reviewAvailability';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

export const dynamic = 'force-dynamic';

export default async function PracticalSelectionPage() {
  const session = await auth();
  const userEmail = String(session?.user?.email || '').trim().toLowerCase();
  const initialIsLoggedIn = Boolean(session?.user);
  const initialIsAdmin = isAllowedAdminEmail(userEmail);

  const initialReviewAvailability = userEmail
    ? await getReviewAvailabilityForUser(userEmail, 'practical')
    : null;
  // 전체 집계가 필요한 utility 가용성은 SSR에서 기다리지 않는다 —
  // null이면 클라이언트가 'loading' 표시 후 /api/user/review-availability 로 채운다.
  const initialUtilityAvailability = null;

  return (
    <PracticalSelectionPageClient
      initialIsLoggedIn={initialIsLoggedIn}
      initialIsAdmin={initialIsAdmin}
      initialReviewAvailability={initialReviewAvailability}
      initialUtilityAvailability={initialUtilityAvailability}
    />
  );
}
