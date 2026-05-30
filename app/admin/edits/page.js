// app/admin/edits/page.js
import { getAdminSession } from '@/lib/adminAccess';
import { redirect } from 'next/navigation';
import AdminEditQueueClient from './AdminEditQueueClient';

export const dynamic = 'force-dynamic';

export default async function AdminEditsPage() {
  const adminSession = await getAdminSession();
  if (!adminSession) redirect('/');
  return <AdminEditQueueClient />;
}
