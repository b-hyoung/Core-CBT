'use client';

import { useState } from 'react';
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

const LANG_THEME = {
  '전체':  { active: 'bg-slate-700 text-white', border: 'border-l-slate-400', hover: 'hover:bg-slate-50' },
  C:       { active: 'bg-indigo-600 text-white', border: 'border-l-indigo-500', hover: 'hover:bg-indigo-50/60' },
  Java:    { active: 'bg-orange-500 text-white', border: 'border-l-orange-400', hover: 'hover:bg-orange-50/60' },
  Python:  { active: 'bg-sky-600 text-white',    border: 'border-l-sky-500',    hover: 'hover:bg-sky-50/60' },
};

const CODE_LANGUAGES = [
  { key: '전체', icon: null, label: '전체' },
  { key: 'C',      icon: '/icons/c.svg',      label: 'C' },
  { key: 'Java',   icon: '/icons/java.svg',   label: 'Java' },
  { key: 'Python', icon: '/icons/python.svg', label: 'Python' },
];

function LanguageFilterTabs({ active, onChange, stats }) {
  const codeStats = stats?.Code || {};
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {CODE_LANGUAGES.map(({ key, icon, label }) => {
        const isActive = active === key;
        const theme = LANG_THEME[key] || LANG_THEME['전체'];
        const stat = key === '전체' ? codeStats._total : codeStats[key];
        const acc = stat?.total > 0 ? ` ${pct(stat.accuracy)}` : '';
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              isActive
                ? `${theme.active} shadow-sm`
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {icon && <img src={icon} alt={label} className={`h-4 w-4 ${isActive ? 'brightness-0 invert' : ''}`} />}
            {label}{acc}
          </button>
        );
      })}
    </div>
  );
}

function getLangBorder(subcategory, activeFilter) {
  if (activeFilter !== '전체') return LANG_THEME[activeFilter]?.border || 'border-l-slate-400';
  return LANG_THEME[subcategory]?.border || 'border-l-slate-400';
}

function getLangHover(subcategory, activeFilter) {
  if (activeFilter !== '전체') return LANG_THEME[activeFilter]?.hover || 'hover:bg-slate-50';
  return LANG_THEME[subcategory]?.hover || 'hover:bg-slate-50';
}

export default function CoachProblemListClient({ category, slug, stats, rows }) {
  const [langFilter, setLangFilter] = useState('전체');

  const filteredRows = category === 'Code' && langFilter !== '전체'
    ? rows.filter((r) => r.subcategory === langFilter)
    : rows;

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
          <h1 className="mb-4 text-xl font-extrabold text-slate-900">{category} 복습</h1>

          {category === 'Code' && (
            <LanguageFilterTabs active={langFilter} onChange={setLangFilter} stats={stats} />
          )}

          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-400">
                {category === 'Code' && langFilter !== '전체'
                  ? `${langFilter}에서 틀린 문제가 없어요`
                  : '이 카테고리에서 틀린 문제가 없어요'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredRows.map((r) => (
                <li key={`${r.source_session_id}:${r.problem_number}`}>
                  <Link
                    href={`/practical/${datasetIdToRouteId(r.source_session_id)}?p=${r.problem_number}&from=coach`}
                    className={`group flex items-center justify-between rounded-xl border border-slate-200/80 border-l-4 ${getLangBorder(r.subcategory, langFilter)} bg-white px-4 py-3 shadow-sm ${getLangHover(r.subcategory, langFilter)} hover:shadow-md transition`}
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
