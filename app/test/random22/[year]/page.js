import { notFound } from 'next/navigation';
import Quiz from '../../[sessionId]/Quiz';
import { buildRandomOptionYearQuiz, isSupportedRandom22Year } from '../_lib/buildRandomOptionYearQuiz';

export const dynamic = 'force-dynamic';

export default async function Random22YearQuizPage({ params }) {
  const { year } = await params;
  if (!isSupportedRandom22Year(year)) {
    notFound();
  }

  let data;
  try {
    data = await buildRandomOptionYearQuiz(year);
  } catch (error) {
    console.error(`Failed to build random22 year quiz (${year}):`, error);
    notFound();
  }

  return (
    <Quiz
      problems={data.problems}
      answersMap={data.answersMap}
      commentsMap={data.commentsMap}
      session={data.session}
      sessionId={`random22-${year}`}
    />
  );
}
