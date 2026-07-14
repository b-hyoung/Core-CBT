// app/api/daily-review/generate/route.js
// 오답 → 앵커 계획 → 생성(게이트+심판+재생성 예산 2회) → generated_problems 저장
import { auth } from '@/auth';
import { classifySessionId } from '@/lib/examType';
import { getUserOutcomeSummary } from '@/lib/userProblemsStore';
import { loadConceptTags, buildProblemIndex } from '@/lib/conceptTags';
import { loadPracticalDatasetMaps } from '@/app/practical/_lib/practicalData';
import {
  planGenerationBatch, validateGeneratedProblem, sanitizeAcceptedAnswers,
  buildGeneratorPrompt, buildJudgePrompt, parseModelJson,
} from '@/lib/variantGeneration';
import {
  hasGeneratedProblemsConfig, insertGeneratedProblems, fetchPendingOriginKeys,
} from '@/lib/generatedProblemsStore';
import { kstTomorrowString, kstTodayString } from '@/lib/kstDate';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 배치 생성이라 길게

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GENERATOR_MODEL = 'gpt-4.1';        // 생성
const JUDGE_MODEL_LIGHT = 'gpt-4.1-mini'; // 심판(이론·용어) — 별도 인스턴스 rubric 채점
const JUDGE_MODEL_HEAVY = 'gpt-4.1';      // 심판(Code/SQL) — mini는 코드 트레이스 실패 전례
const MAX_REGEN = 2;                      // 재생성 예산 (초기 1회 + 재생성 2회)

function judgeModelFor(category) {
  return category === 'Code' || category === 'SQL' ? JUDGE_MODEL_HEAVY : JUDGE_MODEL_LIGHT;
}

async function callOpenAI(model, input, maxTokens) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model, input, max_output_tokens: maxTokens }),
  });
  if (!response.ok) throw new Error(`openai ${model} failed: ${response.status}`);
  const data = await response.json();
  return (data.output || [])
    .flatMap((item) => item?.content || [])
    .map((c) => c?.text || '')
    .join('')
    .trim();
}

// 앵커 1건 → 검증 통과한 생성물 1건 (실패 시 null + 사유)
async function generateOne(anchor, datasetCache) {
  if (!datasetCache.has(anchor.sessionId)) {
    datasetCache.set(anchor.sessionId, await loadPracticalDatasetMaps(anchor.sessionId));
  }
  const ds = datasetCache.get(anchor.sessionId);
  const original = ds?.problemsByNo?.get(Number(anchor.problemNumber));
  if (!original) return { row: null, reasons: ['original problem not found'] };
  const answer = ds.answersByNo.get(Number(anchor.problemNumber)) || '';
  const comment = ds.commentsByNo.get(Number(anchor.problemNumber)) || '';

  const reasons = [];
  for (let attempt = 0; attempt <= MAX_REGEN; attempt += 1) {
    const prompt = buildGeneratorPrompt({
      original, answer, comment, concept: anchor.concept, failureReasons: reasons,
    });
    let gen;
    try {
      gen = parseModelJson(await callOpenAI(GENERATOR_MODEL, prompt, 1500));
    } catch (e) {
      reasons.push(`openai error: ${String(e?.message || e)}`);
      continue;
    }
    if (!gen) { reasons.push('output was not valid JSON'); continue; }

    // 게이트 1: 결정론적 검증 (스키마·정답노출·근사중복)
    const gate = validateGeneratedProblem(gen, original);
    if (!gate.ok) { reasons.push(gate.reason); continue; }

    // 게이트 2: 별도 인스턴스 rubric 심판 (Code/SQL은 강한 모델 — 코드 트레이스 필요)
    let verdict = null;
    try {
      verdict = parseModelJson(
        await callOpenAI(judgeModelFor(String(original.category || '')), buildJudgePrompt({ gen, original, answer }), 600),
      );
    } catch { /* 심판 호출 실패 → 아래 null 처리 */ }
    if (!verdict) { reasons.push('judge output unparsable'); continue; }
    const pass = verdict.concept_same && verdict.answer_correct && verdict.no_leak && verdict.difficulty_ok;
    if (!pass) { reasons.push(`judge rejected: ${verdict.reason || 'no reason'}`); continue; }

    return {
      row: {
        source_session_id: anchor.sessionId,
        source_problem_number: Number(anchor.problemNumber),
        kind: anchor.kind,
        concept_tag: anchor.concept || null,
        problem: {
          question_text: String(gen.question_text),
          examples: String(gen.examples || ''),
          input_type: String(gen.input_type || 'single'),
          input_labels: Array.isArray(gen.input_labels) ? gen.input_labels : undefined,
          answer_format_hint: gen.answer_format_hint ? String(gen.answer_format_hint) : null,
          // category/subcategory는 LLM 출력을 신뢰하지 않는다 — 원본의 정규 분류(SQL/Code/이론)를 그대로
          category: String(original.category || ''),
          subcategory: String(original.subcategory || ''),
        },
        answer: String(gen.answer),
        // Code/SQL 출력엔 동의어가 없다 — 정답과 정규화 동치인 표기만 허용 (지어낸 오답 변형 차단)
        accepted_answers: sanitizeAcceptedAnswers({
          answer: gen.answer,
          acceptedAnswers: gen.accepted_answers,
          category: String(original.category || ''),
        }),
        comment: String(gen.comment || ''),
        status: 'pending',
      },
      reasons,
    };
  }
  return { row: null, reasons };
}

