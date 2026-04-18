/*
  Build problem100 JSON files directly from downloaded HTML page.
  Input: temp_9614352.html
  Output:
    datasets/problem100/first/problem1.json
    datasets/problem100/first/answer1.json
    datasets/problem100/first/comment1.json
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IN = path.join(ROOT, 'temp_9614352.html');
const OUT_DIR = path.join(ROOT, 'datasets', 'problem100', 'first');

const SUBJECTS = [
  { name: '1과목 소프트웨어 설계', from: 1, to: 20 },
  { name: '2과목 소프트웨어 개발', from: 21, to: 40 },
  { name: '3과목 데이터베이스 구축', from: 41, to: 60 },
  { name: '4과목 프로그래밍 언어 활용', from: 61, to: 80 },
  { name: '5과목 정보시스템 구축관리', from: 81, to: 100 },
];

function decodeHtml(s) {
  return (s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function stripTags(s) {
  return decodeHtml((s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function extractDocChunk(html) {
  const m = html.match(/<div class="document_9614352_4 xe_content">([\s\S]*?)<\/div><!--AfterDocument/);
  return m ? m[1] : html;
}

function parseBlocks(doc) {
  const startToken = "<table border='2' width='100%' cellpadding='20' cellspacing='0' bordercolor='#6699cc'><tr><td width=100%>";
  const parts = doc.split(startToken).slice(1);
  const rows = [];

  for (const p of parts) {
    const head = p.match(/<b>(\d+)\.\s*<\/b>[\s\S]*?<td valign='top'><b>([\s\S]*?)<\/b><b>\((\d{4}년 \d{2}월)\)<\/b>/);
    if (!head) continue;
    const no = Number(head[1]);
    if (!(no >= 1 && no <= 100)) continue;
    const qText = stripTags(head[2]).trim();

    const options = ['', '', '', ''];
    const optRe = /<td valign='top'>&nbsp;{0,}.*?([1-4])\.\s*<\/td><td valign='top'>([\s\S]*?)<\/td><\/tr>/g;
    let m;
    while ((m = optRe.exec(p))) {
      const idx = Number(m[1]) - 1;
      if (idx >= 0 && idx < 4 && !options[idx]) options[idx] = stripTags(m[2]);
    }

    const ans = p.match(/id='jungdabcolor\d+'[^>]*>\s*([1-4])\s*<\/div>/);
    const answer = ans ? Number(ans[1]) : 1;

    let comment = '해설이 제공되지 않습니다.';
    const ex = p.match(/&lt;문제 해설&gt;<br>([\s\S]*?)<\/font><\/td><\/tr><\/table><\/font>/);
    if (ex) {
      comment = stripTags(ex[1])
        .replace(/\[해설작성자\s*:[^\]]*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!comment) comment = '해설이 제공되지 않습니다.';
    }

    rows.push({ no, question_text: qText, options, answer, comment });
  }
  const score = (row) => {
    const src = `${row.question_text} ${(row.options || []).join(' ')} ${row.comment}`;
    const hangul = (src.match(/[가-힣]/g) || []).length;
    return hangul;
  };

  const byNo = new Map();
  for (const r of rows.sort((a, b) => a.no - b.no)) {
    const prev = byNo.get(r.no);
    if (!prev || score(r) > score(prev)) byNo.set(r.no, r);
  }
  return Array.from(byNo.values()).sort((a, b) => a.no - b.no);
}

function build(rows) {
  const problemSections = SUBJECTS.map((s) => ({ title: s.name, problems: [] }));
  const answerSections = SUBJECTS.map((s) => ({ title: s.name, answers: [] }));
  const commentSections = SUBJECTS.map((s) => ({ title: s.name, comments: [] }));

  for (const r of rows) {
    const sec = Math.floor((r.no - 1) / 20);
    problemSections[sec].problems.push({
      problem_number: r.no,
      question_text: r.question_text,
      options: r.options,
    });
    answerSections[sec].answers.push({
      problem_number: r.no,
      correct_answer_index: r.answer - 1,
      correct_answer_text: r.options[r.answer - 1] || '',
    });
    commentSections[sec].comments.push({
      problem_number: r.no,
      comment: r.comment,
    });
  }

  return { problemSections, answerSections, commentSections };
}

if (!fs.existsSync(IN)) {
  console.error(`missing input: ${IN}`);
  process.exit(1);
}

const html = fs.readFileSync(IN, 'utf8');
const doc = extractDocChunk(html);
const rows = parseBlocks(doc);
if (rows.length !== 100) {
  console.error(`parsed ${rows.length} questions. expected 100.`);
}
const { problemSections, answerSections, commentSections } = build(rows);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'problem1.json'), JSON.stringify(problemSections, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'answer1.json'), JSON.stringify(answerSections, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'comment1.json'), JSON.stringify(commentSections, null, 2) + '\n', 'utf8');
console.log(`done: ${rows.length} questions -> ${OUT_DIR}`);
