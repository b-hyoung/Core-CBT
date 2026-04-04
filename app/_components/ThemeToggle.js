'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
};

function getInitialDarkMode() {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return stored ? stored === 'dark' : prefersDark;
}

export default function ThemeToggle({ size = 'md' }) {
  const [dark, setDark] = useState(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    window.localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((prev) => !prev)}
      aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className={`inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-[background-color,border-color,transform] duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.95] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 ${sizeClasses[size] || sizeClasses.md}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
