'use client';

import { inferAnswerFormat } from '../_lib/inferAnswerFormat';

export default function AnswerHint({ problem, correctAnswer }) {
  const explicit = problem?.answer_format_hint;
  const text = explicit || inferAnswerFormat(problem, correctAnswer);
  if (!text) return null;

  const isAuto = !explicit;

  return (
    <div className="mb-2 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
      <span aria-hidden className="text-base leading-none">💡</span>
      <div className="flex-1">{text}</div>
      {isAuto ? (
        <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          자동 추론
        </span>
      ) : null}
    </div>
  );
}
