import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export interface EncryptedData {
  encryptedKey: string;
  iv: string;
  authTag: string;
}

export function encrypt(text: string): EncryptedData {
  const keyHex = process.env.BYOK_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('BYOK_ENCRYPTION_KEY is not set in environment.');
  }

  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('BYOK_ENCRYPTION_KEY must be a 32-byte (64 char) hex string.');
  }

  const iv = crypto.randomBytes(12); // Standard for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedKey: encrypted,
    iv: iv.toString('hex'),
    authTag
  };
}

export function decrypt(encryptedData: EncryptedData): string {
  const keyHex = process.env.BYOK_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('BYOK_ENCRYPTION_KEY is not set in environment.');
  }

  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('BYOK_ENCRYPTION_KEY must be a 32-byte (64 char) hex string.');
  }

  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
