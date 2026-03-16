'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Book, ChevronRight, Shuffle } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsClient';
import { PRACTICAL_SESSIONS_BY_YEAR } from './_lib/practicalSessions';
import UserQuickActions from '@/app/_components/UserQuickActions';

const RESUME_STATE_KEY_PREFIX = 'quiz_resume_state_';

export default function PracticalSelectionPage() {
  const [resumeMap, setResumeMap] = useState({});

  useEffect(() => {
    trackEvent('visit_test', { path: '/practical', sessionId: 'practical-index' });
  }, []);

  useEffect(() => {
    const refresh = () => {
      const ids = [
        'practical-high-wrong',
        'practical-high-unknown',
        'practical-random',
        ...PRACTICAL_SESSIONS_BY_YEAR.flatMap((g) => g.sessions.map((s) => s.id)),
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
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-emerald-50 to-teal-100 text-gray-800">
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <UserQuickActions className="mb-4" />
          <div className="text-center mb-12">
            <Link
              href="/exam"
              className="mb-5 inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              필기/실기 선택으로 돌아가기
            </Link>
            <h1 className="text-4xl md:text-5xl font-extrabold text-emerald-900 tracking-tight">실기 모의시험 회차 선택</h1>
            <p className="mt-4 text-lg text-gray-600">실기 주관식 입력형 CBT를 회차별/모드별로 연습하세요.</p>
          </div>

          <div className="mb-6 space-y-2">
            <Link
              href="/practical/high-wrong"
              className="block p-5 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-bold">오답률 높은 문제 풀기 (실기)</h2>
                    <p className="text-sm text-white/90">실기 문항 오답률 집계 기반 재풀이 모드</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
            {resumeMap['practical-high-wrong']?.problemNumber && (
              <Link
                href={`/practical/high-wrong?p=${resumeMap['practical-high-wrong'].problemNumber}&resume=1`}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-sm font-bold text-rose-800 hover:bg-rose-100"
              >
                오답률 모드 이어풀기 {resumeMap['practical-high-wrong'].problemNumber}번
              </Link>
            )}

            <Link
              href="/practical/high-unknown"
              className="block p-5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-bold">모르겠어요 많이 누른 문제 풀기 (실기)</h2>
                    <p className="text-sm text-white/90">실기 문항 모르겠어요 비율 집계 기반 재풀이 모드</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
            {resumeMap['practical-high-unknown']?.problemNumber && (
              <Link
                href={`/practical/high-unknown?p=${resumeMap['practical-high-unknown'].problemNumber}&resume=1`}
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1 text-sm font-bold text-violet-800 hover:bg-violet-100"
              >
                모르겠어요 모드 이어풀기 {resumeMap['practical-high-unknown'].problemNumber}번
              </Link>
            )}

            <Link
              href="/practical/random"
              className="block p-5 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-bold">랜덤풀기 (실기)</h2>
                    <p className="text-sm text-white/90">실기 전체 회차에서 랜덤 추출</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
            {resumeMap['practical-random']?.problemNumber && resumeMap['practical-random']?.resumeToken && (
              <Link
                href={`/practical/random?p=${resumeMap['practical-random'].problemNumber}&resume=1&seed=${encodeURIComponent(resumeMap['practical-random'].resumeToken)}`}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-sm font-bold text-indigo-800 hover:bg-indigo-100"
              >
                랜덤 모드 이어풀기 {resumeMap['practical-random'].problemNumber}번
              </Link>
            )}
          </div>

          <div className="space-y-4">
            {PRACTICAL_SESSIONS_BY_YEAR.map((yearGroup) => (
              <details
                key={yearGroup.year}
                className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 open:border-emerald-300"
                open={yearGroup.year === 2025 || yearGroup.year === 2024}
              >
                <summary className="list-none cursor-pointer p-6 md:p-7 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-xl">
                      <Book className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-900">{yearGroup.year}년</h2>
                  </div>
                  <ChevronRight className="w-7 h-7 text-gray-400" />
                </summary>

                <div className="px-4 pb-4 md:px-6 md:pb-6 space-y-3">
                  {yearGroup.sessions.map((session) => {
                    const resume = resumeMap[String(session.id)];
                    const targetHref = `/practical/${session.id}`;
                    const resumeHref = `/practical/${session.id}?resume=1`;
                    return (
                      <div key={session.id} className="space-y-2">
                        <Link
                          href={targetHref}
                          className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/60 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-emerald-900">{yearGroup.year}년 {session.title}</h3>
                              <p className="text-gray-600 mt-1">실기 주관식 입력형 CBT</p>
                            </div>
                            <ChevronRight className="w-6 h-6 text-gray-400" />
                          </div>
                        </Link>
                        {resume && (
                          <Link
                            href={resumeHref}
                            className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-sm font-bold text-amber-800 hover:bg-amber-100"
                          >
                            이어풀기 {resume.problemNumber}번
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
