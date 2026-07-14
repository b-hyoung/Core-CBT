// app/practical/daily-review/page.js
import Link from 'next/link';
import { auth } from '@/auth';
import PracticalQuizV2 from '../[sessionId]/PracticalQuizV2';
import { fetchDueGeneratedProblems, toQuizProblem } from '@/lib/generatedProblemsStore';
import { interleaveByCategory } from '@/lib/variantGeneration';
import { kstTodayString } from '@/lib/kstDate';
import GeneratePanel from './GeneratePanel';
import LoginButton from './LoginButton';

export const dynamic = 'force-dynamic';

const SET_CATEGORIES = new Set(['SQL', 'Code', '이론']);

export default async function DailyReviewPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const initialProblemNumberRaw = Number(sp?.p);
  const initialProblemNumber = Number.isNaN(initialProblemNumberRaw) ? null : initialProblemNumberRaw;
  const shouldResume = String(sp?.resume || '') === '1';
  // ?set=SQL|Code|이론 → 카테고리 집중 세트만 / 없으면 오답 복습(변형·확장)만
  const setCategory = SET_CATEGORIES.has(String(sp?.set || '')) ? String(sp.set) : null;

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

  const allRows = await fetchDueGeneratedProblems(userEmail, kstTodayString());
  const reviewRows = allRows.filter((r) => r.kind !== 'coverage');
  const setRowsByCategory = new Map();
  for (const r of allRows) {
    if (r.kind !== 'coverage') continue;
    const cat = String(r.problem?.category || '');
    if (!setRowsByCategory.has(cat)) setRowsByCategory.set(cat, []);
    setRowsByCategory.get(cat).push(r);
  }

  const rows = setCategory ? (setRowsByCategory.get(setCategory) || []) : reviewRows;
  const title = setCategory ? `${setCategory} 집중 세트` : '오늘의 복습';

  if (rows.length === 0) {
    return (
      <EmptyShell title={title}>
        {setCategory ? (
          <p className="mb-2 text-slate-600">{setCategory} 집중 세트에 풀 문제가 없습니다.</p>
        ) : (
          <p className="mb-2 text-slate-600">오늘 복습할 오답 변형이 없습니다.</p>
        )}
        <SetLinks setRowsByCategory={setRowsByCategory} reviewCount={reviewRows.length} current={setCategory} />
        <p className="mb-4 mt-3 text-sm text-slate-500">
          오답 변형(내일 출제)을 만들거나, 카테고리 집중 세트를 만들어 바로 풀 수 있어요.
        </p>
        <GeneratePanel />
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
        title: `${title} (${picked.length}문제)`,
        reviewOnly: true,
        lobbySubtitle: setCategory
          ? `안 풀어본 ${setCategory} 유형 위주 기출 변형 · 맞히면 졸업`
          : '어제 틀린 문제의 변형 · 맞히면 졸업, 틀리면 내일 새 변형',
      }}
      sessionId={setCategory ? `practical-daily-review-${setCategory}` : 'practical-daily-review'}
      initialProblemNumber={initialProblemNumber}
      shouldResume={shouldResume}
    />
  );
}

function SetLinks({ setRowsByCategory, reviewCount, current }) {
  const links = [];
  if (current && reviewCount > 0) {
    links.push({ href: '/practical/daily-review', label: `오답 복습 (${reviewCount}문제)` });
  }
  for (const [cat, list] of setRowsByCategory.entries()) {
    if (cat === current) continue;
    links.push({ href: `/practical/daily-review?set=${encodeURIComponent(cat)}`, label: `${cat} 집중 세트 (${list.length}문제)` });
  }
  if (links.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap justify-center gap-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="inline-flex rounded-full border border-emerald-600 px-3 py-1 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
        >
          {l.label} →
        </Link>
      ))}
    </div>
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
