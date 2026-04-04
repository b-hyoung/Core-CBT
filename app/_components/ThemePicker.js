'use client';

import { useEffect, useState } from 'react';

export const themes = [
  { id: 'sky', label: 'Sky', color: 'oklch(60% 0.18 210)' },
  { id: 'violet', label: 'Violet', color: 'oklch(55% 0.25 280)' },
  { id: 'rose', label: 'Rose', color: 'oklch(55% 0.23 355)' },
  { id: 'amber', label: 'Amber', color: 'oklch(68% 0.18 75)' },
  { id: 'teal', label: 'Teal', color: 'oklch(55% 0.17 188)' },
];

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
};

function getInitialTheme() {
  if (typeof window === 'undefined') return 'sky';
  const stored = window.localStorage.getItem('color-theme');
  return themes.some((theme) => theme.id === stored) ? stored : 'sky';
}

export default function ThemePicker({ size = 'md' }) {
  const [active, setActive] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.colorTheme = active;
    window.localStorage.setItem('color-theme', active);
  }, [active]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {themes.map((theme) => (
        <button
          key={theme.id}
          type="button"
          onClick={() => setActive(theme.id)}
          aria-label={`${theme.label} 테마`}
          style={{
            backgroundColor: theme.color,
            boxShadow:
              active === theme.id ? `0 0 0 2px white, 0 0 0 4px ${theme.color}` : 'none',
          }}
          className={`inline-flex items-center justify-center rounded-full transition-all duration-150 hover:scale-105 active:scale-95 dark:[box-shadow:none] ${sizeClasses[size] || sizeClasses.md}`}
        />
      ))}
    </div>
  );
}
