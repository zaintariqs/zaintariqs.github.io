/**
 * Email Encryption Utilities (Backward Compatible)
 * 
 * Supports both historical and current schemes used in this project:
 * - Scheme A (original): 16-byte IV, key = BANK_DATA_ENCRYPTION_KEY padded to 32 bytes
 * - Scheme B (transient): 12-byte IV, key = SHA-256(BANK_DATA_ENCRYPTION_KEY)
 * 
 * Decryption tries Scheme A first, then falls back to Scheme B.
 */

// Scheme A: padded key (original implementation)
async function getCryptoKeyPadded(): Promise<CryptoKey> {
  const keyString = Deno.env.get('BANK_DATA_ENCRYPTION_KEY')
  if (!keyString) throw new Error('BANK_DATA_ENCRYPTION_KEY not configured')
  const encoder = new TextEncoder()
  const paddedKey = keyString.padEnd(32, '0').slice(0, 32)
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(paddedKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

// Scheme B: SHA-256 derived key (transient implementation)
async function getCryptoKeySHA256(): Promise<CryptoKey> {
  const keyString = Deno.env.get('BANK_DATA_ENCRYPTION_KEY')
  if (!keyString) throw new Error('BANK_DATA_ENCRYPTION_KEY not configured')
  const encoder = new TextEncoder()
  const keyData = encoder.encode(keyString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData)
  return await crypto.subtle.importKey(
    'raw',
    new Uint8Array(hashBuffer),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt email (uses Scheme A going forward)
 */
export async function encryptEmail(email: string): Promise<string> {
  const cryptoKey = await getCryptoKeyPadded()
  const iv = crypto.getRandomValues(new Uint8Array(16)) // Scheme A IV length
  const encoder = new TextEncoder()
  const data = encoder.encode(email.toLowerCase())
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  )
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)
  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt email with backward compatibility
 */
export async function decryptEmail(encryptedBase64: string): Promise<string> {
  // Decode once
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))

  // Try Scheme A first (16-byte IV, padded key)
  try {
    const cryptoKeyA = await getCryptoKeyPadded()
    const ivA = combined.slice(0, 16)
    const ciphertextA = combined.slice(16)
    const decryptedA = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivA },
      cryptoKeyA,
      ciphertextA
    )
    return new TextDecoder().decode(decryptedA)
  } catch (e) {
    // Fallback to Scheme B (12-byte IV, SHA-256 key)
    try {
      const cryptoKeyB = await getCryptoKeySHA256()
      const ivB = combined.slice(0, 12)
      const ciphertextB = combined.slice(12)
      const decryptedB = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivB },
        cryptoKeyB,
        ciphertextB
      )
      return new TextDecoder().decode(decryptedB)
    } catch (e2) {
      console.error('Email decryption failed for both schemes:', { e, e2 })
      throw new Error('Failed to decrypt email')
    }
  }
}

/**
 * Heuristic check if a string looks like encrypted base64
 */
export function isEmailEncrypted(email: string): boolean {
  try {
    const decoded = atob(email)
    // Accept both 16+ and 12+ prefixes for IV lengths
    return decoded.length >= 12 && /^[\x00-\xFF]*$/.test(decoded)
  } catch {
    return false
  }
}
