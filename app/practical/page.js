import { auth } from '@/auth';
import PracticalSelectionPageClient from './PracticalSelectionPageClient';
import { getReviewAvailabilityForUser, getUtilityAvailability } from '@/lib/reviewAvailability';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

export const dynamic = 'force-dynamic';

export default async function PracticalSelectionPage() {
  const session = await auth();
  const userEmail = String(session?.user?.email || '').trim().toLowerCase();
  const initialIsLoggedIn = Boolean(session?.user);
  const initialIsAdmin = isAllowedAdminEmail(userEmail);

  const [initialReviewAvailability, initialUtilityAvailability] = userEmail
    ? await Promise.all([
        getReviewAvailabilityForUser(userEmail, 'practical'),
        getUtilityAvailability('practical'),
      ])
    : [null, null];

  return (
    <PracticalSelectionPageClient
      initialIsLoggedIn={initialIsLoggedIn}
      initialIsAdmin={initialIsAdmin}
      initialReviewAvailability={initialReviewAvailability}
      initialUtilityAvailability={initialUtilityAvailability}
    />
  );
}
