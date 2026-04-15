'use client';

import { useState } from 'react';

export default function HintReveal({ hintBody, disabled }) {
  const [open, setOpen] = useState(false);
  if (!hintBody) return null;

  return (
    <div className="mb-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
        >
          🔍 힌트 보기
        </button>
      ) : (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
          <span aria-hidden className="leading-none">🔍</span>
          <div className="flex-1 leading-relaxed">{hintBody}</div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="힌트 닫기"
            className="shrink-0 rounded px-1 text-amber-700 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/50"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
