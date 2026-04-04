'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, UserRound } from 'lucide-react';
import { getSession, signOut } from 'next-auth/react';

export default function UserQuickActions({ className = '' }) {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const session = await getSession();
        if (!mounted) return;
        const loggedIn = Boolean(session?.user);
        setIsLoggedIn(loggedIn);

        if (!loggedIn) {
          setIsAdmin(false);
          return;
        }

        const res = await fetch('/api/admin/access', { cache: 'no-store' });
        if (!mounted) return;
        setIsAdmin(res.ok);
      } finally {
        if (mounted) setIsReady(true);
      }
    };

    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  if (!isReady || !isLoggedIn) return null;

  return (
    <div className={`flex items-center justify-end gap-2 ${className}`}>
      <Link
        href="/mypage"
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <UserRound className="h-3.5 w-3.5" />
        마이페이지
      </Link>
      {isAdmin && (
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-sky-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          어드민페이지
        </Link>
      )}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-rose-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <LogOut className="h-3.5 w-3.5" />
        로그아웃
      </button>
    </div>
  );
}
