/*
  Convert local HTML file (temp_9614352.html) to plain text raw file.

  Usage:
    node scripts/html_to_raw100.js
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IN = path.join(ROOT, 'temp_9614352.html');
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

function extractDocumentChunk(html) {
  const m = html.match(/<div class="document_9614352_4 xe_content">([\s\S]*?)<\/div><!--AfterDocument/);
  return m ? m[1] : html;
}

if (!fs.existsSync(IN)) {
  console.error(`missing input html: ${IN}`);
  process.exit(1);
}

const html = fs.readFileSync(IN, 'utf8');
const chunk = extractDocumentChunk(html);
const text = stripHtmlToText(chunk);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text, 'utf8');
console.log(`wrote raw text: ${OUT}`);

