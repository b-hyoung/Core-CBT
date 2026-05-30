'use client';

// app/shorts/[sessionId]/ShortsPlayer.js
// 문제 → 정답 공개 → 해설 → 다음 문제 자동 진행 (TTS + 수동 컨트롤)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'shorts_progress_v1_';

// 페이즈 사이 기본 대기 시간 (ms) — TTS 종료 후 자동 진행 전 살짝 멈춤
const PHASE_GAP_MS = 600;

// 보기 번호 기호 매핑
const OPTION_SYMBOLS = ['①', '②', '③', '④', '⑤', '⑥'];

const SPEED_OPTIONS = [0.8, 1.0, 1.25, 1.5, 2.0];

function speak(text, { rate = 1, onEnd, onError, voice }) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return null;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = rate;
  if (voice) u.voice = voice;
  u.onend = () => onEnd?.();
  u.onerror = (e) => onError?.(e);
  window.speechSynthesis.speak(u);
  return u;
}

function pickKoreanVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'ko-KR') ||
    voices.find((v) => v.lang?.startsWith('ko')) ||
    null
  );
}

function buildQuestionScript(item) {
  const parts = [`${item.number}번.`, item.question];
  if (item.examples) parts.push(item.examples);
  item.options.forEach((opt, i) => {
    parts.push(`${OPTION_SYMBOLS[i] || `${i + 1}번`}. ${opt}.`);
  });
  return parts.join(' ');
}

function buildAnswerScript(item) {
  const n = item.correctIndex + 1;
  const sym = OPTION_SYMBOLS[item.correctIndex] || `${n}번`;
  return `정답은 ${sym}. ${item.correctText}.`;
}

function buildExplanationScript(item) {
  if (!item.comment) return '';
  return `해설. ${item.comment}`;
}

