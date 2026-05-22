import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { computeUserTopicStats } from '@/lib/topicStatsStore';
import { getUserWrongProblemsByCategory } from '@/lib/wrongProblemsStore';
import { CATEGORY_BY_SLUG } from './categoryConfig';
import CoachProblemListClient from './CoachProblemListClient';

export const dynamic = 'force-dynamic';

export default async function CoachCategoryProblemsPage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const slug = String(params.category || '').toLowerCase();
  const category = CATEGORY_BY_SLUG[slug];
  if (!category) notFound();

  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const email = String(session.user.email).trim().toLowerCase();

  const [stats, rows] = await Promise.all([
    computeUserTopicStats(email),
    getUserWrongProblemsByCategory(email, category),
  ]);

  return <CoachProblemListClient category={category} slug={slug} stats={stats} rows={rows} />;
}
