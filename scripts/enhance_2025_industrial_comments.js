const fs = require('fs/promises');
const path = require('path');

const ROOT = process.cwd();
const DATASETS_DIR = path.join(ROOT, 'datasets');
const TARGETS = ['industrial-2025-1', 'industrial-2025-2', 'industrial-2025-3'];
const CORPUS_SETS = [
  ['problem2022', 'first'], ['problem2022', 'second'], ['problem2022', 'third'],
  ['problem2023', 'first'], ['problem2023', 'second'], ['problem2023', 'third'],
  ['problem2024', 'first'], ['problem2024', 'second'], ['problem2024', 'third'],
];

const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');
const norm = (s) => String(s || '')
  .replace(/\[[^\]]*\]/g, ' ')
  .replace(/[“”"'`]/g, '')
  .replace(/\s+/g, '')
  .trim();

function normalizeSpace(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function findQuestionMode(q) {
  const text = String(q || '');
  return {
    negative: /(옳지 않은 것은|틀린 것은|아닌 것은|거리가 먼 것은|적절하지 않은 것은|잘못된 것은)/.test(text),
    outputLike: /(실행 결과|출력 결과|결과는|값은|평균|개수|개인가|얼마인가|얼마는|Pass\s*\d)/i.test(text),
    codeLike: /printf|System\.out|public class|#include|SELECT|<html>|script|for\s*\(|while\s*\(/i.test(text),
  };
}

function classifyTopic(q) {
  const t = String(q || '');
  if (/(SQL|SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|트랜잭션|정규화|무결성|키\(|외래키|기본키|DBMS|릴레이션|애트리뷰트|도메인)/i.test(t)) {
    return {
      reason: '데이터베이스 문항은 용어 정의(키/무결성/정규화) 또는 SQL 실행 순서(SELECT, FROM, WHERE 등)를 기준으로 판단해야 합니다.',
      tip: '특히 SQL 문항은 하위 질의 결과와 조건절이 먼저 어떻게 계산되는지 확인하면 정답을 안정적으로 고를 수 있습니다.',
    };
  }
  if (/(TCP|UDP|IP|IPv6|프로토콜|라우터|스위치|OSI|네트워크|패킷|포트|DNS|HTTP|FTP|SMTP)/i.test(t)) {
    return {
      reason: '네트워크 문항은 계층(OSI/TCP-IP)과 프로토콜 역할을 정확히 구분하는 것이 핵심입니다.',
      tip: '비슷한 용어가 함께 나오면 “어느 계층에서 어떤 기능을 수행하는가” 기준으로 비교하면 됩니다.',
    };
  }
  if (/(운영체제|프로세스|스레드|스케줄링|교착|페이지|가상기억|캐시|인터럽트|PCB|세마포어|디렉터리 구조|파일 시스템)/i.test(t)) {
    return {
      reason: '운영체제 문항은 개념 정의와 동작 조건(스케줄링 기준, 교착 조건, 메모리 관리 방식)을 구분해서 보면 해결됩니다.',
      tip: '계산형이라면 대기시간/처리시간/이동거리처럼 무엇을 누적하는지 먼저 정하고 단계별로 계산하는 것이 안전합니다.',
    };
  }
  if (/(객체지향|UML|클래스|상속|캡슐화|다형성|디자인 패턴|CASE|요구사항|아키텍처|응집도|결합도|테스트)/i.test(t)) {
    return {
      reason: '소프트웨어 설계/분석 문항은 용어의 정의와 각 기법의 목적·특징을 정확히 대응시키는 것이 핵심입니다.',
      tip: '비슷한 개념이 함께 나오면 “무엇을 위한 개념인지(목적)”를 먼저 비교하면 오답을 줄일 수 있습니다.',
    };
  }
  if (/(C언어|JAVA|Python|파이썬|자바|배열|포인터|문자열|함수|자료형|연산자|컴파일|인터프리터)/i.test(t)) {
    return {
      reason: '프로그래밍 문항은 문법 규칙과 실행 순서를 기준으로 판단해야 합니다.',
      tip: '코드 실행형은 변수 값이 언제 변경되는지(증감 연산, 함수 호출, 포인터 참조)를 순서대로 추적하면 됩니다.',
    };
  }
  if (/(암호|보안|인증|SSL|대칭키|비대칭키|해시|취약점|침입|방화벽)/i.test(t)) {
    return {
      reason: '보안 문항은 개념 정의(인증/암호화/취약점)와 적용 목적을 구분하면 정답을 찾을 수 있습니다.',
      tip: '암호 문항은 대칭/비대칭/해시의 목적과 키 사용 방식을 분리해서 기억하는 것이 중요합니다.',
    };
  }
  return {
    reason: '문제의 핵심 키워드(용어 정의, 규칙, 절차)를 기준으로 선택지를 비교하면 정답을 판단할 수 있습니다.',
    tip: '헷갈리면 선택지마다 핵심 키워드가 문제 조건과 일치하는지부터 확인하세요.',
  };
}

function optionHint(options, answerText, negative) {
  const opts = Array.isArray(options) ? options.map(normalizeSpace) : [];
  const ans = normalizeSpace(answerText);
  const idx = opts.findIndex((o) => o && ans && o === ans);
  if (idx >= 0) {
    return `선택지 비교 시 ${idx + 1}번 항목의 표현이 문제 조건과 ${negative ? '반대되거나 예외에 해당' : '정확히 일치'}하는지 확인하면 됩니다.`;
  }
  return '';
}

function buildFallbackComment(questionText, answerText, options) {
  const q = normalizeSpace(questionText);
  const a = normalizeSpace(answerText);
  const mode = findQuestionMode(q);
  const topic = classifyTopic(q);

  const lines = [];
  if (a) {
    if (mode.negative) {
      lines.push(`정답은 \"${a}\"입니다. 이 문항은 예외/오류/부적절한 항목을 고르는 문제이므로, 정답 선택지는 기준 개념과 맞지 않는 설명(또는 다른 개념의 설명)을 담고 있습니다.`);
    } else {
      lines.push(`정답은 \"${a}\"입니다. 문제에서 묻는 기준(정의, 기능, 절차, 결과 계산)에 맞는 선택지를 고르면 됩니다.`);
    }
  } else {
    lines.push('정답은 문제 조건에 가장 부합하는 선택지입니다. 먼저 문제에서 묻는 기준(정의/기능/절차/결과)을 확인한 뒤 선택지를 비교하세요.');
  }

  lines.push(topic.reason);

  if (mode.outputLike || mode.codeLike) {
    lines.push('계산형/실행 결과형 문항은 중간 값을 생략하지 말고 순서대로 추적하면 오답 가능성을 크게 줄일 수 있습니다.');
  }

  const hint = optionHint(options, answerText, mode.negative);
  if (hint) lines.push(hint);
  lines.push(topic.tip);

  return lines.join(' ');
}

async function loadJson(p) {
  return JSON.parse(stripBom(await fs.readFile(p, 'utf8')));
}

async function buildCorpus() {
  const byQuestion = new Map();
  for (const [yearDir, sess] of CORPUS_SETS) {
    const base = path.join(DATASETS_DIR, yearDir, sess);
    const [problems, answers, comments] = await Promise.all([
      loadJson(path.join(base, 'problem1.json')),
      loadJson(path.join(base, 'answer1.json')),
      loadJson(path.join(base, 'comment1.json')),
    ]);
    const answerMap = new Map();
    for (const sec of answers) for (const a of sec.answers || []) answerMap.set(Number(a.problem_number), normalizeSpace(a.correct_answer_text));
    const commentMap = new Map();
    for (const sec of comments) for (const c of sec.comments || []) commentMap.set(Number(c.problem_number), String(c.comment ?? c.comment_text ?? '').trim());

    for (const sec of problems) {
      for (const p of sec.problems || []) {
        const key = norm(p.question_text);
        const arr = byQuestion.get(key) || [];
        arr.push({
          answerText: answerMap.get(Number(p.problem_number)) || '',
          comment: commentMap.get(Number(p.problem_number)) || '',
        });
        byQuestion.set(key, arr);
      }
    }
  }
  return byQuestion;
}

function pickCorpusComment(candidates, answerText) {
  const ans = normalizeSpace(answerText);
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  const exact = candidates.find((c) => c.comment && normalizeSpace(c.answerText) === ans);
  if (exact) return exact.comment;
  const firstNonEmpty = candidates.find((c) => c.comment);
  return firstNonEmpty ? firstNonEmpty.comment : '';
}

async function processTarget(slug, corpus) {
  const base = path.join(DATASETS_DIR, 'pdfPacks', slug);
  const [problems, answers, comments] = await Promise.all([
    loadJson(path.join(base, 'problem1.json')),
    loadJson(path.join(base, 'answer1.json')),
    loadJson(path.join(base, 'comment1.json')),
  ]);

  const problemMap = new Map();
  for (const sec of problems) for (const p of sec.problems || []) problemMap.set(Number(p.problem_number), p);
  const answerMap = new Map();
  for (const sec of answers) for (const a of sec.answers || []) answerMap.set(Number(a.problem_number), a);

  let reused = 0;
  let generated = 0;

  for (const sec of comments) {
    for (const row of sec.comments || []) {
      const no = Number(row.problem_number);
      const p = problemMap.get(no);
      const a = answerMap.get(no);
      if (!p || !a) continue;
      const key = norm(p.question_text);
      const corpusComment = pickCorpusComment(corpus.get(key), a.correct_answer_text || '');
      let next = corpusComment;
      if (!next) {
        next = buildFallbackComment(p.question_text, a.correct_answer_text || '', p.options || []);
        generated += 1;
      } else {
        reused += 1;
      }
      row.comment = next;
      if ('comment_text' in row) delete row.comment_text;
    }
  }

  await fs.writeFile(path.join(base, 'comment1.json'), JSON.stringify(comments, null, 2), 'utf8');
  return { slug, reused, generated, total: reused + generated };
}

(async function main() {
  const corpus = await buildCorpus();
  const results = [];
  for (const slug of TARGETS) {
    results.push(await processTarget(slug, corpus));
  }
  for (const r of results) {
    console.log(`${r.slug}: total=${r.total}, reused=${r.reused}, generated=${r.generated}`);
  }
})();
