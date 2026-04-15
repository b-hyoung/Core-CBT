'use client';

const REASON_LABELS = {
  exact: '완전 일치',
  case_insensitive: '대소문자 무관 인정',
  whitespace_ignored: '공백 무시 인정',
  punctuation_ignored: '구두점 무시 인정',
  korean_english_pair: '한/영 동의어 인정',
  label_normalized: '라벨 형식 정규화',
  accepted_alternative: '허용 표현 인정',
  order_independent: '순서 무시 인정',
};

function DiffText({ segments, showRemoved, showAdded }) {
  if (!segments?.length) return <span className="text-slate-400">-</span>;
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === 'equal') return <span key={i}>{seg.text}</span>;
        if (seg.type === 'removed' && showRemoved)
          return (
            <span
              key={i}
              className="bg-rose-100 text-rose-800 line-through dark:bg-rose-900/40 dark:text-rose-200"
            >
              {seg.text}
            </span>
          );
        if (seg.type === 'added' && showAdded)
          return (
            <span
              key={i}
              className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
            >
              {seg.text}
            </span>
          );
        return null;
      })}
    </div>
  );
}

export default function ResultFeedback({ grade, inputType }) {
  if (!grade) return null;
  const { matched, reasons = [], fieldResults, diff } = grade;

  const showReasons =
    matched &&
    reasons.length > 0 &&
    !(reasons.length === 1 && reasons[0] === 'exact');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`text-base font-bold ${
            matched
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {matched ? '✓ 정답입니다' : '✗ 오답입니다'}
        </span>
        {showReasons
          ? reasons.map((r) => (
              <span
                key={r}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
              >
                {REASON_LABELS[r] || r}
              </span>
            ))
          : null}
      </div>

      {(inputType === 'single' || inputType === 'textarea') && diff ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              내 답
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
              <DiffText segments={diff.segments} showRemoved showAdded={false} />
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              정답
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
              <DiffText segments={diff.segments} showRemoved={false} showAdded />
            </div>
          </div>
        </div>
      ) : null}

      {fieldResults && fieldResults.length > 0 &&
      (inputType === 'multi_blank' || inputType === 'ordered_sequence') ? (
        <div className="mt-1 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                  {inputType === 'ordered_sequence' ? '순서' : '라벨'}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                  내 답
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                  정답
                </th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">
                  판정
                </th>
              </tr>
            </thead>
            <tbody>
              {fieldResults.map((f, i) => (
                <tr
                  key={i}
                  className={f.matched ? '' : 'bg-rose-50/60 dark:bg-rose-900/10'}
                >
                  <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">
                    {f.label}
                  </td>
                  <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                    {f.userValue || <span className="text-slate-400">(빈칸)</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                    {f.correctValue || <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {f.matched ? (
                      <span className="text-emerald-600">✓</span>
                    ) : (
                      <span className="text-rose-600">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
