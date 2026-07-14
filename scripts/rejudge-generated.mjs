// scripts/rejudge-generated.mjs
// 저장된 Code/SQL 생성 문제 전수 재심사 — 강한 모델(gpt-4.1)로 정답 검산, 불합격은 폐기.
// (mini 심판이 코드 트레이스를 못 해 틀린 정답을 통과시킨 사고의 수습 + 재발 감시용)
// 실행: node --env-file=.env scripts/rejudge-generated.mjs
import process from 'node:process';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const base = `${SUPABASE_URL}/rest/v1/generated_problems`;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json' };

async function judge(row) {
  const p = row.problem || {};
  const prompt = [
    '당신은 시험 문제 검산관입니다. 아래 문제를 직접 풀어서 제시된 정답이 옳은지 검증하세요.',
    '코드 문제면 실행을 한 줄씩 손으로 트레이스하고, SQL이면 테이블 데이터로 직접 계산하세요.',
    '확신이 없으면 false를 주세요.',
    '',
    'JSON만 출력: {"answer_correct": bool, "my_answer": "직접 계산한 답", "reason": "불일치 시 구체 사유"}',
    '',
    '[문제]', String(p.question_text || ''),
    '[보기/코드]', String(p.examples || '없음'),
    `[제시된 정답] ${String(row.answer)}`,
    `[허용 답안] ${(row.accepted_answers || []).join(' / ')}`,
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'gpt-4.1', input: prompt, max_output_tokens: 800 }),
  });
  if (!response.ok) throw new Error(`openai ${response.status}`);
  const data = await response.json();
  const text = (data.output || []).flatMap((i) => i?.content || []).map((c) => c?.text || '').join('');
  const m = text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

const rows = await (await fetch(
  `${base}?select=id,answer,accepted_answers,problem,status&status=neq.discarded`,
  { headers: H },
)).json();
const targets = rows.filter((r) => ['Code', 'SQL'].includes(String(r.problem?.category || '')));
console.log(`재심사 대상 (Code/SQL): ${targets.length}건`);

let bad = 0;
for (const row of targets) {
  let verdict = null;
  try { verdict = await judge(row); } catch (e) { console.log(`skip ${row.id.slice(0, 8)}: ${e.message}`); continue; }
  if (!verdict) { console.log(`skip ${row.id.slice(0, 8)}: unparsable`); continue; }
  if (verdict.answer_correct) {
    console.log(`ok   ${row.id.slice(0, 8)}`);
    continue;
  }
  bad += 1;
  console.log(`BAD  ${row.id.slice(0, 8)} 저장답=${JSON.stringify(row.answer).slice(0, 40)} 검산답=${JSON.stringify(verdict.my_answer).slice(0, 40)} — ${String(verdict.reason).slice(0, 80)}`);
  await fetch(`${base}?id=eq.${row.id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'discarded' }),
  });
}
console.log(`완료: ${targets.length}건 중 ${bad}건 폐기`);
