/**
 * Symmetric encryption for sensitive data at rest (e.g., Slack tokens).
 *
 * Uses AES-256-GCM with a random IV per ciphertext.
 * The encryption key is derived from the ENCRYPTION_KEY env var.
 * If no key is set, falls back to plaintext (with a console warning).
 *
 * Storage format: base64(iv:ciphertext:authTag)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM recommended IV length
const TAG_LENGTH = 16

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) return null
  // Derive a consistent 32-byte key from whatever string was provided
  return createHash('sha256').update(raw).digest()
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded ciphertext.
 * If ENCRYPTION_KEY is not set, returns the plaintext as-is (for dev).
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[encryption] ENCRYPTION_KEY is required in production')
    }
    // Dev only — allow plaintext for local development
    return plaintext
  }

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  // Combine: iv + encrypted + tag
  const combined = Buffer.concat([iv, encrypted, tag])
  return `enc:${combined.toString('base64')}`
}

/**
 * Decrypt a ciphertext string. If the value doesn't start with 'enc:',
 * treats it as plaintext (backward compatible with pre-encryption data).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith('enc:')) {
    return ciphertext // plaintext (legacy or dev mode)
  }

  const key = getKey()
  if (!key) {
    throw new Error('ENCRYPTION_KEY required to decrypt data')
  }

  const combined = Buffer.from(ciphertext.slice(4), 'base64')
  const iv = combined.subarray(0, IV_LENGTH)
  const tag = combined.subarray(combined.length - TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
