'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function ReportReasonPicker({
  value,
  onChange,
  options,
  placeholder = '선택해주세요',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex-1 min-w-[14rem]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-[border-color,background-color,box-shadow] duration-200 ${
          open
            ? 'border-slate-400 bg-slate-50 shadow-[0_0_0_2px_rgba(148,163,184,0.18)] dark:border-slate-500 dark:bg-slate-800'
            : 'border-[color:var(--theme-border)] bg-white dark:bg-slate-800'
        } text-gray-900 dark:text-slate-100`}
      >
        <span className={value ? '' : 'text-slate-500 dark:text-slate-400'}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 bg-slate-50/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/90">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 dark:text-slate-400">
              신고 사유 선택
            </p>
          </div>
          <div className="p-2">
            {options.map((option) => {
              const selected = value === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-slate-300 bg-slate-100 text-slate-950 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50'
                      : 'border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        selected ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                    <span>{option}</span>
                  </span>
                  <Check className={`h-4 w-4 ${selected ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
