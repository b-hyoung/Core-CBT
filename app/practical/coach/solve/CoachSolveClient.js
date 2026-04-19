'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MessageCircle, X, Send, CheckCircle2, XCircle, Database } from 'lucide-react';

const LANG_ICON = {
  C: '/icons/c.svg',
  Java: '/icons/java.svg',
  Python: '/icons/python.svg',
  SQL: null, // lucide Database 아이콘 사용
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
  SQL:    { bg: '#1e293b', base: '#e2e8f0', keyword: '#38bdf8', string: '#a6e3a1', number: '#fb923c', comment: '#64748b', func: '#818cf8', label: 'SQL' },
};

const KW = {
  C: 'auto break case char const continue default do double else enum extern float for goto if int long register return short signed sizeof static struct switch typedef union unsigned void volatile while',
  Java: 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while null true false',
  Python: 'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield',
  SQL: 'SELECT FROM WHERE AND OR NOT IN BETWEEN LIKE IS NULL ORDER BY GROUP HAVING JOIN INNER LEFT RIGHT OUTER ON AS INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP INDEX VIEW DISTINCT UNION ALL EXISTS ANY SOME CASE WHEN THEN ELSE END ASC DESC LIMIT OFFSET PRIMARY KEY FOREIGN REFERENCES CONSTRAINT UNIQUE CHECK DEFAULT CASCADE GRANT REVOKE COMMIT ROLLBACK',
};

const BF = {
  C: 'printf scanf main strlen strcmp strcpy strcat malloc calloc realloc free fprintf sprintf sscanf fopen fclose fgets fputs puts getchar putchar atoi atof exit memcpy memset sizeof',
  Java: 'System out println print main length toString equals charAt substring indexOf parseInt valueOf Math Arrays sort add get size put remove contains isEmpty String Integer Double Float Boolean Object',
  Python: 'print len range list dict set tuple int str float bool input abs max min sum round sorted map filter zip enumerate open type isinstance hasattr getattr setattr super append pop sort join split strip replace find count upper lower',
  SQL: 'COUNT SUM AVG MAX MIN UPPER LOWER TRIM SUBSTRING LENGTH COALESCE IFNULL CAST CONVERT DATE NOW YEAR MONTH DAY',
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
    if (lang === 'SQL' && line[i] === '-' && line[i+1] === '-') {
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
          {LANG_ICON[lang]
            ? <img src={LANG_ICON[lang]} alt={lang} className="h-3.5 w-3.5 brightness-0 invert opacity-70" />
            : lang === 'SQL' && <Database className="h-3.5 w-3.5 opacity-50" style={{ color: 'white' }} />}
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
              <span style={{ whiteSpace: lang === 'SQL' ? 'pre-wrap' : 'pre', wordBreak: lang === 'SQL' ? 'keep-all' : undefined }}>
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

// 인라인 마크다운: `code`, **bold**
function renderInline(text) {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return <code key={i} className="bg-slate-800/90 text-emerald-300 px-1.5 py-0.5 rounded text-[11px] font-mono">{tok.slice(1, -1)}</code>;
    }
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return <strong key={i} className="font-bold text-slate-800">{tok.slice(2, -2)}</strong>;
    }
    return tok;
  });
}

