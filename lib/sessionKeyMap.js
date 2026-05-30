// lib/sessionKeyMap.js
// Maps a /test/[sessionId] route param to the (subject, sessionKey) pair
// used by the comment-edit API (subject = dataset folder, sessionKey = sub-folder).
//
// Only sessions present in OBJECTIVE_SESSION_CONFIG are mapped; the legacy
// numeric sessions (1-11, 정보처리산업기사) return null because they are not
// tracked in the edit system yet.

import { OBJECTIVE_SESSION_CONFIG } from '@/lib/objectiveSessionCatalog';

/**
 * @param {string} sessionId  — the route param from /test/[sessionId]
 * @returns {{ subject: string, sessionKey: string } | null}
 */
export function parseSessionId(sessionId) {
  const id = String(sessionId || '');

  // pdfPacks 라우트는 OBJECTIVE_SESSION_CONFIG에 없고 별도 라우트에서
  // sessionId={`pdfpack-${slug}`} 형태로 전달됨.
  if (id.startsWith('pdfpack-')) {
    const sessionKey = id.slice('pdfpack-'.length);
    if (!sessionKey) return null;
    return { subject: 'pdfPacks', sessionKey };
  }

  const entry = OBJECTIVE_SESSION_CONFIG[id];
  if (!entry) return null;

  // basePath shape: ['datasets', '<subject>', '<sessionKey>']
  // e.g. ['datasets', 'sqld', '2025-first']
  const basePath = entry.basePath;
  if (!Array.isArray(basePath) || basePath.length < 3) return null;

  const subject = basePath[1];
  const sessionKey = basePath[2];
  return { subject, sessionKey };
}
