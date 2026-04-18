import { auth } from '@/auth';
import TestSelectionPageClient from './TestSelectionPageClient';
import { getReviewAvailabilityForUser, getUtilityAvailability } from '@/lib/reviewAvailability';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

export const dynamic = 'force-dynamic';

export default async function TestSelectionPage() {
  const session = await auth();
  const userEmail = String(session?.user?.email || '').trim().toLowerCase();
  const initialIsLoggedIn = Boolean(session?.user);
  const initialIsAdmin = isAllowedAdminEmail(userEmail);

  const [initialReviewAvailability, initialUtilityAvailability] = userEmail
    ? await Promise.all([
        getReviewAvailabilityForUser(userEmail, 'written'),
        getUtilityAvailability('written'),
      ])
    : [null, null];

  return (
    <TestSelectionPageClient
      initialIsLoggedIn={initialIsLoggedIn}
      initialIsAdmin={initialIsAdmin}
      initialReviewAvailability={initialReviewAvailability}
      initialUtilityAvailability={initialUtilityAvailability}
    />
  );
}
