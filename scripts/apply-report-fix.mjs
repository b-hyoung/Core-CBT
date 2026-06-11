// 사용법: PAYLOAD='{"report_id":...}' node scripts/apply-report-fix.mjs
// repository_dispatch의 client_payload를 받아 대상 JSON을 수정하고 PR 본문을 생성한다.
// 검증 실패 시 아무 파일도 수정하지 않고 exit 1.
import fs from 'node:fs';
import path from 'node:path';
import { applyFix, selectTargetFile } from './applyReportFix.lib.mjs';

function fail(msg) {
  console.error(`validation failed: ${msg}`);
  process.exit(1);
}

const payload = JSON.parse(process.env.PAYLOAD ?? 'null');
if (!payload) fail('PAYLOAD env is required');

const { report_id, dataset_path, problem_number, target_field, new_value, reasoning, confidence } = payload;

if (!report_id || typeof report_id !== 'string') fail('report_id is required');
const problemNumber = Number(problem_number);
if (!Number.isInteger(problemNumber)) fail('problem_number must be an integer');
const normalized = path.posix.normalize(String(dataset_path ?? ''));
if (!normalized.startsWith('datasets/') || normalized.includes('..')) fail(`invalid dataset_path: ${dataset_path}`);
if (!fs.existsSync(normalized) || !fs.statSync(normalized).isDirectory()) fail(`dataset_path not found: ${normalized}`);

const files = fs.readdirSync(normalized)
  .filter((name) => name.endsWith('.json'))
  .map((name) => ({ name, doc: JSON.parse(fs.readFileSync(path.join(normalized, name), 'utf8')) }));

let filePath;
try {
  const fileName = selectTargetFile(files, target_field, problemNumber);
  const doc = files.find((f) => f.name === fileName).doc;
  applyFix(doc, target_field, problemNumber, new_value);
  filePath = path.join(normalized, fileName);
  fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + '\n');
} catch (err) {
  fail(err.message);
}
console.log(`modified: ${filePath}`);

const prBody = `> :robot: 이 PR은 신고 처리 봇(cbt-report-handler)이 자동 생성했습니다. 반드시 사람이 리뷰 후 머지하세요.

## 신고 정보
- **report_id**: \`${report_id}\`
- **대상**: \`${normalized}\` / 문항 ${problemNumber}

## Dify 판단
- **target_field**: \`${target_field}\`
- **confidence**: ${confidence ?? '-'}
- **근거**: ${reasoning || '-'}

## 변경 내용
- **파일**: \`${filePath}\`
- **변경 후 값**:
\`\`\`json
${JSON.stringify(new_value, null, 2)}
\`\`\`
`;
fs.writeFileSync(process.env.PR_BODY_PATH ?? '/tmp/pr-body.md', prBody);
