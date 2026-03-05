import Link from 'next/link';
import { ArrowLeft, Bot, ChevronRight, Database, FilePenLine, FileText } from 'lucide-react';

const cards = [
  {
    href: '/test',
    title: '필기',
    subtitle: '객관식 CBT',
    description: '회차별 필기 모의시험, 랜덤 문제, 오답 재학습 모드로 연습합니다.',
    icon: FilePenLine,
    classes:
      'border-sky-200 bg-gradient-to-br from-white via-sky-50 to-cyan-50 hover:border-sky-400 hover:shadow-sky-100',
    iconWrap: 'bg-sky-100 text-sky-700',
    badge: '필기 시험',
    badgeClass: 'bg-sky-100 text-sky-800',
  },
  {
    href: '/practical',
    title: '실기',
    subtitle: '주관식 CBT',
    description: '회차별 실기 문제를 입력형 UI와 자동 채점으로 연습합니다.',
    icon: FileText,
    classes:
      'border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-teal-50 hover:border-emerald-400 hover:shadow-emerald-100',
    iconWrap: 'bg-emerald-100 text-emerald-700',
    badge: '실기 시험',
    badgeClass: 'bg-emerald-100 text-emerald-800',
  },
  {
    href: '/sqld',
    title: 'SQLD',
    subtitle: '객관식 CBT',
    description: '2024~2025 SQLD 회차별 객관식 문제를 모의시험처럼 연습합니다.',
    icon: Database,
    classes:
      'border-amber-200 bg-gradient-to-br from-white via-amber-50 to-orange-50 hover:border-amber-400 hover:shadow-amber-100',
    iconWrap: 'bg-amber-100 text-amber-700',
    badge: 'SQLD 시험',
    badgeClass: 'bg-amber-100 text-amber-800',
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

export default function ExamTypeSelectionPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-10 md:py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          홈으로 돌아가기
        </Link>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">모의시험 시작하기</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            시험 종류를 선택하세요
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
            필기와 실기를 분리해서 회차 목록을 볼 수 있도록 구성했습니다.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`group rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${card.classes}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${card.badgeClass}`}>
                      {card.badge}
                    </span>
                    <h2 className="mt-3 text-2xl font-extrabold text-slate-900">{card.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{card.subtitle}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{card.description}</p>
                  </div>
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.iconWrap}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-5 inline-flex items-center text-sm font-bold text-slate-800">
                  회차 선택으로 이동
                  <ChevronRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
