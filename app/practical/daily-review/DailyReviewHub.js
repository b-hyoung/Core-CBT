// app/practical/daily-review/DailyReviewHub.js
// 오늘의 복습 허브 — 세트 진입/생성/이어풀기/내일 예정이 한 화면에.
// 각 카드: 문제가 있으면 [풀기], 없으면 그 자리에서 [만들기] → 완료되면 바로 [풀기].
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBatchGenerate } from './useBatchGenerate';

const RESUME_STATE_KEY_PREFIX = 'quiz_resume_state_';
const CATEGORIES = ['SQL', 'Code', '이론'];

function sessionIdOf(setKey) {
  return setKey === 'review' ? 'practical-daily-review' : `practical-daily-review-${setKey}`;
}

export default function DailyReviewHub({ reviewCount, setCounts, tomorrowCount }) {
  const { runBatches, loadingKey, progress, summary, error, busy } = useBatchGenerate();
  const [resumeMap, setResumeMap] = useState({});

  const cards = [
    {
      setKey: 'review',
      title: '오답 복습',
      desc: '내가 틀린 문제의 변형 + 약한 개념 확장',
      count: reviewCount,
      accent: true,
      emptyAction: {
        label: '오답 변형 만들기 (내일 출제)',
        target: 25,
        makePayload: (n) => ({ maxAnchors: n }),
      },
    },
    ...CATEGORIES.map((category) => ({
      setKey: category,
      title: `${category} 집중 세트`,
      desc: '안 풀어본 유형 위주 기출 변형',
      count: setCounts[category] || 0,
      accent: false,
      emptyAction: {
        label: '20문제 만들고 바로 풀기',
        target: 20,
        makePayload: (n) => ({ category, count: n, dueToday: true }),
      },
    })),
  ];

  useEffect(() => {
    const next = {};
    for (const card of cards) {
      try {
        const raw = window.localStorage.getItem(`${RESUME_STATE_KEY_PREFIX}${sessionIdOf(card.setKey)}`);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const problemNumber = Number(parsed?.problemNumber);
        if (Number.isFinite(problemNumber) && problemNumber > 0) {
          next[card.setKey] = problemNumber;
        }
      } catch {
        // localStorage 접근 실패는 이어풀기 칩만 생략
      }
    }
    setResumeMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewCount, JSON.stringify(setCounts)]);

  const totalToday = cards.reduce((acc, c) => acc + c.count, 0);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">오늘의 복습</h1>
          <p className="mt-1 text-sm text-slate-500">
            {totalToday > 0
              ? `오늘 풀 문제 ${totalToday}개 — 맞히면 졸업, 틀리면 내일 새 변형`
              : '풀 문제가 없어요 — 아래 카드에서 바로 만들 수 있습니다'}
          </p>
        </div>

        <div className="space-y-3">
          {cards.map((card) => {
            const resumeAt = resumeMap[card.setKey];
            const baseHref = `/practical/daily-review?set=${encodeURIComponent(card.setKey)}`;
            const isEmpty = card.count === 0;
            const isGenerating = loadingKey === card.setKey;
            const justGenerated = summary?.key === card.setKey && summary.generated > 0;
            return (
              <div
                key={card.setKey}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${card.accent ? 'border-emerald-300' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900">
                      {card.title}
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${isEmpty ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-800'}`}>
                        {isEmpty ? '0문제' : `${card.count}문제`}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{card.desc}</p>
                    {justGenerated && (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">
                        ✅ {summary.generated}문제 생성 완료
                        {summary.rejected > 0 ? ` · ${summary.rejected}건 품질 미달 제외` : ''}
                        {card.setKey === 'review' ? ' (내일 출제)' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {!isEmpty ? (
                      <>
                        <Link
                          href={baseHref}
                          className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                        >
                          풀기
                        </Link>
                        {resumeAt ? (
                          <Link
                            href={`${baseHref}&p=${resumeAt}&resume=1`}
                            className="text-xs font-semibold text-amber-600 hover:underline"
                          >
                            {resumeAt}번부터 이어풀기
                          </Link>
                        ) : null}
                      </>
                    ) : (
                      <button
                        onClick={() => runBatches(card.setKey, card.emptyAction.makePayload, card.emptyAction.target)}
                        disabled={busy}
                        className="inline-flex rounded-lg border border-emerald-600 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {isGenerating ? progress || '생성 중...' : card.emptyAction.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

        {tomorrowCount > 0 && (
          <p className="mt-4 rounded-lg bg-sky-50 px-4 py-2.5 text-center text-sm text-sky-800">
            📅 내일 출제 예정 {tomorrowCount}문제가 준비돼 있어요
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-4">
          <Link href="/practical" className="text-sm font-semibold text-emerald-700 hover:underline">
            ← 실기 회차 선택으로
          </Link>
          <Link href="/practical/daily-review/generate" className="text-sm font-semibold text-slate-500 hover:underline">
            고급 생성 화면
          </Link>
        </div>
      </div>
    </div>
  );
}
