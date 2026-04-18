const fs = require('fs');
const path = require('path');

const baseDir = path.join(process.cwd(), 'datasets', 'practicalIndustrial');

function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '');
}

function normalize(v) {
  return String(v ?? '').trim();
}

let updatedFiles = 0;
let removedCount = 0;

for (const dirName of fs.readdirSync(baseDir)) {
  const problemPath = path.join(baseDir, dirName, 'problem1.json');
  const answerPath = path.join(baseDir, dirName, 'answer1.json');
  if (!fs.existsSync(problemPath) || !fs.existsSync(answerPath)) continue;

  const problemData = JSON.parse(stripBom(fs.readFileSync(problemPath, 'utf8')));
  const answerData = JSON.parse(stripBom(fs.readFileSync(answerPath, 'utf8')));

  const answerMap = new Map();
  for (const section of answerData) {
    for (const ans of section.answers || []) {
      answerMap.set(Number(ans.problem_number), String(ans.correct_answer_text ?? ''));
    }
  }

  let fileChanged = false;
  for (const section of problemData) {
    for (const problem of section.problems || []) {
      if (!Array.isArray(problem.options)) continue;
      if (problem.options.length !== 1) continue;

      const answer = answerMap.get(Number(problem.problem_number));
      if (normalize(problem.options[0]) !== normalize(answer)) continue;

      delete problem.options;
      fileChanged = true;
      removedCount += 1;
    }
  }

  if (fileChanged) {
    fs.writeFileSync(problemPath, JSON.stringify(problemData, null, 2) + '\n', 'utf8');
    updatedFiles += 1;
    console.log(`updated ${dirName}`);
  }
}

console.log(`done: updatedFiles=${updatedFiles}, removedOptions=${removedCount}`);

