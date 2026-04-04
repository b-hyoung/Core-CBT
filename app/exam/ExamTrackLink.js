'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

export default function ExamTrackLink({
  href,
  className,
  children,
  style,
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    router.prefetch(href);
  }, [href, router]);

  const prefetch = () => {
    router.prefetch(href);
  };

  return (
    <>
      <Link
        href={href}
        prefetch
        style={style}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        onTouchStart={prefetch}
        onClick={() => setPending(true)}
        className={`${className} ${pending ? 'pointer-events-none cursor-progress scale-[0.99] opacity-90' : ''} relative overflow-hidden`}
      >
        {children}
      </Link>

      {pending ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/18 backdrop-blur-[3px] dark:bg-slate-950/40">
          <div className="mx-4 flex min-w-[180px] items-center gap-3 rounded-2xl border border-slate-200 bg-white/92 px-5 py-4 text-sm font-semibold text-slate-700 shadow-2xl dark:border-slate-700 dark:bg-slate-900/92 dark:text-slate-100">
            <LoaderCircle className="h-4 w-4 animate-spin text-sky-600 dark:text-sky-300" />
            <span>불러오는 중...</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
