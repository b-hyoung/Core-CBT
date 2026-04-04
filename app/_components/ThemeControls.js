'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Pipette } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { themes } from './ThemePicker';
import { trackEvent } from '@/lib/analyticsClient';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'sky';
  const stored = window.localStorage.getItem('color-theme');
  return themes.some((theme) => theme.id === stored) || stored === 'custom' ? stored : 'sky';
}

function getInitialCustomColor() {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_COLOR;
  return window.localStorage.getItem('custom-theme-color') || DEFAULT_CUSTOM_COLOR;
}

const WHEEL_STEP_THRESHOLD = 36;
const DEFAULT_CUSTOM_COLOR = '#0ea5e9';

export default function ThemeControls({ onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState(getInitialTheme);
  const [customColor, setCustomColor] = useState(getInitialCustomColor);
  const wheelDeltaRef = useRef(0);
  const colorInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.colorTheme = activeTheme;
    window.localStorage.setItem('color-theme', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--custom-theme-color', customColor);
    window.localStorage.setItem('custom-theme-color', customColor);
  }, [customColor]);

  const syncOpenState = (nextOpen) => {
    setOpen(nextOpen);
    if (typeof onOpenChange === 'function') onOpenChange(nextOpen);
  };

  useEffect(() => {
    return () => {
      if (typeof onOpenChange === 'function') onOpenChange(false);
    };
  }, [onOpenChange]);

  const recordThemeChange = (themeId, nextCustomColor, source) => {
    trackEvent('theme_change', {
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      payload: {
        themeId: String(themeId || 'sky'),
        customColor: themeId === 'custom' ? String(nextCustomColor || customColor || '') : '',
        source,
      },
    });
  };

  const applyTheme = (themeId, options = {}) => {
    const nextTheme = String(themeId || 'sky');
    const nextCustomColor = String(options.customColor || customColor || DEFAULT_CUSTOM_COLOR);
    setActiveTheme(nextTheme);
    if (nextTheme === 'custom') setCustomColor(nextCustomColor);
    if (options.track !== false) {
      recordThemeChange(nextTheme, nextCustomColor, options.source || 'button');
    }
  };

  const moveTheme = (direction) => {
    const themeOrder = [...themes.map((theme) => theme.id), 'custom'];
    const currentIndex = themeOrder.findIndex((themeId) => themeId === activeTheme);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (safeIndex + direction + themeOrder.length) % themeOrder.length;
    applyTheme(themeOrder[nextIndex], { source: 'wheel' });
  };

  const handleWheel = (event) => {
    if (!open) return;
    const dominantDelta =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

    wheelDeltaRef.current += dominantDelta;

    if (Math.abs(wheelDeltaRef.current) < WHEEL_STEP_THRESHOLD) return;

    event.preventDefault();
    moveTheme(wheelDeltaRef.current > 0 ? 1 : -1);
    wheelDeltaRef.current = 0;
  };

  const handleKeyDown = (event) => {
    if (!open) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    moveTheme(event.key === 'ArrowRight' ? 1 : -1);
  };

  const openColorPicker = () => {
    colorInputRef.current?.click();
  };

  const handleCustomColorChange = (event) => {
    const nextColor = event.target.value;
    applyTheme('custom', { customColor: nextColor, source: 'color-picker' });
  };

  return (
    <div className="relative flex items-center gap-2">
      <div
        className={`absolute right-[calc(100%+0.5rem)] top-1/2 z-30 -translate-y-1/2 overflow-hidden rounded-full transition-[max-width,opacity,transform] duration-300 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none sm:static sm:right-auto sm:top-auto sm:z-auto sm:translate-y-0 ${
          open ? 'max-w-64 translate-x-0 opacity-100' : 'pointer-events-none max-w-0 translate-x-2 opacity-0'
        }`}
        aria-hidden={!open}
      >
        <div
          role="group"
          aria-label="색상 테마 선택"
          tabIndex={open ? 0 : -1}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm outline-none dark:border-slate-700 dark:bg-slate-900"
          title="클릭하거나 스크롤로 색을 바꿀 수 있습니다."
        >
          <input
            ref={colorInputRef}
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={openColorPicker}
            aria-label="사용자 지정 색상 선택"
            style={{
              backgroundColor: customColor,
              boxShadow:
                activeTheme === 'custom' ? `0 0 0 2px white, 0 0 0 4px ${customColor}` : 'none',
              transitionDelay: `${open ? 0 : themes.length * 30}ms`,
            }}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-white transition-[transform,opacity] duration-300 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
              open ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
            } dark:[box-shadow:none]`}
            tabIndex={open ? 0 : -1}
            title="직접 색 고르기"
          >
            <Pipette className="h-3 w-3" />
          </button>
          {themes.map((theme, index) => {
            const delay = open ? (index + 1) * 45 : (themes.length - index) * 30;
            return (
              <button
                key={theme.id}
                type="button"
                aria-label={`${theme.label} 테마`}
                onClick={() => applyTheme(theme.id, { source: 'button' })}
                style={{
                  backgroundColor: theme.color,
                  boxShadow:
                    activeTheme === theme.id ? `0 0 0 2px white, 0 0 0 4px ${theme.color}` : 'none',
                  transitionDelay: `${delay}ms`,
                }}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-[transform,opacity] duration-300 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
                  open ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
                } dark:[box-shadow:none]`}
                tabIndex={open ? 0 : -1}
                title={`${theme.label} 테마`}
              />
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => syncOpenState(!open)}
        aria-label={open ? '테마 색상 접기' : '테마 색상 펼치기'}
        aria-expanded={open}
        className="relative z-40 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-[background-color,border-color,transform] duration-200 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.96] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 motion-reduce:transition-none"
      >
        <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? '' : 'rotate-180'}`} />
      </button>

      <div className="relative z-40 shrink-0">
        <ThemeToggle size="sm" />
      </div>
    </div>
  );
}
