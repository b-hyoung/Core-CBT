'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PlayCircle } from 'lucide-react';

const FAIL_QUOTES = [
  '멘탈 나가도 한 번 더 보면 잡힙니다.',
  '조금만 더 보면 점수는 따라옵니다.',
  '이번 회차에서 흔들린 부분만 다시 정리하면 됩니다.',
  '틀린 문제를 남겨두지 않는 쪽이 결국 이깁니다.',
];

export function UpdateNoticeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="exam-scale fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 md:p-7">
        <h2 className="mb-4 text-xl font-extrabold text-sky-900 dark:text-sky-100 md:text-2xl">업데이트 안내</h2>
        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300 md:text-base">
          <p>사용 경험을 개선한 항목을 반영했습니다.</p>
          <p>문제 네비게이션에서 정답, 오답, 미풀이 상태를 바로 확인할 수 있습니다.</p>
          <p>오른쪽 상단 설정에서 정답 확인과 해설 노출 방식을 조정할 수 있습니다.</p>
          <p>키보드로도 풀이할 수 있습니다. 숫자키 선택 후 Enter 또는 Space로 진행하세요.</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-sky-600 px-5 py-2.5 font-bold text-white transition hover:bg-sky-700"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export function TestLobby({ session, onStart, problemCount, labels }) {
  const backHref = String(session?.backHref || '/test');
  const lobbySubtitle = String(session?.lobbySubtitle || `총 ${problemCount}문항`);

  return (
    <div className="exam-scale flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-white via-sky-50 to-slate-100 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-2xl text-center">
        <Link
          href={backHref}
          className="group mb-8 inline-flex items-center text-slate-600 hover:text-sky-700 dark:text-slate-300 dark:hover:text-sky-300"
        >
          <ArrowLeft className="mr-2 h-5 w-5 transition-transform group-hover:-translate-x-1" />
          {labels.backToSession}
        </Link>

        <div className="rounded-2xl border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white/85 p-8 shadow-xl backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/85 md:p-12">
          <p className="font-semibold text-sky-700 dark:text-sky-300">{labels.lobbyTitle}</p>
          <h1 className="mt-2 mb-4 text-3xl font-extrabold text-sky-900 dark:text-sky-100 md:text-4xl">{session.title}</h1>
          <p className="mb-8 text-slate-700 dark:text-slate-300">{lobbySubtitle}</p>

          <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-3 md:flex-row">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex w-full items-center justify-center rounded-full bg-sky-600 px-8 py-4 text-lg font-bold text-white transition-transform hover:scale-105 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300 md:w-auto"
            >
              <PlayCircle className="mr-3 h-6 w-6" />
              {labels.start}
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            시작 전 설정에서 정답 확인 사용 여부와 해설 노출 방식을 조정할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export function QuizResults({ session, results, onRetryWrong, onRetryUnknown, labels, isReviewOnly = false }) {
  const {
    totalCorrect,
    totalCount = 60,
    wrongCount,
    unknownCount = 0,
    subjectCorrectCounts,
    subjectTotalCounts,
    subjectPassFail,
    isOverallPass,
    isRetryMode,
    elapsedSeconds = 0,
    subjectSummaries = [],
  } = results;

  const [showFailModal, setShowFailModal] = useState(!isReviewOnly && !isRetryMode && !isOverallPass);
  const [failQuote] = useState(() => FAIL_QUOTES[Math.floor(Math.random() * FAIL_QUOTES.length)]);
  const backHref = String(session?.backHref || '/test');
  const displaySubjectSummaries = Array.isArray(subjectSummaries) ? subjectSummaries : [];

  const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
  const elapsedH = String(Math.floor(safeElapsed / 3600)).padStart(2, '0');
  const elapsedM = String(Math.floor((safeElapsed % 3600) / 60)).padStart(2, '0');
  const elapsedS = String(Math.floor(safeElapsed % 60)).padStart(2, '0');

  return (
    <div className="exam-scale flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-white via-sky-50 to-slate-100 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-2xl text-center">
        <Link
          href={backHref}
          className="group mb-8 inline-flex items-center text-slate-600 hover:text-sky-700 dark:text-slate-300 dark:hover:text-sky-300"
        >
          <ArrowLeft className="mr-2 h-5 w-5 transition-transform group-hover:-translate-x-1" />
          {labels.backToSession}
        </Link>

        <div className="rounded-2xl border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white/85 p-8 shadow-xl backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/85 md:p-12">
          <h1 className="mt-2 mb-2 text-3xl font-extrabold text-sky-900 dark:text-sky-100 md:text-4xl">{session.title}</h1>
          {isRetryMode && (
            <p className="mb-2 text-base font-semibold text-sky-700 dark:text-sky-300 md:text-lg">다시 풀기 결과</p>
          )}

          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
              {labels.score}: {totalCorrect} / {totalCount}
            </h2>
            <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-400 md:text-base">
              걸린 시간: {elapsedH}:{elapsedM}:{elapsedS}
            </p>
            {!isReviewOnly ? (
              <p className={`text-3xl font-extrabold ${isOverallPass ? 'text-green-600' : 'text-red-600'}`}>
                {isOverallPass ? labels.pass : labels.fail}
              </p>
            ) : (
              <p className="text-2xl font-extrabold text-sky-700 dark:text-sky-300">검수 결과</p>
            )}
          </div>

          {!isReviewOnly ? (
            <div className="mb-8 grid grid-cols-1 gap-4 text-lg md:grid-cols-2 lg:grid-cols-3">
              {displaySubjectSummaries.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border-2 p-4 ${item.passed ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}
                >
                  <p className="font-semibold text-slate-700">{item.label}</p>
                  <p className="text-xl font-bold text-slate-900">
                    {item.correctCount} / {item.totalCount} {labels.qCount}
                  </p>
                  <p className={`font-semibold ${item.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {item.passed ? labels.avoidFail : labels.failSubject}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-8 grid grid-cols-1 gap-3 text-left">
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
                <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">검수용 점수 요약</p>
                <p className="mt-1 text-sm text-sky-800 dark:text-sky-200">
                  정답 기준으로 맞춘 문항만 표시합니다. 합격 여부는 참고용이 아닙니다.
                </p>
                <p className="mt-2 text-sm text-sky-800 dark:text-sky-200">
                  오답 {wrongCount}개 / 모르겠어요 {unknownCount}개
                </p>
              </div>
            </div>
          )}

          {wrongCount > 0 && (
            <button
              type="button"
              onClick={onRetryWrong}
              className="mx-auto mb-4 inline-flex w-full max-w-xs items-center justify-center rounded-full bg-amber-500 px-8 py-3 font-bold text-white transition hover:bg-amber-600"
            >
              오답만 다시 풀기 ({wrongCount})
            </button>
          )}

          {unknownCount > 0 && (
            <button
              type="button"
              onClick={onRetryUnknown}
              className="mx-auto mb-4 inline-flex w-full max-w-xs items-center justify-center rounded-full bg-sky-500 px-8 py-3 font-bold text-white transition hover:bg-sky-600"
            >
              {labels.unknownRetry} ({unknownCount})
            </button>
          )}

          <Link
            href={backHref}
            className="mx-auto inline-flex w-full max-w-xs items-center justify-center rounded-full bg-sky-600 px-8 py-4 text-lg font-bold text-white transition-transform hover:scale-105 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300"
          >
            <ArrowLeft className="mr-3 h-6 w-6" />
            {labels.chooseOther}
          </Link>
        </div>
      </div>

      {!isReviewOnly && !isRetryMode && !isOverallPass && showFailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[oklab(89.9%_-2.5%_-13.3%_/_0.8)] bg-white p-6 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-5 whitespace-pre-line text-lg font-bold text-slate-800 dark:text-slate-100">{failQuote}</p>
            <button
              type="button"
              onClick={() => setShowFailModal(false)}
              className="rounded-lg bg-sky-600 px-5 py-2.5 font-bold text-white transition hover:bg-sky-700"
            >
              다시 보고 이어가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
