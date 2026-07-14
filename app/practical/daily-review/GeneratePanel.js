// app/practical/daily-review/GeneratePanel.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORY_BUTTONS = [
  { category: 'SQL', label: 'SQL 집중 20문제' },
  { category: 'Code', label: '코드 집중 20문제' },
  { category: '이론', label: '이론(네트워크 등) 20문제' },
];

// 한 요청에 3문제씩 — 요청이 짧아야 연결 드랍·서버리스 타임아웃에 안전
const BATCH_SIZE = 3;
const MAX_ITERATIONS = 10;

export default function GeneratePanel() {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState('');
  const [progress, setProgress] = useState('');
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  async function callGenerate(payload) {
    const response = await fetch('/api/daily-review/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error(data?.error || '생성 요청 실패');
    return data;
  }

  // 작은 배치를 반복 호출해 target까지 채움 — 중간에 끊겨도 진행분은 저장돼 있음
  async function runBatches(key, makePayload, target) {
    setLoadingKey(key);
    setError('');
    setSummary(null);
    let generated = 0;
    let rejected = 0;
    let dueDate = '';
    try {
      for (let i = 0; i < MAX_ITERATIONS && generated < target; i += 1) {
        setProgress(`${generated}/${target} 생성됨...`);
        const batch = Math.min(BATCH_SIZE, target - generated);
        const data = await callGenerate(makePayload(batch));
        generated += Number(data.generated) || 0;
        rejected += Number(data.rejected) || 0;
        dueDate = data.dueDate || dueDate;
        if (data.exhausted || ((Number(data.generated) || 0) === 0 && (Number(data.rejected) || 0) === 0)) break;
      }
      setSummary({ key, generated, rejected, dueDate });
      router.refresh();
    } catch (e) {
      // 이미 생성된 분량은 저장돼 있음 — 부분 성공을 알려줌
      setError(`${String(e?.message || e)}${generated > 0 ? ` (${generated}문제는 저장됨 — 새로고침해 보세요)` : ''}`);
    } finally {
      setLoadingKey('');
      setProgress('');
    }
  }

  const busy = Boolean(loadingKey);

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
          <Link href="/practical/daily-review" className="mt-1 inline-block font-bold underline">
            지금 풀러 가기 →
          </Link>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
