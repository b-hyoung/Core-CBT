'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MessageCircle, X, Send, CheckCircle2, XCircle } from 'lucide-react';

const LANG_ICON = {
  C: '/icons/c.svg',
  Java: '/icons/java.svg',
  Python: '/icons/python.svg',
};

const LANG_COLOR = {
  C: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', accent: 'bg-indigo-600' },
  Java: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', accent: 'bg-orange-500' },
  Python: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', accent: 'bg-sky-600' },
};

const CODE_THEME = {
  C:      { bg: '#1e1e2e', base: '#cdd6f4', keyword: '#cba6f7', string: '#a6e3a1', number: '#fab387', comment: '#6c7086', preproc: '#f38ba8', func: '#89b4fa', label: 'C' },
  Java:   { bg: '#2b2b2b', base: '#a9b7c6', keyword: '#cc7832', string: '#6a8759', number: '#6897bb', comment: '#808080', func: '#ffc66d', label: 'Java' },
  Python: { bg: '#1a1b26', base: '#a9b1d6', keyword: '#7aa2f7', string: '#9ece6a', number: '#ff9e64', comment: '#565f89', func: '#7dcfff', label: 'Python' },
};

const KW = {
  C: 'auto break case char const continue default do double else enum extern float for goto if int long register return short signed sizeof static struct switch typedef union unsigned void volatile while',
  Java: 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while null true false',
  Python: 'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield',
};

const BF = {
  C: 'printf scanf main strlen strcmp strcpy strcat malloc calloc realloc free fprintf sprintf sscanf fopen fclose fgets fputs puts getchar putchar atoi atof exit memcpy memset sizeof',
  Java: 'System out println print main length toString equals charAt substring indexOf parseInt valueOf Math Arrays sort add get size put remove contains isEmpty String Integer Double Float Boolean Object',
  Python: 'print len range list dict set tuple int str float bool input abs max min sum round sorted map filter zip enumerate open type isinstance hasattr getattr setattr super append pop sort join split strip replace find count upper lower',
};

function buildSets(raw) { return new Set(raw.split(' ')); }

function tokenize(line, lang) {
  const kw = buildSets(KW[lang] || '');
  const bf = buildSets(BF[lang] || '');
  const tokens = [];
  let i = 0;
  while (i < line.length) {
    // 행 끝 주석
    if ((lang === 'C' || lang === 'Java') && line[i] === '/' && line[i+1] === '/') {
      tokens.push({ t: 'comment', v: line.slice(i) }); return tokens;
    }
    if (lang === 'Python' && line[i] === '#') {
      tokens.push({ t: 'comment', v: line.slice(i) }); return tokens;
    }
    // C 전처리기
    if (lang === 'C' && line[i] === '#') {
      const m = line.slice(i).match(/^#\w+/);
      if (m) { tokens.push({ t: 'preproc', v: m[0] }); i += m[0].length; continue; }
    }
    // 문자열
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i]; let j = i + 1;
      while (j < line.length && line[j] !== q) { if (line[j] === '\\') j++; j++; }
      j = Math.min(j + 1, line.length);
      tokens.push({ t: 'string', v: line.slice(i, j) }); i = j; continue;
    }
    // 숫자
    if (/\d/.test(line[i]) && (i === 0 || /[^a-zA-Z_]/.test(line[i-1]))) {
      const m = line.slice(i).match(/^\d+(\.\d+)?[fFlLuU]?/);
      if (m) { tokens.push({ t: 'number', v: m[0] }); i += m[0].length; continue; }
    }
    // 식별자
    if (/[a-zA-Z_]/.test(line[i])) {
      const m = line.slice(i).match(/^[a-zA-Z_]\w*/);
      if (m) {
        const w = m[0];
        tokens.push({ t: kw.has(w) ? 'keyword' : bf.has(w) ? 'func' : 'plain', v: w });
        i += w.length; continue;
      }
    }
    tokens.push({ t: 'plain', v: line[i] }); i++;
  }
  return tokens;
}

function HighlightedLine({ line, lang, theme }) {
  const toks = tokenize(line, lang);
  return <>{toks.map((tok, i) => (
    <span key={i} style={{ color: theme[tok.t] || theme.base, fontStyle: tok.t === 'comment' ? 'italic' : undefined }}>{tok.v}</span>
  ))}</>;
}

function CodeBlock({ code, lang }) {
  const theme = CODE_THEME[lang] || CODE_THEME.C;
  const lines = code.split('\n');

  return (
    <div className="rounded-xl overflow-hidden mb-4 shadow-lg" style={{ background: theme.bg }}>
      {/* 상단 바 */}
      <div className="flex items-center px-4 py-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex items-center gap-1.5 ml-3">
          <img src={LANG_ICON[lang]} alt={lang} className="h-3.5 w-3.5 brightness-0 invert opacity-70" />
          <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{theme.label}</span>
        </div>
      </div>
      {/* 코드 본문 */}
      <div className="overflow-x-auto p-4 pt-2">
        <pre className="text-sm font-mono leading-relaxed" style={{ margin: 0, color: theme.base }}>
          {lines.map((line, i) => (
            <div key={i} className="flex hover:bg-white/5 rounded">
              <span className="select-none text-right text-[11px] mr-4 inline-block" style={{ minWidth: '2ch', color: 'rgba(255,255,255,0.15)' }}>
                {i + 1}
              </span>
              <span style={{ whiteSpace: 'pre' }}>
                <HighlightedLine line={line} lang={lang} theme={theme} />
              </span>
            </div>
          ))}
        </pre>
      </div>
      <div className="h-2" />
    </div>
  );
}

