import { notFound } from 'next/navigation';
import PracticalQuizV2 from './PracticalQuizV2';
import { loadPracticalQuizData, PRACTICAL_SESSION_CONFIG } from '../_lib/practicalData';

export default async function PracticalSessionPage({ params: paramsPromise, searchParams: searchParamsPromise }) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const { sessionId } = params;
  const cfg = PRACTICAL_SESSION_CONFIG[sessionId];
  const initialProblemNumber = Number(searchParams?.p);
  const validInitialProblemNumber = Number.isNaN(initialProblemNumber) ? null : initialProblemNumber;
  const shouldResume = String(searchParams?.resume) === '1';

  if (!cfg) notFound();

  const data = await loadPracticalQuizData(sessionId);
  if (!data) notFound();

  return (
    <PracticalQuizV2
      problems={data.problems}
      answersMap={data.answersMap}
      commentsMap={data.commentsMap}
      session={{ title: cfg.title, reviewOnly: true, lobbySubtitle: `총 ${data.problems.length}문항 / 실기 주관식` }}
      sessionId={sessionId}
      initialProblemNumber={validInitialProblemNumber}
      shouldResume={shouldResume}
    />
  );
}
