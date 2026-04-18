/*
  Usage:
  1) Save source text to datasets/problem100/raw.txt
  2) node scripts/build_problem100_from_txt.js
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const RAW = path.join(ROOT, 'datasets', 'problem100', 'raw.txt');
const OUT_DIR = path.join(ROOT, 'datasets', 'problem100', 'first');

const SUBJECTS = [
  { name: '1과목 소프트웨어 설계', from: 1, to: 20 },
  { name: '2과목 소프트웨어 개발', from: 21, to: 40 },
  { name: '3과목 데이터베이스 구축', from: 41, to: 60 },
  { name: '4과목 프로그래밍 언어 활용', from: 61, to: 80 },
  { name: '5과목 정보시스템 구축관리', from: 81, to: 100 },
];

const CIRCLED_TO_NUM = { '①': 1, '②': 2, '③': 3, '④': 4 };

function getSubjectTitle(no) {
  const s = SUBJECTS.find((x) => no >= x.from && no <= x.to);
  return s ? s.name : '기타';
}

function normalize(s) {
  return (s || '').replace(/\r/g, '').replace(/\u00A0/g, ' ');
}

function parseAnswerKey(text) {
  const idx = text.lastIndexOf('정 답 지');
  if (idx < 0) return {};
  const tail = text.slice(idx);
  const circled = tail.match(/[①②③④]/g) || [];
  const picked = circled.length >= 100 ? circled.slice(-100) : circled;
  const map = {};
  picked.forEach((ch, i) => {
    map[i + 1] = CIRCLED_TO_NUM[ch];
  });
  return map;
}

function parseQuestions(text, answerKeyMap) {
  const stopMatch = text.match(/\n\s*정\s*답\s*지\b/);
  const stopIdx = stopMatch ? stopMatch.index : -1;
  const body = stopIdx > 0 ? text.slice(0, stopIdx) : text;
  const lines = body.split('\n').map((x) => x.trim()).filter(Boolean);

  const result = [];
  let expectedQuestionNo = 1;
  let i = 0;

  while (i < lines.length && expectedQuestionNo <= 100) {
    const qRe = new RegExp(`^${expectedQuestionNo}\\.\\s+(.+)$`);
    const qMatch = lines[i].match(qRe);
    if (!qMatch) {
      i += 1;
      continue;
    }

    const question_text = qMatch[1].trim();
    i += 1;

    const options = ['', '', '', ''];
    while (i < lines.length) {
      const m = lines[i].match(/^([1-4])\.\s*(.+)$/);
      if (!m) break;
      const idx = Number(m[1]) - 1;
      options[idx] = m[2].trim();
      i += 1;
    }

    let answer_index = answerKeyMap[expectedQuestionNo];
    while (i < lines.length) {
      const m = lines[i].match(/^정답\s*:\s*\[\s*(\d+)\s*\]/);
      if (m) {
        answer_index = Number(m[1]);
        i += 1;
        break;
      }
      const nextQ = new RegExp(`^${expectedQuestionNo + 1}\\.\\s+`);
      if (nextQ.test(lines[i])) break;
      i += 1;
    }

    let comment = '해설이 제공되지 않습니다.';
    while (i < lines.length) {
      if (lines[i].includes('<문제 해설>')) {
        i += 1;
        const commentLines = [];
        while (i < lines.length) {
          const nextQ = new RegExp(`^${expectedQuestionNo + 1}\\.\\s+`);
          if (nextQ.test(lines[i])) break;
          if (lines[i].startsWith('정답 : [')) break;
          commentLines.push(lines[i]);
          i += 1;
        }
        comment = commentLines
          .join(' ')
          .replace(/\[해설작성자\s*:[^\]]*\]/g, '')
          .replace(/\s+/g, ' ')
          .trim() || '해설이 제공되지 않습니다.';
        break;
      }
      const nextQ = new RegExp(`^${expectedQuestionNo + 1}\\.\\s+`);
      if (nextQ.test(lines[i])) break;
      i += 1;
    }

    result.push({
      no: expectedQuestionNo,
      question_text,
      options,
      answer_index,
      comment,
    });
    expectedQuestionNo += 1;
  }

  return result;
}

function buildOutputs(parsed) {
  const problemSections = SUBJECTS.map((s) => ({ title: s.name, problems: [] }));
  const answerSections = SUBJECTS.map((s) => ({ title: s.name, answers: [] }));
  const commentSections = SUBJECTS.map((s) => ({ title: s.name, comments: [] }));

  for (const q of parsed) {
    const secIdx = Math.floor((q.no - 1) / 20);

    problemSections[secIdx].problems.push({
      problem_number: q.no,
      question_text: q.question_text,
      options: q.options,
    });

    const text = (q.answer_index >= 1 && q.answer_index <= 4) ? q.options[q.answer_index - 1] : '';
    answerSections[secIdx].answers.push({
      problem_number: q.no,
      correct_answer_index: (q.answer_index >= 1 && q.answer_index <= 4) ? q.answer_index - 1 : 0,
      correct_answer_text: text,
    });

    commentSections[secIdx].comments.push({
      problem_number: q.no,
      comment: q.comment,
    });
  }

  return { problemSections, answerSections, commentSections };
}

(function run() {
  if (!fs.existsSync(RAW)) {
    console.error('missing file:', RAW);
    process.exit(1);
  }

  const raw = normalize(fs.readFileSync(RAW, 'utf8'));
  const keyMap = parseAnswerKey(raw);
  const parsed = parseQuestions(raw, keyMap);

  if (parsed.length < 100) {
    console.error(`parsed ${parsed.length} questions. expected 100.`);
  }

  const { problemSections, answerSections, commentSections } = buildOutputs(parsed);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'problem1.json'), JSON.stringify(problemSections, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'answer1.json'), JSON.stringify(answerSections, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'comment1.json'), JSON.stringify(commentSections, null, 2) + '\n', 'utf8');

  console.log('done:', parsed.length, 'questions -> datasets/problem100/first');
})();
