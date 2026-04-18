'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Book, ChevronRight, LoaderCircle, Shuffle } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsClient';
import UserQuickActions from '@/app/_components/UserQuickActions';
import MyStudyButtons from '@/app/_components/MyStudyButtons';
import ThemeControls from '@/app/_components/ThemeControls';

const RESUME_STATE_KEY_PREFIX = 'quiz_resume_state_';

const sessionsByYear = [
  {
    year: 'Now',
    sessions: [{ id: 12, title: '따끈 문제 60', description: '개발자가 방금 만든 신규 60문제 세트입니다.' }],
  },
  {
    year: 2025,
    sessions: [
      { id: 'pdfpack-industrial-2025-1', title: '1회', description: '2025년 1회 정보처리산업기사 필기 문제입니다.' },
      { id: 'pdfpack-industrial-2025-2', title: '2회', description: '2025년 2회 정보처리산업기사 필기 문제입니다.' },
      { id: 'pdfpack-industrial-2025-3', title: '3회', description: '2025년 3회 정보처리산업기사 필기 문제입니다.' },
    ],
  },
  {
    year: 2024,
    sessions: [
      { id: 1, title: '1회', description: '2024년 1회 기출문제입니다.' },
      { id: 4, title: '2회', description: '2024년 2회 기출문제입니다.' },
      { id: 5, title: '3회', description: '2024년 3회 기출문제입니다.' },
    ],
  },
  {
    year: 2023,
    sessions: [
      { id: 6, title: '1회', description: '2023년 1회 기출문제입니다.' },
      { id: 7, title: '2회', description: '2023년 2회 기출문제입니다.' },
      { id: 8, title: '3회', description: '2023년 3회 기출문제입니다.' },
    ],
  },
  {
    year: 2022,
    sessions: [
      { id: 9, title: '1회', description: '2022년 1회 기출문제입니다.' },
      { id: 10, title: '2회', description: '2022년 2회 기출문제입니다.' },
      { id: 11, title: '3회', description: '2022년 3회 기출문제입니다.' },
    ],
  },
  {
    year: '실기',
    sessions: [
      { id: 'practical-industrial-2022-1', title: '2022년 1회', description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)' },
      { id: 'practical-industrial-2022-2', title: '2022년 2회', description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)' },
      { id: 'practical-industrial-2022-3', title: '2022년 3회', description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)' },
      { id: 'practical-industrial-2023-1', title: '2023년 1회', description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)' },
      { id: 'practical-industrial-2023-2', title: '2023년 2회', description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)' },
      { id: 'practical-industrial-2023-3', title: '2023년 3회', description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)' },
      { id: 'practical-industrial-2024-1', title: '2024년 1회', description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)' },
      { id: 'practical-industrial-2024-2', title: '2024년 2회', description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)' },
      { id: 'practical-industrial-2024-3', title: '2024년 3회', description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)' },
    ],
  },
];

const writtenSessionsByYear = sessionsByYear.filter((group) => group.year !== '실기' && group.year !== 'Now');

const utilityModes = [
  {
    href: '/test/high-wrong',
    title: '오답률 높은 문제 풀기',
    desc: '전체 통계 기반 오답률 상위 문제 모음',
    colorClass: 'bg-rose-50 text-rose-700 dark:bg-slate-800 dark:text-slate-300',
    resumeKey: 'high-wrong',
    resumeColor: 'rose',
    availabilityKey: 'highWrong',
    buildResumeHref: (resume) => `/test/high-wrong?p=${resume.problemNumber}&resume=1`,
  },
  {
    href: '/test/high-unknown',
    title: '모르겠어요 많이 누른 문제 풀기',
    desc: '전체 통계 기반 모르겠어요 비율 상위 모음',
    colorClass: 'bg-violet-50 text-violet-700 dark:bg-slate-800 dark:text-slate-300',
    resumeKey: 'high-unknown',
    resumeColor: 'violet',
    availabilityKey: 'highUnknown',
    buildResumeHref: (resume) => `/test/high-unknown?p=${resume.problemNumber}&resume=1`,
  },
  {
    href: '/test/random',
    title: '랜덤풀기',
    desc: '전 회차에서 무작위로 출제',
    colorClass: 'bg-sky-50 text-sky-700 dark:bg-slate-800 dark:text-slate-300',
    resumeKey: 'random',
    resumeColor: 'indigo',
    buildResumeHref: (resume) =>
      `/test/random?p=${resume.problemNumber}&resume=1&seed=${encodeURIComponent(resume.resumeToken)}`,
    needsResumeToken: true,
  },
  {
    href: '/test/random22',
    title: '랜덤보기22 (문제 셔플형)',
    desc: '2022 / 2023 / 2024 / 2025 연도 선택 후 진행',
    colorClass: 'bg-violet-50 text-violet-700 dark:bg-slate-800 dark:text-slate-300',
  },
];

