import Link from 'next/link';
import { ArrowLeft, Network, ChevronRight } from 'lucide-react';
import ThemeControls from '@/app/_components/ThemeControls';
import ExamTrackLink from '@/app/exam/ExamTrackLink';
import { listPdfPackConfigs } from '@/app/test/pdf-pack/_lib/pdfPackCatalog';

export const metadata = {
  title: '네트워크관리사 2급 필기 CBT',
  description: '네트워크관리사 2급 필기 회차별 기출문제를 CBT 형식으로 학습합니다.',
};

const cardTransition =
  'transition-[transform,box-shadow,border-color] duration-200 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)]';

export default function Network2SelectionPage() {
  const sessions = listPdfPackConfigs().filter((cfg) => String(cfg.slug).startsWith('network2-'));

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-slate-100 px-4 py-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 md:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center justify-end">
          <ThemeControls />
        </div>

        <Link
          href="/exam"
          className="mb-4 inline-flex min-h-[44px] items-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-[background-color,box-shadow,transform] duration-150 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] hover:bg-slate-50 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          시험 종류 선택으로
        </Link>

        <div className="animate-fade-up mb-4 rounded-2xl border border-teal-300 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-4 shadow-sm dark:border-teal-700/70 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/80 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-teal-600 uppercase dark:text-teal-400">
                모의시험 회차 선택
              </p>
              <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 md:text-[1.75rem]">
                네트워크관리사 2급 필기
              </h1>
              <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                회차를 선택하여 실전처럼 연습하세요. (회차당 50문항 / 4과목)
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
              <Network className="h-6 w-6" />
            </div>
          </div>
        </div>

        <section
          className="animate-fade-up rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800"
          style={{ animationDelay: '80ms' }}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((cfg, i) => (
              <ExamTrackLink
                key={cfg.slug}
                href={`/test/pdf-pack/${cfg.slug}/quiz`}
                style={{ animationDelay: `${120 + i * 40}ms` }}
                className={`animate-fade-up group rounded-2xl border border-teal-300 bg-white p-5 shadow-sm ${cardTransition} hover:-translate-y-1 hover:border-teal-500 hover:shadow-lg active:scale-[0.98] active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-teal-700 dark:bg-slate-800/80 dark:hover:border-teal-500 dark:focus-visible:ring-offset-slate-900`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[1.0625rem] font-bold leading-snug text-slate-900 dark:text-slate-50">
                      {cfg.title.replace(' 네트워크관리사 2급 필기', '')}
                    </h3>
                    <p className="mt-1 text-[0.8125rem] font-medium text-slate-500 dark:text-slate-400">
                      필기 기출 · 50문항
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                    <Network className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 transition-[opacity,transform] duration-150 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] group-hover:translate-x-1 group-hover:opacity-100 dark:text-slate-500" />
                </div>
              </ExamTrackLink>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
