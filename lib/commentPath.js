// lib/commentPath.js
import fs from 'fs/promises';
import path from 'path';

const DATASETS_DIR = path.join(process.cwd(), 'datasets');

const ALLOWED_SUBJECT_PREFIXES = ['sqld', 'problem', 'pdfPacks'];

export function isAllowedSubject(subject) {
  const s = String(subject || '');
  if (!s) return false;
  return ALLOWED_SUBJECT_PREFIXES.some((p) =>
    p === 'problem' ? /^problem\d{4}$/.test(s) : s === p
  );
}

export async function isAllowedSessionKey(subject, sessionKey) {
  if (!isAllowedSubject(subject)) return false;
  const sk = String(sessionKey || '');
  if (!sk || sk.includes('..') || sk.includes('/') || sk.includes('\\')) return false;
  try {
    const dir = path.join(DATASETS_DIR, subject, sk);
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export function buildCommentPath(subject, sessionKey) {
  return `datasets/${subject}/${sessionKey}/comment1.json`;
}

export async function readCommentFromDisk(subject, sessionKey, problemNumber) {
  const fullPath = path.join(process.cwd(), buildCommentPath(subject, sessionKey));
  const raw = await fs.readFile(fullPath, 'utf8');
  const data = JSON.parse(raw);
  for (const section of data || []) {
    for (const c of section?.comments || []) {
      if (Number(c?.problem_number) === Number(problemNumber)) {
        return String(c?.comment ?? '');
      }
    }
  }
  return '';
}