// 마크다운 렌더링
function renderMarkdown(text) {
  if (!text) return null;

  // 1. 코드블럭 분리
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        // 코드블럭
        const codeMatch = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
        if (codeMatch) {
          return (
            <pre key={i} className="bg-slate-900 text-slate-200 rounded-lg p-3 text-[12px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {codeMatch[2].trim()}
            </pre>
          );
        }

        // 2. 문단 단위로 분리 (빈 줄 기준)
        const paragraphs = part.split(/\n\n+/);
        return (
          <div key={i} className="space-y-2">
            {paragraphs.map((para, pi) => {
              const lines = para.split('\n');
              // 전체가 리스트인지 확인
              const isAllList = lines.every((l) => /^\s*([-•]\s|\d+\.\s)/.test(l) || !l.trim());

              if (isAllList && lines.some((l) => l.trim())) {
                return (
                  <ul key={pi} className="space-y-1.5 pl-1">
                    {lines.filter((l) => l.trim()).map((line, li) => {
                      const content = line.replace(/^\s*([-•]\s|\d+\.\s)/, '');
                      const num = line.match(/^\s*(\d+)\./)?.[1];
                      return (
                        <li key={li} className="flex gap-2 text-[13px] leading-relaxed">
                          <span className="text-slate-400 font-semibold shrink-0 w-4 text-right">
                            {num ? `${num}.` : '•'}
                          </span>
                          <span>{renderInline(content)}</span>
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              return (
                <div key={pi}>
                  {lines.map((line, li) => {
                    const trimmed = line.trimStart();

                    // 헤더
                    if (trimmed.startsWith('#### ')) {
                      return <p key={li} className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-2 mb-0.5">{renderInline(trimmed.slice(5))}</p>;
                    }
                    if (trimmed.startsWith('### ')) {
                      return <p key={li} className="text-[13px] font-bold text-slate-700 mt-2 mb-0.5">{renderInline(trimmed.slice(4))}</p>;
                    }
                    if (trimmed.startsWith('## ')) {
                      return <p key={li} className="text-sm font-bold text-slate-800 mt-2 mb-0.5">{renderInline(trimmed.slice(3))}</p>;
                    }

                    // 리스트 아이템 (단독)
                    const listMatch = trimmed.match(/^(\d+)\.\s(.+)/);
                    if (listMatch) {
                      return (
                        <div key={li} className="flex gap-2 text-[13px] leading-relaxed mt-1">
                          <span className="text-slate-400 font-semibold shrink-0 w-4 text-right">{listMatch[1]}.</span>
                          <span>{renderInline(listMatch[2])}</span>
                        </div>
                      );
                    }
                    const bulletMatch = trimmed.match(/^[-•]\s(.+)/);
                    if (bulletMatch) {
                      return (
                        <div key={li} className="flex gap-2 text-[13px] leading-relaxed mt-1">
                          <span className="text-slate-400 shrink-0">•</span>
                          <span>{renderInline(bulletMatch[1])}</span>
                        </div>
                      );
                    }

                    // 빈 줄
                    if (!trimmed) return null;

                    // 일반 텍스트
                    return <p key={li} className="text-[13px] leading-relaxed text-slate-600">{renderInline(line)}</p>;
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ChatBubble({ msg, onStartProblem, onRequestSimilar }) {
  if (msg.role === 'user') {
    return (
      <div className="bg-violet-600 text-white rounded-xl px-3 py-2 text-sm ml-8">
        {msg.content}
      </div>
    );
  }
  // "유사 문제 내줘" 제안 버튼
  if (msg.ui_action?.type === 'suggest_similar') {
    return (
      <div className="mr-4">
        <button
          onClick={() => onRequestSimilar?.()}
          className="w-full rounded-xl bg-violet-50 border border-violet-200 text-violet-700 py-3 text-sm font-semibold hover:bg-violet-100 transition"
        >
          비슷한 유형 문제 풀어보기
        </button>
      </div>
    );
  }
  // 유사 문제 대기 카드 (버튼)
  if (msg.ui_action?.type === 'pending_problem') {
    const d = msg.ui_action.data;
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mr-4">
        <p className="text-xs font-bold text-emerald-700 mb-1">✏️ 유사 문제 준비됨</p>
        <p className="text-sm text-emerald-900 mb-2 line-clamp-2">{d.question_text}</p>
        {d.examples && (
          <pre className="bg-slate-900 text-slate-200 rounded-lg p-2 text-xs font-mono mb-2 overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-hidden">
            {d.examples.slice(0, 150)}{d.examples.length > 150 ? '...' : ''}
          </pre>
        )}
        <button
          onClick={() => onStartProblem?.(d)}
          className="w-full rounded-lg bg-emerald-600 text-white py-2 text-sm font-semibold hover:bg-emerald-500 transition"
        >
          유사문제 풀기 →
        </button>
      </div>
    );
  }
  // 채점 결과 카드
  if (msg.ui_action?.type === 'evaluation') {
    const e = msg.ui_action;
    return (
      <div className={`rounded-xl p-3 mr-4 border ${e.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
        <div className="flex items-center gap-2 mb-1">
          {e.correct
            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            : <XCircle className="h-4 w-4 text-rose-600" />}
          <span className={`text-sm font-bold ${e.correct ? 'text-emerald-700' : 'text-rose-700'}`}>
            {e.correct ? '정답!' : '오답'}
          </span>
        </div>
        {e.reasoning && (
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{e.reasoning}</p>
        )}
      </div>
    );
  }
  // 일반 AI 응답 (마크다운 지원)
  return (
    <div className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-3 mr-4 leading-relaxed">
      {renderMarkdown(msg.content)}
    </div>
  );
}

function MobileChatOverlay({
  problem, genProblem, viewMode, lang, chatMessages, chatInput, chatLoading,
  checked, isCorrect, userAnswer, genAnswer, genSubmitted, genResult, genLoading,
  onClose, onChatInput, onChatSend, onStartProblem, onRequestSimilar,
  onSwitchOriginal, onSwitchGenerated, onGenAnswer, onGenSubmit, onNext,
  currentIndex, total, chatScrollRef,
}) {
  const [mobileTab, setMobileTab] = useState('chat');
  const [kbHeight, setKbHeight] = useState(0);

  // 키보드 높이 감지 (visualViewport API)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function onResize() {
      const diff = window.innerHeight - vv.height;
      setKbHeight(diff > 50 ? diff : 0);
    }
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  // 채팅 탭 전환 시 맨 아래로 스크롤
  useEffect(() => {
    if (mobileTab === 'chat' && chatScrollRef?.current) {
      setTimeout(() => {
        chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  }, [mobileTab]);

  return (
    <div className="md:hidden fixed inset-x-0 top-0 z-40 flex flex-col bg-white" style={{ height: `calc(100dvh - ${kbHeight}px)` }}>
      {/* 상단 바: 문제 요약 + 탭 + 닫기 */}
      <div className="border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <img src={LANG_ICON[lang]} alt={lang} className="h-4 w-4" />
            <span className="text-xs font-bold text-slate-700">{problem._sourceSessionId} · {problem.problem_number}번</span>
          </div>
          <button onClick={onClose} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* 탭 */}
        <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
          <button
            onClick={() => setMobileTab('problem')}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${mobileTab === 'problem' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}
          >
            {genProblem && viewMode === 'generated' ? '유사 문제' : '문제'}
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${mobileTab === 'chat' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500'}`}
          >
            AI 코치
          </button>
        </div>
      </div>

      {/* 문제 탭 */}
      {mobileTab === 'problem' && (
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {/* 원본/유사 전환 */}
          {genProblem && (
            <div className="flex gap-1 mb-3 p-0.5 bg-slate-200/60 rounded-lg">
              <button
                onClick={onSwitchOriginal}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${viewMode === 'original' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}
              >
                원본
              </button>
              <button
                onClick={onSwitchGenerated}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${viewMode === 'generated' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
              >
                유사 문제
              </button>
            </div>
          )}

          {genProblem && viewMode === 'generated' ? (
            <>
              <h2 className="text-base font-bold text-slate-900 mb-5 leading-relaxed">{genProblem.question_text}</h2>
              {genProblem.examples && <CodeBlock code={genProblem.examples} lang={lang || category} />}
              {!genSubmitted ? (
                <div className="flex gap-2">
                  <input
                    type="text" value={genAnswer} onChange={(e) => onGenAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onGenSubmit(); } }}
                    placeholder="답 입력..."
                    className="flex-1 rounded-xl border border-emerald-200 bg-white text-slate-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  <button onClick={onGenSubmit} disabled={genLoading}
                    className="bg-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                    {genLoading ? '...' : '제출'}
                  </button>
                </div>
              ) : genResult ? (
                <div className="space-y-2">
                  <div className={`rounded-xl p-3 text-sm ${genResult.correct ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                    {genResult.correct ? '✅ ' : '💡 '}{genResult.reasoning}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { onRequestSimilar(); setMobileTab('chat'); }}
                      className="flex-1 rounded-xl bg-violet-600 text-white py-2.5 text-sm font-semibold">한 문제 더</button>
                    <button onClick={onNext}
                      className="flex-1 rounded-xl bg-slate-800 text-white py-2.5 text-sm font-semibold">
                      {currentIndex + 1 >= total ? '결과 보기' : '다음 문제 →'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-100 p-4 text-center animate-pulse text-sm text-slate-400">채점 중...</div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-base font-bold text-slate-900 mb-5 leading-relaxed">{problem.question_text}</h2>
              {problem.examples && <CodeBlock code={problem.examples} lang={lang || category} />}
              {checked && (
                <div className="space-y-2">
                  <div className={`rounded-xl p-3 ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                    <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isCorrect ? '✅ 정답!' : '❌ 오답'}
                    </span>
                    {!isCorrect && <p className="text-xs text-rose-600 mt-1">내 답: {userAnswer} → 정답: {problem._answer}</p>}
                  </div>
                  {problem._comment && (
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                      <p className="text-xs font-bold text-blue-600 mb-1">해설</p>
                      <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">{problem._comment}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 채팅 탭 */}
      {mobileTab === 'chat' && (
        <>
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
            {chatMessages.length === 0 && (
              <div className="text-center py-16">
                <MessageCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">이 문제에 대해 질문해보세요</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <ChatBubble key={i} msg={msg}
                onStartProblem={(d) => { onStartProblem(d); setMobileTab('problem'); }}
                onRequestSimilar={onRequestSimilar}
              />
            ))}
            {chatLoading && (
              <div className="bg-white border border-slate-200 text-slate-400 rounded-xl px-3 py-2 text-sm mr-8 animate-pulse">
                생각 중...
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <div className="flex gap-2">
              <input
                type="text" value={chatInput}
                onChange={(e) => onChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onChatSend(); } }}
                placeholder={chatLoading ? '답변 생성 중...' : '질문하기...'}
                disabled={chatLoading}
                className="flex-1 rounded-lg border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button onClick={onChatSend} disabled={chatLoading} className="rounded-lg bg-violet-600 text-white p-2 hover:bg-violet-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CoachSolveClient({ lang, category = 'Code', problems }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [autoSent, setAutoSent] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState([]);
  // 유사 문제 상태
  const [genProblem, setGenProblem] = useState(null); // { problem_id, question_text, examples, category, input_type, ... }
  const [genAnswer, setGenAnswer] = useState('');
  const [genSubmitted, setGenSubmitted] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState(null); // { correct, reasoning, correctAnswer }
  const [slideDir, setSlideDir] = useState('');
  const [viewMode, setViewMode] = useState('original'); // 'original' | 'generated'
  const inputRef = useRef(null);
  const chatScrollRef = useRef(null);

  const problem = problems[currentIndex];
  const colors = LANG_COLOR[lang] || LANG_COLOR.C;
  const total = problems.length;

  useEffect(() => {
    if (!checked && inputRef.current) inputRef.current.focus();
  }, [currentIndex, checked]);

  useEffect(() => {
    if (chatScrollRef.current) {
      const el = chatScrollRef.current;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  // 채팅 패널 열릴 때 맨 아래로
  useEffect(() => {
    if (chatOpen && chatScrollRef.current) {
      setTimeout(() => {
        chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight });
      }, 50);
    }
  }, [chatOpen]);

  // AI 코치 열릴 때 자동 해설 요청
  useEffect(() => {
    if (chatOpen && !autoSent && checked) {
      setAutoSent(true);
      if (isCorrect) {
        sendToAgent(`이 문제를 맞혔어. 왜 정답이 "${problem._answer}"인지 핵심 포인트를 정리해줘.`);
      } else {
        sendToAgent(`이 문제를 틀렸어. 왜 정답이 "${problem._answer}"인지 자세히 설명해줘.`);
      }
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
    setGenProblem(null);
    setGenAnswer('');
    setGenSubmitted(false);
    setGenResult(null);
    setViewMode('original');
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
      const hasPresentProblem = data.ui_actions?.some((a) => a.type === 'present_problem');

      if (hasPresentProblem) {
        // 유사 문제가 있으면 → AI 텍스트는 짧게 대체, 카드만 표시
        setChatMessages((prev) => [...prev, {
          role: 'assistant',
          content: '유사 문제를 준비했어요!',
        }]);
        for (const action of data.ui_actions) {
          if (action.type === 'present_problem') {
            const pendingProblem = { problem_id: action.problem_id, ...action.data };
            setChatMessages((prev) => [...prev, {
              role: 'assistant',
              content: null,
              ui_action: { type: 'pending_problem', data: pendingProblem },
            }]);
          }
        }
      } else {
        // 유사 문제 없으면 → AI 응답 그대로 + 유사문제 제안 버튼
        if (data.reply) {
          setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        }
        if (data.reply && !genProblem) {
          setChatMessages((prev) => [...prev, {
            role: 'assistant',
            content: null,
            ui_action: { type: 'suggest_similar' },
          }]);
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

  async function handleGenSubmit() {
    if (!genAnswer.trim() || genLoading || !genProblem) return;
    setGenLoading(true);
    setGenSubmitted(true);
    try {
      const resp = await fetch('/api/agent/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_session_id: problem._sourceSessionId,
          problem_number: problem.problem_number,
          problem_id: genProblem.problem_id,
          user_answer: genAnswer.trim(),
        }),
      });
      const data = await resp.json();
      if (data.reply) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }
      // 채점 결과 ui_action 처리
      if (data.ui_actions?.length > 0) {
        for (const action of data.ui_actions) {
          if (action.type === 'evaluation') {
            setGenResult({
              correct: action.correct,
              reasoning: action.reasoning || '',
              userAnswer: genAnswer.trim(),
            });
          }
          if (action.type === 'present_problem') {
            // AI가 또 유사 문제를 내면 다시 전환
            setSlideDir('slide-left');
            setTimeout(() => {
              setGenProblem({ problem_id: action.problem_id, ...action.data });
              setGenAnswer('');
              setGenSubmitted(false);
              setGenResult(null);
              setSlideDir('');
            }, 200);
          }
        }
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '제출 중 오류가 발생했어요.' }]);
    } finally {
      setGenLoading(false);
    }
  }

  function handleStartGenProblem(problemData) {
    setSlideDir('slide-left');
    setTimeout(() => {
      setGenProblem(problemData);
      setGenAnswer('');
      setGenSubmitted(false);
      setGenResult(null);
      setViewMode('generated');
      setSlideDir('');
    }, 200);
  }

  function switchToOriginal() {
    setSlideDir('slide-right');
    setTimeout(() => { setViewMode('original'); setSlideDir(''); }, 200);
  }

  function switchToGenerated() {
    setSlideDir('slide-left');
    setTimeout(() => { setViewMode('generated'); setSlideDir(''); }, 200);
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
              href={`/practical/coach/${category.toLowerCase()}`}
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
            href={`/practical/coach/${category.toLowerCase()}`}
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
          <div className={`max-w-2xl mx-auto transition-all duration-200 ${slideDir === 'slide-left' ? 'opacity-0 -translate-x-8' : slideDir === 'slide-right' ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>

            {/* 원본/유사 탭 (유사 문제 있을 때만 표시) */}
            {genProblem && (
              <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={switchToOriginal}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${viewMode === 'original' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:bg-white/60'}`}
                >
                  원본 문제
                </button>
                <button
                  onClick={switchToGenerated}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${viewMode === 'generated' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-white/60'}`}
                >
                  유사 문제
                </button>
              </div>
            )}

            {genProblem && viewMode === 'generated' ? (
              /* ─── 유사 문제 모드 ─── */
              <>
                <h2 className="text-base font-bold text-slate-900 mb-3 leading-relaxed">
                  {genProblem.question_text}
                </h2>
                {genProblem.examples && (
                  <CodeBlock code={genProblem.examples} lang={lang || category} />
                )}
                {!genSubmitted ? (
                  /* 답 입력 */
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={genAnswer}
                      onChange={(e) => setGenAnswer(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenSubmit(); } }}
                      placeholder="답 입력..."
                      className="flex-1 rounded-xl border border-emerald-200 bg-white text-slate-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      autoFocus
                    />
                    <button
                      onClick={handleGenSubmit}
                      disabled={genLoading}
                      className="bg-emerald-600 text-white rounded-xl px-6 py-3 text-sm font-semibold hover:bg-emerald-500 transition disabled:opacity-50"
                    >
                      {genLoading ? '채점 중...' : '제출'}
                    </button>
                  </div>
                ) : genResult ? (
                  /* diff 비교 UI */
                  <div className="mb-4 space-y-3">
                    <div className="rounded-xl overflow-hidden" style={{ background: '#1e1e2e' }}>
                      <div className="px-4 py-2 text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.2)' }}>
                        출력 결과 비교
                      </div>
                      <div className="px-4 py-3 font-mono text-sm space-y-1">
                        <div className="flex items-center gap-2 rounded px-2 py-1" style={{ background: genResult.correct ? '#0d331a' : '#3b1111', borderLeft: `3px solid ${genResult.correct ? '#22c55e' : '#ef4444'}` }}>
                          <span style={{ color: genResult.correct ? '#86efac' : '#fca5a5' }}>
                            {genResult.correct ? '+' : '-'} {genResult.userAnswer}
                          </span>
                          <span className="text-[10px] ml-auto" style={{ color: genResult.correct ? '#4ade80' : '#f87171' }}>
                            (내 답)
                          </span>
                        </div>
                        {!genResult.correct && (
                          <div className="flex items-center gap-2 rounded px-2 py-1" style={{ background: '#0d331a', borderLeft: '3px solid #22c55e' }}>
                            <span style={{ color: '#86efac' }}>+ (정답은 AI 채팅에서 확인)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI 피드백 요약 */}
                    {genResult.reasoning && (
                      <div className={`rounded-xl p-3 text-sm leading-relaxed ${genResult.correct ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                        {genResult.correct ? '✅ ' : '💡 '}
                        {genResult.reasoning}
                      </div>
                    )}

                    {/* 하단 버튼 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => sendToAgent('비슷한 문제 하나 더 내줘')}
                        className="flex-1 rounded-xl bg-violet-600 text-white px-4 py-3 text-sm font-semibold hover:bg-violet-500 transition"
                      >
                        한 문제 더
                      </button>
                      <button
                        onClick={handleNext}
                        className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-slate-800 text-white px-4 py-3 text-sm font-semibold hover:bg-slate-700 transition"
                      >
                        다음 원래 문제
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 채점 대기 중 */
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 mb-4 text-center animate-pulse">
                    <p className="text-sm text-slate-400">AI가 채점 중...</p>
                  </div>
                )}
              </>
            ) : (
              /* ─── 원래 문제 모드 ─── */
              <>
                <p className="text-xs font-medium text-slate-400 mb-2">
                  {problem._sourceSessionId} · {problem.problem_number}번
                </p>

                <h2 className="text-base font-bold text-slate-900 mb-5 leading-relaxed">
                  {problem.question_text}
                </h2>
                {problem.examples && (
                  <div className="mb-5">
                    <CodeBlock code={problem.examples} lang={lang || category} />
                  </div>
                )}
                {!checked ? (
                  <div className="flex gap-2 mb-4 mt-2">
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
                  <div className="space-y-4 mb-4">
                    <div className={`rounded-xl p-4 ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {isCorrect
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          : <XCircle className="h-5 w-5 text-rose-600" />}
                        <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isCorrect ? '정답!' : '오답'}
                        </span>
                      </div>
                      {!isCorrect && (
                        <div className="flex gap-3 text-sm">
                          <div className="flex-1 rounded-lg bg-rose-100/60 px-3 py-2 text-center">
                            <p className="text-[10px] text-rose-400 font-semibold mb-0.5">내 답</p>
                            <p className="font-bold text-rose-700">{userAnswer}</p>
                          </div>
                          <div className="flex-1 rounded-lg bg-emerald-100/60 px-3 py-2 text-center">
                            <p className="text-[10px] text-emerald-500 font-semibold mb-0.5">정답</p>
                            <p className="font-bold text-emerald-700">{problem._answer}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {problem._comment && (
                      <div className="mt-4 rounded-xl bg-blue-50/70 border border-blue-100 p-5">
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-3">해설</p>
                        <div className="text-sm text-blue-950 leading-[1.8] whitespace-pre-wrap">
                          {problem._comment}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setChatOpen(true)}
                        className="w-full flex items-center justify-center gap-1 rounded-xl bg-violet-600 text-white px-4 py-3 text-sm font-semibold hover:bg-violet-500 transition"
                      >
                        <MessageCircle className="h-4 w-4" />
                        AI 코치에게 물어보기
                      </button>
                      <button
                        onClick={() => { setChatOpen(true); sendToAgent('비슷한 유형으로 문제 하나 내줘.'); }}
                        className="w-full flex items-center justify-center gap-1 rounded-xl bg-emerald-600 text-white px-4 py-3 text-sm font-semibold hover:bg-emerald-500 transition"
                      >
                        유사 문제 바로 풀기
                      </button>
                      <Link
                        href={`/practical/coach/${category.toLowerCase()}`}
                        className="w-full flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition"
                      >
                        다른 문제 풀기
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* 오른쪽: AI 채팅 사이드 패널 (데스크탑) */}
        {chatOpen && (
          <div className="hidden md:flex w-[360px] flex-col border-l border-slate-200 bg-slate-50 sticky top-[57px] h-[calc(100vh-57px)]">
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
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 && (
                <div className="text-center py-10">
                  <MessageCircle className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">이 문제에 대해 질문해보세요</p>
                  <p className="text-xs text-slate-300 mt-1">"왜 이게 정답이야?" "비슷한 문제 내줘"</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <ChatBubble key={i} msg={msg} onStartProblem={handleStartGenProblem} onRequestSimilar={() => sendToAgent('이해했어. 비슷한 유형으로 문제 하나 내줘.')} />
              ))}
              {chatLoading && (
                <div className="bg-white border border-slate-200 text-slate-400 rounded-xl px-3 py-2 text-sm mr-8 animate-pulse">
                  생각 중...
                </div>
              )}
            </div>

            {/* 입력 */}
            <div className="border-t border-slate-200 bg-white p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChatSend(); } }}
                  placeholder={chatLoading ? '답변 생성 중...' : '질문하기...'}
                  disabled={chatLoading}
                  className="flex-1 rounded-lg border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:bg-slate-50 disabled:text-slate-400"
                />
                <button
                  onClick={handleChatSend}
                  disabled={chatLoading}
                  className="rounded-lg bg-violet-600 text-white p-2 hover:bg-violet-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 모바일: 우하단 플로팅 AI 버튼 — 오답 시에만, 버튼 아래로 겹치지 않게 */}
      {!chatOpen && checked && (
        <button
          onClick={() => setChatOpen(true)}
          className="md:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-violet-600 text-white pl-4 pr-5 py-3 shadow-lg hover:bg-violet-500 transition active:scale-95"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">AI 코치</span>
        </button>
      )}

      {/* 모바일: 풀스크린 오버레이 (문제/채팅 탭 전환) */}
      {chatOpen && (
        <MobileChatOverlay
          problem={problem}
          genProblem={genProblem}
          viewMode={viewMode}
          lang={lang}
          chatMessages={chatMessages}
          chatInput={chatInput}
          chatLoading={chatLoading}
          checked={checked}
          isCorrect={isCorrect}
          userAnswer={userAnswer}
          genAnswer={genAnswer}
          genSubmitted={genSubmitted}
          genResult={genResult}
          genLoading={genLoading}
          onClose={() => setChatOpen(false)}
          onChatInput={setChatInput}
          onChatSend={handleChatSend}
          onStartProblem={handleStartGenProblem}
          onRequestSimilar={() => sendToAgent('이해했어. 비슷한 유형으로 문제 하나 내줘.')}
          onSwitchOriginal={switchToOriginal}
          onSwitchGenerated={switchToGenerated}
          onGenAnswer={setGenAnswer}
          onGenSubmit={handleGenSubmit}
          onNext={handleNext}
          currentIndex={currentIndex}
          total={total}
          chatScrollRef={chatScrollRef}
        />
      )}
    </main>
  );
}
