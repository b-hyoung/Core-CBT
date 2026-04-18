import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserRound, ChevronLeft, BarChart2, BookOpen } from 'lucide-react';
import { auth } from '@/auth';
import MyProblemsList from './MyProblemsList';
import MyStatsSection from './MyStatsSection';

export default async function MyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/');
  }

  const userName = session.user.name || '이름 없음';
  const userEmail = session.user.email || '이메일 없음';

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/exam"
          className="mb-6 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          시험 선택으로 돌아가기
        </Link>

        {/* 계정 정보 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600 shadow-sm">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">마이페이지</p>
              <h1 className="text-2xl font-extrabold text-slate-900">내 계정 정보</h1>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 divide-y divide-slate-100">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-slate-500">이름</span>
              <span className="text-sm font-bold text-slate-800">{userName}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-slate-500">이메일</span>
              <span className="text-sm font-bold text-slate-800">{userEmail}</span>
            </div>
          </div>
        </section>

        {/* 학습 통계 */}
        <section className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-violet-500" />
            <h2 className="text-base font-extrabold text-slate-800">내 학습 통계</h2>
          </div>
          <MyStatsSection />
        </section>

        {/* 오답 노트 */}
        <section className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-rose-500" />
            <h2 className="text-base font-extrabold text-slate-800">내 오답 노트</h2>
          </div>
          <MyProblemsList />
        </section>
      </div>
    </main>
  );
}