export default function ShortsPlayer({ items, title, sessionId }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('question'); // 'question' | 'answer' | 'explanation'
  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [voice, setVoice] = useState(null);
  const phaseTimer = useRef(null);
  const currentUtterance = useRef(null);

  const item = items[index];
  const storageKey = `${STORAGE_KEY_PREFIX}${sessionId}`;

  // 진행 상황 복원
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const n = Number(saved);
        if (Number.isFinite(n) && n >= 0 && n < items.length) setIndex(n);
      }
    } catch {}
  }, [storageKey, items.length]);

  // 진행 상황 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, String(index));
    } catch {}
  }, [index, storageKey]);

  // 한국어 음성 선택 (voices가 비동기 로드되는 브라우저 대응)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const update = () => setVoice(pickKoreanVoice());
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);

  // 페이즈/문제 변경 시 TTS 재생
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (phaseTimer.current) {
      clearTimeout(phaseTimer.current);
      phaseTimer.current = null;
    }
    window.speechSynthesis?.cancel();

    if (!isPlaying || !item) return;

    let script = '';
    if (phase === 'question') script = buildQuestionScript(item);
    else if (phase === 'answer') script = buildAnswerScript(item);
    else if (phase === 'explanation') script = buildExplanationScript(item);

    const advanceFn = () => {
      phaseTimer.current = setTimeout(() => goNextPhase(), PHASE_GAP_MS);
    };

    if (!script || muted) {
      // 스크립트 없거나 음소거 — 페이즈별 정적 대기 후 진행
      const fallbackMs = phase === 'answer' ? 1800 : phase === 'explanation' ? 3000 : 4000;
      phaseTimer.current = setTimeout(() => goNextPhase(), fallbackMs);
      return;
    }

    currentUtterance.current = speak(script, {
      rate: speed,
      voice,
      onEnd: advanceFn,
      onError: advanceFn,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase, isPlaying, muted, speed, voice]);

  // 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (phaseTimer.current) clearTimeout(phaseTimer.current);
    };
  }, []);

  const goNextPhase = useCallback(() => {
    setPhase((p) => {
      if (p === 'question') return 'answer';
      if (p === 'answer') {
        // 해설 없으면 바로 다음 문제로 점프
        if (!item?.comment) {
          setIndex((i) => Math.min(items.length - 1, i + 1));
          return 'question';
        }
        return 'explanation';
      }
      // explanation → 다음 문제
      setIndex((i) => {
        if (i >= items.length - 1) return i; // 마지막이면 멈춤
        return i + 1;
      });
      return 'question';
    });
  }, [item, items.length]);

  const goPrev = useCallback(() => {
    if (phase === 'explanation') {
      setPhase('answer');
      return;
    }
    if (phase === 'answer') {
      setPhase('question');
      return;
    }
    setIndex((i) => {
      const prev = Math.max(0, i - 1);
      setPhase('question');
      return prev;
    });
  }, [phase]);

  const goNext = useCallback(() => {
    goNextPhase();
  }, [goNextPhase]);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const phaseLabel = useMemo(() => {
    if (phase === 'question') return '문제';
    if (phase === 'answer') return '정답';
    return '해설';
  }, [phase]);

  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        데이터가 없습니다.
      </div>
    );
  }

  const correctSym = OPTION_SYMBOLS[item.correctIndex] || `${item.correctIndex + 1}번`;
  const showAnswer = phase === 'answer' || phase === 'explanation';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
      {/* 9:16 세로 카드 */}
      <div className="relative flex aspect-[9/16] w-full max-w-[420px] flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl ring-1 ring-slate-800">

        {/* progress bar */}
        <div className="absolute left-0 right-0 top-0 z-10 h-1 bg-slate-800/80">
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{ width: `${((index + 1) / items.length) * 100}%` }}
          />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 text-[0.75rem] text-slate-400">
          <span className="font-medium text-slate-300">{title}</span>
          <span>{index + 1} / {items.length}</span>
        </div>

        {/* phase chip */}
        <div className="mt-2 flex justify-center">
          <span
            className={`rounded-full px-3 py-1 text-[0.7rem] font-semibold tracking-[0.15em] uppercase ${
              phase === 'question'
                ? 'bg-slate-800 text-slate-300'
                : phase === 'answer'
                  ? 'bg-sky-600/30 text-sky-200'
                  : 'bg-emerald-600/30 text-emerald-200'
            }`}
          >
            {phaseLabel}
          </span>
        </div>

        {/* body */}
        <div
          onClick={goNext}
          className="flex-1 cursor-pointer overflow-y-auto px-5 py-4"
          aria-label="탭하면 다음 페이즈로 진행"
        >
          <div className="mb-2 text-[0.7rem] uppercase tracking-[0.1em] text-slate-500">
            {item.sectionTitle || '문제'} · #{item.number}
          </div>
          <h2 className="mb-3 text-[1.0625rem] font-semibold leading-snug text-slate-100">
            {item.question}
          </h2>
          {item.examples && (
            <pre className="mb-3 whitespace-pre-wrap rounded-md bg-slate-900/60 px-3 py-2 text-[0.8125rem] text-slate-300">
              {item.examples}
            </pre>
          )}

          <ul className="space-y-2">
            {item.options.map((opt, i) => {
              const isCorrect = showAnswer && i === item.correctIndex;
              const sym = OPTION_SYMBOLS[i] || `${i + 1}`;
              return (
                <li
                  key={i}
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-[0.9375rem] transition-colors ${
                    isCorrect
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                      : 'border-slate-700 bg-slate-900/40 text-slate-200'
                  }`}
                >
                  <span className={`shrink-0 font-semibold ${isCorrect ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {sym}
                  </span>
                  <span>{opt}</span>
                </li>
              );
            })}
          </ul>

          {showAnswer && (
            <div className="mt-4 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2">
              <div className="text-[0.7rem] uppercase tracking-[0.1em] text-sky-300">정답</div>
              <div className="mt-0.5 text-[1.0625rem] font-semibold text-sky-100">
                {correctSym} {item.correctText}
              </div>
            </div>
          )}

          {phase === 'explanation' && item.comment && (
            <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
              <div className="text-[0.7rem] uppercase tracking-[0.1em] text-emerald-300">해설</div>
              <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-slate-100">
                {item.comment}
              </p>
            </div>
          )}
        </div>

        {/* controls */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
              aria-label={muted ? '음소거 해제' : '음소거'}
              className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[0.75rem] text-slate-200"
            >
              {SPEED_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.toFixed(s === 1 ? 0 : 2)}x</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              aria-label="이전"
              className="rounded-md p-2 text-slate-200 hover:bg-slate-800"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              aria-label={isPlaying ? '일시정지' : '재생'}
              className="rounded-full bg-sky-600 p-3 text-white hover:bg-sky-500"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              aria-label="다음"
              className="rounded-md p-2 text-slate-200 hover:bg-slate-800"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
