'use client';

import Link from 'next/link';
import { ChevronLeft, Brain, Database, Code2, BookOpen, AlertCircle } from 'lucide-react';

function pct(n) {
  return `${Math.round((n || 0) * 100)}%`;
}

function CategoryRow({ icon: Icon, label, accent, accuracy, href, disabled, disabledLabel }) {
  const cardClasses = `flex items-center justify-between rounded-xl border bg-white px-5 py-4 shadow-sm transition ${
    disabled ? 'border-slate-200 opacity-60 cursor-not-allowed' : 'border-slate-200 hover:-translate-y-px hover:shadow-md'
  }`;
  const content = (
    <>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <p className="text-xs text-slate-400">정답률 <span className="font-semibold text-slate-600">{pct(accuracy)}</span></p>
        </div>
      </div>
      {disabled
        ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{disabledLabel || '준비중입니다'}</span>
        : <span className="text-xs font-semibold text-sky-600">복습하기 ▶</span>}
    </>
  );
  if (disabled) return <div className={cardClasses}>{content}</div>;
  return <Link href={href} className={cardClasses}>{content}</Link>;
}

export default function CoachCategoryPageClient({ stats }) {
  const totalAttempts =
    (stats?.SQL?.total || 0) +
    (stats?.Code?._total?.total || 0) +
    (stats?.이론?._total?.total || 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/practical"
          className="mb-6 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          실기 회차 선택으로
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">코치 에이전트</p>
              <h1 className="text-2xl font-extrabold text-slate-900">내 약점 진단</h1>
            </div>
          </div>

          {totalAttempts === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-400">아직 실기를 풀어본 기록이 없어요.</p>
              <p className="text-xs text-slate-300">실기를 한 번 풀고 오시면 약점 진단을 해드릴 수 있어요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <CategoryRow
                icon={Database}
                label="SQL"
                accent="bg-sky-100 text-sky-600"
                accuracy={stats?.SQL?.accuracy}
                href="/practical/coach/sql"
              />
              <CategoryRow
                icon={Code2}
                label="Code"
                accent="bg-emerald-100 text-emerald-600"
                accuracy={stats?.Code?._total?.accuracy}
                href="/practical/coach/code"
              />
              <CategoryRow
                icon={BookOpen}
                label="이론"
                accent="bg-amber-100 text-amber-600"
                accuracy={stats?.이론?._total?.accuracy}
                disabled
                disabledLabel="준비중입니다"
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
