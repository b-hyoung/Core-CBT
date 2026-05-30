'use client';

// app/shorts/[sessionId]/ShortsPlayer.js
// 자동 진행 흐름:
//   question → answer → explanation → ask(10s) → (질문 시) gpt_loading → gpt_response → next
//                                              → (10s 만료) → next

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Mic, MicOff, Loader2 } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'shorts_progress_v1_';

const PHASE_GAP_MS = 600;
const ASK_WINDOW_MS = 10_000;

const OPTION_SYMBOLS = ['①', '②', '③', '④', '⑤', '⑥'];
const SPEED_OPTIONS = [0.8, 1.0, 1.25, 1.5, 2.0];

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
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

// TTS용 정제: 화면에는 구조화된 텍스트, 음성엔 자연스러운 본문만.
// - [라벨] → "라벨." 평문화
// - ①②③④ → "일번/이번/삼번/사번"
// - 기호 정제 (→, ∪, ≡, ≥, ≤ 등)
// - 연속 줄바꿈/공백 정리
const TTS_LABEL_REPLACEMENTS = [
  [/\[핵심\]/g, '핵심.'],
  [/\[풀이\]/g, '풀이.'],
  [/\[오답\]/g, '오답 정리.'],
  [/\[암기\]/g, '암기 포인트.'],
  [/\[데이터\]/g, '데이터.'],
  [/\[입력\]/g, '입력.'],
  [/\[보기\]/g, '보기.'],
  [/\[배경\]/g, '배경.'],
  [/\[상황\]/g, '상황.'],
  [/\[조건\]/g, '조건.'],
  [/\[조합\]/g, '조합.'],
  [/\[연산\]/g, '연산.'],
  [/\[비교\]/g, '비교.'],
  [/\[함수\]/g, '함수.'],
  [/\[구문\]/g, '구문.'],
  [/\[문제\]/g, '문제.'],
  [/\[쿼리\]/g, '쿼리.'],
  [/\[시나리오\]/g, '시나리오.'],
];

const TTS_SYMBOL_REPLACEMENTS = [
  [/①/g, '1번'],
  [/②/g, '2번'],
  [/③/g, '3번'],
  [/④/g, '4번'],
  [/⑤/g, '5번'],
  [/⑥/g, '6번'],
  [/→/g, ', '],
  [/∪/g, ' 합 '],
  [/∩/g, ' 교 '],
  [/≡/g, ' 같음 '],
  [/≥/g, ' 이상 '],
  [/≤/g, ' 이하 '],
  [/×/g, ' 곱하기 '],
];

function cleanForTts(text) {
  let s = String(text || '');
  for (const [re, rep] of TTS_LABEL_REPLACEMENTS) s = s.replace(re, rep);
  for (const [re, rep] of TTS_SYMBOL_REPLACEMENTS) s = s.replace(re, rep);
  // 남은 대괄호 라벨도 일반화 [임의] → "임의."
  s = s.replace(/\[([^\]]+)\]/g, '$1.');
  // 줄바꿈/연속공백 → 한 칸
  s = s.replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return s;
}

function buildQuestionScript(item) {
  const parts = [`${item.number}번.`, item.question];
  if (item.examples) parts.push(item.examples);
  item.options.forEach((opt, i) => {
    parts.push(`${OPTION_SYMBOLS[i] || `${i + 1}번`}. ${opt}.`);
  });
  return cleanForTts(parts.join(' '));
}

function buildAnswerScript(item) {
  const n = item.correctIndex + 1;
  const sym = OPTION_SYMBOLS[item.correctIndex] || `${n}번`;
  return cleanForTts(`정답은 ${sym}. ${item.correctText}.`);
}

// 해설 코멘트에서 [풀이] 섹션만 추출. 다음 [라벨] 또는 문자열 끝까지.
// [풀이] 라벨이 없으면 전체 코멘트를 fallback으로 사용 (구버전·복원불완전 케이스).
function extractPuriSection(comment) {
  const s = String(comment || '');
  const m = s.match(/\[\s*풀이\s*\]([\s\S]*?)(?=\n\s*\[[^\]]+\]|$)/);
  return (m ? m[1] : s).trim();
}

function buildExplanationScript(item) {
  if (!item.comment) return '';
  const puri = extractPuriSection(item.comment);
  if (!puri) return '';
  // TTS용: 라벨/기호 정제 + 괄호와 그 안 내용까지 통째로 제거
  let s = cleanForTts(puri).replace(/\([^)]*\)/g, ' ');
  // 글머리표(·, -) 정리
  s = s.replace(/(^|\s)[·\-]\s+/g, '$1');
  s = s.replace(/\s{2,}/g, ' ').trim();
  if (!s) return '';
  return `해설. ${s}`;
}

