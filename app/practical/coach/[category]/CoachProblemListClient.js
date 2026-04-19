'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

function pct(n) {
  return `${Math.round((n || 0) * 100)}%`;
}

// datasets 폴더명(2024-first) → Next.js 라우트 ID(practical-industrial-2024-1)
const ROUND_MAP = { first: '1', second: '2', third: '3' };
function datasetIdToRouteId(datasetId) {
  const m = String(datasetId).match(/^(\d{4})-(first|second|third)$/);
  if (!m) return datasetId;
  return `practical-industrial-${m[1]}-${ROUND_MAP[m[2]]}`;
}

const SESSION_LABELS = {
  '2022-first': '2022년 1회', '2022-second': '2022년 2회', '2022-third': '2022년 3회',
  '2023-first': '2023년 1회', '2023-second': '2023년 2회', '2023-third': '2023년 3회',
  '2024-first': '2024년 1회', '2024-second': '2024년 2회', '2024-third': '2024년 3회',
  '2025-first': '2025년 1회', '2025-second': '2025년 2회', '2025-third': '2025년 3회',
};

function prettySession(id) {
  return SESSION_LABELS[id] || id;
}

function SubStatsBadges({ category, stats }) {
  if (category === 'SQL') return null;
  if (category === 'Code') {
    const c = stats?.Code || {};
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Java {pct(c.Java?.accuracy)}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">C {pct(c.C?.accuracy)}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Python {pct(c.Python?.accuracy)}</span>
      </div>
    );
  }
  return null;
}

export default function CoachProblemListClient({ category, slug, stats, rows }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/practical/coach"
          className="mb-6 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          카테고리 선택으로
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-extrabold text-slate-900">{category} 복습</h1>
          <div className="mb-5">
            <SubStatsBadges category={category} stats={stats} />
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-400">이 카테고리에서 틀린 문제가 없어요</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={`${r.source_session_id}:${r.problem_number}`}>
                  <Link
                    href={`/practical/${datasetIdToRouteId(r.source_session_id)}?p=${r.problem_number}&from=coach`}
                    className="group flex items-center justify-between rounded-xl border border-slate-200/80 border-l-4 border-l-rose-400 bg-white px-4 py-3 shadow-sm hover:bg-rose-50/60 hover:shadow-md transition"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-400">{prettySession(r.source_session_id)}</p>
                      <p className="text-sm font-bold text-slate-800">
                        {r.problem_number}번
                        {r.subcategory && <span className="ml-2 text-xs font-semibold text-slate-500">({r.subcategory})</span>}
                      </p>
                      {r.question_preview && (
                        <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{r.question_preview}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500 transition-transform" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
