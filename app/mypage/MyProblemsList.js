'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, HelpCircle, ChevronRight, AlertCircle } from 'lucide-react';

const SESSION_LABELS = {
  '1': '2024년 1회차', '2': '2024년 2회차', '3': '2024년 3회차',
  '6': '2023년 1회차', '7': '2023년 2회차', '8': '2023년 3회차',
  '9': '2022년 1회차', '10': '2022년 2회차', '11': '2022년 3회차',
};

function sessionLabel(id) {
  return SESSION_LABELS[String(id)] || `${id}회차`;
}

function ProblemItem({ item, type }) {
  const accent = type === 'wrong'
    ? 'border-l-rose-400 hover:bg-rose-50/60'
    : 'border-l-amber-400 hover:bg-amber-50/60';
  const badge = type === 'wrong'
    ? 'bg-rose-100 text-rose-600'
    : 'bg-amber-100 text-amber-600';

  return (
    <Link
      href={`/test/${item.sourceSessionId}?p=${item.sourceProblemNumber}`}
      className={`group flex items-center justify-between rounded-xl border border-slate-200/80 border-l-4 ${accent} bg-white px-4 py-3.5 shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-px`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${badge}`}>
          {item.sourceProblemNumber}
        </span>
        <div>
          <p className="text-xs font-medium text-slate-400">{sessionLabel(item.sourceSessionId)}</p>
          <p className="text-sm font-bold text-slate-800 leading-snug">{item.sourceProblemNumber}번 문제</p>
          {item.correctAnswer && (
            <p className="text-xs text-slate-400 mt-0.5">정답: <span className="font-semibold text-slate-600">{item.correctAnswer}</span></p>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500" />
    </Link>
  );
}

function EmptyState({ type }) {
  const isWrong = type === 'wrong';
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
      {isWrong
        ? <BookOpen className="h-8 w-8 text-slate-300" />
        : <HelpCircle className="h-8 w-8 text-slate-300" />}
      <p className="text-sm font-semibold text-slate-400">
        {isWrong ? '틀린 문제가 없습니다.' : '모르겠어요로 표시한 문제가 없습니다.'}
      </p>
      <p className="text-xs text-slate-300">시험을 완료하면 자동으로 쌓입니다.</p>
    </div>
  );
}

export default function MyProblemsList() {
  const [tab, setTab] = useState('wrong');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/user/my-problems')
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setData(json);
        else setError(json.message || '불러오기 실패');
      })
      .catch(() => setError('네트워크 오류'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-5 w-24 animate-pulse rounded-md bg-slate-100 mb-4" />
        <div className="flex gap-2 mb-4">
          <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
          <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-50" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-rose-600">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      </section>
    );
  }

  const wrong = data?.wrong ?? [];
  const unknown = data?.unknown ?? [];
  const current = tab === 'wrong' ? wrong : unknown;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        {(wrong.length > 0 || unknown.length > 0) && (
          <span className="text-xs text-slate-400 font-medium">
            총 {wrong.length + unknown.length}문제
          </span>
        )}
      </div>

      {/* 탭 */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('wrong')}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-150 ${
            tab === 'wrong'
              ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          틀린 문제
          {wrong.length > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${
              tab === 'wrong' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-600'
            }`}>
              {wrong.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('unknown')}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-150 ${
            tab === 'unknown'
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          모르겠어요
          {unknown.length > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${
              tab === 'unknown' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-600'
            }`}>
              {unknown.length}
            </span>
          )}
        </button>
      </div>

      {/* 목록 */}
      {current.length === 0 ? (
        <EmptyState type={tab} />
      ) : (
        <div className="flex flex-col gap-2">
          {current.map((item) => (
            <ProblemItem key={item.key} item={item} type={tab} />
          ))}
        </div>
      )}
    </section>
  );
}
