// lib/discordVerify.js
const PUBLIC_KEY_HEX = process.env.DISCORD_PUBLIC_KEY || '';

function hexToBytes(hex) {
  const clean = String(hex).replace(/[^0-9a-f]/gi, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

let cachedKey = null;
async function getKey() {
  if (cachedKey) return cachedKey;
  if (!PUBLIC_KEY_HEX) return null;
  cachedKey = await crypto.subtle.importKey(
    'raw',
    hexToBytes(PUBLIC_KEY_HEX),
    { name: 'Ed25519' },
    false,
    ['verify'],
  );
  return cachedKey;
}

export async function verifyDiscordSignature({ signature, timestamp, body }) {
  const key = await getKey();
  if (!key) return false;
  const sigBytes = hexToBytes(signature);
  const data = new TextEncoder().encode(timestamp + body);
  try {
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, sigBytes, data);
  } catch {
    return false;
  }
}
