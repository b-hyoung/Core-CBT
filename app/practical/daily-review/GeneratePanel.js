// app/practical/daily-review/GeneratePanel.js
// 고급 생성 화면용 패널 — 허브 카드와 같은 배치 생성 훅 사용
'use client';

import Link from 'next/link';
import { useBatchGenerate } from './useBatchGenerate';

const CATEGORY_BUTTONS = [
  { category: 'SQL', label: 'SQL 집중 20문제' },
  { category: 'Code', label: '코드 집중 20문제' },
  { category: '이론', label: '이론(네트워크 등) 20문제' },
];

export default function GeneratePanel() {
  const { runBatches, loadingKey, progress, summary, error, busy } = useBatchGenerate();

  const solveHref = summary
    ? CATEGORY_BUTTONS.some((b) => b.category === summary.key)
      ? `/practical/daily-review?set=${encodeURIComponent(summary.key)}`
      : '/practical/daily-review?set=review'
    : '';

  return (
    <div className="mt-6 space-y-5 text-left">
      <div>
        <p className="mb-2 text-sm font-bold text-slate-700">내 오답 변형 만들기</p>
        <button
          onClick={() => runBatches('wrong', (n) => ({ maxAnchors: n }), 25)}
          disabled={busy}
          className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loadingKey === 'wrong' ? progress || '변형 생성 중...' : '오답 변형 생성 (내일 출제)'}
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-slate-700">집중 세트 — 지금 바로 풀기</p>
        <div className="grid gap-2">
          {CATEGORY_BUTTONS.map(({ category, label }) => (
            <button
              key={category}
              onClick={() => runBatches(category, (n) => ({ category, count: n, dueToday: true }), 20)}
              disabled={busy}
              className="inline-flex w-full items-center justify-center rounded-lg border border-emerald-600 bg-white px-4 py-2.5 font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              {loadingKey === category ? progress || `${category} 세트 생성 중...` : label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          안 풀어본 유형 우선으로 기출 변형을 만듭니다. 3문제씩 진행되며 5분 안팎 걸려요.
        </p>
      </div>

      {summary && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p>
            ✅ {summary.generated}문제 생성 완료 ({summary.dueDate}에 출제)
            {summary.rejected > 0 ? ` · ${summary.rejected}건 품질 미달로 제외` : ''}
          </p>
          <Link href={solveHref || '/practical/daily-review'} className="mt-1 inline-block font-bold underline">
            지금 풀러 가기 →
          </Link>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
