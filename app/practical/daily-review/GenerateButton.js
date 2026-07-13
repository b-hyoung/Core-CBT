// app/practical/daily-review/GenerateButton.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GenerateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setSummary(null);
    try {
      const response = await fetch('/api/daily-review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '생성 실패');
      setSummary(data);
      router.refresh();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? '변형 생성 중... (1~2분 소요)' : '오답 변형 생성하기'}
      </button>
      {summary && (
        <p className="mt-3 text-sm text-slate-600">
          {summary.generated}문제 생성 완료 ({summary.dueDate}에 출제)
          {summary.rejected > 0 ? ` · ${summary.rejected}건 품질 미달로 제외` : ''}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
