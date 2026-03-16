import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { auth } from '@/auth';

export default async function MyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/');
  }

  const userName = session.user.name || '이름 없음';
  const userEmail = session.user.email || '이메일 없음';

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/exam"
          className="mb-4 inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          시험 선택으로 돌아가기
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600">마이페이지</p>
              <h1 className="text-2xl font-extrabold text-slate-900">내 계정 정보</h1>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p>
              <span className="font-bold text-slate-700">이름:</span> {userName}
            </p>
            <p>
              <span className="font-bold text-slate-700">이메일:</span> {userEmail}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