function ChatBubble({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="bg-violet-600 text-white rounded-xl px-3 py-2 text-sm ml-8">
        {msg.content}
      </div>
    );
  }
  // 유사 문제 카드
  if (msg.ui_action?.type === 'present_problem') {
    const d = msg.ui_action.data || {};
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mr-4">
        <p className="text-xs font-bold text-emerald-700 mb-1">✏️ 유사 문제</p>
        <p className="text-sm text-emerald-900 mb-2">{d.question_text}</p>
        {d.examples && (
          <pre className="bg-slate-900 text-emerald-300 rounded-lg p-2 text-xs font-mono mb-2 overflow-x-auto whitespace-pre-wrap">
            {d.examples}
          </pre>
        )}
        <p className="text-[10px] text-emerald-500">답을 아래 입력창에 보내세요</p>
      </div>
    );
  }
  // 일반 AI 응답
  return (
    <div className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm mr-8 whitespace-pre-wrap leading-relaxed">
      {msg.content}
    </div>
  );
}

export default function CoachSolveClient({ lang, problems }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [autoSent, setAutoSent] = useState(false); // 자동 해설 요청 여부
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState([]); // {problemNumber, sourceSessionId, correct}
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);

  const problem = problems[currentIndex];
  const colors = LANG_COLOR[lang] || LANG_COLOR.C;
  const total = problems.length;

  useEffect(() => {
    if (!checked && inputRef.current) inputRef.current.focus();
  }, [currentIndex, checked]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // AI 코치 열릴 때 자동 해설 요청
  useEffect(() => {
    if (chatOpen && !autoSent && checked && !isCorrect) {
      setAutoSent(true);
      sendToAgent(`이 문제를 틀렸어. 왜 정답이 "${problem._answer}"인지 설명해주고, 이해할 수 있게 비슷한 문제를 내줘.`);
    }
  }, [chatOpen]);

  function handleCheck() {
    if (!userAnswer.trim()) return;
    const correct = userAnswer.trim().toLowerCase() === (problem._answer || '').trim().toLowerCase();
    setIsCorrect(correct);
    setChecked(true);
    setResults((prev) => [...prev, {
      problemNumber: problem.problem_number,
      sourceSessionId: problem._sourceSessionId,
      correct,
    }]);
  }

  function handleNext() {
    if (currentIndex + 1 >= total) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setUserAnswer('');
    setChecked(false);
    setIsCorrect(false);
    setChatMessages([]);
    setChatOpen(false);
    setAutoSent(false);
    setChatLoading(false);
  }

  async function sendToAgent(message) {
    setChatLoading(true);
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
    try {
      const resp = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_session_id: problem._sourceSessionId,
          problem_number: problem.problem_number,
          message,
        }),
      });
      const data = await resp.json();
      if (data.reply) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }
      // ui_actions 처리 (유사 문제 카드 등)
      if (data.ui_actions?.length > 0) {
        for (const action of data.ui_actions) {
          if (action.type === 'present_problem') {
            setChatMessages((prev) => [...prev, {
              role: 'assistant',
              content: null,
              ui_action: action,
            }]);
          }
        }
      }
    } catch (e) {
      setChatMessages((prev) => [...prev, {
        role: 'assistant',
        content: '연결 오류가 발생했어요. FastAPI 서버가 실행 중인지 확인해주세요.',
      }]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleChatSend() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    sendToAgent(msg);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!checked) handleCheck();
    }
  }

  // 결과 화면
  if (completed) {
    const correctCount = results.filter((r) => r.correct).length;
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 px-4 py-10">
        <div className="mx-auto max-w-lg">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="flex justify-center mb-4">
              <img src={LANG_ICON[lang]} alt={lang} className="h-12 w-12" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">{lang} 복습 완료</h1>
            <p className="text-4xl font-black text-slate-800 mb-1">
              {correctCount} <span className="text-lg font-semibold text-slate-400">/ {total}</span>
            </p>
            <p className="text-sm text-slate-500 mb-6">
              {correctCount === total ? '전부 맞혔어요!' : '틀린 문제는 다시 복습해보세요'}
            </p>
            <div className="space-y-2 mb-6 text-left">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
                  {r.correct
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <XCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                  <span className="text-sm text-slate-700">{r.problemNumber}번</span>
                  <span className="text-xs text-slate-400 ml-auto">{r.sourceSessionId}</span>
                </div>
              ))}
            </div>
            <Link
              href="/practical/coach/code"
              className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              돌아가기
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50">
      {/* 상단 바 */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/practical/coach/code"
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            목록
          </Link>
          <div className="flex items-center gap-2">
            <img src={LANG_ICON[lang]} alt={lang} className="h-4 w-4" />
            <span className="text-sm font-bold text-slate-700">{lang}</span>
            <span className="text-xs text-slate-400">{currentIndex + 1} / {total}</span>
          </div>
          {/* 프로그레스 바 */}
          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.accent} rounded-full transition-all`}
              style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl flex min-h-[calc(100vh-57px)]">
        {/* 왼쪽: 퀴즈 영역 */}
        <div className={`flex-1 p-6 ${chatOpen ? 'hidden md:block' : ''}`}>
          <div className="max-w-2xl mx-auto">
            {/* 문제 출처 */}
            <p className="text-xs font-medium text-slate-400 mb-1">
              {problem._sourceSessionId} · {problem.problem_number}번
            </p>

            {/* 문제 텍스트 */}
            <h2 className="text-base font-bold text-slate-900 mb-3 leading-relaxed">
              {problem.question_text}
            </h2>

            {/* 코드 예시 */}
            {problem.examples && (
              <CodeBlock code={problem.examples} lang={lang} />
            )}

            {/* 답 입력 */}
            {!checked ? (
              <div className="flex gap-2 mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="답 입력..."
                  className="flex-1 rounded-xl border border-slate-200 bg-white text-slate-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={handleCheck}
                  className={`${colors.accent} text-white rounded-xl px-6 py-3 text-sm font-semibold hover:opacity-90 transition`}
                >
                  확인
                </button>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {/* 정답/오답 피드백 */}
                <div className={`rounded-xl p-4 ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {isCorrect
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      : <XCircle className="h-5 w-5 text-rose-600" />}
                    <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isCorrect ? '정답!' : '오답'}
                    </span>
                  </div>
                  {!isCorrect && (
                    <p className="text-sm text-rose-600">
                      내 답: <span className="font-semibold">{userAnswer}</span> → 정답: <span className="font-semibold">{problem._answer}</span>
                    </p>
                  )}
                </div>

                {/* 해설 */}
                {problem._comment && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                    <p className="text-xs font-bold text-blue-600 mb-1">해설</p>
                    <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{problem._comment}</p>
                  </div>
                )}

                {/* 다음/AI 코치 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={handleNext}
                    className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-slate-800 text-white px-4 py-3 text-sm font-semibold hover:bg-slate-700 transition"
                  >
                    {currentIndex + 1 >= total ? '결과 보기' : '다음 문제'}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {!isCorrect && (
                    <button
                      onClick={() => setChatOpen(true)}
                      className="flex items-center gap-1 rounded-xl bg-violet-600 text-white px-4 py-3 text-sm font-semibold hover:bg-violet-500 transition"
                    >
                      <MessageCircle className="h-4 w-4" />
                      AI 코치
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: AI 채팅 사이드 패널 (데스크탑) */}
        {chatOpen && (
          <div className="hidden md:flex w-[360px] flex-col border-l border-slate-200 bg-slate-50">
            {/* 패널 헤더 */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <MessageCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-bold text-slate-700">AI 코치</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 && (
                <div className="text-center py-10">
                  <MessageCircle className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">이 문제에 대해 질문해보세요</p>
                  <p className="text-xs text-slate-300 mt-1">"왜 이게 정답이야?" "비슷한 문제 내줘"</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))}
              {chatLoading && (
                <div className="bg-white border border-slate-200 text-slate-400 rounded-xl px-3 py-2 text-sm mr-8 animate-pulse">
                  생각 중...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 입력 */}
            <div className="border-t border-slate-200 bg-white p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChatSend(); } }}
                  placeholder="질문하기..."
                  className="flex-1 rounded-lg border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <button
                  onClick={handleChatSend}
                  className="rounded-lg bg-violet-600 text-white p-2 hover:bg-violet-500 transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 모바일: 플로팅 AI 버튼 */}
      {!chatOpen && checked && !isCorrect && (
        <button
          onClick={() => setChatOpen(true)}
          className="md:hidden fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-500 transition"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* 모바일: 풀스크린 채팅 오버레이 */}
      {chatOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <MessageCircle className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-bold text-slate-700">AI 코치</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
            {chatMessages.length === 0 && (
              <div className="text-center py-16">
                <MessageCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">이 문제에 대해 질문해보세요</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white ml-12'
                    : 'bg-white border border-slate-200 text-slate-700 mr-12'
                }`}
              >
                {msg.content}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-3 safe-area-bottom">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChatSend(); } }}
                placeholder="질문하기..."
                className="flex-1 rounded-lg border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button
                onClick={handleChatSend}
                className="rounded-lg bg-violet-600 text-white p-2 hover:bg-violet-500 transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
