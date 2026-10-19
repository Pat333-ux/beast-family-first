const { createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');

function loadEncryptionKey(value = process.env.INTAKE_ENCRYPTION_KEY) {
  if (typeof value !== 'string' || !value) {
    throw new Error('INTAKE_ENCRYPTION_KEY must be configured');
  }

  let key;
  if (/^[a-f\d]{64}$/i.test(value)) {
    key = Buffer.from(value, 'hex');
  } else {
    key = Buffer.from(value, 'base64');
    if (key.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')) {
      throw new Error('INTAKE_ENCRYPTION_KEY must be a 32-byte base64 or hex value');
    }
  }
  if (key.length !== 32) {
    throw new Error('INTAKE_ENCRYPTION_KEY must encode exactly 32 bytes');
  }
  return key;
}

function encryptIntake(value, keyValue) {
  const key = loadEncryptionKey(keyValue);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);

  return { ciphertext, iv, tag: cipher.getAuthTag() };
}

function decryptIntake({ ciphertext, iv, tag }, keyValue) {
  const key = loadEncryptionKey(keyValue);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

module.exports = { loadEncryptionKey, encryptIntake, decryptIntake };
