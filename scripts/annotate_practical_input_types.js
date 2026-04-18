const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(process.cwd(), 'datasets', 'practicalIndustrial');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function collectAnswers(answerDoc) {
  const map = new Map();
  for (const subject of answerDoc) {
    for (const item of subject.answers || []) {
      map.set(Number(item.problem_number), String(item.correct_answer_text ?? ''));
    }
  }
  return map;
}

function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

function normalizeSpace(v) {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}

function classifyPracticalInput(questionText, examples, answerText) {
  const q = `${questionText || ''}\n${examples || ''}`;
  const a = String(answerText || '');
  const qNorm = normalizeSpace(q);
  const aNorm = normalizeSpace(a);

  const hasSqlKeyword =
    /\b(SELECT|UPDATE|INSERT|DELETE|CREATE|ALTER|DROP)\b/i.test(aNorm) ||
    /\bSQL\b/i.test(qNorm);
  const looksSqlStatement = /;\s*$/.test(aNorm) || /\b(FROM|WHERE|GROUP BY|ORDER BY|VALUES|SET)\b/i.test(aNorm);

  const circledCount = countMatches(a, /[①②③④⑤⑥⑦⑧⑨]/g);
  const gaCount = countMatches(a, /\(([가나다라마바사아자차카타파하])\)/g);
  const numberedCount = countMatches(a, /(?:^|[\s/])\d+\s*[\).:]/g);
  const korLabeledCount = countMatches(a, /[ㄱ-ㅎ]\s*:/g);
  const gaLabeledCount = countMatches(a, /[가-힣]\s*:/g);
  const slashSegments = countMatches(a, /\s\/\s/g);

  const hasOrderQuestion = /(순서|나열|절차.*나열|수행 순서|과정.*순서|V모델 순서)/.test(qNorm);
  const hasBulletSequenceAnswer =
    countMatches(a, /[ㄱ-ㅎ]/g) >= 2 && /[,>\-]/.test(a) && !/(가|나|다)\s*:/.test(a);
  const hasArrowSequence = /->|→/.test(a);

  let inputType = 'single';

  if (hasSqlKeyword && looksSqlStatement) {
    inputType = 'textarea';
  } else if (
    circledCount >= 2 ||
    gaCount >= 2 ||
    numberedCount >= 2 ||
    korLabeledCount >= 2 ||
    gaLabeledCount >= 2
  ) {
    inputType = 'multi_blank';
  } else if (hasOrderQuestion || hasBulletSequenceAnswer || hasArrowSequence) {
    inputType = 'sequence';
  }

  let answerFormatHint = '';

  if (inputType === 'textarea') {
    if (/\bSELECT\b/i.test(aNorm)) answerFormatHint = '예: SELECT ...;';
    else if (/\bUPDATE\b/i.test(aNorm)) answerFormatHint = '예: UPDATE ... SET ... WHERE ...;';
    else if (/\bINSERT\b/i.test(aNorm)) answerFormatHint = '예: INSERT INTO ... VALUES (...);';
    else if (/\bDELETE\b/i.test(aNorm)) answerFormatHint = '예: DELETE FROM ... WHERE ...;';
    else if (/\bCREATE\b/i.test(aNorm)) answerFormatHint = '예: CREATE TABLE ...;';
    else answerFormatHint = '예: SQL문 전체를 입력하세요.';
  } else if (inputType === 'sequence') {
    if (/[①②③④⑤]/.test(a)) answerFormatHint = '예: ①-②-③-④';
    else if (/[ㄱ-ㅎ]/.test(a)) answerFormatHint = '예: ㄱ-ㄴ-ㄷ-ㄹ';
    else if (/\d/.test(a)) answerFormatHint = '예: 1-2-3-4';
    else answerFormatHint = '예: 순서대로 기호를 입력';
  } else if (inputType === 'multi_blank') {
    if (circledCount >= 2) {
      answerFormatHint = '예: ① 값 ② 값';
    } else if (gaCount >= 2) {
      answerFormatHint = '예: (가) 값 / (나) 값';
    } else if (numberedCount >= 2) {
      answerFormatHint = '예: 1) 값 / 2) 값';
    } else if (korLabeledCount >= 2) {
      answerFormatHint = '예: ㄱ: 값, ㄴ: 값';
    } else {
      answerFormatHint = '예: 항목별 답을 함께 입력';
    }
  }

  return { inputType, answerFormatHint };
}

function main() {
  const summary = [];

  for (const dirName of fs.readdirSync(BASE_DIR)) {
    const dirPath = path.join(BASE_DIR, dirName);
    const problemPath = path.join(dirPath, 'problem1.json');
    const answerPath = path.join(dirPath, 'answer1.json');

    if (!fs.existsSync(problemPath) || !fs.existsSync(answerPath)) continue;

    const problemDoc = readJson(problemPath);
    const answerDoc = readJson(answerPath);
    const answerMap = collectAnswers(answerDoc);

    const counts = { single: 0, sequence: 0, multi_blank: 0, textarea: 0 };
    let updated = 0;

    for (const subject of problemDoc) {
      for (const problem of subject.problems || []) {
        const answerText = answerMap.get(Number(problem.problem_number)) ?? '';
        const { inputType, answerFormatHint } = classifyPracticalInput(
          problem.question_text,
          problem.examples,
          answerText,
        );
        problem.input_type = inputType;
        if (answerFormatHint) problem.answer_format_hint = answerFormatHint;
        else delete problem.answer_format_hint;
        counts[inputType] = (counts[inputType] || 0) + 1;
        updated += 1;
      }
    }

    writeJson(problemPath, problemDoc);
    summary.push({
      dirName,
      updated,
      counts,
    });
  }

  for (const row of summary) {
    console.log(
      `${row.dirName}: updated=${row.updated} | single=${row.counts.single} sequence=${row.counts.sequence} multi_blank=${row.counts.multi_blank} textarea=${row.counts.textarea}`,
    );
  }
}

main();
