// app/practical/daily-review/useBatchGenerate.js
// 작은 배치(3문제)로 반복 생성 — 연결 드랍·서버리스 타임아웃에도 진행분이 보존된다
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BATCH_SIZE = 3;
const MAX_ITERATIONS = 10;

export function useBatchGenerate() {
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
      setError(`${String(e?.message || e)}${generated > 0 ? ` (${generated}문제는 저장됨)` : ''}`);
      if (generated > 0) router.refresh();
    } finally {
      setLoadingKey('');
      setProgress('');
    }
  }

  return { runBatches, loadingKey, progress, summary, error, busy: Boolean(loadingKey) };
}
