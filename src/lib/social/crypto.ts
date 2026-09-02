import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ENVELOPE_VERSION = 'v1';
const AAD = Buffer.from('brandbox-social-oauth:v1', 'utf8');

function decodeKey(rawValue: string): Buffer {
  const raw = rawValue.trim();
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('SOCIAL_ENCRYPTION_KEY_INVALID');
  return key;
}

function encryptionKey(): Buffer {
  const raw = process.env.BRANDBOX_SOCIAL_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error('SOCIAL_ENCRYPTION_KEY_MISSING');
  return decodeKey(raw);
}

export function isSocialEncryptionConfigured(): boolean {
  const raw = process.env.BRANDBOX_SOCIAL_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) return false;
  try {
    return decodeKey(raw).length === 32;
  } catch {
    return false;
  }
}

export function encryptSocialSecret(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(AAD);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENVELOPE_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptSocialSecret<T>(envelope: string): T {
  const [version, ivRaw, tagRaw, payloadRaw] = envelope.split('.');
  if (version !== ENVELOPE_VERSION || !ivRaw || !tagRaw || !payloadRaw) {
    throw new Error('SOCIAL_CREDENTIAL_ENVELOPE_INVALID');
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payloadRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(plaintext) as T;
}

export function newOAuthState(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOAuthState(state: string): string {
  return createHash('sha256').update(state, 'utf8').digest('hex');
}
