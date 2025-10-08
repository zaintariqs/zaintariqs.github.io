/**
 * Phone Number Encryption Utilities
 * 
 * Encrypts phone numbers using AES-256-GCM for PII protection
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
 * Encrypt phone number using AES-256-GCM
 */
export async function encryptPhoneNumber(phoneNumber: string): Promise<string> {
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
    
    // Encrypt the phone number
    const encoder = new TextEncoder()
    const data = encoder.encode(phoneNumber)
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
    console.error('Phone number encryption error:', error)
    throw new Error('Failed to encrypt phone number')
  }
}

/**
 * Decrypt phone number
 */
export async function decryptPhoneNumber(encryptedBase64: string): Promise<string> {
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
    console.error('Phone number decryption error:', error)
    throw new Error('Failed to decrypt phone number')
  }
}

/**
 * Check if phone number is encrypted (heuristic check)
 */
export function isPhoneEncrypted(phoneNumber: string): boolean {
  try {
    // Encrypted phone numbers are base64 encoded and longer than typical plaintext
    const decoded = atob(phoneNumber)
    return decoded.length >= 12 && /^[\x00-\xFF]*$/.test(decoded)
  } catch {
    return false
  }
}
