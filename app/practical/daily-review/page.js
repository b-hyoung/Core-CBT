// app/practical/daily-review/page.js
// ?set 없음 → 허브(세트 목록·생성) / ?set=review → 오답 복습 퀴즈 / ?set=SQL|Code|이론 → 집중 세트 퀴즈
import Link from 'next/link';
import { auth } from '@/auth';
import PracticalQuizV2 from '../[sessionId]/PracticalQuizV2';
import {
  fetchDueGeneratedProblems,
  fetchPendingSummary,
  toQuizProblem,
} from '@/lib/generatedProblemsStore';
import { interleaveByCategory } from '@/lib/variantGeneration';
import { kstTodayString } from '@/lib/kstDate';
import DailyReviewHub from './DailyReviewHub';
import LoginButton from './LoginButton';

export const dynamic = 'force-dynamic';

const SET_CATEGORIES = new Set(['SQL', 'Code', '이론']);

export default async function DailyReviewPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const initialProblemNumberRaw = Number(sp?.p);
  const initialProblemNumber = Number.isNaN(initialProblemNumberRaw) ? null : initialProblemNumberRaw;
  const shouldResume = String(sp?.resume || '') === '1';
  const rawSet = String(sp?.set || '');
  // 유효한 세트: review(오답 복습) 또는 카테고리. 이상한 값은 허브로.
  const setKey = rawSet === 'review' || SET_CATEGORIES.has(rawSet) ? rawSet : null;

  const session = await auth();
  const userEmail = String(session?.user?.email || '').trim().toLowerCase();

  if (!userEmail) {
    return (
      <Shell title="오늘의 복습">
        <p className="mb-6 text-slate-600">로그인하면 어제 틀린 문제의 변형을 복습할 수 있습니다.</p>
        <LoginButton />
        <div className="mt-4">
          <Link href="/practical" className="text-sm font-semibold text-emerald-700 hover:underline">
            ← 실기 회차 선택으로
          </Link>
        </div>
      </Shell>
    );
  }

  const today = kstTodayString();

  // ---------- 허브 ----------
  if (!setKey) {
    let summary;
    try {
      summary = await fetchPendingSummary(userEmail);
    } catch {
      return (
        <Shell title="오늘의 복습">
          <p className="mb-4 text-slate-600">복습 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
          <Link
            href="/practical/daily-review"
            className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
          >
            다시 시도
          </Link>
        </Shell>
      );
    }

    const dueToday = summary.filter((r) => String(r.due_date) <= today);
    const reviewCount = dueToday.filter((r) => r.kind !== 'coverage').length;
    const setCounts = {};
    for (const r of dueToday) {
      if (r.kind !== 'coverage') continue;
      const cat = String(r.category || '');
      if (!SET_CATEGORIES.has(cat)) continue;
      setCounts[cat] = (setCounts[cat] || 0) + 1;
    }
    const tomorrowCount = summary.filter((r) => String(r.due_date) > today).length;

    return <DailyReviewHub reviewCount={reviewCount} setCounts={setCounts} tomorrowCount={tomorrowCount} />;
  }

  // ---------- 퀴즈 (오답 복습 or 집중 세트) ----------
  let allRows;
  try {
    allRows = await fetchDueGeneratedProblems(userEmail, today);
  } catch {
    return (
      <Shell title="오늘의 복습">
        <p className="mb-4 text-slate-600">문제를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        <Link href="/practical/daily-review" className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
          허브로 돌아가기
        </Link>
      </Shell>
    );
  }

  const rows =
    setKey === 'review'
      ? allRows.filter((r) => r.kind !== 'coverage')
      : allRows.filter((r) => r.kind === 'coverage' && String(r.problem?.category || '') === setKey);
  const title = setKey === 'review' ? '오답 복습' : `${setKey} 집중 세트`;

  if (rows.length === 0) {
    return (
      <Shell title={title}>
        <p className="mb-2 text-2xl">🎉</p>
        <p className="mb-4 text-slate-600">이 세트의 오늘 분량을 모두 끝냈어요!</p>
        <Link
          href="/practical/daily-review"
          className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
        >
          허브로 — 다른 세트 보기
        </Link>
      </Shell>
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
        lobbySubtitle:
          setKey === 'review'
            ? '어제 틀린 문제의 변형 · 맞히면 졸업, 틀리면 내일 새 변형'
            : `안 풀어본 ${setKey} 유형 위주 기출 변형 · 맞히면 졸업`,
        backHref: '/practical/daily-review',
      }}
      sessionId={setKey === 'review' ? 'practical-daily-review' : `practical-daily-review-${setKey}`}
      initialProblemNumber={initialProblemNumber}
      shouldResume={shouldResume}
    />
  );
}

function Shell({ title, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-3 text-2xl font-extrabold text-slate-900">{title}</h1>
        {children}
      </div>
    </div>
  );
}
