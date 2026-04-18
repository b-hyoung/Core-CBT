const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_SESSIONS = ['first', 'second', 'third'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trimEnd())
    .join('\n')
    .trim();
}

function removeFormulaicPrefix(text, answerText) {
  let out = normalizeWhitespace(text);
  // 기존 자동생성형 해설의 반복 문구를 줄여 가독성 개선
  out = out.replace(/^문항은[\s\S]{0,220}?이해를 묻고 있으며[, ]*/u, '');
  out = out.replace(/^이에 해당하는 선택지는/u, '');
  out = out.replace(/^다른 선택지는[\s\S]{0,220}?맞지 않습니다\.?/u, '').trim();

  if (answerText && out === answerText) return '';
  return out;
}

function detectQuestionType(questionText) {
  const q = String(questionText || '');
  if (/실행 결과|출력 결과|결과는|값은 얼마|평균 .*시간|계산/i.test(q)) {
    return {
      label: '계산/추적형',
      hint: '코드·수식·절차를 순서대로 추적하면서 중간값을 계산해 정답을 확인하는 유형입니다.',
    };
  }
  if (/SQL|SELECT|INSERT|UPDATE|DELETE|JOIN|WHERE|GROUP BY/i.test(q)) {
    return {
      label: 'SQL/DB 질의형',
      hint: '질의문의 의미(조건, 집계, 중복 제거, 결과 집합)를 해석하고 보기와 비교하는 것이 핵심입니다.',
    };
  }
  if (/옳지 않은 것|아닌 것은|해당하지 않는 것은|거리가 먼 것은/u.test(q)) {
    return {
      label: '오답 선택형',
      hint: '조건에 맞지 않는 설명/개념 1개를 찾는 문제이므로, 정답은 “틀린 설명”일 수 있습니다.',
    };
  }
  if (/옳은 것은|맞는 것은/u.test(q)) {
    return {
      label: '정답 선택형',
      hint: '보기 중 문제 조건에 정확히 부합하는 설명 1개를 고르는 유형입니다.',
    };
  }
  if (/무엇인가|의미하는 것은|설명하는 것은|해당하는 것은/u.test(q)) {
    return {
      label: '개념 식별형',
      hint: '지문이 설명하는 개념/용어를 정의와 특징으로 대응시키면 정답을 고를 수 있습니다.',
    };
  }
  return {
    label: '개념 비교형',
    hint: '선택지의 정의·특징·적용 범위를 비교해 문제 조건과 일치하는 항목을 판단하는 유형입니다.',
  };
}

function containsStructuredBlocks(text) {
  return /핵심 정리:|풀이 포인트:|정답 선택지:/u.test(text);
}

function shouldForceDetailed(existing) {
  const t = normalizeWhitespace(existing);
  if (!t) return true;
  if (t.length < 70) return true;
  if (!/[.!?]|다\.$|이다\.$|입니다\.$|는다\.$/u.test(t) && t.length < 120) return true;
  if (/^문항은/u.test(t)) return true;
  return false;
}

function buildDetailedComment({
  questionText,
  answerIndex,
  answerText,
  existingComment,
}) {
  const type = detectQuestionType(questionText);
  const cleaned = removeFormulaicPrefix(existingComment, answerText);
  const answerLine = `${answerIndex + 1}번 (${normalizeWhitespace(answerText)})`;

  // 기존 해설이 충분히 길고 구조적이면 최소 보강만
  if (!shouldForceDetailed(cleaned) && !containsStructuredBlocks(cleaned)) {
    return normalizeWhitespace(cleaned.replace(/\n\s*\n?? ??:[\s\S]*$/u, ''));
  }

  const baseLines = [];
  if (cleaned) {
    baseLines.push(cleaned);
  } else {
    baseLines.push(
      '정답 선택지의 개념/설명이 문제에서 요구한 조건에 가장 정확하게 일치합니다.'
    );
  }

  // 짧은 답복붙형 해설은 답 텍스트만 반복하지 않도록 설명 보강
  if (cleaned && normalizeWhitespace(cleaned) === normalizeWhitespace(answerText)) {
    baseLines.length = 0;
    baseLines.push(
      '해설이 답안 문구만 반복되어 있던 항목으로, 문제 조건과 정답의 연결 이유를 보강했습니다.'
    );
    baseLines.push('지문에서 요구한 기준(개념/정의/특징/결과)에 해당하는 선택지가 정답입니다.');
  }

  return normalizeWhitespace(baseLines.join('\n'));
}

function sectionMapByProblemNumber(sectionArray, key) {
  const map = new Map();
  for (const section of sectionArray) {
    const title = section.title;
    for (const item of section[key]) {
      map.set(`${title}::${item.problem_number}`, item);
    }
  }
  return map;
}

function runForSession(sessionName) {
  const baseDir = path.join(ROOT, 'datasets', 'problem2022', sessionName);
  const problemFile = path.join(baseDir, 'problem1.json');
  const answerFile = path.join(baseDir, 'answer1.json');
  const commentFile = path.join(baseDir, 'comment1.json');

  const problems = readJson(problemFile);
  const answers = readJson(answerFile);
  const comments = readJson(commentFile);

  const problemMap = sectionMapByProblemNumber(problems, 'problems');
  const answerMap = sectionMapByProblemNumber(answers, 'answers');

  let updated = 0;

  for (const section of comments) {
    for (const commentItem of section.comments) {
      const key = `${section.title}::${commentItem.problem_number}`;
      const p = problemMap.get(key);
      const a = answerMap.get(key);
      if (!p || !a) continue;

      const nextComment = buildDetailedComment({
        questionText: p.question_text,
        answerIndex: Number(a.correct_answer_index || 0),
        answerText: a.correct_answer_text || '',
        existingComment: commentItem.comment || '',
      });

      if (normalizeWhitespace(commentItem.comment) !== normalizeWhitespace(nextComment)) {
        commentItem.comment = nextComment;
        updated++;
      }
    }
  }

  writeJson(commentFile, comments);
  return { sessionName, updated };
}

function main() {
  const results = TARGET_SESSIONS.map(runForSession);
  for (const r of results) {
    console.log(`${r.sessionName}: updated ${r.updated} comments`);
  }
}

main();

