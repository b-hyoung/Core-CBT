'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Layers3, LayoutPanelTop, Rows3, Shuffle } from 'lucide-react';
import ThemeControls from '@/app/_components/ThemeControls';

const layoutOptions = [
  { id: 'focus-stack', label: 'Focus Stack' },
  { id: 'split-board', label: 'Split Board' },
  { id: 'compact-ledger', label: 'Compact Ledger' },
];

const modeCards = [
  {
    title: '오답률 높은 문제 풀기',
    desc: '전체 통계 기반 오답률 상위 문제 모음',
    className: 'from-rose-500 to-orange-400 dark:from-slate-900 dark:to-slate-900',
  },
  {
    title: '모르겠어요 많이 누른 문제 풀기',
    desc: '전체 통계 기반 모르겠어요 비율 상위 모음',
    className: 'from-violet-500 to-sky-500 dark:from-slate-900 dark:to-slate-900',
  },
  {
    title: '랜덤풀기',
    desc: '전 회차에서 무작위로 출제',
    className: 'from-sky-500 to-cyan-400 dark:from-slate-900 dark:to-slate-900',
  },
];

const yearGroups = [
  { year: '2025년', items: ['1회', '2회', '3회'] },
  { year: '2024년', items: ['1회', '2회', '3회'] },
];

function PreviewCard({ icon: Icon, title, desc, className }) {
  return (
    <div className={`rounded-[1.1rem] bg-gradient-to-r ${className} p-4 text-white shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/15">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight">{title}</p>
            <p className="mt-1 text-xs text-white/75">{desc}</p>
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 text-white/60" />
      </div>
    </div>
  );
}

function SectionFrame({ label, children }) {
  return (
    <section className="rounded-[1.5rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      {children}
    </section>
  );
}

function YearList() {
  return (
    <div className="space-y-3">
      {yearGroups.map((group) => (
        <div
          key={group.year}
          className="rounded-[1.25rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/35"
        >
          <div className="mb-2 flex items-center justify-between rounded-[1rem] bg-sky-50/80 px-3 py-3 dark:bg-slate-800/70">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950/60">
                <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-300" />
              </div>
              <span className="text-sm font-bold text-sky-900 dark:text-sky-100">{group.year}</span>
            </div>
            <ChevronRight className="h-4 w-4 rotate-90 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="space-y-2">
            {group.items.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-[1rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="text-sm font-bold text-sky-900 dark:text-sky-100">{item}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{group.year} 기출문제</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FocusStackLayout() {
  return (
    <SectionFrame label="Option 1 · Focus Stack">
      <div className="space-y-3">
        <div className="rounded-[1.4rem] bg-sky-50/80 p-5 dark:bg-slate-800/70">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
            <LayoutPanelTop className="h-3.5 w-3.5" />
            Hero + Core Picks
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-sky-900 dark:text-sky-100">가장 먼저 풀 문제</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">큰 액션 카드를 먼저 배치하는 집중형 레이아웃입니다.</p>
        </div>
        {modeCards.slice(0, 2).map((card) => (
          <PreviewCard key={card.title} icon={Shuffle} {...card} />
        ))}
        <YearList />
      </div>
    </SectionFrame>
  );
}

function SplitBoardLayout() {
  return (
    <SectionFrame label="Option 2 · Split Board">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.35rem] bg-slate-50 p-4 dark:bg-slate-950/40">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <Layers3 className="h-3.5 w-3.5" />
            Study Modes
          </div>
          <div className="space-y-3">
            {modeCards.map((card) => (
              <PreviewCard key={card.title} icon={Shuffle} {...card} />
            ))}
          </div>
        </div>
        <div className="rounded-[1.35rem] bg-slate-50 p-4 dark:bg-slate-950/40">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <BookOpen className="h-3.5 w-3.5" />
            Past Exams
          </div>
          <YearList />
        </div>
      </div>
    </SectionFrame>
  );
}

function CompactLedgerLayout() {
  return (
    <SectionFrame label="Option 3 · Compact Ledger">
      <div className="space-y-4">
        <div className="rounded-[1.35rem] border border-dashed border-sky-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/30">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
            <Rows3 className="h-3.5 w-3.5" />
            Dense Overview
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            정보 밀도를 조금 높여서 빠르게 훑는 데 초점을 둔 구조입니다.
          </p>
        </div>
        <div className="space-y-2 rounded-[1.35rem] bg-slate-50 p-3 dark:bg-slate-950/35">
          {modeCards.map((card) => (
            <div
              key={card.title}
              className="flex items-center justify-between rounded-[1rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950/60">
                  <Shuffle className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{card.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{card.desc}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
          ))}
        </div>
        <YearList />
      </div>
    </SectionFrame>
  );
}

export default function TestLayoutIdeasPage() {
  const [selectedLayout, setSelectedLayout] = useState('focus-stack');

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 px-4 py-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/test"
              className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" />
              시험 선택 화면으로 돌아가기
            </Link>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-sky-900 dark:text-sky-100 md:text-4xl">
              테스트 페이지 레이아웃 샘플
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              현재 정보 구조를 유지한 채 참고 사이트 스타일을 반영한 비교용 시안입니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-full border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white/92 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
            <label className="flex items-center gap-3 rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <span className="font-bold">Layout</span>
              <select
                value={selectedLayout}
                onChange={(event) => setSelectedLayout(event.target.value)}
                className="rounded-2xl border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {layoutOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <ThemeControls />
          </div>
        </div>

        {selectedLayout === 'focus-stack' && <FocusStackLayout />}
        {selectedLayout === 'split-board' && <SplitBoardLayout />}
        {selectedLayout === 'compact-ledger' && <CompactLedgerLayout />}
      </div>
    </main>
  );
}
