import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/adminAccess';
import { PRACTICAL_SESSION_CONFIG } from '@/app/practical/_lib/practicalData';
import PracticalHintsClient from './PracticalHintsClient';

export default async function Page() {
  const session = await getAdminSession();
  if (!session) redirect('/');
  const sessionIds = Object.keys(PRACTICAL_SESSION_CONFIG);
  return <PracticalHintsClient sessionIds={sessionIds} />;
}
