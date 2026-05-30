'use client';

import { Pencil } from 'lucide-react';

export default function CommentEditButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 text-[0.8125rem] text-slate-500 transition-colors hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:text-sky-300"
    >
      <Pencil className="h-3.5 w-3.5" />
      <span>수정 제안</span>
    </button>
  );
}
