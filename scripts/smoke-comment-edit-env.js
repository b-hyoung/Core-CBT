// scripts/smoke-comment-edit-env.js
// Discord/GitHub/Supabase 환경변수가 제대로 설정됐는지 빠르게 검증.
// 사용: node --env-file=.env scripts/smoke-comment-edit-env.js

const REQUIRED = [
  'DISCORD_WEBHOOK_URL',
  'DISCORD_PUBLIC_KEY',
  'DISCORD_BOT_TOKEN',
  'DISCORD_APPLICATION_ID',
  'GITHUB_TOKEN',
  'GITHUB_REPO_OWNER',
  'GITHUB_REPO_NAME',
  'GITHUB_BASE_BRANCH',
  'SITE_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const results = [];

function pass(label, detail) {
  results.push({ label, ok: true, detail });
  console.log(`✅ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label, detail) {
  results.push({ label, ok: false, detail });
  console.log(`❌ ${label} — ${detail}`);
}

function checkEnvPresence() {
  console.log('\n--- 환경변수 존재 확인 ---');
  for (const key of REQUIRED) {
    const val = process.env[key];
    if (!val || !String(val).trim()) {
      fail(key, '미설정 또는 빈 값');
    } else {
      const preview = val.length <= 12 ? val : `${val.slice(0, 8)}...`;
      pass(key, preview);
    }
  }
}

async function checkDiscordWebhook() {
  console.log('\n--- Discord Webhook ---');
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    fail('Discord webhook', 'URL 미설정');
    return;
  }
  try {
    // GET으로 webhook 정보 조회 (메시지 전송 안 함)
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      pass('Discord webhook', `채널 "${data.name || '?'}" id=${data.channel_id}`);
    } else {
      fail('Discord webhook', `HTTP ${res.status}`);
    }
  } catch (err) {
    fail('Discord webhook', err.message);
  }
}

async function checkDiscordBotToken() {
  console.log('\n--- Discord Bot Token ---');
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    fail('Discord bot token', '미설정');
    return;
  }
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      pass('Discord bot token', `봇 "${data.username}#${data.discriminator}" (id ${data.id})`);
    } else {
      fail('Discord bot token', `HTTP ${res.status}`);
    }
  } catch (err) {
    fail('Discord bot token', err.message);
  }
}

async function checkGithubToken() {
  console.log('\n--- GitHub Token ---');
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    fail('GitHub token', '미설정');
    return;
  }
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      pass('GitHub token', `로그인 "${data.login}"`);
    } else {
      fail('GitHub token', `HTTP ${res.status}`);
    }
  } catch (err) {
    fail('GitHub token', err.message);
  }
}

async function checkGithubRepoAccess() {
  console.log('\n--- GitHub Repo Write 권한 ---');
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  if (!token || !owner || !repo) {
    fail('GitHub repo access', 'token/owner/repo 중 하나 미설정');
    return;
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.permissions?.push) {
        pass('GitHub repo access', `${data.full_name} (push 권한 OK)`);
      } else {
        fail('GitHub repo access', `${data.full_name} (push 권한 없음 — PAT scope 확인)`);
      }
    } else {
      fail('GitHub repo access', `HTTP ${res.status}`);
    }
  } catch (err) {
    fail('GitHub repo access', err.message);
  }
}

async function checkSupabaseTables() {
  console.log('\n--- Supabase 테이블 확인 ---');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    fail('Supabase', 'URL/key 미설정');
    return;
  }
  for (const table of ['comment_edits', 'comment_contributors']) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        pass(`Supabase table ${table}`, '접근 OK');
      } else if (res.status === 404 || res.status === 400) {
        fail(`Supabase table ${table}`, `테이블 없음 (docs/setup/comment-edits-schema.sql 실행 필요)`);
      } else {
        fail(`Supabase table ${table}`, `HTTP ${res.status}`);
      }
    } catch (err) {
      fail(`Supabase table ${table}`, err.message);
    }
  }
}

async function main() {
  console.log('해설 수정 시스템 — 환경 스모크 체크');
  console.log('====================================');

  checkEnvPresence();
  await checkDiscordWebhook();
  await checkDiscordBotToken();
  await checkGithubToken();
  await checkGithubRepoAccess();
  await checkSupabaseTables();

  const failed = results.filter((r) => !r.ok);
  console.log('\n====================================');
  if (failed.length === 0) {
    console.log(`✅ 전체 ${results.length}건 통과 — 운영 준비 완료`);
    process.exit(0);
  } else {
    console.log(`❌ 실패 ${failed.length}건 / 전체 ${results.length}건`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('스모크 스크립트 자체 오류:', err);
  process.exit(2);
});
