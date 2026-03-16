'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Database } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsClient';
import UserQuickActions from '@/app/_components/UserQuickActions';

const sessionsByYear = [
  {
    year: 2025,
    sessions: [
      { id: 'sqld-2025-1', round: '1회', description: 'SQLD 2025년 1회 객관식 50문항' },
      { id: 'sqld-2025-2', round: '2회', description: 'SQLD 2025년 2회 객관식 50문항' },
      { id: 'sqld-2025-3', round: '3회', description: 'SQLD 2025년 3회 객관식 50문항' },
    ],
  },
  {
    year: 2024,
    sessions: [
      { id: 'sqld-2024-1', round: '1회', description: 'SQLD 2024년 1회 객관식 50문항' },
      { id: 'sqld-2024-2', round: '2회', description: 'SQLD 2024년 2회 객관식 50문항' },
      { id: 'sqld-2024-3', round: '3회', description: 'SQLD 2024년 3회 객관식 50문항' },
    ],
  },
];

export default function SqldSelectionPage() {
  useEffect(() => {
    trackEvent('visit_test', { path: '/sqld', sessionId: 'sqld-index' });
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-100 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <UserQuickActions className="mb-4" />
        <div className="mb-8 rounded-3xl border border-amber-200 bg-white/90 p-6 shadow-sm md:p-8">
          <Link
            href="/exam"
            className="mb-5 inline-flex items-center rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            필기/실기/SQLD 선택으로 돌아가기
          </Link>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-700">SQLD 모의시험</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                SQLD 회차 선택 (2024~2025)
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
                `SQL.MD` 기준으로 정리한 회차별 SQLD 객관식 데이터셋입니다. 각 회차는 50문항 / 2과목 구조로
                구성되어 있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {sessionsByYear.map((group) => (
            <section key={group.year} className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-slate-900">{group.year}년</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  {group.sessions.length}개 회차
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {group.sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/test/${session.id}`}
                    className="group rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md"
                  >
                    <p className="text-xs font-bold text-amber-700">SQLD {group.year}</p>
                    <h3 className="mt-2 text-xl font-extrabold text-slate-900">{session.round}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{session.description}</p>
                    <div className="mt-4 inline-flex items-center text-sm font-bold text-slate-800">
                      모의시험 시작
                      <ChevronRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
