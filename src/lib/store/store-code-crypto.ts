import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function keyBuffer() {
  const raw = process.env.STORE_CODE_ENCRYPTION_KEY || '';
  if (!raw) throw new Error('STORE_CODE_ENCRYPTION_KEY_MISSING');

  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) key = Buffer.from(raw, 'hex');
  else {
    try { key = Buffer.from(raw, 'base64'); } catch { key = Buffer.alloc(0); }
  }

  if (key.length !== 32) throw new Error('STORE_CODE_ENCRYPTION_KEY_INVALID');
  return key;
}

export function fingerprintStoreCode(code: string) {
  return createHash('sha256').update(code.trim(), 'utf8').digest('hex');
}

export function encryptStoreCode(code: string) {
  const normalized = code.trim();
  if (!normalized) throw new Error('STORE_CODE_EMPTY');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBuffer(), iv);
  const ciphertext = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':');
}

export function decryptStoreCode(value: string) {
  if (!value.startsWith('v1:')) return value;
  const [, ivRaw, tagRaw, dataRaw] = value.split(':');
  if (!ivRaw || !tagRaw || !dataRaw) throw new Error('STORE_CODE_CIPHERTEXT_INVALID');
  const decipher = createDecipheriv('aes-256-gcm', keyBuffer(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, 'base64url')), decipher.final()]).toString('utf8');
}
