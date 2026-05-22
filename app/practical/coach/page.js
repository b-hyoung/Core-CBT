import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { computeUserTopicStats } from '@/lib/topicStatsStore';
import CoachCategoryPageClient from './CoachCategoryPageClient';

export const dynamic = 'force-dynamic';

export default async function CoachCategoryPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const email = String(session.user.email).trim().toLowerCase();
  const stats = await computeUserTopicStats(email);
  return <CoachCategoryPageClient stats={stats} />;
}
