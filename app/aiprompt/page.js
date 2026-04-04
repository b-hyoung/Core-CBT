import { auth } from '@/auth';
import AiPromptSelectionPageClient from './AiPromptSelectionPageClient';
import { getReviewAvailabilityForUser } from '@/lib/reviewAvailability';

export const dynamic = 'force-dynamic';

export default async function AiPromptSelectionPage() {
  const session = await auth();
  const userEmail = String(session?.user?.email || '').trim().toLowerCase();
  const initialIsLoggedIn = Boolean(session?.user);
  const initialIsAdmin = session?.user?.role === 'admin';

  const initialReviewAvailability = userEmail
    ? await getReviewAvailabilityForUser(userEmail, 'aiprompt')
    : null;

  return (
    <AiPromptSelectionPageClient
      initialIsLoggedIn={initialIsLoggedIn}
      initialIsAdmin={initialIsAdmin}
      initialReviewAvailability={initialReviewAvailability}
    />
  );
}
