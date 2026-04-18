'use client';

import Link from 'next/link';
import { LoaderCircle, LogOut, UserRound } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export default function UserQuickActions({
  className = '',
  initialIsLoggedIn = null,
  initialIsAdmin = false,
}) {
  const { status, data: session } = useSession();
  const hasInitialState = initialIsLoggedIn !== null;

  if (hasInitialState) {
    if (!initialIsLoggedIn) return null;

    return (
      <div className={`flex min-h-9 items-center justify-end gap-2 ${className}`}>
        <Link
          href="/mypage"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <UserRound className="h-3.5 w-3.5" />
          마이페이지
        </Link>
        {initialIsAdmin ? (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-sky-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            어드민페이지
          </Link>
        ) : null}
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

  if (status === 'loading') {
    return (
      <div className={`flex min-h-9 items-center justify-end ${className}`} aria-live="polite">
        <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          불러오는 중
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  const isAdmin = session.user.role === 'admin';

  return (
    <div className={`flex min-h-9 items-center justify-end gap-2 ${className}`}>
      <Link
        href="/mypage"
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <UserRound className="h-3.5 w-3.5" />
        마이페이지
      </Link>
      {isAdmin ? (
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-sky-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          어드민페이지
        </Link>
      ) : null}
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
