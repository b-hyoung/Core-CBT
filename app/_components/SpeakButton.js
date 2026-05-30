'use client';

// app/_components/SpeakButton.js
// 한국어 TTS 토글 버튼 — 클릭으로 텍스트 읽기 시작/중단.
// 브라우저 SpeechSynthesisAPI 사용.

import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';

function pickKoreanVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'ko-KR') ||
    voices.find((v) => v.lang?.startsWith('ko')) ||
    null
  );
}

export default function SpeakButton({ text, lang = 'ko-KR', rate = 1.0, size = 'md', label = '읽기' }) {
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState(null);
  const utterRef = useRef(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && !!window.speechSynthesis);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const update = () => setVoice(pickKoreanVoice());
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);

  useEffect(() => {
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  function start() {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    if (voice) u.voice = voice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }

  function stop() {
    try { window.speechSynthesis?.cancel(); } catch {}
    setSpeaking(false);
  }

  if (!supported || !text) return null;

  const sizeCls = size === 'sm' ? 'h-7 px-2 text-[0.7rem]' : 'h-8 px-2.5 text-[0.75rem]';
  const iconCls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={speaking ? stop : start}
      aria-label={speaking ? `${label} 중단` : `${label} 시작`}
      title={speaking ? '읽는 중 — 클릭해서 중단' : '소리내 읽기'}
      className={`inline-flex ${sizeCls} items-center gap-1 rounded-md border transition-colors ${
        speaking
          ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200'
          : 'border-[color:var(--theme-border)] bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {speaking ? <Square className={iconCls} /> : <Volume2 className={iconCls} />}
      <span>{speaking ? '중단' : label}</span>
    </button>
  );
}