export default function ShortsPlayer({ items, title, sessionId }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('question');
  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [voice, setVoice] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true); // ask 페이즈에서 음성 입력 사용 여부

  // ask 페이즈 관련
  const [askRemainingMs, setAskRemainingMs] = useState(ASK_WINDOW_MS);
  const [askListening, setAskListening] = useState(false);
  const [askTranscript, setAskTranscript] = useState('');
  const askTimerRef = useRef(null);
  const recognitionRef = useRef(null);

  // GPT 응답
  const [gptAnswer, setGptAnswer] = useState('');
  const [gptError, setGptError] = useState('');

  const phaseTimer = useRef(null);
  const item = items[index];

  // 페이즈별 자동 스크롤용 ref
  const bodyRef = useRef(null);
  const answerRef = useRef(null);
  const explanationRef = useRef(null);
  const askRef = useRef(null);
  const gptRef = useRef(null);
  const storageKey = `${STORAGE_KEY_PREFIX}${sessionId}`;

  // ── 진행 상황 복원/저장 ────────────────────────
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(storageKey, String(index)); } catch {}
  }, [index, storageKey]);

  // 마이크 on/off 복원·저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem('shorts_mic_enabled_v1');
      if (saved === '0') setMicEnabled(false);
    } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('shorts_mic_enabled_v1', micEnabled ? '1' : '0'); } catch {}
  }, [micEnabled]);

  // ask 페이즈 중 마이크를 끄면 즉시 다음 문제로
  useEffect(() => {
    if (phase === 'ask' && !micEnabled) {
      stopRecognition();
      goNextItem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micEnabled]);

  // 페이즈 전환 시 해당 섹션으로 부드럽게 스크롤
  useEffect(() => {
    let target = null;
    if (phase === 'question') target = bodyRef.current;          // 문제 카드 맨 위로
    else if (phase === 'answer') target = answerRef.current;
    else if (phase === 'explanation') target = explanationRef.current;
    else if (phase === 'ask') target = askRef.current;
    else if (phase === 'gpt_loading' || phase === 'gpt_response') target = gptRef.current;

    if (!target) return;
    if (phase === 'question') {
      // 문제 페이즈: 카드 본문 전체 맨 위로 스크롤
      target.scrollTo?.({ top: 0, behavior: 'smooth' });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [phase, index]);

  // ── 한국어 음성 ────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const update = () => setVoice(pickKoreanVoice());
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);

  // ── 다음 문제로 ─────────────────────────────────
  const goNextItem = useCallback(() => {
    setGptAnswer('');
    setGptError('');
    setAskTranscript('');
    setIndex((i) => (i >= items.length - 1 ? i : i + 1));
    setPhase('question');
  }, [items.length]);

  // ── STT (ask 페이즈에서 자동 시작) ──────────────
  const stopRecognition = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setAskListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return; // 미지원 브라우저는 타이머만으로 진행
    try {
      const r = new SR();
      r.lang = 'ko-KR';
      r.continuous = false;
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.onresult = (event) => {
        const text = String(event.results?.[0]?.[0]?.transcript || '').trim();
        if (text) {
          setAskTranscript(text);
          setAskListening(false);
          setPhase('gpt_loading');
        }
      };
      r.onerror = () => {
        setAskListening(false);
      };
      r.onend = () => {
        setAskListening(false);
      };
      r.start();
      recognitionRef.current = r;
      setAskListening(true);
    } catch {
      setAskListening(false);
    }
  }, []);

  // ── ask 페이즈 타이머 ──────────────────────────
  useEffect(() => {
    if (phase !== 'ask' || !isPlaying) return;
    // 속도에 맞춰 대기 시간도 짧아짐 (최소 3초 보장)
    const askWindow = Math.max(3000, Math.round(ASK_WINDOW_MS / speed));
    setAskRemainingMs(askWindow);
    // 마이크 on일 때만 STT 자동 활성화. off면 카운트다운만 진행.
    if (micEnabled) startRecognition();
    const startedAt = Date.now();
    askTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = askWindow - elapsed;
      if (remaining <= 0) {
        clearInterval(askTimerRef.current);
        askTimerRef.current = null;
        stopRecognition();
        goNextItem();
      } else {
        setAskRemainingMs(remaining);
      }
    }, 100);
    return () => {
      if (askTimerRef.current) {
        clearInterval(askTimerRef.current);
        askTimerRef.current = null;
      }
      stopRecognition();
    };
  }, [phase, isPlaying, micEnabled, speed, startRecognition, stopRecognition, goNextItem]);

  // ── GPT 호출 (gpt_loading 페이즈) ──────────────
  useEffect(() => {
    if (phase !== 'gpt_loading' || !askTranscript || !item) return;
    let cancelled = false;
    setGptAnswer('');
    setGptError('');

    fetch('/api/gpt/objection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceSessionId: sessionId,
        sourceProblemNumber: item.number,
        questionText: item.question,
        examples: item.examples || '',
        options: item.options,
        selectedAnswer: '',
        correctAnswer: item.correctText,
        explanationText: item.comment || '',
        history: [{ role: 'user', content: askTranscript }],
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok) {
          setGptAnswer(String(data.answer || '').trim() || '답변을 받지 못했어요.');
        } else {
          setGptError(data?.message || 'GPT 호출 실패');
        }
        setPhase('gpt_response');
      })
      .catch((err) => {
        if (cancelled) return;
        setGptError(err?.message || '네트워크 오류');
        setPhase('gpt_response');
      });

    return () => { cancelled = true; };
  }, [phase, askTranscript, item, sessionId]);

  // ── 페이즈별 TTS / 자동 진행 ────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (phaseTimer.current) {
      clearTimeout(phaseTimer.current);
      phaseTimer.current = null;
    }
    window.speechSynthesis?.cancel();

    if (!isPlaying || !item) return;
    if (phase === 'ask' || phase === 'gpt_loading') return; // 별도 effect에서 관리

    let script = '';
    if (phase === 'question') script = buildQuestionScript(item);
    else if (phase === 'answer') script = buildAnswerScript(item);
    else if (phase === 'explanation') script = buildExplanationScript(item);
    else if (phase === 'gpt_response') script = gptAnswer || gptError || '응답이 없어요.';

    const advance = () => {
      phaseTimer.current = setTimeout(() => {
        if (phase === 'question') {
          setPhase('answer');
        } else if (phase === 'answer') {
          if (item?.comment) setPhase('explanation');
          else if (micEnabled) setPhase('ask');
          else goNextItem();
        } else if (phase === 'explanation') {
          if (micEnabled) setPhase('ask');
          else goNextItem();
        } else if (phase === 'gpt_response') {
          goNextItem();
        }
      }, Math.max(150, Math.round(PHASE_GAP_MS / speed)));
    };

    if (!script || muted) {
      // 음성 없을 때 페이즈별 정적 대기. 속도에 비례해서 짧아짐 (최소 800ms).
      const base =
        phase === 'answer' ? 1800 :
        phase === 'explanation' ? 3000 :
        phase === 'gpt_response' ? 4000 : 4000;
      const fallbackMs = Math.max(800, Math.round(base / speed));
      phaseTimer.current = setTimeout(advance, fallbackMs);
      return;
    }

    speak(script, { rate: speed, voice, onEnd: advance, onError: advance });
  }, [index, phase, isPlaying, muted, speed, voice, item, gptAnswer, gptError, micEnabled, goNextItem]);

  // ── 언마운트 cleanup ────────────────────────────
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (phaseTimer.current) clearTimeout(phaseTimer.current);
      if (askTimerRef.current) clearInterval(askTimerRef.current);
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  // ── 컨트롤 ──────────────────────────────────────
  const skipToNextPhase = useCallback(() => {
    // 현재 페이즈 즉시 종료 → 다음으로 (mic OFF면 ask 페이즈 건너뜀)
    if (phase === 'question') setPhase('answer');
    else if (phase === 'answer') {
      if (item?.comment) setPhase('explanation');
      else if (micEnabled) setPhase('ask');
      else goNextItem();
    } else if (phase === 'explanation') {
      if (micEnabled) setPhase('ask');
      else goNextItem();
    } else if (phase === 'ask') { stopRecognition(); goNextItem(); }
    else if (phase === 'gpt_loading') { /* 무시 — 로딩 끝날 때까지 대기 */ }
    else if (phase === 'gpt_response') goNextItem();
  }, [phase, item, micEnabled, goNextItem, stopRecognition]);

  const goPrev = useCallback(() => {
    if (phase === 'gpt_response' || phase === 'gpt_loading') {
      setPhase('ask');
      return;
    }
    if (phase === 'ask') { stopRecognition(); setPhase(item?.comment ? 'explanation' : 'answer'); return; }
    if (phase === 'explanation') { setPhase('answer'); return; }
    if (phase === 'answer') { setPhase('question'); return; }
    setIndex((i) => Math.max(0, i - 1));
    setPhase('question');
  }, [phase, item, stopRecognition]);

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);

  // ── 파생 상태 ───────────────────────────────────
  const phaseLabel = useMemo(() => {
    if (phase === 'question') return '문제';
    if (phase === 'answer') return '정답';
    if (phase === 'explanation') return '해설';
    if (phase === 'ask') return '질문';
    if (phase === 'gpt_loading') return 'GPT';
    if (phase === 'gpt_response') return 'GPT 답변';
    return phase;
  }, [phase]);

  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        데이터가 없습니다.
      </div>
    );
  }

  const correctSym = OPTION_SYMBOLS[item.correctIndex] || `${item.correctIndex + 1}번`;
  const showAnswer = phase === 'answer' || phase === 'explanation' || phase === 'ask' || phase === 'gpt_loading' || phase === 'gpt_response';
  const showExplanation = (phase === 'explanation' || phase === 'ask' || phase === 'gpt_loading' || phase === 'gpt_response') && item.comment;
  const askSecondsLeft = Math.ceil(askRemainingMs / 1000);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
      <div className="relative flex w-full flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl ring-1 ring-slate-800 aspect-[9/16] max-w-[420px] lg:aspect-auto lg:h-[85vh] lg:max-w-[1200px]">

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

        <div className="mt-2 flex justify-center">
          <span
            className={`rounded-full px-3 py-1 text-[0.7rem] font-semibold tracking-[0.15em] uppercase ${
              phase === 'question'
                ? 'bg-slate-800 text-slate-300'
                : phase === 'answer'
                  ? 'bg-sky-600/30 text-sky-200'
                  : phase === 'explanation'
                    ? 'bg-emerald-600/30 text-emerald-200'
                    : phase === 'ask'
                      ? 'bg-amber-600/30 text-amber-200'
                      : 'bg-violet-600/30 text-violet-200'
            }`}
          >
            {phaseLabel}
          </span>
        </div>

        {/* body: 모바일은 단일 스크롤, PC는 2-pane (좌=문제/보기, 우=정답/해설/ask/gpt) */}
        <div
          ref={bodyRef}
          onClick={skipToNextPhase}
          className="flex flex-1 cursor-pointer flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
          aria-label="탭하면 다음 페이즈로 진행"
        >
          {/* LEFT pane — 문제 + 보기 */}
          <div className="px-5 py-4 lg:flex-1 lg:overflow-y-auto lg:border-r lg:border-slate-800 lg:py-5">
            <div className="mb-2 text-[0.7rem] uppercase tracking-[0.1em] text-slate-500">
              {item.sectionTitle || '문제'} · #{item.number}
            </div>
            <h2 className={`mb-3 text-[1.0625rem] font-semibold leading-snug text-slate-100 lg:text-[1.25rem] ${phase === 'question' ? 'ring-2 ring-sky-400/40 rounded-md px-2 py-1 -mx-2' : ''}`}>
              {item.question}
            </h2>
            {item.examples && (
              <pre className="mb-3 whitespace-pre-wrap rounded-md bg-slate-900/60 px-3 py-2 text-[0.8125rem] text-slate-300 lg:text-[0.875rem]">
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
                    className={`flex items-start gap-2 rounded-md border px-3 py-2 text-[0.9375rem] transition-colors lg:text-[1rem] ${
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
          </div>

          {/* RIGHT pane — 정답 + 해설 + ask + gpt. PC에선 항상 보임, 모바일에선 좌측 아래에 이어짐 */}
          <div className="px-5 pb-4 lg:flex-1 lg:overflow-y-auto lg:px-5 lg:py-5">
            {/* PC에선 빈 영역 안내 — 답 공개 전 */}
            {!showAnswer && (
              <div className="hidden h-full items-center justify-center text-center lg:flex">
                <div className="text-slate-500">
                  <p className="text-[0.875rem]">문제를 다 읽으면</p>
                  <p className="text-[0.875rem]">이쪽에 정답과 해설이 표시됩니다</p>
                </div>
              </div>
            )}

            {showAnswer && (
            <div
              ref={answerRef}
              className={`mt-4 rounded-lg border bg-sky-500/10 px-3 py-2 transition-all ${
                phase === 'answer'
                  ? 'border-sky-400 ring-2 ring-sky-400/60 shadow-[0_0_24px_rgba(56,189,248,0.25)]'
                  : 'border-sky-500/40'
              }`}
            >
              <div className="text-[0.7rem] uppercase tracking-[0.1em] text-sky-300">정답 {phase === 'answer' && '· 읽는 중'}</div>
              <div className="mt-0.5 text-[1.0625rem] font-semibold text-sky-100">
                {correctSym} {item.correctText}
              </div>
            </div>
          )}

          {showExplanation && (
            <div
              ref={explanationRef}
              className={`mt-3 rounded-lg border bg-emerald-500/5 px-3 py-2.5 transition-all ${
                phase === 'explanation'
                  ? 'border-emerald-400 ring-2 ring-emerald-400/60 shadow-[0_0_24px_rgba(52,211,153,0.25)]'
                  : 'border-emerald-500/30'
              }`}
            >
              <div className="text-[0.7rem] uppercase tracking-[0.1em] text-emerald-300">해설 {phase === 'explanation' && '· 읽는 중'}</div>
              <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-slate-100">
                {item.comment}
              </p>
            </div>
          )}

          {/* ask 페이즈 — 카운트다운 + 마이크 상태 */}
          {phase === 'ask' && (
            <div
              ref={askRef}
              className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-center ring-2 ring-amber-400/40"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                !micEnabled
                  ? 'bg-slate-700 text-slate-400'
                  : askListening
                    ? 'bg-rose-500/30 text-rose-200 animate-pulse'
                    : 'bg-slate-700 text-slate-300'
              }`}>
                {micEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
              </div>
              <p className="text-[0.875rem] font-medium text-amber-100">
                {!micEnabled
                  ? '마이크 OFF · 음성 질문 비활성'
                  : askListening
                    ? '듣는 중... 질문하세요'
                    : `${Math.ceil(Math.max(3000, Math.round(ASK_WINDOW_MS/speed))/1000)}초간 음성 질문 받습니다`}
              </p>
              <div className="flex items-center gap-2 text-[1.25rem] font-bold text-amber-200">
                <span>{askSecondsLeft}</span>
                <span className="text-[0.875rem] font-normal text-amber-300/70">초</span>
              </div>
              <p className="text-[0.7rem] text-amber-300/60">다음 ▶ 누르면 즉시 통과</p>
            </div>
          )}

          {/* gpt_loading */}
          {phase === 'gpt_loading' && (
            <div
              ref={gptRef}
              className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-5 text-center ring-2 ring-violet-400/40"
            >
              <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
              <p className="text-[0.875rem] font-medium text-violet-100">GPT에게 묻는 중...</p>
              {askTranscript && (
                <p className="rounded-md bg-violet-950/40 px-3 py-1.5 text-[0.8125rem] text-violet-200">
                  "{askTranscript}"
                </p>
              )}
            </div>
          )}

          {/* gpt_response */}
          {phase === 'gpt_response' && (
            <div
              ref={gptRef}
              className="mt-4 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-3 ring-2 ring-violet-400/60 shadow-[0_0_24px_rgba(167,139,250,0.25)]"
            >
              <div className="text-[0.7rem] uppercase tracking-[0.1em] text-violet-300">GPT 답변</div>
              {askTranscript && (
                <p className="mt-1 text-[0.8125rem] italic text-violet-200/70">
                  Q. {askTranscript}
                </p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-slate-100">
                {gptAnswer || gptError || '응답이 없어요.'}
              </p>
            </div>
          )}
          </div>{/* RIGHT pane end */}
        </div>{/* body end */}

        {/* controls */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
              aria-label={muted ? '음소거 해제' : '음소거'}
              title={muted ? '음소거 해제' : '음소거 (TTS 끔)'}
              className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMicEnabled((m) => !m); }}
              aria-label={micEnabled ? '음성 질문 끄기' : '음성 질문 켜기'}
              title={micEnabled ? '음성 질문 ON · 클릭해서 OFF' : '음성 질문 OFF · 클릭해서 ON'}
              className={`rounded-md p-1.5 ${
                micEnabled
                  ? 'text-rose-300 hover:bg-rose-900/40'
                  : 'text-slate-500 hover:bg-slate-800'
              }`}
            >
              {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
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
              onClick={(e) => { e.stopPropagation(); skipToNextPhase(); }}
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
