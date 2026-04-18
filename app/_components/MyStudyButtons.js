'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BookMarked, ChevronRight, HelpCircle, LoaderCircle } from 'lucide-react';

const BLOCK_MESSAGE = '아직 데이터가 모자랍니다';

function AvailabilityOverlay({ loading, message = BLOCK_MESSAGE }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[1rem] bg-white/70 px-4 backdrop-blur-[3px] dark:bg-slate-950/70">
      <div className={`inline-flex items-center gap-2 rounded-full border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 ${loading ? 'animate-pulse' : ''}`}>
        {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
        <span>{loading ? '불러오는 중' : message}</span>
      </div>
    </div>
  );
}

function PersonalCardInner({ icon: Icon, title, desc }) {
  return (
    <>
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
    </>
  );
}

function PersonalRow({ href, icon, title, desc, status }) {
  const cardClassName =
    'group flex items-center justify-between rounded-[1rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white px-4 py-3 transition hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900';

  if (status === 'ready') {
    return (
      <Link href={href} className={cardClassName}>
        <PersonalCardInner icon={icon} title={title} desc={desc} />
      </Link>
    );
  }

  return (
    <div className="relative">
      <div className={`pointer-events-none transition duration-300 ${status === 'loading' ? 'scale-[0.995] blur-[1.5px] opacity-60 saturate-[0.88]' : 'blur-[1px] opacity-65 grayscale-[0.12]'}`}>
        <div className={`${cardClassName} ${status === 'loading' ? 'animate-pulse' : ''}`}>
          <PersonalCardInner icon={icon} title={title} desc={desc} />
        </div>
      </div>
      <AvailabilityOverlay loading={status === 'loading'} />
    </div>
  );
}

function ResumeSlot({ children }) {
  return children ?? null;
}

export default function MyStudyButtons({
  resumeMap = {},
  examType = 'written',
  initialIsLoggedIn = null,
  initialAvailability = null,
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
  const router = useRouter();
  const { status } = useSession();
  const hasInitialAuth = initialIsLoggedIn !== null;
  const authState = hasInitialAuth
    ? initialIsLoggedIn
      ? 'authenticated'
      : 'unauthenticated'
    : status;
  const [availability, setAvailability] = useState({
    wrong: initialAvailability?.wrongAvailable ? 'ready' : initialAvailability ? 'blocked' : 'loading',
    unknown: initialAvailability?.unknownAvailable ? 'ready' : initialAvailability ? 'blocked' : 'loading',
  });

  useEffect(() => {
    if (authState !== 'authenticated') return;
    if (initialAvailability) return;

    let active = true;

    fetch(`/api/user/review-availability?examType=${encodeURIComponent(examType)}`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('availability fetch failed');
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        setAvailability({
          wrong: payload?.review?.wrongAvailable ? 'ready' : 'blocked',
          unknown: payload?.review?.unknownAvailable ? 'ready' : 'blocked',
        });
      })
      .catch(() => {
        if (!active) return;
        setAvailability({ wrong: 'ready', unknown: 'ready' });
      });

    return () => {
      active = false;
    };
  }, [authState, examType, initialAvailability]);

  useEffect(() => {
    if (authState !== 'authenticated') return;
    if (availability.wrong === 'ready') router.prefetch(wrongHref);
    if (availability.unknown === 'ready') router.prefetch(unknownHref);
  }, [authState, availability.unknown, availability.wrong, router, unknownHref, wrongHref]);

  if (authState === 'unauthenticated') return null;

  const rowStatus = authState === 'loading' ? { wrong: 'loading', unknown: 'loading' } : availability;

  return (
    <section className="rounded-[1.5rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{sectionTitle}</p>
      <div className="space-y-2">
        <div className="space-y-1.5">
          <PersonalRow
            href={wrongHref}
            icon={BookMarked}
            title={wrongTitle}
            desc={wrongDescription}
            status={rowStatus.wrong}
          />
          <ResumeSlot>
            {rowStatus.wrong === 'ready' && resumeMap[wrongResumeKey]?.problemNumber ? (
              <Link
                href={`${wrongHref}?p=${resumeMap[wrongResumeKey].problemNumber}&resume=1`}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
              >
                {wrongTitle} 이어풀기 {resumeMap[wrongResumeKey].problemNumber}번
              </Link>
            ) : null}
          </ResumeSlot>
        </div>

        <div className="space-y-1.5">
          <PersonalRow
            href={unknownHref}
            icon={HelpCircle}
            title={unknownTitle}
            desc={unknownDescription}
            status={rowStatus.unknown}
          />
          <ResumeSlot>
            {rowStatus.unknown === 'ready' && resumeMap[unknownResumeKey]?.problemNumber ? (
              <Link
                href={`${unknownHref}?p=${resumeMap[unknownResumeKey].problemNumber}&resume=1`}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
              >
                {unknownTitle} 이어풀기 {resumeMap[unknownResumeKey].problemNumber}번
              </Link>
            ) : null}
          </ResumeSlot>
        </div>
      </div>
    </section>
  );
}
