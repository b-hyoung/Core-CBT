// scripts/repair-generated-categories.mjs
// 일회성 복구: generated_problems.problem.category/subcategory를 원본 기출의 정규 분류로 교정
// (초기 버전이 LLM이 지어낸 category를 저장했던 문제 수습)
// 실행: node --env-file=.env scripts/repair-generated-categories.mjs
import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { PRACTICAL_SESSION_CONFIG } = await import('../app/practical/_lib/practicalSessions.js');

const stripBom = (s) => String(s || '').replace(/^﻿/, '');
const headers = { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json' };
const base = `${SUPABASE_URL}/rest/v1/generated_problems`;

// 원본 카테고리 인덱스 구축
const originCategory = new Map();
for (const [sessionId, cfg] of Object.entries(PRACTICAL_SESSION_CONFIG)) {
  let sections;
  try {
    sections = JSON.parse(stripBom(await fs.readFile(path.join(process.cwd(), ...cfg.basePath, 'problem1.json'), 'utf8')));
  } catch { continue; }
  for (const section of sections || []) {
    for (const p of section?.problems || []) {
      originCategory.set(`${sessionId}:${Number(p.problem_number)}`, {
        category: String(p.category || ''),
        subcategory: String(p.subcategory || ''),
      });
    }
  }
}

const rows = await (await fetch(`${base}?select=id,source_session_id,source_problem_number,problem`, { headers })).json();
let fixed = 0;
for (const row of rows) {
  const origin = originCategory.get(`${row.source_session_id}:${row.source_problem_number}`);
  if (!origin) { console.log(`skip (원본 없음): ${row.id}`); continue; }
  const p = row.problem || {};
  if (p.category === origin.category && p.subcategory === origin.subcategory) continue;
  const patched = { ...p, category: origin.category, subcategory: origin.subcategory };
  const res = await fetch(`${base}?id=eq.${row.id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ problem: patched }),
  });
  if (!res.ok) { console.log(`FAIL ${row.id}: ${res.status}`); continue; }
  fixed += 1;
  console.log(`fixed ${row.source_session_id}:${row.source_problem_number} '${p.category}' → '${origin.category}'`);
}
console.log(`완료: ${fixed}/${rows.length} 교정`);
