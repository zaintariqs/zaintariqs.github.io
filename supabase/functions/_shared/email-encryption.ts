/**
 * Email Encryption Utilities
 * 
 * Encrypts email addresses using AES-256-GCM for PII protection
 */

// Get encryption key from environment
async function getEncryptionKey(): Promise<Uint8Array> {
  const keyString = Deno.env.get('BANK_DATA_ENCRYPTION_KEY')
  if (!keyString) {
    throw new Error('BANK_DATA_ENCRYPTION_KEY not configured')
  }
  
  // Use SHA-256 to derive a proper 32-byte key
  const encoder = new TextEncoder()
  const keyData = encoder.encode(keyString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData)
  
  return new Uint8Array(hashBuffer)
}

/**
 * Encrypt email address using AES-256-GCM
 */
export async function encryptEmail(email: string): Promise<string> {
  try {
    const key = await getEncryptionKey()
    
    // Generate random 12-byte IV
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Import key for encryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )
    
    // Encrypt the email
    const encoder = new TextEncoder()
    const data = encoder.encode(email.toLowerCase())
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
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
 */
export async function decryptEmail(encryptedBase64: string): Promise<string> {
  try {
    const key = await getEncryptionKey()
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
    
    // Extract IV (first 12 bytes) and ciphertext
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    
    // Import key for decryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
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
    return decoded.length >= 12 && /^[\x00-\xFF]*$/.test(decoded)
  } catch {
    return false
  }
}