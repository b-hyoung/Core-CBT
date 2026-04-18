import { notFound, redirect } from 'next/navigation';
import { getPdfPackConfig } from '../_lib/pdfPackCatalog';

export const dynamic = 'force-dynamic';

export default async function PdfPackEntryRedirectPage({ params }) {
  const { slug } = await params;
  if (!getPdfPackConfig(slug)) {
    notFound();
  }
  redirect(`/test/pdf-pack/${slug}/quiz`);
}

