import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, ChevronRight, Database, FilePenLine, FileText } from 'lucide-react';
import ExamBackGuard from '@/app/_components/ExamBackGuard';
import UserQuickActions from '@/app/_components/UserQuickActions';

const industrialTracks = [
  {
    href: '/test',
    title: '필기',
    subtitle: '객관식 CBT',
    icon: FilePenLine,
    borderClass: 'border-sky-200 hover:border-sky-400',
    iconClass: 'bg-sky-100 text-sky-700',
  },
  {
    href: '/practical',
    title: '실기',
    subtitle: '주관식 CBT',
    icon: FileText,
    borderClass: 'border-emerald-200 hover:border-emerald-400',
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    href: '/aiprompt',
    title: 'AI 프롬프트엔지니어링 2급',
    subtitle: '객관식 CBT',
    description: '프롬프트 설계, 평가, 안전성, 운영 기초를 20문항으로 연습합니다.',
    icon: Bot,
    classes:
      'border-rose-200 bg-gradient-to-br from-white via-rose-50 to-pink-50 hover:border-rose-400 hover:shadow-rose-100',
    iconWrap: 'bg-rose-100 text-rose-700',
    badge: 'AI 자격',
    badgeClass: 'bg-rose-100 text-rose-800',
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
      'border-amber-200 bg-gradient-to-br from-white via-amber-50 to-orange-50 hover:border-amber-400 hover:shadow-amber-100',
    badgeClass: 'bg-amber-100 text-amber-800',
    iconClass: 'bg-amber-100 text-amber-700',
  },
  {
    href: '/aiprompt',
    badge: 'AI 자격',
    title: 'AI-프롬프트엔지니어링',
    subtitle: '객관식 CBT',
    icon: Bot,
    wrapClass:
      'border-rose-200 bg-gradient-to-br from-white via-rose-50 to-pink-50 hover:border-rose-400 hover:shadow-rose-100',
    badgeClass: 'bg-rose-100 text-rose-800',
    iconClass: 'bg-rose-100 text-rose-700',
  },
];

function MoveLink() {
  return (
    <div className="mt-5 inline-flex items-center text-sm font-bold text-slate-800">
      회차 선택으로 이동
      <ChevronRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
    </div>
  );
}

export default function ExamTypeSelectionPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-6 md:py-10">
      <Suspense fallback={null}>
        <ExamBackGuard />
      </Suspense>
      <div className="mx-auto max-w-5xl">
        <UserQuickActions className="mb-3" />
        <Link
          href="/"
          className="mb-4 inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          홈으로 돌아가기
        </Link>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-sm font-semibold text-slate-600">모의시험 시작하기</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            시험 종류를 선택하세요
          </h1>
          <p className="mt-1 text-sm text-slate-600">아래에서 바로 선택하세요.</p>
        </div>

        <section className="mb-4 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">정보처리산업기사</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">#대표</span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">#필기</span>
                <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-800">#실기</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {industrialTracks.map((track) => {
              const Icon = track.icon;
              return (
                <Link
                  key={track.href}
                  href={track.href}
                  className={`group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${track.borderClass}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">{track.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{track.subtitle}</p>
                    </div>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${track.iconClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <MoveLink />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-lg font-extrabold text-slate-900">기타 시험</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">#SQLD</span>
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">#AI프롬프트</span>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {extraTracks.map((track) => {
              const Icon = track.icon;
              return (
                <Link
                  key={track.href}
                  href={track.href}
                  className={`group rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 ${track.wrapClass}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${track.badgeClass}`}>
                        {track.badge}
                      </span>
                      <h2 className="mt-2 text-xl font-extrabold text-slate-900">{track.title}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{track.subtitle}</p>
                    </div>
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${track.iconClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <MoveLink />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
