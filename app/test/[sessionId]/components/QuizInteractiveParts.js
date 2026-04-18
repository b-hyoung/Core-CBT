'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';

export function QuizSettingsPopover({
  isOpen,
  onClose,
  labels,
  enableAnswerCheck,
  onChangeEnableAnswerCheck,
  showExplanationWhenCorrect,
  onChangeShowExplanationWhenCorrect,
  showExplanationWhenIncorrect,
  onChangeShowExplanationWhenIncorrect,
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-12 z-20 w-64 rounded-lg border border-[color:var(--theme-border)] bg-white p-4 shadow-xl dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between border-b border-[color:var(--theme-border)] pb-2">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">{labels.settings}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-0.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="설정 닫기"
        >
          X
        </button>
      </div>
      <div className="space-y-3">
        <label className="flex cursor-pointer items-center space-x-2">
          <input
            type="checkbox"
            checked={enableAnswerCheck}
            onChange={(event) => onChangeEnableAnswerCheck(event.target.checked)}
            className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">{labels.enableCheck}</span>
        </label>
        <label className="flex cursor-pointer items-center space-x-2">
          <input
            type="checkbox"
            checked={showExplanationWhenCorrect}
            onChange={(event) => onChangeShowExplanationWhenCorrect(event.target.checked)}
            className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">{labels.showCorrect}</span>
        </label>
        <label className="flex cursor-pointer items-center space-x-2">
          <input
            type="checkbox"
            checked={showExplanationWhenIncorrect}
            onChange={(event) => onChangeShowExplanationWhenIncorrect(event.target.checked)}
            className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">{labels.showWrong}</span>
        </label>
      </div>
    </div>
  );
}

export function GptHelpSection({
  isGptUsedForCurrent,
  hasAssistantReplyForCurrent,
  showGptHelp,
  gptQuestion,
  onChangeGptQuestion,
  onAskGpt,
  gptLoading,
  gptMessages,
  gptError,
  hasSavedGptForCurrent,
  onOpenGptView,
  onOpenGptChat,
  gptMaxTurns,
}) {
  return (
    <div className="mt-4 border-t border-[color:var(--theme-border)] pt-4">
      <button
        type="button"
        onClick={onOpenGptView}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
      >
        GPT 해설보기
      </button>
      {isGptUsedForCurrent && !hasAssistantReplyForCurrent && (
        <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          이 문제는 GPT 이의신청을 1회만 요청할 수 있습니다.
        </p>
      )}

      {showGptHelp && (
        <div className="mt-3 space-y-3 rounded-lg border border-[color:var(--theme-border)] bg-white p-3 dark:bg-slate-800">
          <textarea
            value={gptQuestion}
            onChange={(event) => onChangeGptQuestion(event.target.value)}
            placeholder="추가로 궁금한 점이 있으면 적어주세요. (선택)"
            className="w-full rounded-md border border-[color:var(--theme-border)] px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--theme-ring)] dark:bg-slate-800 dark:text-slate-100"
            rows={3}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onAskGpt}
              disabled={gptLoading || gptMessages.filter((message) => message.role === 'user').length >= gptMaxTurns}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
            >
              {gptLoading ? 'GPT 답변 생성 중..' : 'GPT에게 물어보기'}
            </button>
          </div>

          {gptError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {gptError}
            </p>
          )}

          {(gptMessages.length > 0 || hasSavedGptForCurrent) && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onOpenGptChat}
                className="rounded-lg border border-[color:var(--theme-border-strong)] bg-sky-50 px-4 py-2 text-sm font-bold text-sky-800 hover:bg-sky-100 dark:bg-slate-800 dark:text-sky-200 dark:hover:bg-slate-700"
              >
                GPT 설명 보기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GptChatModal({
  isOpen,
  onClose,
  gptMessages,
  gptVoteMap,
  onVoteGpt,
  gptMaxTurns,
  gptQuestion,
  onChangeGptQuestion,
  onAskGpt,
  gptLoading,
  gptError,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-[color:var(--theme-border)] bg-white p-4 shadow-2xl dark:bg-slate-800 md:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-[color:var(--theme-border)] pb-2">
          <h3 className="text-base font-extrabold text-sky-900 dark:text-sky-100 md:text-lg">GPT 이의신청 대화</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            닫기
          </button>
        </div>

        <div className="max-h-[48vh] space-y-2 overflow-y-auto rounded-lg border border-[color:var(--theme-border)] bg-slate-50 p-3 dark:bg-slate-900/40">
          {gptMessages.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">아직 대화가 없습니다.</p>
          ) : (
            gptMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'ml-8 bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100'
                    : 'mr-8 border border-[color:var(--theme-border)] bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <p className="mb-1 text-xs font-bold opacity-70">{message.role === 'user' ? '나' : 'GPT'}</p>
                <p>{message.content}</p>
                {message.role === 'assistant' && message.cached && (
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">이전 대화를 통한 해석입니다. (캐시)</p>
                )}
                {message.role === 'assistant' && (
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {message.cacheKey && gptVoteMap[String(message.cacheKey)] && (
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">평가 완료</span>
                    )}
                    <button
                      type="button"
                      disabled={!message.cacheKey || Boolean(gptVoteMap[String(message.cacheKey)])}
                      onClick={() => onVoteGpt(index, 'up')}
                      className="inline-flex h-8 min-w-[56px] items-center justify-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      {Number(message?.feedback?.like || 0)}
                    </button>
                    <button
                      type="button"
                      disabled={!message.cacheKey || Boolean(gptVoteMap[String(message.cacheKey)])}
                      onClick={() => onVoteGpt(index, 'down')}
                      className="inline-flex h-8 min-w-[56px] items-center justify-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      {Number(message?.feedback?.dislike || 0)}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
            대화 {gptMessages.filter((message) => message.role === 'user').length} / {gptMaxTurns}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={gptQuestion}
              onChange={(event) => onChangeGptQuestion(event.target.value)}
              placeholder="추가 질문 입력"
              className="flex-1 rounded-lg border border-[color:var(--theme-border)] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--theme-ring)] dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={onAskGpt}
              disabled={gptLoading || gptMessages.filter((message) => message.role === 'user').length >= gptMaxTurns}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
            >
              {gptLoading ? '생성 중..' : '전송'}
            </button>
          </div>
          {gptError && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{gptError}</p>}
        </div>
      </div>
    </div>
  );
}

export function GptLoadingOverlay({ isOpen }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[color:var(--theme-border)] bg-white/95 p-5 text-center shadow-2xl backdrop-blur-sm dark:bg-slate-800/95">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--theme-border-soft)] border-t-sky-600" />
        <p className="text-base font-bold text-sky-900 dark:text-sky-100">GPT 해설 생성 중..</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}

export function ReportTipToast({ isOpen, countdown }) {
  if (!isOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center p-4">
      <div className="mt-4 w-full max-w-md rounded-2xl border border-[color:var(--theme-border)] bg-white p-4 text-center shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 dark:bg-slate-800">
        <p className="text-base font-bold leading-relaxed text-slate-800 dark:text-slate-100 md:text-lg">
          문제에 오류가 있다면 하단의
          <br />
          신고하기로 제보해주세요.
        </p>
        <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
          {countdown <= 3 ? `${countdown}초 후 사라집니다.` : '잠시 후 자동으로 사라집니다.'}
        </p>
      </div>
    </div>
  );
}
