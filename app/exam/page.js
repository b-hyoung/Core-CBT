import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, ChevronRight, Database, FilePenLine, FileText } from 'lucide-react';
import ExamBackGuard from '@/app/_components/ExamBackGuard';
import ThemeControls from '@/app/_components/ThemeControls';
import UserQuickActions from '@/app/_components/UserQuickActions';
import ExamTrackLink from './ExamTrackLink';

const industrialTracks = [
  {
    href: '/test',
    title: '필기',
    subtitle: '객관식 CBT',
    icon: FilePenLine,
    borderClass: 'border-sky-300 hover:border-sky-500 dark:border-sky-700 dark:hover:border-sky-500',
    iconClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  },
  {
    href: '/practical',
    title: '실기',
    subtitle: '주관식 CBT',
    icon: FileText,
    borderClass: 'border-emerald-300 hover:border-emerald-500 dark:border-emerald-700 dark:hover:border-emerald-500',
    iconClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  },
];

const extraTracks = [
  {
    href: '/sqld',
    badge: 'SQLD 시험',
    title: 'SQLD',
    subtitle: '객관식 CBT',
    icon: Database,
    wrapClass:
      'border-amber-300 bg-white hover:border-amber-500 dark:border-amber-700 dark:bg-slate-800 dark:hover:border-amber-500',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  {
    href: '/aiprompt',
    badge: 'AI 자격',
    title: 'AI 프롬프트엔지니어링 2급',
    subtitle: '객관식 CBT',
    icon: Bot,
    wrapClass:
      'border-rose-300 bg-white hover:border-rose-500 dark:border-rose-700 dark:bg-slate-800 dark:hover:border-rose-500',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
    iconClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  },
];

const cardTransition =
  'transition-[transform,box-shadow,border-color] duration-200 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)]';

function CardArrow() {
  return (
    <div className="mt-4 flex justify-end">
      <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 transition-[opacity,transform] duration-150 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] group-hover:translate-x-1 group-hover:opacity-100 dark:text-slate-500" />
    </div>
  );
}

export default function ExamTypeSelectionPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-100 px-4 py-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 md:py-10">
      <Suspense fallback={null}>
        <ExamBackGuard />
      </Suspense>
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center justify-between">
          <UserQuickActions />
          <ThemeControls />
        </div>
        <Link
          href="/"
          className="mb-4 inline-flex min-h-[44px] items-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-[background-color,box-shadow,transform] duration-150 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] hover:bg-slate-50 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          홈으로 돌아가기
        </Link>

        <div className="animate-fade-up mb-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800 md:p-5">
          <p className="text-xs font-semibold tracking-wider text-sky-600 uppercase dark:text-sky-400">모의시험 시작하기</p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 md:text-[1.75rem]">
            시험 종류를 선택하세요
          </h1>
        </div>

        <section
          className="animate-fade-up mb-4 rounded-2xl border border-sky-300 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-4 shadow-sm dark:border-sky-700/70 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/80"
          style={{ animationDelay: '80ms' }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.125rem] font-bold text-slate-900 dark:text-slate-50">정보처리산업기사</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">#대표</span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">#필기</span>
                <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300">#실기</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {industrialTracks.map((track, i) => {
              const Icon = track.icon;
              return (
                <ExamTrackLink
                  key={track.href}
                  href={track.href}
                  style={{ animationDelay: `${160 + i * 60}ms` }}
                  className={`animate-fade-up group rounded-2xl border bg-white p-5 shadow-sm ${cardTransition} hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:bg-slate-800/80 dark:focus-visible:ring-offset-slate-900 ${track.borderClass}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-[1.0625rem] font-bold leading-snug text-slate-900 dark:text-slate-50">{track.title}</h3>
                      <p className="mt-1 text-[0.8125rem] font-medium text-slate-500 dark:text-slate-400">{track.subtitle}</p>
                    </div>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${track.iconClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <CardArrow />
                </ExamTrackLink>
              );
            })}
          </div>
        </section>

        <section
          className="animate-fade-up rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800"
          style={{ animationDelay: '340ms' }}
        >
          <div className="mb-3">
            <h2 className="text-[1.125rem] font-bold text-slate-900 dark:text-slate-50">기타 시험</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">#SQLD</span>
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">#AI프롬프트</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {extraTracks.map((track, i) => {
              const Icon = track.icon;
              return (
                <ExamTrackLink
                  key={track.href}
                  href={track.href}
                  style={{ animationDelay: `${400 + i * 60}ms` }}
                  className={`animate-fade-up group rounded-2xl border p-6 shadow-sm ${cardTransition} hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${track.wrapClass}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${track.badgeClass}`}>
                        {track.badge}
                      </span>
                      <h3 className="mt-2 text-[1.125rem] font-bold leading-snug text-slate-900 dark:text-slate-50">{track.title}</h3>
                      <p className="mt-1 text-[0.8125rem] font-medium text-slate-500 dark:text-slate-400">{track.subtitle}</p>
                    </div>
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${track.iconClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <CardArrow />
                </ExamTrackLink>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
