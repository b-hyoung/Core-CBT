'use client';

import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { getProviders, getSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function StartLoginModalButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const openModal = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      const session = await getSession();
      if (session?.user) {
        router.push('/exam');
        return;
      }
      const providers = await getProviders();
      const hasGoogleProvider = Boolean(providers?.google);
      if (!hasGoogleProvider) {
        // Shared test env: auth provider can be disabled when .env is not configured.
        router.push('/exam');
        return;
      }
      setIsOpen(true);
    } finally {
      setIsPending(false);
    }
  };
  const closeModal = () => {
    if (!isPending) setIsOpen(false);
  };

  const handleGoogleLogin = async () => {
    try {
      setIsPending(true);
      const providers = await getProviders();
      const hasGoogleProvider = Boolean(providers?.google);
      if (!hasGoogleProvider) {
        router.push('/exam');
        return;
      }
      await signIn('google', { callbackUrl: '/exam' });
    } catch {
      router.push('/exam');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={isPending}
        className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-sky-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-200 transition-transform hover:scale-105 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:max-w-none sm:px-8 sm:py-4 sm:text-lg whitespace-nowrap"
      >
        모의시험 시작하기 <ArrowRight className="ml-2 w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-bold text-slate-900">로그인 후 시작</h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-5 text-sm text-slate-600">
              학습 기록 저장과 오답 분석을 위해 구글 로그인이 필요합니다.
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-base font-black text-sky-700">G</span>
              {isPending ? '이동 중...' : 'Google로 계속하기'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
