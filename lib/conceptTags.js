// lib/conceptTags.js
import fs from 'fs/promises';
import path from 'path';
import { PRACTICAL_SESSION_CONFIG } from '@/app/practical/_lib/practicalSessions';

const TAGS_PATH = path.join(process.cwd(), 'datasets', 'practicalIndustrial', 'conceptTags.json');
const stripBom = (s) => String(s || '').replace(/^﻿/, '');

export async function loadConceptTags() {
  try {
    const raw = await fs.readFile(TAGS_PATH, 'utf8');
    return JSON.parse(stripBom(raw));
  } catch {
    return {};
  }
}

// 기출 전체 인덱스: [{ key, sessionId, problemNumber, concept, category }]
export async function buildProblemIndex(tagsMap) {
  const index = [];
  for (const [sessionId, cfg] of Object.entries(PRACTICAL_SESSION_CONFIG)) {
    const problemPath = path.join(process.cwd(), ...cfg.basePath, 'problem1.json');
    let sections;
    try {
      sections = JSON.parse(stripBom(await fs.readFile(problemPath, 'utf8')));
    } catch {
      continue;
    }
    for (const section of sections || []) {
      for (const p of section?.problems || []) {
        const problemNumber = Number(p.problem_number);
        if (!Number.isFinite(problemNumber)) continue;
        const key = `${sessionId}:${problemNumber}`;
        index.push({
          key,
          sessionId,
          problemNumber,
          concept: String(tagsMap[key] || `${String(p.category || '기타')}-기타`),
          category: String(p.category || '기타'),
          subcategory: String(p.subcategory || ''),
        });
      }
    }
  }
  return index;
}

// 확장: 약한 개념 순서대로, 그 개념의 미시도 문제를 라운드로빈으로 선정
export function pickExpansionAnchors({ weakConcepts, problemIndex, attemptedKeys, excludeKeys, count }) {
  const picked = [];
  const used = new Set(excludeKeys);
  for (const concept of weakConcepts) {
    if (picked.length >= count) break;
    const candidate = problemIndex.find(
      (p) => p.concept === concept && !attemptedKeys.has(p.key) && !used.has(p.key),
    );
    if (candidate) {
      picked.push(candidate);
      used.add(candidate.key);
    }
  }
  return picked;
}

// 커버리지: 미시도 개념 우선 → 개념당 1문제 라운드로빈
export function pickCoverageAnchors({ problemIndex, attemptedKeys, excludeKeys, count, random = Math.random }) {
  const attemptedConcepts = new Set(
    problemIndex.filter((p) => attemptedKeys.has(p.key)).map((p) => p.concept),
  );
  const byConcept = new Map();
  for (const p of problemIndex) {
    if (attemptedKeys.has(p.key) || excludeKeys.has(p.key)) continue;
    if (!byConcept.has(p.concept)) byConcept.set(p.concept, []);
    byConcept.get(p.concept).push(p);
  }
  // 미시도 개념 먼저, 그다음 시도된 개념
  const concepts = [...byConcept.keys()].sort((a, b) => {
    const aUntried = attemptedConcepts.has(a) ? 1 : 0;
    const bUntried = attemptedConcepts.has(b) ? 1 : 0;
    return aUntried - bUntried;
  });
  const picked = [];
  for (const concept of concepts) {
    if (picked.length >= count) break;
    const pool = byConcept.get(concept);
    picked.push(pool[Math.floor(random() * pool.length)]);
  }
  return picked;
}
