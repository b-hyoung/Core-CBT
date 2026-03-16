'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Book, ChevronRight, Shuffle } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsClient';
import { readUnknownProblems } from '@/lib/unknownProblemsStore';
import UserQuickActions from '@/app/_components/UserQuickActions';

const RESUME_STATE_KEY_PREFIX = 'quiz_resume_state_';

const sessionsByYear = [
  {
    year: 'Now',
    sessions: [
      { id: 12, title: '따끈 문제 60', description: '개발자가 방금 만든 신규 60문제 세트입니다.' },
    ],
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
      {
        id: 'practical-industrial-2022-1',
        title: '2022년 1회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2022-2',
        title: '2022년 2회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2022-3',
        title: '2022년 3회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2023-1',
        title: '2023년 1회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2023-2',
        title: '2023년 2회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2023-3',
        title: '2023년 3회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2024-1',
        title: '2024년 1회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2024-2',
        title: '2024년 2회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2024-3',
        title: '2024년 3회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
    ],
  },
];

const writtenSessionsByYear = sessionsByYear.filter((group) => group.year !== '실기');

export default function TestSelectionPage() {
  const [resumeMap, setResumeMap] = useState({});
  const [unknownProblems, setUnknownProblems] = useState([]);

  const refreshClientStoredState = () => {
    const allSessionIds = [
      'random',
      'high-wrong',
      'high-unknown',
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
    setUnknownProblems(readUnknownProblems());
  };

  useEffect(() => {
    const key = `visit_test_${new Date().toISOString().slice(0, 10)}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
    trackEvent('visit_test', { path: '/test' });
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      refreshClientStoredState();
    }, 0);
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

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-sky-50 to-sky-100 text-gray-800">
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <UserQuickActions className="mb-4" />
          <div className="text-center mb-12">
            <div className="mb-4">
              <Link
                href="/exam"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                필기/실기 선택으로 돌아가기
              </Link>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-sky-900 tracking-tight">모의시험 회차 선택</h1>
            <p className="mt-4 text-lg text-gray-600">원하는 회차를 선택하여 실전처럼 연습을 시작하세요.</p>
          </div>

          <div className="mb-4 space-y-2">
            <Link
              href="/test/high-wrong"
              className="block p-5 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-bold">오답률 높은 문제 풀기</h2>
                    <p className="text-sm text-white/90">문항별 오답률 집계 기반 재풀이 모드</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
            {resumeMap['high-wrong']?.problemNumber && (
              <Link
                href={`/test/high-wrong?p=${resumeMap['high-wrong'].problemNumber}&resume=1`}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-sm font-bold text-rose-800 hover:bg-rose-100"
              >
                오답률 모드 이어풀기 {resumeMap['high-wrong'].problemNumber}번
              </Link>
            )}

            <Link
              href="/test/high-unknown"
              className="block p-5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-bold">모르겠어요 많이 누른 문제 풀기</h2>
                    <p className="text-sm text-white/90">문항별 모르겠어요 비율 집계 기반 재풀이 모드</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
            {resumeMap['high-unknown']?.problemNumber && (
              <Link
                href={`/test/high-unknown?p=${resumeMap['high-unknown'].problemNumber}&resume=1`}
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1 text-sm font-bold text-violet-800 hover:bg-violet-100"
              >
                모르겠어요 모드 이어풀기 {resumeMap['high-unknown'].problemNumber}번
              </Link>
            )}

            <Link
              href="/test/random"
              className="block p-5 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-6 h-6" />
                  <h2 className="text-lg font-bold">랜덤풀기</h2>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
            {resumeMap.random?.problemNumber && resumeMap.random?.resumeToken && (
              <Link
                href={`/test/random?p=${resumeMap.random.problemNumber}&resume=1&seed=${encodeURIComponent(resumeMap.random.resumeToken)}`}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-sm font-bold text-indigo-800 hover:bg-indigo-100"
              >
                랜덤 이어풀기 {resumeMap.random.problemNumber}번
              </Link>
            )}
          </div>

          <Link
            href="/test/random22"
            className="mb-4 block p-5 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shuffle className="w-6 h-6" />
                <div>
                  <h2 className="text-lg font-bold">랜덤보기22 (문제 셔플형)</h2>
                  <p className="text-sm text-white/90">2022 / 2023 / 2024 / 2025 선택 후 진행</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6" />
            </div>
          </Link>

          <Link
            href="/test/100"
            className="mb-6 block p-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shuffle className="w-6 h-6" />
                <h2 className="text-lg font-bold">100문제 풀어보기</h2>
              </div>
              <ChevronRight className="w-6 h-6" />
            </div>
          </Link>

          {unknownProblems.length > 0 && (
            <Link
              href="/test/unknown"
              className="mb-6 block p-5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-bold">모르겠어요 다시 풀기</h2>
                    <p className="text-sm text-white/90">{unknownProblems.length}문제 대기 중</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
          )}

          <div className="space-y-4">
            {writtenSessionsByYear.map((yearGroup) => (
              <details
                key={yearGroup.year}
                className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 open:border-sky-300"
                open={yearGroup.year === 'Now' || yearGroup.year === 2025 || yearGroup.year === 2024}
              >
                <summary className="list-none cursor-pointer p-6 md:p-7 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-sky-100 rounded-xl">
                      <Book className="w-6 h-6 text-sky-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-sky-900">
                      {typeof yearGroup.year === 'number' ? `${yearGroup.year}년` : `${yearGroup.year} 세트`}
                    </h2>
                  </div>
                  <ChevronRight className="w-7 h-7 text-gray-400" />
                </summary>

                <div className="px-4 pb-4 md:px-6 md:pb-6 space-y-3">
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
                      <div key={session.id} className="space-y-2">
                        <Link
                          href={targetHref}
                          className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-sky-300 hover:bg-sky-50 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-sky-900">{session.title}</h3>
                              <p className="text-gray-600 mt-1">{session.description}</p>
                            </div>
                            <ChevronRight className="w-6 h-6 text-gray-400" />
                          </div>
                        </Link>
                        {resume && (
                          <Link
                            href={resumeHref}
                            className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-sm font-bold text-indigo-800 hover:bg-indigo-100"
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
