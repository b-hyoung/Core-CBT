import { auth } from '@/auth';
import SqldSelectionPageClient from './SqldSelectionPageClient';
import { getReviewAvailabilityForUser } from '@/lib/reviewAvailability';

export const dynamic = 'force-dynamic';

export default async function SqldSelectionPage() {
  const session = await auth();
  const userEmail = String(session?.user?.email || '').trim().toLowerCase();
  const initialIsLoggedIn = Boolean(session?.user);
  const initialIsAdmin = session?.user?.role === 'admin';

  const initialReviewAvailability = userEmail
    ? await getReviewAvailabilityForUser(userEmail, 'sqld')
    : null;

  return (
    <SqldSelectionPageClient
      initialIsLoggedIn={initialIsLoggedIn}
      initialIsAdmin={initialIsAdmin}
      initialReviewAvailability={initialReviewAvailability}
    />
  );
}
