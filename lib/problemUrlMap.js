// lib/problemUrlMap.js
// Builds the canonical site URL for a (subject, sessionKey, problemNumber) tuple,
// used by the Discord notification so reviewers can jump directly to the problem.

import { OBJECTIVE_SESSION_CONFIG } from '@/lib/objectiveSessionCatalog';

/**
 * Reverse-lookup: given (subject, sessionKey), find the sessionId that owns it.
 * OBJECTIVE_SESSION_CONFIG entries have basePath shaped as
 *   ['datasets', '<subject>', '<sessionKey>']
 *
 * @param {string} subject
 * @param {string} sessionKey
 * @returns {string | null}
 */
function findSessionId(subject, sessionKey) {
  for (const [id, cfg] of Object.entries(OBJECTIVE_SESSION_CONFIG)) {
    const bp = cfg?.basePath;
    if (!Array.isArray(bp) || bp.length < 3) continue;
    // bp[0] is 'datasets', bp[1] is subject, bp[2] is sessionKey
    if (bp[1] === subject && bp[2] === sessionKey) {
      return id;
    }
  }
  return null;
}

/**
 * Returns the canonical problem page URL.
 *
 * @param {string} subject       — dataset folder, e.g. 'sqld' or 'pdfPacks'
 * @param {string} sessionKey    — sub-folder, e.g. '2025-first'
 * @param {number} problemNumber — 1-based problem index
 * @returns {string}
 */
export function buildProblemUrl(subject, sessionKey, problemNumber) {
  const SITE_BASE_URL = process.env.SITE_BASE_URL || '';
  if (!SITE_BASE_URL) return '';

  if (subject === 'pdfPacks') {
    return `${SITE_BASE_URL}/test/pdf-pack/${sessionKey}/quiz?problem=${problemNumber}`;
  }

  const sessionId = findSessionId(subject, sessionKey);
  if (!sessionId) return `${SITE_BASE_URL}/test`;

  return `${SITE_BASE_URL}/test/${sessionId}?problem=${problemNumber}`;
}
