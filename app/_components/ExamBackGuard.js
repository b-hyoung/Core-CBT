'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function ExamBackGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname !== '/exam') return;
    if (searchParams.get('from') !== 'login') return;

    window.history.replaceState(window.history.state, '', '/exam');
    window.history.pushState({ __examGuard: true }, '', '/exam');

    const onPopState = () => {
      router.replace('/');
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [pathname, router, searchParams]);

  return null;
}
