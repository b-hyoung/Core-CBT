/*
  Fetches comcbt webhaesul page and writes a plain-text raw file
  that can be consumed by scripts/build_problem100_from_txt.js

  Usage:
    node scripts/fetch_problem100_raw.js
*/
const fs = require('fs');
const path = require('path');

const SOURCE_URL = 'https://www.comcbt.com/xe/webhaesul/9614352';
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'datasets', 'problem100', 'raw.txt');

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

function stripHtmlToText(html) {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '\n');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/p>/gi, '\n');
  s = s.replace(/<\/tr>/gi, '\n');
  s = s.replace(/<\/td>/gi, ' ');
  s = s.replace(/<\/table>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeHtml(s);
  s = s.replace(/\r/g, '');
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim() + '\n';
}

async function fetchHtml(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`failed to fetch: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function extractDocumentChunk(html) {
  const m = html.match(/<div class="document_9614352_4 xe_content">([\s\S]*?)<\/div><!--AfterDocument/);
  return m ? m[1] : html;
}

(async () => {
  const html = await fetchHtml(SOURCE_URL);
  const chunk = extractDocumentChunk(html);
  const text = stripHtmlToText(chunk);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text, 'utf8');
  console.log(`wrote raw text: ${OUT}`);
})();

