const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SESSIONS = ['first', 'second', 'third'];

function readJson(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM 제거
  return JSON.parse(text);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function normalize(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trimEnd())
    .join('\n')
    .trim();
}

function removeFormulaicText(text, answerText) {
  let out = normalize(text);
  out = out.replace(/^문항은[\s\S]{0,260}?이해를 묻고 있으며[, ]*/u, '');
  out = out.replace(/^이에 해당하는 선택지는\s*/u, '');
  out = out.replace(/^다른 선택지는[\s\S]{0,260}?맞지 않습니다\.?/u, '').trim();
  out = out.replace(/^정답은 .*?입니다\.?/u, '').trim();
  if (answerText && out === normalize(answerText)) return '';
  return out;
}

function detectType(questionText) {
  const q = String(questionText || '');
  if (/실행 결과|출력 결과|평균 .*시간|평균 대기 시간|값은 얼마|계산/i.test(q)) {
    return {
      label: '계산/추적형',
      hint: '절차 또는 중간값(실행 순서, 종료 시점, 누적값)을 순서대로 계산하면 정답에 도달할 수 있습니다.',
    };
  }
  if (/SQL|SELECT|INSERT|UPDATE|DELETE|JOIN|WHERE|GROUP BY|HAVING/i.test(q)) {
    return {
      label: 'SQL/DB 질의형',
      hint: '조건절, 중복 제거, 집계, 하위 질의의 의미를 해석한 뒤 결과 튜플/값을 판단하는 문제가 많습니다.',
    };
  }
  if (/실행시간|도착시간|스케줄링|FCFS|SJF|RR|HRN|대기 시간/u.test(q)) {
    return {
      label: '스케줄링 계산형',
      hint: '도착 시간/실행 시간을 기준으로 실행 순서를 먼저 정하고, 대기시간/반환시간을 계산해야 합니다.',
    };
  }
  if (/옳지 않은 것|아닌 것은|해당하지 않는 것은|거리가 먼 것은/u.test(q)) {
    return {
      label: '오답 선택형',
      hint: '정답은 조건에 맞지 않는 보기 1개입니다. 정답 문장이 틀린 설명일 수 있다는 점을 먼저 확인하세요.',
    };
  }
  if (/옳은 것은|맞는 것은/u.test(q)) {
    return {
      label: '정답 선택형',
      hint: '정의/특징/적용 범위를 비교해 문제 조건에 정확히 맞는 보기 1개를 고르는 유형입니다.',
    };
  }
  if (/무엇인가|의미하는 것은|설명하는 것은|해당하는 것은/u.test(q)) {
    return {
      label: '개념 식별형',
      hint: '지문이 설명하는 핵심 특징(정의, 목적, 역할, 계층, 구성요소)을 키워드로 잡으면 정답 판별이 쉬워집니다.',
    };
  }
  return {
    label: '개념 비교형',
    hint: '선택지 간 핵심 용어의 차이(정의/역할/범위)를 비교해 문제 조건과 일치 여부를 판단하면 됩니다.',
  };
}

function hasStructure(text) {
  return /핵심 정리:|풀이 포인트:|정답 선택지:/u.test(text);
}

function buildComment({ questionText, answerIndex, answerText, existingComment }) {
  const type = detectType(questionText);
  const cleaned = removeFormulaicText(existingComment, answerText);
  const answerLine = `${answerIndex + 1}번 (${normalize(answerText)})`;
  const forceDetail =
    !cleaned ||
    cleaned.length < 80 ||
    /^문항은/u.test(cleaned) ||
    normalize(cleaned) === normalize(answerText);

  const headLines = [];
  if (forceDetail) {
    headLines.push(
      cleaned ||
        '정답 선택지가 문제에서 요구한 개념/규칙/결과에 가장 정확하게 부합합니다.'
    );
    if (normalize(cleaned) === normalize(answerText)) {
      headLines.length = 0;
      headLines.push('해설이 정답 문구 반복 형태라서, 이해를 돕도록 설명형 해설로 보강했습니다.');
      headLines.push('문제에서 요구한 기준에 해당하는 이유를 확인하고 다른 보기와 비교하는 방식으로 푸는 것이 좋습니다.');
    }
  } else {
    headLines.push(cleaned);
  }

  // 이미 충분히 구조화된 경우 중복 구조 추가를 피함
  if (!forceDetail && hasStructure(cleaned)) {
    return normalize(cleaned.replace(/\n\s*\n?? ??:[\s\S]*$/u, ''));
  }

  return normalize(headLines.join('\n'));
}

function makeItemMap(sections, key) {
  const map = new Map();
  for (const section of sections) {
    const title = section.title;
    for (const item of section[key]) {
      map.set(`${title}::${item.problem_number}`, item);
    }
  }
  return map;
}

function enhanceYear(year) {
  let totalUpdated = 0;

  for (const session of SESSIONS) {
    const baseDir = path.join(ROOT, 'datasets', `problem${year}`, session);
    const problemPath = path.join(baseDir, 'problem1.json');
    const answerPath = path.join(baseDir, 'answer1.json');
    const commentPath = path.join(baseDir, 'comment1.json');
    if (!fs.existsSync(problemPath) || !fs.existsSync(answerPath) || !fs.existsSync(commentPath)) continue;

    const problems = readJson(problemPath);
    const answers = readJson(answerPath);
    const comments = readJson(commentPath);

    const problemMap = makeItemMap(problems, 'problems');
    const answerMap = makeItemMap(answers, 'answers');

    let sessionUpdated = 0;
    for (const section of comments) {
      for (const commentItem of section.comments) {
        const key = `${section.title}::${commentItem.problem_number}`;
        const problem = problemMap.get(key);
        const answer = answerMap.get(key);
        if (!problem || !answer) continue;

        const next = buildComment({
          questionText: problem.question_text,
          answerIndex: Number(answer.correct_answer_index || 0),
          answerText: answer.correct_answer_text || '',
          existingComment: commentItem.comment || '',
        });

        if (normalize(commentItem.comment) !== normalize(next)) {
          commentItem.comment = next;
          sessionUpdated += 1;
        }
      }
    }

    writeJson(commentPath, comments);
    totalUpdated += sessionUpdated;
    console.log(`${year}-${session}: updated ${sessionUpdated}`);
  }

  console.log(`${year}: total updated ${totalUpdated}`);
}

function main() {
  const years = process.argv.slice(2).length ? process.argv.slice(2) : ['2023', '2024'];
  for (const year of years) {
    enhanceYear(year);
  }
}

main();

