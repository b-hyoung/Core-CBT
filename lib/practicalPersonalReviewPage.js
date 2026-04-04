import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import PracticalQuizV2 from '@/app/practical/[sessionId]/PracticalQuizV2';
import { getUserUnknownProblems, getUserWrongProblems } from '@/lib/userProblemsStore';
import {
  isPracticalSessionId,
  loadPracticalDatasetMaps,
  practicalSessionLabel,
} from '@/app/practical/_lib/practicalData';

const reviewGetters = {
  wrong: getUserWrongProblems,
  unknown: getUserUnknownProblems,
};

const reviewLabels = {
  wrong: '오답',
  unknown: '모르겠어요',
};

export async function renderPracticalPersonalReviewPage({
  searchParams,
  reviewType,
  routeSessionId,
  backHref = '/practical',
  emptyTitle,
  emptyDescription,
  quizTitle,
}) {
  const session = await auth();
  if (!session?.user?.email) redirect('/');

  const getReviewList = reviewGetters[reviewType];
  if (!getReviewList) redirect(backHref);

  const sp = (await searchParams) || {};
  const initialProblemNumberRaw = Number(sp?.p);
  const initialProblemNumber = Number.isNaN(initialProblemNumberRaw) ? null : initialProblemNumberRaw;
  const shouldResume = String(sp?.resume || '') === '1';

  const userEmail = session.user.email.trim().toLowerCase();
  const rows = await getReviewList(userEmail);

  const datasetCache = new Map();
  const picked = [];
  const answersMap = {};
  const commentsMap = {};

  for (const row of rows) {
    const sessionId = String(row.sourceSessionId || '').trim();
    if (!isPracticalSessionId(sessionId)) continue;

    if (!datasetCache.has(sessionId)) {
      datasetCache.set(sessionId, await loadPracticalDatasetMaps(sessionId).catch(() => null));
    }
    const dataset = datasetCache.get(sessionId);
    if (!dataset) continue;

    const sourceProblemNumber = Number(row.sourceProblemNumber);
    const problem = dataset.problemsByNo.get(sourceProblemNumber);
    if (!problem) continue;

    const newProblemNumber = picked.length + 1;
    picked.push({
      ...problem,
      problem_number: newProblemNumber,
      originSessionId: sessionId,
      originProblemNumber: sourceProblemNumber,
      originSourceKey: practicalSessionLabel(sessionId),
    });
    answersMap[newProblemNumber] = String(dataset.answersByNo.get(sourceProblemNumber) ?? '');
    commentsMap[newProblemNumber] = String(dataset.commentsByNo.get(sourceProblemNumber) ?? '');
  }

  if (picked.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-3 text-2xl font-extrabold text-slate-900">{emptyTitle}</h1>
          <p className="mb-6 text-slate-600">{emptyDescription}</p>
          <Link
            href={backHref}
            className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white transition hover:bg-emerald-700"
          >
            실기 시험 선택으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PracticalQuizV2
      problems={picked}
      answersMap={answersMap}
      commentsMap={commentsMap}
      session={{
        title: `${quizTitle} (${picked.length}문제)`,
        reviewOnly: true,
        backHref,
        lobbySubtitle: `${session.user.name || userEmail}님의 ${reviewLabels[reviewType]} 문제 모음 / 총 ${picked.length}문항`,
      }}
      sessionId={routeSessionId}
      initialProblemNumber={initialProblemNumber}
      shouldResume={shouldResume}
    />
  );
}
