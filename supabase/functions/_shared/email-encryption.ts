/**
 * Email Encryption Utilities
 * 
 * Encrypts email addresses using AES-256-GCM for PII protection
 * IMPORTANT: Uses same method as original encryption for compatibility
 */

// Get encryption key from environment (matches original implementation)
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get('BANK_DATA_ENCRYPTION_KEY')
  if (!keyString) {
    throw new Error('BANK_DATA_ENCRYPTION_KEY not configured')
  }
  
  // Match original key derivation: pad to 32 bytes
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

/**
 * Encrypt email address using AES-256-GCM
 * Uses 16-byte IV to match original implementation
 */
export async function encryptEmail(email: string): Promise<string> {
  try {
    const cryptoKey = await getEncryptionKey()
    
    // Generate random 16-byte IV (matches original)
    const iv = crypto.getRandomValues(new Uint8Array(16))
    
    // Encrypt the email
    const encoder = new TextEncoder()
    const data = encoder.encode(email.toLowerCase())
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    )
    
    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encrypted), iv.length)
    
    // Return as base64
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('Email encryption error:', error)
    throw new Error('Failed to encrypt email')
  }
}

/**
 * Decrypt email address
 * Uses 16-byte IV to match original implementation
 */
export async function decryptEmail(encryptedBase64: string): Promise<string> {
  try {
    const cryptoKey = await getEncryptionKey()
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
    
    // Extract IV (first 16 bytes) and ciphertext
    const iv = combined.slice(0, 16)
    const ciphertext = combined.slice(16)
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    )
    
    // Convert back to string
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('Email decryption error:', error)
    throw new Error('Failed to decrypt email')
  }
}

/**
 * Check if email is encrypted (heuristic check)
 */
export function isEmailEncrypted(email: string): boolean {
  try {
    // Encrypted emails are base64 encoded and longer than typical plaintext
    const decoded = atob(email)
    return decoded.length >= 16 && /^[\x00-\xFF]*$/.test(decoded)
  } catch {
    return false
  }
}