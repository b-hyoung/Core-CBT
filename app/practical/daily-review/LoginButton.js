// app/practical/daily-review/LoginButton.js
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginButton() {
  const [isPending, setIsPending] = useState(false);

  async function handleLogin() {
    try {
      setIsPending(true);
      await signIn('google', { callbackUrl: '/practical/daily-review' });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={isPending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="text-base font-black text-sky-700">G</span>
      {isPending ? '이동 중...' : 'Google로 로그인하고 복습 시작'}
    </button>
  );
}
