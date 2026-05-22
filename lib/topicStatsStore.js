import fs from 'fs/promises';
import path from 'path';
import { fetchUserFinishEvents } from '@/lib/userProblemsStore';

const DATASETS_ROOT = path.join(process.cwd(), 'datasets', 'practicalIndustrial');

function emptySlot() {
  return { total: 0, correct: 0, accuracy: 0 };
}

function finalizeSlot(slot) {
  const total = slot.total;
  const correct = slot.correct;
  return { total, correct, accuracy: total > 0 ? correct / total : 0 };
}

async function loadAllTags() {
  const tags = new Map();
  try {
    const entries = await fs.readdir(DATASETS_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sessionId = entry.name;
      const problemFile = path.join(DATASETS_ROOT, sessionId, 'problem1.json');
      try {
        const raw = await fs.readFile(problemFile, 'utf8');
        const data = JSON.parse(raw);
        const problems = data?.[0]?.problems || [];
        for (const p of problems) {
          const pnum = Number(p.problem_number);
          if (!Number.isFinite(pnum) || !p.category) continue;
          tags.set(`${sessionId}:${pnum}`, { category: p.category, subcategory: p.subcategory || null });
        }
      } catch {
        // skip malformed session
      }
    }
  } catch {
    // dataset root missing
  }
  return tags;
}

export async function computeUserTopicStats(userEmail) {
  const events = await fetchUserFinishEvents(userEmail);
  const tags = await loadAllTags();

  // 2-pass latest-wins: (sid, pnum) → latest outcome
  const latestForKey = new Map();
  for (const ev of events) {
    const outcomes = ev?.payload?.problemOutcomes || [];
    for (const o of outcomes) {
      const sid = String(o?.sessionId || '').trim();
      const pnum = Number(o?.problemNumber);
      if (!sid || !Number.isFinite(pnum)) continue;
      const key = `${sid}:${pnum}`;
      if (latestForKey.has(key)) continue; // events is desc — first seen is latest
      latestForKey.set(key, o);
    }
  }

  const result = {
    SQL: emptySlot(),
    Code: { _total: emptySlot(), Java: emptySlot(), C: emptySlot(), Python: emptySlot() },
    이론: { _total: emptySlot(), 네트워크: emptySlot(), 보안: emptySlot(), 소프트웨어공학: emptySlot() },
  };

  for (const [key, o] of latestForKey.entries()) {
    const tag = tags.get(key);
    if (!tag) continue;
    const isCorrect = Boolean(o?.isCorrect);

    if (tag.category === 'SQL') {
      result.SQL.total += 1;
      result.SQL.correct += isCorrect ? 1 : 0;
    } else if (tag.category === 'Code') {
      result.Code._total.total += 1;
      result.Code._total.correct += isCorrect ? 1 : 0;
      if (tag.subcategory && result.Code[tag.subcategory]) {
        result.Code[tag.subcategory].total += 1;
        result.Code[tag.subcategory].correct += isCorrect ? 1 : 0;
      }
    } else if (tag.category === '이론') {
      result.이론._total.total += 1;
      result.이론._total.correct += isCorrect ? 1 : 0;
      if (tag.subcategory && result.이론[tag.subcategory]) {
        result.이론[tag.subcategory].total += 1;
        result.이론[tag.subcategory].correct += isCorrect ? 1 : 0;
      }
    }
  }

  result.SQL = finalizeSlot(result.SQL);
  for (const parent of ['Code', '이론']) {
    const sub = {};
    for (const [k, v] of Object.entries(result[parent])) {
      sub[k] = finalizeSlot(v);
    }
    result[parent] = sub;
  }
  return result;
}
