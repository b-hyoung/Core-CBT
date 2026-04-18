const CLIENT_ID_KEY = 'quiz_client_id';

export function getClientId() {
  if (typeof window === 'undefined') return 'server';
  const existing = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;

  const newId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `guest_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(CLIENT_ID_KEY, newId);
  return newId;
}

export async function trackEvent(type, data = {}) {
  try {
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, clientId: getClientId(), ...data }),
      keepalive: true,
    });
  } catch {
    // Ignore analytics failures.
  }
}
