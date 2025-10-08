/**
 * AES-256-GCM Encryption Utilities for Sensitive Bank Data (v2)
 * 
 * This module provides secure encryption/decryption for bank account details
 * using AES-256-GCM (Galois/Counter Mode) which provides both confidentiality
 * and authenticity.
 */

// Get encryption key from environment
async function getEncryptionKey(): Promise<Uint8Array> {
  const keyString = Deno.env.get('BANK_DATA_ENCRYPTION_KEY')
  if (!keyString) {
    throw new Error('BANK_DATA_ENCRYPTION_KEY not configured')
  }
  
  // Use SHA-256 to derive a proper 32-byte key from the provided string
  const encoder = new TextEncoder()
  const keyData = encoder.encode(keyString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData)
  
  return new Uint8Array(hashBuffer)
}

/**
 * Encrypt sensitive text using AES-256-GCM
 * Returns base64-encoded encrypted data with IV prepended
 */
export async function encryptText(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey()
    
    // Generate random 12-byte IV (recommended for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Import key for encryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )
    
    // Encrypt the data
    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)
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
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt sensitive data')
  }
}

/**
 * Decrypt text encrypted with encryptText
 * Expects base64-encoded data with IV prepended
 */
export async function decryptText(encryptedBase64: string): Promise<string> {
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
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt sensitive data')
  }
}

/**
 * Encrypt bank account details
 */
export async function encryptBankDetails(bankDetails: {
  bankName: string
  accountNumber: string
  accountTitle: string
}): Promise<{
  bankName: string
  accountNumber: string
  accountTitle: string
}> {
  return {
    bankName: await encryptText(bankDetails.bankName),
    accountNumber: await encryptText(bankDetails.accountNumber),
    accountTitle: await encryptText(bankDetails.accountTitle)
  }
}

/**
 * Decrypt bank account details
 */
export async function decryptBankDetails(encryptedDetails: {
  bankName: string
  accountNumber: string
  accountTitle: string
}): Promise<{
  bankName: string
  accountNumber: string
  accountTitle: string
}> {
  return {
    bankName: await decryptText(encryptedDetails.bankName),
    accountNumber: await decryptText(encryptedDetails.accountNumber),
    accountTitle: await decryptText(encryptedDetails.accountTitle)
  }
}

/**
 * Check if data is encrypted (basic heuristic check)
 */
export function isEncrypted(text: string): boolean {
  // Encrypted data will be base64 and longer than typical plaintext
  // This is a simple heuristic - encrypted data should be base64 encoded
  try {
    const decoded = atob(text)
    return decoded.length >= 12 && /^[\x00-\xFF]*$/.test(decoded)
  } catch {
    return false
  }
}
