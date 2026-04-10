'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, ChevronRight, Shuffle } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsClient';
import UserQuickActions from '@/app/_components/UserQuickActions';
import MyStudyButtons from '@/app/_components/MyStudyButtons';
import ThemeControls from '@/app/_components/ThemeControls';
import { AIPROMPT_SESSIONS } from '@/lib/objectiveSessionCatalog';

const RESUME_STATE_KEY_PREFIX = 'quiz_resume_state_';

function SectionShell({ eyebrow, children }) {
  return (
    <section className="rounded-[1.5rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white/92 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{eyebrow}</p>
      {children}
    </section>
  );
}

function ResumeSlot({ children }) {
  return children ?? null;
}

export default function AiPromptSelectionPageClient({
  initialIsLoggedIn = null,
  initialIsAdmin = false,
  initialReviewAvailability = null,
}) {
  const [resumeMap, setResumeMap] = useState({});

  useEffect(() => {
    trackEvent('visit_test', { path: '/aiprompt', sessionId: 'aiprompt-index' });
  }, []);

  useEffect(() => {
    const refresh = () => {
      const ids = ['aiprompt-my-wrong', 'aiprompt-my-unknown', ...AIPROMPT_SESSIONS.map((session) => session.id)];
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
          <UserQuickActions className="mb-0" initialIsLoggedIn={initialIsLoggedIn} initialIsAdmin={initialIsAdmin} />
          <ThemeControls />
        </div>

        <section className="mb-6 rounded-[1.5rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-sky-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/70 md:p-7">
          <div className="max-w-2xl">
            <Link
              href="/exam"
              className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              시험 종류 선택으로 돌아가기
            </Link>
            <div className="mt-5 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-sky-900 dark:text-sky-100 md:text-[2.5rem]">
                  AI 프롬프트엔지니어링 문제 선택
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  기출형 세트와 개념 정리 세트를 개인화 복습 흐름과 함께 바로 이어서 풀 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <MyStudyButtons
            resumeMap={resumeMap}
            examType="aiprompt"
            initialIsLoggedIn={initialIsLoggedIn}
            initialAvailability={initialReviewAvailability}
            sectionTitle="내가 틀린 AI 프롬프트 문제 모아보기"
            wrongHref="/aiprompt/my-wrong"
            wrongResumeKey="aiprompt-my-wrong"
            unknownHref="/aiprompt/my-unknown"
            unknownResumeKey="aiprompt-my-unknown"
          />

          <SectionShell eyebrow="랜덤 풀기">
            <Link
              href="/aiprompt/random"
              className="group flex items-center justify-between rounded-[1rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white px-4 py-3 transition hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                  <Shuffle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">A+B 혼합 랜덤</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">A형+B형 80문항 중 40문항 랜덤 추출 · 보기 셔플</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500" />
            </Link>
          </SectionShell>

          <SectionShell eyebrow="문제 세트 / 개념 정리">
            <div className="space-y-2">
              {AIPROMPT_SESSIONS.map((session) => (
                <div key={session.id} className="space-y-1.5">
                  <Link
                    href={`/test/${session.id}`}
                    className="group flex items-center justify-between rounded-[1rem] border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white px-4 py-3 transition hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-slate-800 dark:text-slate-300">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{session.round}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{session.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500" />
                  </Link>
                  <ResumeSlot>
                    {resumeMap[session.id]?.problemNumber && (
                      <Link
                        href={`/test/${session.id}?p=${resumeMap[session.id].problemNumber}&resume=1`}
                        className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/60"
                      >
                        이어풀기 {resumeMap[session.id].problemNumber}번
                      </Link>
                    )}
                  </ResumeSlot>
                </div>
              ))}
            </div>
          </SectionShell>
        </div>
      </div>
    </main>
  );
}
