// lib/githubPr.js
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_REPO_OWNER;
const REPO = process.env.GITHUB_REPO_NAME;
const BASE = process.env.GITHUB_BASE_BRANCH || 'main';

function ghHeaders(extra = {}) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  };
}

async function gh(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: ghHeaders(body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`github ${method} ${path} failed: ${res.status} ${text}`);
  }
  return await res.json();
}

function toBase64Utf8(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}
function fromBase64Utf8(b64) {
  return Buffer.from(b64, 'base64').toString('utf8');
}

async function getBaseSha() {
  const ref = await gh('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BASE}`);
  return ref.object.sha;
}

async function createBranch(branchName, baseSha) {
  await gh('POST', `/repos/${OWNER}/${REPO}/git/refs`, {
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });
}

async function getFileOnBranch(branch, filePath) {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURI(filePath)}?ref=${branch}`,
    { headers: ghHeaders() }
  );
  if (!res.ok) throw new Error(`github GET contents failed: ${res.status}`);
  const data = await res.json();
  return { sha: data.sha, content: fromBase64Utf8(data.content) };
}

async function putFileOnBranch(branch, filePath, newContent, prevSha, message) {
  await gh('PUT', `/repos/${OWNER}/${REPO}/contents/${encodeURI(filePath)}`, {
    message,
    content: toBase64Utf8(newContent),
    sha: prevSha,
    branch,
  });
}

function applyEditToJson(jsonText, problemNumber, finalComment) {
  const data = JSON.parse(jsonText);
  let touched = false;
  for (const section of data || []) {
    for (const c of section?.comments || []) {
      if (Number(c?.problem_number) === Number(problemNumber)) {
        c.comment = finalComment;
        touched = true;
      }
    }
  }
  if (!touched) throw new Error(`problem_number ${problemNumber} not found in comment json`);
  return JSON.stringify(data, null, 2) + '\n';
}

export async function createRoundPr(edits, buildPath) {
  if (!GITHUB_TOKEN || !OWNER || !REPO) throw new Error('github env missing');
  if (edits.length === 0) throw new Error('no edits');

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
  const branch = `edits/round-${stamp}`;

  const baseSha = await getBaseSha();
  await createBranch(branch, baseSha);

  const byFile = new Map();
  for (const e of edits) {
    const filePath = buildPath(e.subject, e.sessionKey);
    if (!byFile.has(filePath)) byFile.set(filePath, []);
    byFile.get(filePath).push(e);
  }

  for (const [filePath, groupEdits] of byFile) {
    const { sha, content } = await getFileOnBranch(branch, filePath);
    let next = content;
    for (const e of groupEdits) {
      next = applyEditToJson(next, e.problemNumber, e.finalComment);
    }
    const msg = `docs(comment): ${filePath} — ${groupEdits.length}건 수정\n\n${groupEdits.map((e) => `- ${e.problemNumber}번 (edit ${e.id})`).join('\n')}`;
    await putFileOnBranch(branch, filePath, next, sha, msg);
  }

  const bodyMd = [
    '## 해설 수정 라운드',
    '',
    `총 ${edits.length}건`,
    '',
    ...edits.map((e) => `- **${e.subject}** ${e.sessionKey} · ${e.problemNumber}번 (edit \`${e.id}\`)`),
  ].join('\n');

  const pr = await gh('POST', `/repos/${OWNER}/${REPO}/pulls`, {
    title: `해설 수정 라운드 ${new Date().toISOString().slice(0, 10)} (${edits.length}건)`,
    head: branch,
    base: BASE,
    body: bodyMd,
  });

  return { prNumber: pr.number, prUrl: pr.html_url, branch };
}
