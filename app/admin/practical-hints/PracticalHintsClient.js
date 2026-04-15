'use client';

import { useCallback, useEffect, useState } from 'react';

export default function PracticalHintsClient({ sessionIds }) {
  const [sessionId, setSessionId] = useState(sessionIds[0] || '');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/practical-hints?sessionId=${encodeURIComponent(sid)}`);
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const data = await res.json();
      setRows(data.rows || []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(sessionId);
  }, [sessionId, load]);

  const onSave = async ({ problemNumber, hintText }) => {
    setError('');
    const res = await fetch('/api/admin/practical-hints', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, problemNumber, hintText }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || `save failed: ${res.status}`);
      return;
    }
    setEditing(null);
    load(sessionId);
  };

  const onDelete = async (problemNumber) => {
    if (!window.confirm('이 override를 삭제하면 자동 추론 또는 원본 힌트로 돌아갑니다. 계속?')) return;
    setError('');
    const res = await fetch('/api/admin/practical-hints', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, problemNumber }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || `delete failed: ${res.status}`);
      return;
    }
    load(sessionId);
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-xl font-bold">실기 힌트 override</h1>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm font-semibold" htmlFor="session-select">
          회차
        </label>
        <select
          id="session-select"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          {sessionIds.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="mb-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div>불러오는 중...</div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-3 py-2 text-left">번호</th>
              <th className="px-3 py-2 text-left">힌트</th>
              <th className="px-3 py-2 text-left">수정자</th>
              <th className="px-3 py-2 text-left">수정 시각</th>
              <th className="px-3 py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                  저장된 override 없음
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.problem_number} className="border-b">
                  <td className="px-3 py-2 font-mono">{r.problem_number}</td>
                  <td className="px-3 py-2">{r.hint_text}</td>
                  <td className="px-3 py-2 text-slate-500">{r.updated_by || '-'}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {new Date(r.updated_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setEditing(r)}
                      className="mr-2 rounded border px-2 py-1 text-xs"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => onDelete(r.problem_number)}
                      className="rounded border px-2 py-1 text-xs text-rose-600"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <div className="mt-4 rounded border border-slate-200 p-3 text-sm">
        <div className="mb-2 font-semibold">새 override 추가</div>
        <NewOverrideForm onSave={onSave} />
      </div>

      {editing ? (
        <EditModal row={editing} onCancel={() => setEditing(null)} onSave={onSave} />
      ) : null}
    </div>
  );
}

function NewOverrideForm({ onSave }) {
  const [problemNumber, setProblemNumber] = useState('');
  const [hintText, setHintText] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ problemNumber: Number(problemNumber), hintText });
        setProblemNumber('');
        setHintText('');
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <input
        type="number"
        min={1}
        value={problemNumber}
        onChange={(e) => setProblemNumber(e.target.value)}
        placeholder="번호"
        className="w-20 rounded border px-2 py-1"
        required
      />
      <input
        type="text"
        maxLength={200}
        value={hintText}
        onChange={(e) => setHintText(e.target.value)}
        placeholder="힌트 텍스트"
        className="flex-1 rounded border px-2 py-1"
        required
      />
      <button type="submit" className="rounded bg-slate-800 px-3 py-1 text-white">
        저장
      </button>
    </form>
  );
}

function EditModal({ row, onCancel, onSave }) {
  const [hintText, setHintText] = useState(row.hint_text);
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-4">
        <div className="mb-2 font-semibold">문항 {row.problem_number} 수정</div>
        <textarea
          value={hintText}
          onChange={(e) => setHintText(e.target.value)}
          maxLength={200}
          rows={4}
          className="w-full rounded border p-2"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded border px-3 py-1">
            취소
          </button>
          <button
            onClick={() => onSave({ problemNumber: row.problem_number, hintText })}
            className="rounded bg-slate-800 px-3 py-1 text-white"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
