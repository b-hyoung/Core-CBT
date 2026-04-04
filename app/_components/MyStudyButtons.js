'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { BookMarked, ChevronRight, HelpCircle } from 'lucide-react';

function PersonalRow({ href, icon: Icon, title, desc }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-[1rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white px-4 py-3 transition hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800">
          <Icon className="h-4 w-4 text-sky-600 dark:text-slate-300" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{desc}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500" />
    </Link>
  );
}

export default function MyStudyButtons({
  resumeMap = {},
  sectionTitle = '내가 틀린 문제 모아보기',
  wrongHref = '/test/my-wrong',
  wrongResumeKey = 'my-wrong',
  wrongTitle = '오답',
  wrongDescription = '틀린 문제만 다시 모아 복습합니다.',
  unknownHref = '/test/my-unknown',
  unknownResumeKey = 'my-unknown',
  unknownTitle = '모르겠어요',
  unknownDescription = '모르겠어요 누른 문제만 다시 모아 점검합니다.',
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user) setShow(true);
    });
  }, []);

  if (!show) return null;

  return (
    <section className="rounded-[1.5rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{sectionTitle}</p>
      <div className="space-y-2">
        <div className="space-y-1.5">
          <PersonalRow href={wrongHref} icon={BookMarked} title={wrongTitle} desc={wrongDescription} />
          {resumeMap[wrongResumeKey]?.problemNumber && (
            <Link
              href={`${wrongHref}?p=${resumeMap[wrongResumeKey].problemNumber}&resume=1`}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
            >
              {wrongTitle} 이어풀기 {resumeMap[wrongResumeKey].problemNumber}번
            </Link>
          )}
        </div>

        <div className="space-y-1.5">
          <PersonalRow href={unknownHref} icon={HelpCircle} title={unknownTitle} desc={unknownDescription} />
          {resumeMap[unknownResumeKey]?.problemNumber && (
            <Link
              href={`${unknownHref}?p=${resumeMap[unknownResumeKey].problemNumber}&resume=1`}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
            >
              {unknownTitle} 이어풀기 {resumeMap[unknownResumeKey].problemNumber}번
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
