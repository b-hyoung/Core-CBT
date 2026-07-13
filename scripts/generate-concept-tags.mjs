// scripts/generate-concept-tags.mjs
// 기출 전체에 개념 태그 1회 배치 부여 → datasets/practicalIndustrial/conceptTags.json
// 실행: node --env-file=.env scripts/generate-concept-tags.mjs
// 재실행 안전: 이미 태깅된 키는 건너뜀 (체크포인트 방식)
import fs from 'fs/promises';
import path from 'path';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OUT_PATH = path.join(process.cwd(), 'datasets', 'practicalIndustrial', 'conceptTags.json');

const { PRACTICAL_SESSION_CONFIG } = await import('../app/practical/_lib/practicalSessions.js');

export const SQL_TAGS = [
  'SQL-DCL권한', 'SQL-집계그룹', 'SQL-조인', 'SQL-서브쿼리',
  'SQL-DML', 'SQL-DDL', 'SQL-트랜잭션', 'SQL-뷰인덱스', 'SQL-기타',
];
export const CODE_TAGS = [
  'Code-제어흐름', 'Code-배열문자열', 'Code-함수포인터', 'Code-OOP', 'Code-연산자', 'Code-기타',
];

function stripBom(s) { return String(s || '').replace(/^﻿/, ''); }

async function tagWithLLM(problem, tags) {
  const prompt = [
    '다음 시험 문제가 측정하는 핵심 개념을 아래 태그 목록에서 정확히 하나 골라 태그 문자열만 출력하세요.',
    `태그 목록: ${tags.join(', ')}`,
    '',
    '[문제]', String(problem.question_text || ''),
    '[보기/코드]', String(problem.examples || '').slice(0, 1500),
  ].join('\n');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'gpt-4.1-mini', input: prompt, max_output_tokens: 30 }),
  });
  if (!response.ok) throw new Error(`openai failed: ${response.status}`);
  const data = await response.json();
  const text = (data.output || [])
    .flatMap((item) => item?.content || [])
    .map((c) => c?.text || '')
    .join('')
    .trim();
  return tags.find((t) => text.includes(t)) || tags[tags.length - 1]; // 미매칭 → '-기타'
}

async function main() {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY 필요 (node --env-file=.env 로 실행)');
  let tagsMap = {};
  try { tagsMap = JSON.parse(stripBom(await fs.readFile(OUT_PATH, 'utf8'))); } catch {}

  for (const [sessionId, cfg] of Object.entries(PRACTICAL_SESSION_CONFIG)) {
    const problemPath = path.join(process.cwd(), ...cfg.basePath, 'problem1.json');
    let sections;
    try { sections = JSON.parse(stripBom(await fs.readFile(problemPath, 'utf8'))); } catch { continue; }

    for (const section of sections || []) {
      for (const p of section?.problems || []) {
        const key = `${sessionId}:${Number(p.problem_number)}`;
        if (tagsMap[key]) continue; // 체크포인트

        const category = String(p.category || '').trim();
        if (category === 'SQL') {
          tagsMap[key] = await tagWithLLM(p, SQL_TAGS);
        } else if (category === 'Code') {
          tagsMap[key] = await tagWithLLM(p, CODE_TAGS);
        } else {
          // 이론: 기존 subcategory가 이미 개념 수준 → LLM 불필요
          tagsMap[key] = `이론-${String(p.subcategory || '기타').trim()}`;
        }
        console.log(`${key} → ${tagsMap[key]}`);
      }
    }
    // 세션마다 저장 (중단해도 재개 가능)
    await fs.writeFile(OUT_PATH, JSON.stringify(tagsMap, null, 2), 'utf8');
  }
  console.log(`완료: ${Object.keys(tagsMap).length}건 → ${OUT_PATH}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
