const fs = require('fs/promises');
const path = require('path');

const ROOT = process.cwd();
const YEARS = {
  2022: [
    { key: '2022-1', sessionId: '9', dir: ['datasets','problem2022','first'] },
    { key: '2022-2', sessionId: '10', dir: ['datasets','problem2022','second'] },
    { key: '2022-3', sessionId: '11', dir: ['datasets','problem2022','third'] },
  ],
  2023: [
    { key: '2023-1', sessionId: '6', dir: ['datasets','problem2023','first'] },
    { key: '2023-2', sessionId: '7', dir: ['datasets','problem2023','second'] },
    { key: '2023-3', sessionId: '8', dir: ['datasets','problem2023','third'] },
  ],
  2024: [
    { key: '2024-1', sessionId: '1', dir: ['datasets','problem2024','first'] },
    { key: '2024-2', sessionId: '4', dir: ['datasets','problem2024','second'] },
    { key: '2024-3', sessionId: '5', dir: ['datasets','problem2024','third'] },
  ],
  2025: [
    { key: '2025I-1', sessionId: 'pdfpack-industrial-2025-1', dir: ['datasets','pdfPacks','industrial-2025-1'] },
    { key: '2025I-2', sessionId: 'pdfpack-industrial-2025-2', dir: ['datasets','pdfPacks','industrial-2025-2'] },
    { key: '2025I-3', sessionId: 'pdfpack-industrial-2025-3', dir: ['datasets','pdfPacks','industrial-2025-3'] },
  ],
};

const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');

async function readTextWithFallback(baseDir, names) {
  for (const name of names) {
    const p = path.join(baseDir, name);
    try {
      return await fs.readFile(p, 'utf8');
    } catch (e) {
      if (e && e.code === 'ENOENT') continue;
      throw e;
    }
  }
  throw new Error(`Missing files in ${baseDir}: ${names.join(', ')}`);
}

function flattenProblemData(problemData) {
  return problemData.flatMap((section) => section.problems || []);
}

function buildMap(sections, listKey, valueFieldCandidates) {
  const map = {};
  for (const section of sections) {
    const list = section[listKey] || [];
    for (const row of list) {
      for (const field of valueFieldCandidates) {
        if (row[field] != null) {
          map[row.problem_number] = row[field];
          break;
        }
      }
      if (!(row.problem_number in map)) map[row.problem_number] = '';
    }
  }
  return map;
}

function subjectOf(problemNumber) {
  if (problemNumber >= 1 && problemNumber <= 20) return 1;
  if (problemNumber >= 21 && problemNumber <= 40) return 2;
  return 3;
}

async function readSessionBundle(meta) {
  const baseDir = path.join(ROOT, ...meta.dir);
  const [problemText, answerText, commentText] = await Promise.all([
    readTextWithFallback(baseDir, ['problem1.json', 'problem1.temp3.json']),
    readTextWithFallback(baseDir, ['answer1.json']),
    readTextWithFallback(baseDir, ['comment1.json']),
  ]);

  const problemData = JSON.parse(stripBom(problemText));
  const answerData = JSON.parse(stripBom(answerText));
  const commentData = JSON.parse(stripBom(commentText));

  const answersMap = buildMap(answerData, 'answers', ['correct_answer_text']);
  const commentsMap = buildMap(commentData, 'comments', ['comment', 'comment_text']);

  return flattenProblemData(problemData).map((p) => ({
    sourceKey: meta.key,
    sourceSessionId: meta.sessionId,
    problem_number: p.problem_number,
    subject: subjectOf(p.problem_number),
    question_text: p.question_text,
    options: p.options,
    examples: p.examples || null,
    answer_text: answersMap[p.problem_number] || '',
    comment_text: commentsMap[p.problem_number] || '',
  }));
}

async function main() {
  const outDir = path.join(ROOT, 'datasets', 'randomOptionShuffle');
  await fs.mkdir(outDir, { recursive: true });

  for (const [year, sessions] of Object.entries(YEARS)) {
    const all = (await Promise.all(sessions.map(readSessionBundle))).flat();
    const payload = {
      format: 'random-option-shuffle-year-v1',
      year: Number(year),
      generatedAt: new Date().toISOString(),
      sessions: sessions.map((s) => ({ key: s.key, sessionId: s.sessionId })),
      items: all,
    };
    const outPath = path.join(outDir, `year${year}.json`);
    await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`generated ${path.relative(ROOT, outPath)} (${all.length} items)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
