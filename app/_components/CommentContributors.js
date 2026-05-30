// app/_components/CommentContributors.js
'use client';

import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';

export default function CommentContributors({ subject, sessionKey, problemNumber, onMyPendingChange }) {
  const [contributors, setContributors] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const key = `${subject}:${sessionKey}:${problemNumber}`;
    fetch(`/api/edits/${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok) {
          setContributors(data.contributors || []);
          onMyPendingChange?.(data.myPending || null);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [subject, sessionKey, problemNumber, onMyPendingChange]);

  if (contributors.length === 0) return null;

  const visible = contributors.slice(0, 3).map((c) => c.displayName);
  const rest = contributors.length - visible.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center gap-2 border-t border-[color:var(--theme-border-soft)] pt-2 text-left text-[0.8125rem] text-slate-600 transition-colors hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300"
      >
        <Pencil className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        <span>수정 기여 · {visible.join(', ')}{rest > 0 ? ` 외 ${rest}명` : ''}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm dark:bg-slate-950/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-[1.125rem] font-semibold text-slate-900 dark:text-slate-100">전체 기여자</h3>
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {contributors.map((c, i) => (
                <li key={i} className="flex justify-between text-[0.875rem]">
                  <span className="text-slate-700 dark:text-slate-200">{c.displayName}</span>
                  <span className="text-slate-400 dark:text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
