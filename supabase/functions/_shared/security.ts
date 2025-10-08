import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.7.0';

/**
 * Verify wallet signature with nonce to prevent replay attacks
 */
export async function verifyWalletSignature(
  supabase: SupabaseClient,
  walletAddress: string,
  signature: string,
  message: string,
  nonce: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if nonce was already used
    const { data: nonceData, error: nonceError } = await supabase.rpc('is_nonce_used', {
      _nonce: nonce
    });

    if (nonceError) {
      console.error('Error checking nonce:', nonceError);
      return { valid: false, error: 'Failed to verify nonce' };
    }

    if (nonceData === true) {
      return { valid: false, error: 'Nonce already used (replay attack prevented)' };
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Signature verification error:', error);
    return { valid: false, error: 'Signature verification failed' };
  }
}

/**
 * Check if admin has specific permission
 */
export async function hasAdminPermission(
  supabase: SupabaseClient,
  walletAddress: string,
  permission: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_admin_permission', {
      _wallet_address: walletAddress,
      _permission: permission
    });

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Check rate limit for admin operations
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  walletAddress: string,
  operationType: string,
  maxOperations: number = 10,
  windowMinutes: number = 5
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    // Get current rate limit data
    const { data: rateLimitData, error: fetchError } = await supabase
      .from('admin_rate_limits')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('operation_type', operationType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Rate limit check error:', fetchError);
      return { allowed: true }; // Fail open to avoid blocking legitimate requests
    }

    if (!rateLimitData) {
      // First operation - create new record
      await supabase.from('admin_rate_limits').insert({
        wallet_address: walletAddress.toLowerCase(),
        operation_type: operationType,
        operation_count: 1,
        window_start: new Date(),
        last_operation_at: new Date()
      });
      return { allowed: true };
    }

    // Check if window has expired
    const windowStartTime = new Date(rateLimitData.window_start);
    if (windowStartTime < windowStart) {
      // Reset window
      await supabase
        .from('admin_rate_limits')
        .update({
          operation_count: 1,
          window_start: new Date(),
          last_operation_at: new Date()
        })
        .eq('id', rateLimitData.id);
      return { allowed: true };
    }

    // Check if limit exceeded
    if (rateLimitData.operation_count >= maxOperations) {
      const retryAfter = Math.ceil(
        (windowStartTime.getTime() + windowMinutes * 60 * 1000 - Date.now()) / 1000
      );
      return { allowed: false, retryAfter };
    }

    // Increment counter
    await supabase
      .from('admin_rate_limits')
      .update({
        operation_count: rateLimitData.operation_count + 1,
        last_operation_at: new Date()
      })
      .eq('id', rateLimitData.id);

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true }; // Fail open
  }
}

/**
 * Check if transaction hash was already used
 */
export async function isTransactionHashUsed(
  supabase: SupabaseClient,
  transactionHash: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('used_transaction_hashes')
      .select('id')
      .eq('transaction_hash', transactionHash.toLowerCase())
      .single();

    return !error && data !== null;
  } catch (error) {
    console.error('Transaction hash check failed:', error);
    return false;
  }
}

/**
 * Mark transaction hash as used
 */
export async function markTransactionHashUsed(
  supabase: SupabaseClient,
  transactionHash: string,
  transactionType: 'mint' | 'burn',
  usedBy: string
): Promise<void> {
  try {
    await supabase.from('used_transaction_hashes').insert({
      transaction_hash: transactionHash.toLowerCase(),
      transaction_type: transactionType,
      used_by: usedBy.toLowerCase()
    });
  } catch (error) {
    console.error('Failed to mark transaction hash as used:', error);
    throw error;
  }
}

/**
 * Log admin action with signature verification details
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  actionType: string,
  walletAddress: string,
  details: any,
  nonce?: string,
  signature?: string,
  signedMessage?: string
): Promise<void> {
  try {
    await supabase.from('admin_actions').insert({
      action_type: actionType,
      wallet_address: walletAddress.toLowerCase(),
      details,
      nonce,
      signature,
      signed_message: signedMessage
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Generate a nonce for signature verification
 */
export function generateNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Validate nonce timestamp (should be within last 5 minutes)
 */
export function isNonceValid(nonce: string): boolean {
  try {
    const timestamp = parseInt(nonce.split('-')[0]);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return now - timestamp < fiveMinutes;
  } catch {
    return false;
  }
}
