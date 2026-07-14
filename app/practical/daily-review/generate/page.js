// app/practical/daily-review/generate/page.js
// 복습함에 풀 문제가 이미 있어도 접근 가능한 생성 전용 화면
import Link from 'next/link';
import { auth } from '@/auth';
import GeneratePanel from '../GeneratePanel';
import LoginButton from '../LoginButton';

export const dynamic = 'force-dynamic';

export default async function DailyReviewGeneratePage() {
  const session = await auth();
  const userEmail = String(session?.user?.email || '').trim().toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-extrabold text-slate-900">문제 생성</h1>
        <p className="mb-4 text-center text-sm text-slate-500">
          오답 변형 또는 카테고리 집중 세트를 만듭니다
        </p>
        {userEmail ? <GeneratePanel /> : <LoginButton />}
        <div className="mt-6 text-center">
          <Link href="/practical/daily-review" className="text-sm font-semibold text-emerald-700 hover:underline">
            ← 오늘의 복습으로
          </Link>
        </div>
      </div>
    </div>
  );
}
