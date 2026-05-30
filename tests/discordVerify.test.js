import { describe, it, expect } from 'vitest';
import { verifyDiscordSignature } from '@/lib/discordVerify.js';

describe('verifyDiscordSignature', () => {
  it('is exported as a function', () => {
    expect(typeof verifyDiscordSignature).toBe('function');
  });

  it('returns false when DISCORD_PUBLIC_KEY is not set (no key available)', async () => {
    // No DISCORD_PUBLIC_KEY env var set → getKey() returns null → graceful false
    const result = await verifyDiscordSignature({
      signature: 'invalidsignature',
      timestamp: '1234567890',
      body: '{}',
    });
    expect(result).toBe(false);
  });

  it('returns false for empty signature and timestamp', async () => {
    const result = await verifyDiscordSignature({
      signature: '',
      timestamp: '',
      body: '',
    });
    expect(result).toBe(false);
  });
});
