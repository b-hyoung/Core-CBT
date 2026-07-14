// app/practical/daily-review/page.js
import Link from 'next/link';
import { auth } from '@/auth';
import PracticalQuizV2 from '../[sessionId]/PracticalQuizV2';
import { fetchDueGeneratedProblems, toQuizProblem } from '@/lib/generatedProblemsStore';
import { interleaveByCategory } from '@/lib/variantGeneration';
import { kstTodayString } from '@/lib/kstDate';
import GenerateButton from './GenerateButton';
import LoginButton from './LoginButton';

export const dynamic = 'force-dynamic';

export default async function DailyReviewPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const initialProblemNumberRaw = Number(sp?.p);
  const initialProblemNumber = Number.isNaN(initialProblemNumberRaw) ? null : initialProblemNumberRaw;
  const shouldResume = String(sp?.resume || '') === '1';

  const session = await auth();
  const userEmail = String(session?.user?.email || '').trim().toLowerCase();

  if (!userEmail) {
    return (
      <EmptyShell title="오늘의 복습">
        <p className="mb-6 text-slate-600">로그인하면 어제 틀린 문제의 변형을 복습할 수 있습니다.</p>
        <LoginButton />
        <div className="mt-4">
          <Link href="/practical" className="text-sm font-semibold text-emerald-700 hover:underline">
            ← 실기 회차 선택으로
          </Link>
        </div>
      </EmptyShell>
    );
  }

  const rows = await fetchDueGeneratedProblems(userEmail, kstTodayString());

  if (rows.length === 0) {
    return (
      <EmptyShell title="오늘의 복습">
        <p className="mb-2 text-slate-600">오늘 복습할 문제가 없습니다.</p>
        <p className="mb-4 text-sm text-slate-500">
          기출을 풀어 오답이 쌓이면, 아래 버튼으로 변형 문제를 만들 수 있어요. 만든 문제는 다음날 여기에 나옵니다.
        </p>
        <GenerateButton />
        <div className="mt-6">
          <Link href="/practical" className="text-sm font-semibold text-emerald-700 hover:underline">
            ← 실기 회차 선택으로
          </Link>
        </div>
      </EmptyShell>
    );
  }

  // 결정론적 인터리빙: 같은 due 목록이면 항상 같은 순서 (resume 혼란 방지)
  const ordered = interleaveByCategory(
    rows.map((row) => ({ row, category: String(row.problem?.category || '') })),
    () => 0.5,
  );

  const picked = [];
  const answersMap = {};
  const commentsMap = {};
  for (const { row } of ordered) {
    const newNo = picked.length + 1;
    picked.push(toQuizProblem(row, newNo));
    answersMap[newNo] = String(row.answer ?? '');
    commentsMap[newNo] = String(row.comment ?? '');
  }

  return (
    <PracticalQuizV2
      problems={picked}
      answersMap={answersMap}
      commentsMap={commentsMap}
      session={{
        title: `오늘의 복습 (${picked.length}문제)`,
        reviewOnly: true,
        lobbySubtitle: '어제 틀린 문제의 변형 · 맞히면 졸업, 틀리면 내일 새 변형',
      }}
      sessionId="practical-daily-review"
      initialProblemNumber={initialProblemNumber}
      shouldResume={shouldResume}
    />
  );
}

function EmptyShell({ title, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-3 text-2xl font-extrabold text-slate-900">{title}</h1>
        {children}
      </div>
    </div>
  );
}
