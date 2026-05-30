'use client';

// app/_components/VoiceInputButton.js
// 한국어 STT 마이크 버튼 — 클릭으로 듣기 시작/중단, 인식 결과를 onTranscript로 전달.
// 브라우저 SpeechRecognition API 사용 (Chrome/Edge 안정, Safari는 webkit prefix, Firefox는 미지원).

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function VoiceInputButton({ onTranscript, lang = 'ko-KR', size = 'md', disabled }) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = getSpeechRecognition();
    setSupported(Boolean(SR));
  }, []);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, []);

  function start() {
    const SR = getSpeechRecognition();
    if (!SR) {
      setError('이 브라우저는 음성 입력 미지원');
      return;
    }
    setError('');
    const r = new SR();
    r.lang = lang;
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;

    r.onresult = (event) => {
      const text = String(event.results?.[0]?.[0]?.transcript || '').trim();
      if (text) onTranscript?.(text);
    };
    r.onerror = (event) => {
      const code = String(event?.error || '');
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('마이크 권한이 필요해요');
      } else if (code === 'no-speech') {
        setError('음성이 감지되지 않았어요');
      } else {
        setError(`인식 실패: ${code}`);
      }
      setListening(false);
    };
    r.onend = () => setListening(false);

    try {
      r.start();
      recognitionRef.current = r;
      setListening(true);
    } catch (err) {
      setError(`시작 실패: ${err?.message || err}`);
    }
  }

  function stop() {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  }

  if (!supported) return null;

  const sizeCls =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  const iconCls = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled}
        aria-label={listening ? '음성 입력 중단' : '음성 입력 시작'}
        title={listening ? '듣는 중 — 클릭해서 중단' : '음성으로 질문하기'}
        className={`inline-flex ${sizeCls} items-center justify-center rounded-full border transition-colors ${
          listening
            ? 'border-rose-300 bg-rose-50 text-rose-600 animate-pulse dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
            : 'border-[color:var(--theme-border)] bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {listening ? <MicOff className={iconCls} /> : <Mic className={iconCls} />}
      </button>
      {error && (
        <span className="absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[0.7rem] text-white shadow-md dark:bg-slate-100 dark:text-slate-900">
          {error}
        </span>
      )}
    </div>
  );
}
