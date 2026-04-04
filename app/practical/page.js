'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Book, ChevronRight, LoaderCircle, Shuffle } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsClient';
import { PRACTICAL_SESSIONS_BY_YEAR } from './_lib/practicalSessions';
import UserQuickActions from '@/app/_components/UserQuickActions';
import MyStudyButtons from '@/app/_components/MyStudyButtons';
import ThemeControls from '@/app/_components/ThemeControls';

const RESUME_STATE_KEY_PREFIX = 'quiz_resume_state_';

const resumeChipColors = {
  rose: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60',
  violet: 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60',
  indigo: 'border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/60',
  amber: 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60',
};

const utilityModes = [
  {
    href: '/practical/high-wrong',
    title: '오답률 높은 문제 풀기',
    desc: '전체 통계 기반 오답률 상위 실기 문제 모음',
    colorClass: 'bg-rose-50 text-rose-700 dark:bg-slate-800 dark:text-slate-300',
    resumeKey: 'practical-high-wrong',
    resumeColor: 'rose',
    availabilityKey: 'highWrong',
    buildResumeHref: (resume) => `/practical/high-wrong?p=${resume.problemNumber}&resume=1`,
  },
  {
    href: '/practical/high-unknown',
    title: '모르겠어요 많은 문제 풀기',
    desc: '전체 통계 기반 모르겠어요 비율 상위 실기 문제 모음',
    colorClass: 'bg-violet-50 text-violet-700 dark:bg-slate-800 dark:text-slate-300',
    resumeKey: 'practical-high-unknown',
    resumeColor: 'violet',
    availabilityKey: 'highUnknown',
    buildResumeHref: (resume) => `/practical/high-unknown?p=${resume.problemNumber}&resume=1`,
  },
  {
    href: '/practical/random',
    title: '랜덤 풀기',
    desc: '실기 전체 회차에서 무작위로 출제',
    colorClass: 'bg-sky-50 text-sky-700 dark:bg-slate-800 dark:text-slate-300',
    resumeKey: 'practical-random',
    resumeColor: 'indigo',
    buildResumeHref: (resume) =>
      `/practical/random?p=${resume.problemNumber}&resume=1&seed=${encodeURIComponent(resume.resumeToken)}`,
    needsResumeToken: true,
  },
];

function ResumeChip({ href, color = 'indigo', children }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${resumeChipColors[color]}`}
    >
      {children}
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

export default function PracticalSelectionPage() {
  const [resumeMap, setResumeMap] = useState({});
  const [utilityAvailability, setUtilityAvailability] = useState({
    highWrong: 'loading',
    highUnknown: 'loading',
  });

  useEffect(() => {
    trackEvent('visit_test', { path: '/practical', sessionId: 'practical-index' });
  }, []);

  useEffect(() => {
    let active = true;

    fetch('/api/user/review-availability?examType=practical', { cache: 'no-store' })
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
  }, []);

  useEffect(() => {
    const refresh = () => {
      const ids = [
        'practical-my-wrong',
        'practical-my-unknown',
        'practical-high-wrong',
        'practical-high-unknown',
        'practical-random',
        ...PRACTICAL_SESSIONS_BY_YEAR.flatMap((group) => group.sessions.map((session) => session.id)),
      ];

      const next = {};
      for (const id of ids) {
        try {
          const raw = window.localStorage.getItem(`${RESUME_STATE_KEY_PREFIX}${id}`);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const problemNumber = Number(parsed?.problemNumber);
          if (!Number.isFinite(problemNumber) || problemNumber <= 0) continue;
          next[id] = { problemNumber, resumeToken: String(parsed?.resumeToken || '') };
        } catch {}
      }
      setResumeMap(next);
    };

    const timerId = window.setTimeout(refresh, 0);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 px-4 py-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <UserQuickActions className="mb-0" />
          <ThemeControls />
        </div>

        <section className="mb-6 rounded-[1.5rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-sky-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/70 md:p-7">
          <div className="max-w-2xl">
            <Link
              href="/exam"
              className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              필기/실기 선택으로 돌아가기
            </Link>
            <div className="mt-5">
              <h1 className="text-3xl font-black tracking-tight text-sky-900 dark:text-sky-100 md:text-[2.5rem]">
                실기 모의시험 회차 선택
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                실기 주관식 입력형 CBT를 회차별, 개인화 복습, 통계 모드로 바로 이어서 풀 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <MyStudyButtons
            resumeMap={resumeMap}
            examType="practical"
            sectionTitle="내가 틀린 실기 문제 모아보기"
            wrongHref="/practical/my-wrong"
            wrongResumeKey="practical-my-wrong"
            unknownHref="/practical/my-unknown"
            unknownResumeKey="practical-my-unknown"
          />

          <SectionShell eyebrow="특수 모드 / 종합">
            <div className="space-y-2">
              {utilityModes.map((mode) => {
                const resume = resumeMap[mode.resumeKey];
                const canResume = resume && (!mode.needsResumeToken || resume.resumeToken);
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
              {PRACTICAL_SESSIONS_BY_YEAR.map((yearGroup) => (
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
                      <span className="text-sm font-bold text-sky-900 dark:text-sky-100">{yearGroup.year}년</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-90 dark:text-slate-500" />
                  </summary>

                  <div className="space-y-2">
                    {yearGroup.sessions.map((session) => {
                      const resume = resumeMap[String(session.id)];
                      return (
                        <div key={session.id} className="space-y-1.5">
                          <Link
                            href={`/practical/${session.id}`}
                            className="group/item flex items-center justify-between rounded-[1rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white px-4 py-3 transition hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {yearGroup.year}년 {session.title}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">실기 주관식 CBT</p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover/item:translate-x-0.5 dark:text-slate-500" />
                          </Link>
                          <ResumeSlot>
                            {resume ? (
                              <ResumeChip href={`/practical/${session.id}?resume=1`} color="amber">
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
      </div>
    </main>
  );
}
