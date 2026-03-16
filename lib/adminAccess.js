function parseAllowedEmails() {
  return String(process.env.ADMIN_ALLOWED_EMAILS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;

  const allowlist = parseAllowedEmails();
  if (allowlist.length === 0) {
    // Fallback: if allowlist is not configured, any signed-in user can access admin.
    return true;
  }
  return allowlist.includes(normalized);
}

export async function getAdminSession() {
  const { auth } = await import('@/auth');
  const session = await auth();
  const email = String(session?.user?.email || '').trim();
  if (!email) return null;
  if (!isAllowedAdminEmail(email)) return null;
  return session;
}
