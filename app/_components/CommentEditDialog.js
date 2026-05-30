// app/_components/CommentEditDialog.js
'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';

const MIN_LEN = 10;
const MAX_LEN = 1000;

export default function CommentEditDialog({
  open,
  onClose,
  subject,
  sessionKey,
  problemNumber,
  problemTitle,
  originalComment,
  onSubmitted,
}) {
  const [proposed, setProposed] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false); // success 화면 표시 플래그
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setProposed('');
    setIsAnonymous(false);
    setError('');
    setSubmitted(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const len = proposed.length;
  const lenColor =
    len < MIN_LEN ? 'text-rose-600 dark:text-rose-400'
    : len > MAX_LEN - 50 ? 'text-amber-600 dark:text-amber-400'
    : 'text-slate-500 dark:text-slate-400';
  const canSubmit = len >= MIN_LEN && len <= MAX_LEN && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, sessionKey, problemNumber, proposed, isAnonymous }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) setError('로그인이 필요해요.');
        else if (res.status === 429) setError('이미 이 문제에 제안하셨어요. 24시간 후 다시 시도해주세요.');
        else setError(data?.message || '제출에 실패했어요.');
        setSubmitting(false);
        return;
      }
      onSubmitted?.(data);
      setSubmitting(false);
      setSubmitted(true);
      // 1.6초간 성공 메시지 노출 후 자동 닫기
      setTimeout(() => onClose(), 1600);
    } catch {
      setError('네트워크 오류');
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm dark:bg-slate-950/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-2xl bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.5)] dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--theme-border)] px-6 py-4">
          <h2 className="text-[1.375rem] font-semibold text-slate-900 dark:text-slate-100">
            해설 수정 제안 <span className="text-slate-400 dark:text-slate-500">·</span>{' '}
            <span className="text-slate-600 dark:text-slate-300">{problemTitle}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-[1rem] font-semibold text-slate-900 dark:text-slate-100">제안이 전송됐어요</p>
            <p className="text-[0.875rem] text-slate-500 dark:text-slate-400">관리자 검토 후 반영됩니다.</p>
          </div>
        ) : (
        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              기존 해설
            </p>
            <div className="rounded-lg bg-[var(--surface-muted)] px-4 py-3 text-[0.9375rem] text-slate-700 dark:text-slate-300">
              {originalComment || <span className="text-slate-400 dark:text-slate-500">(기존 해설 없음)</span>}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              제안 내용
            </p>
            <textarea
              ref={textareaRef}
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              maxLength={MAX_LEN}
              rows={6}
              placeholder="해설을 어떻게 바꾸면 좋을지 작성해주세요."
              className="w-full resize-y rounded-lg border border-[color:var(--theme-border)] bg-white px-4 py-3 text-[0.9375rem] text-slate-900 outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--theme-ring)] dark:bg-slate-800 dark:text-slate-100"
            />
            <p className={`mt-1 text-[0.75rem] ${lenColor}`}>
              최소 {MIN_LEN}자 · 최대 {MAX_LEN}자 (현재 {len}/{MAX_LEN})
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[0.875rem] text-slate-700 dark:text-slate-300">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded border ${
                isAnonymous
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-[color:var(--theme-border)] bg-white dark:bg-slate-800'
              }`}
            >
              {isAnonymous && <Check className="h-3.5 w-3.5" />}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <span>익명으로 표시</span>
          </label>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>
        )}

        {!submitted && (
        <div className="flex items-center justify-end gap-2 border-t border-[color:var(--theme-border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[color:var(--theme-border)] px-4 py-2 text-[0.875rem] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="rounded-lg bg-sky-600 px-4 py-2 text-[0.875rem] font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
          >
            {submitting ? '제출 중...' : '제안 제출'}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
