import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { getUserWrongProblemsByCategory } from '@/lib/wrongProblemsStore';
import { loadPracticalDatasetMaps } from '@/app/practical/_lib/practicalData';
import { PRACTICAL_SESSION_CONFIG } from '@/app/practical/_lib/practicalSessions';
import CoachSolveClient from './CoachSolveClient';

export const dynamic = 'force-dynamic';

// datasets 폴더명 → Next.js sessionId 매핑
const ROUND_MAP = { first: '1', second: '2', third: '3' };
function datasetIdToSessionId(datasetId) {
  const m = String(datasetId).match(/^(\d{4})-(first|second|third)$/);
  if (!m) return null;
  return `practical-industrial-${m[1]}-${ROUND_MAP[m[2]]}`;
}

export default async function CoachSolvePage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const email = String(session.user.email).trim().toLowerCase();

  const lang = searchParams?.lang || null; // C, Java, Python (Code 전용)
  const category = searchParams?.category || (lang ? 'Code' : null); // SQL or Code
  if (!category || !['SQL', 'Code'].includes(category)) notFound();
  if (category === 'Code' && (!lang || !['C', 'Java', 'Python'].includes(lang))) notFound();

  // 특정 문제로 진입한 경우
  const targetSid = searchParams?.sid || null;
  const targetP = searchParams?.p ? Number(searchParams.p) : null;

  // 해당 카테고리 틀린 문제 목록
  const wrongRows = await getUserWrongProblemsByCategory(email, category);
  const langRows = category === 'Code'
    ? wrongRows.filter((r) => r.subcategory === lang)
    : category === 'SQL'
      ? wrongRows.filter((r) => r.subcategory === 'query')
      : wrongRows;

  if (langRows.length === 0) {
    redirect(`/practical/coach/${category.toLowerCase()}`);
  }

  // 특정 문제가 지정된 경우 해당 문제를 맨 앞으로
  let orderedRows = langRows;
  if (targetSid && targetP) {
    const targetIdx = langRows.findIndex(
      (r) => r.source_session_id === targetSid && r.problem_number === targetP
    );
    if (targetIdx > 0) {
      orderedRows = [langRows[targetIdx], ...langRows.filter((_, i) => i !== targetIdx)];
    }
  }

  // 각 문제의 퀴즈 데이터 로드
  const problemsWithData = [];
  for (const row of orderedRows) {
    const routeSessionId = datasetIdToSessionId(row.source_session_id);
    if (!routeSessionId) continue;

    try {
      const maps = await loadPracticalDatasetMaps(routeSessionId);
      if (!maps) continue;
      const problem = maps.problemsByNo.get(row.problem_number);
      if (!problem) continue;

      const answer = maps.answersByNo.get(row.problem_number) || '';
      const comment = maps.commentsByNo.get(row.problem_number) || '';

      problemsWithData.push({
        ...problem,
        _sourceSessionId: row.source_session_id,
        _routeSessionId: routeSessionId,
        _answer: answer,
        _comment: comment,
        _questionPreview: row.question_preview,
      });
    } catch {
      // skip if data load fails
    }
  }

  if (problemsWithData.length === 0) {
    redirect(`/practical/coach/${category.toLowerCase()}`);
  }

  return (
    <CoachSolveClient
      lang={lang}
      category={category}
      problems={problemsWithData}
    />
  );
}
