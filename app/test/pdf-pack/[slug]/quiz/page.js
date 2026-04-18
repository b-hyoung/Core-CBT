import { notFound } from 'next/navigation';
import Quiz from '../../../[sessionId]/Quiz';
import { buildPdfPackQuiz } from '../../_lib/loadPdfPackQuiz';
import { getPdfPackConfig } from '../../_lib/pdfPackCatalog';

export const dynamic = 'force-dynamic';

export default async function PdfPackQuizPage({ params }) {
  const { slug } = await params;
  if (!getPdfPackConfig(slug)) {
    notFound();
  }

  let data;
  try {
    data = await buildPdfPackQuiz(slug);
  } catch (error) {
    console.error(`Failed to build pdf pack quiz (${slug}):`, error);
    notFound();
  }

  return (
    <Quiz
      problems={data.problems}
      answersMap={data.answersMap}
      commentsMap={data.commentsMap}
      session={data.session}
      sessionId={`pdfpack-${slug}`}
    />
  );
}