const resumeChipColors = {
  rose: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60',
  violet: 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60',
  indigo: 'border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/60',
};

function ResumeChip({ href, color = 'indigo', children }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${resumeChipColors[color]}`}
    >
      ↩ {children}
    </Link>
  );
}

function ResumeSlot({ children }) {
  return children ?? null;
}

function AvailabilityOverlay({ loading }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[1rem] bg-white/70 px-4 backdrop-blur-[3px] dark:bg-slate-950/70">
      <div className="inline-flex items-center gap-2 rounded-full border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200">
        {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
        <span>{loading ? '불러오는 중' : '아직 데이터가 모자랍니다'}</span>
      </div>
    </div>
  );
}

function SectionShell({ eyebrow, children }) {
  return (
    <section className="rounded-[1.5rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{eyebrow}</p>
      {children}
    </section>
  );
}

function LedgerRow({ href, title, desc, colorClass }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-[1rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white px-4 py-3 transition hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
          <Shuffle className="h-4 w-4" />
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

export default function TestSelectionPageClient({
  initialIsLoggedIn = null,
  initialIsAdmin = false,
  initialReviewAvailability = null,
  initialUtilityAvailability = null,
}) {
  const router = useRouter();
  const [resumeMap, setResumeMap] = useState({});
  const [utilityAvailability, setUtilityAvailability] = useState({
    highWrong: initialUtilityAvailability?.highWrongAvailable ? 'ready' : initialUtilityAvailability ? 'blocked' : 'loading',
    highUnknown: initialUtilityAvailability?.highUnknownAvailable ? 'ready' : initialUtilityAvailability ? 'blocked' : 'loading',
  });

  const refreshClientStoredState = () => {
    const allSessionIds = [
      'random',
      'high-wrong',
      'high-unknown',
      'my-wrong',
      'my-unknown',
      'random22',
      'random22-2022',
      'random22-2023',
      'random22-2024',
      'random22-2025',
      '100',
      ...sessionsByYear.flatMap((group) => group.sessions.map((session) => String(session.id))),
    ];

    const nextMap = {};
    for (const id of allSessionIds) {
      try {
        const raw = window.localStorage.getItem(`${RESUME_STATE_KEY_PREFIX}${id}`);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const problemNumber = Number(parsed?.problemNumber);
        if (Number.isNaN(problemNumber) || problemNumber <= 0) continue;
        nextMap[id] = { problemNumber, resumeToken: String(parsed?.resumeToken || '') };
      } catch {}
    }
    setResumeMap(nextMap);
  };

  useEffect(() => {
    const key = `visit_test_${new Date().toISOString().slice(0, 10)}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
    trackEvent('visit_test', { path: '/test' });
  }, []);

  useEffect(() => {
    if (initialUtilityAvailability) return;

    let active = true;

    fetch('/api/user/review-availability?examType=written', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) throw new Error('unauthorized');
        if (!response.ok) throw new Error('availability fetch failed');
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        setUtilityAvailability({
          highWrong: payload?.utility?.highWrongAvailable ? 'ready' : 'blocked',
          highUnknown: payload?.utility?.highUnknownAvailable ? 'ready' : 'blocked',
        });
      })
      .catch(() => {
        if (!active) return;
        setUtilityAvailability({ highWrong: 'ready', highUnknown: 'ready' });
      });

    return () => {
      active = false;
    };
  }, [initialUtilityAvailability]);

  useEffect(() => {
    const timerId = window.setTimeout(() => refreshClientStoredState(), 0);
    const onFocus = () => refreshClientStoredState();
    const onStorage = () => refreshClientStoredState();
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  useEffect(() => {
    utilityModes.forEach((mode) => {
      const status = mode.availabilityKey ? utilityAvailability[mode.availabilityKey] : 'ready';
      if (status === 'ready') {
        router.prefetch(mode.href);
      }
    });
  }, [router, utilityAvailability]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 text-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
      <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <UserQuickActions className="mb-0" initialIsLoggedIn={initialIsLoggedIn} initialIsAdmin={initialIsAdmin} />
          <ThemeControls />
        </div>

        <section className="mb-6 rounded-[1.5rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-sky-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/70 md:p-7">
          <div className="max-w-2xl">
            <Link
              href="/exam"
              className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" />
              필기/실기 선택으로 돌아가기
            </Link>
            <div className="mt-5">
              <h1 className="text-3xl font-black tracking-tight text-sky-900 dark:text-sky-100 md:text-[2.5rem]">
                모의시험 회차 선택
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                원하는 회차를 선택하여 실전처럼 연습하세요.
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <MyStudyButtons
            resumeMap={resumeMap}
            examType="written"
            initialIsLoggedIn={initialIsLoggedIn}
            initialAvailability={initialReviewAvailability}
          />

          <SectionShell eyebrow="특수 모드 / 종합">
            <div className="space-y-2">
              {utilityModes.map((mode) => {
                const resume = mode.resumeKey ? resumeMap[mode.resumeKey] : null;
                const canResume =
                  resume &&
                  (!mode.needsResumeToken || resume.resumeToken) &&
                  mode.buildResumeHref;
                const status = mode.availabilityKey ? utilityAvailability[mode.availabilityKey] : 'ready';

                return (
                  <div key={mode.href} className="space-y-1.5">
                    {status === 'ready' ? (
                      <LedgerRow href={mode.href} title={mode.title} desc={mode.desc} colorClass={mode.colorClass} />
                    ) : (
                      <div className="relative">
                        <div className="pointer-events-none blur-[1.5px] opacity-65">
                          <LedgerRow href={mode.href} title={mode.title} desc={mode.desc} colorClass={mode.colorClass} />
                        </div>
                        <AvailabilityOverlay loading={status === 'loading'} />
                      </div>
                    )}
                    <ResumeSlot>
                      {status === 'ready' && canResume ? (
                        <ResumeChip href={mode.buildResumeHref(resume)} color={mode.resumeColor}>
                          {mode.title} 이어풀기 {resume.problemNumber}번
                        </ResumeChip>
                      ) : null}
                    </ResumeSlot>
                  </div>
                );
              })}
            </div>
          </SectionShell>

          <SectionShell eyebrow="연도별 기출">
            <div className="space-y-3">
              {writtenSessionsByYear.map((yearGroup) => (
                <details
                  key={yearGroup.year}
                  className="group rounded-[1.25rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/35"
                  open={yearGroup.year === 2025 || yearGroup.year === 2024}
                >
                  <summary className="mb-2 flex list-none cursor-pointer items-center justify-between rounded-[1rem] bg-sky-50/80 px-3 py-3 transition-colors hover:bg-sky-50 dark:bg-slate-800/70 dark:hover:bg-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950/60">
                        <Book className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                      </div>
                      <span className="text-sm font-bold text-sky-900 dark:text-sky-100">
                        {typeof yearGroup.year === 'number' ? `${yearGroup.year}년` : `${yearGroup.year} 세트`}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-90 dark:text-slate-500" />
                  </summary>

                  <div className="space-y-2">
                    {yearGroup.sessions.map((session) => {
                      const resume = resumeMap[String(session.id)];
                      const sessionIdText = String(session.id);
                      const isPdfPack = sessionIdText.startsWith('pdfpack-');
                      const isPractical = sessionIdText.startsWith('practical-industrial-');
                      const targetHref = isPdfPack
                        ? `/test/pdf-pack/${sessionIdText.slice('pdfpack-'.length)}/quiz`
                        : isPractical
                          ? `/practical/${sessionIdText}`
                          : `/test/${sessionIdText}`;
                      const resumeHref = isPdfPack
                        ? `/test/pdf-pack/${sessionIdText.slice('pdfpack-'.length)}/quiz?p=${resume?.problemNumber}&resume=1`
                        : isPractical
                          ? `/practical/${sessionIdText}?resume=1`
                          : `/test/${sessionIdText}?p=${resume?.problemNumber}&resume=1`;

                      return (
                        <div key={session.id} className="space-y-1.5">
                          <Link
                            href={targetHref}
                            className="group/item flex items-center justify-between rounded-[1rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white px-4 py-3 transition hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{session.title}</p>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{session.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover/item:translate-x-0.5 dark:text-slate-500" />
                          </Link>
                          <ResumeSlot>
                            {resume ? (
                              <ResumeChip href={resumeHref} color="indigo">
                                이어풀기 {resume.problemNumber}번
                              </ResumeChip>
                            ) : null}
                          </ResumeSlot>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </SectionShell>
        </div>
      </main>
    </div>
  );
}