export async function POST(request) {
  try {
    const session = await auth();
    const email = String(session?.user?.email || '').trim().toLowerCase();
    if (!email) return Response.json({ error: 'unauthorized' }, { status: 401 });
    if (!OPENAI_API_KEY) return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
    if (!hasGeneratedProblemsConfig()) return Response.json({ error: 'supabase not configured' }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const dueDate = body?.dueToday ? kstTodayString() : kstTomorrowString(); // dueToday는 수동 테스트용
    // 한 요청당 앵커 상한 — 클라이언트가 작은 배치로 반복 호출 (연결 드랍·서버리스 타임아웃 대비)
    const maxAnchors = Math.min(Math.max(Number(body?.maxAnchors) || 20, 1), 20);

    // 1) 오답 + 시도 이력 (로컬 dev에서도 Supabase 강제)
    const { wrongProblems, attemptedKeys } = await getUserOutcomeSummary(email, { forceRemote: true });
    const practicalWrongs = wrongProblems.filter(
      (w) => classifySessionId(w.sourceSessionId) === 'practical',
    );

    // 2) 배치 계획
    const [tagsMap, pendingKeys] = await Promise.all([loadConceptTags(), fetchPendingOriginKeys(email)]);
    const problemIndex = await buildProblemIndex(tagsMap);

    // 카테고리 집중 모드: 오답과 무관하게 해당 카테고리 기출을 앵커로 변형 생성 (미시도 우선)
    const CATEGORY_SET = new Set(['SQL', 'Code', '이론']);
    const CODE_LANGUAGES = new Set(['C', 'Java', 'Python']);
    const category = String(body?.category || '');
    // Code 집중 세트의 언어 선택 (C/Java/Python) — 미지정·'혼합'이면 전체
    const language = String(body?.language || '');
    let anchors;
    if (CATEGORY_SET.has(category)) {
      const count = Math.min(Math.max(Number(body?.count) || 20, 1), maxAnchors);
      const pool = problemIndex.filter(
        (p) =>
          p.category === category &&
          !pendingKeys.has(p.key) &&
          (category !== 'Code' || !CODE_LANGUAGES.has(language) || p.subcategory === language),
      );
      const untried = pool.filter((p) => !attemptedKeys.has(p.key)).sort(() => Math.random() - 0.5);
      const tried = pool.filter((p) => attemptedKeys.has(p.key)).sort(() => Math.random() - 0.5);
      anchors = [...untried, ...tried].slice(0, count).map((p) => ({ ...p, kind: 'coverage' }));
    } else {
      anchors = planGenerationBatch({
        wrongs: practicalWrongs, pendingKeys, tagsMap, problemIndex, attemptedKeys, maxAnchors,
      });
    }
    if (anchors.length === 0) {
      return Response.json({ generated: 0, rejected: 0, exhausted: true, dueDate, message: '생성할 앵커가 없습니다 (모두 pending이거나 풀 소진).' });
    }

    // 3) 순차 생성 + 생성 즉시 저장 (연결이 끊겨도 진행분 보존)
    const datasetCache = new Map();
    let generated = 0;
    const byKind = {};
    const rejectedReasons = [];
    for (const anchor of anchors) {
      const { row, reasons } = await generateOne(anchor, datasetCache);
      if (row) {
        await insertGeneratedProblems([{ ...row, user_email: email, due_date: dueDate }]);
        generated += 1;
        byKind[row.kind] = (byKind[row.kind] || 0) + 1;
      } else {
        rejectedReasons.push({ anchor: anchor.key, reasons });
      }
    }

    return Response.json({
      generated,
      rejected: rejectedReasons.length,
      dueDate,
      byKind,
      rejectedReasons,
    });
  } catch (err) {
    console.error('[daily-review/generate] error:', err?.message || err);
    return Response.json({ error: 'generate failed', detail: String(err?.message || '') }, { status: 500 });
  }
}
