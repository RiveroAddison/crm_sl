import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getSecretKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] ENCRYPTION_KEY es requerida en producción.');
    }
    // Fallback inseguro solo para desarrollo
    return crypto.scryptSync('dev-only-key-not-for-production', 'salt', 32);
  }
  return Buffer.from(key, 'hex');
}

export function encrypt(plaintext: string): string {
  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Formato: iv:tag:ciphertext (hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  // Si no tiene formato de cifrado, retornar tal cual (compatibilidad con datos en claro)
  if (!ciphertext.includes(':')) return ciphertext;

  const key = getSecretKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext;

  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3 && parts[0].length === IV_LENGTH * 2 && parts[1].length === TAG_LENGTH * 2;
}
