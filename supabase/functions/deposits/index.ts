import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, responseHeaders } from '../_shared/cors.ts'

// Valid payment methods for deposits
const VALID_PAYMENT_METHODS = ['easypaisa', 'jazzcash', 'bank']

// Validate Ethereum address format
function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Sanitize input to prevent SQL injection and XSS
function sanitizeString(input: string): string {
  return input.trim().substring(0, 255)
}

// SHA-256 hex helper (WebCrypto) used when DB hashing is unavailable
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(hash))
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Verify wallet signature to prove ownership
async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    const { ethers } = await import('https://esm.sh/ethers@6.9.0')
    const recoveredAddress = ethers.verifyMessage(message, signature)
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase()
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

// Database-backed rate limiting using admin_rate_limits table
async function checkRateLimit(
  supabase: any,
  walletAddress: string,
  operationType: string = 'deposit_operation',
  maxOperations: number = 12,
  windowMinutes: number = 1
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const { data, error } = await supabase.rpc('check_and_update_rate_limit', {
      p_wallet_address: walletAddress.toLowerCase(),
      p_operation_type: operationType,
      p_max_operations: maxOperations,
      p_window_minutes: windowMinutes
    }).single()

    if (error) {
      console.error('Rate limit check error:', error)
      return { allowed: true } // Fail open on error
    }

    return {
      allowed: data.allowed,
      retryAfter: data.retry_after_seconds || undefined
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return { allowed: true } // Fail open on error
  }
}

// Validate phone number (Pakistan format)
function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: 'Phone number is required' }
  }
  
  const cleanPhone = phone.replace(/[\s-]/g, '')
  // Pakistan numbers: +92XXXXXXXXXX or 03XXXXXXXXX
  if (!/^(\+92|0)?3\d{9}$/.test(cleanPhone)) {
    return { valid: false, error: 'Invalid Pakistan phone number format' }
  }
  
  return { valid: true }
}

// Validate deposit amount
function validateAmount(amount: number): { valid: boolean; error?: string } {
  if (!amount || isNaN(amount)) {
    return { valid: false, error: 'Valid amount is required' }
  }
  
  if (amount < 100) {
    return { valid: false, error: 'Minimum deposit is PKR 100' }
  }
  
  if (amount > 50000) {
    return { valid: false, error: 'Maximum deposit is PKR 50,000' }
  }
  
  return { valid: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const walletAddressHeader = req.headers.get('x-wallet-address')
    
    // GET requests only need wallet address
    if (req.method === 'GET') {
      if (!walletAddressHeader) {
        return new Response(
          JSON.stringify({ error: 'Wallet address required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // POST, PATCH, and DELETE require full signature verification
      const signatureHeader = req.headers.get('x-wallet-signature')
      const messageHeaderEncoded = req.headers.get('x-signature-message')
      const messageHeader = messageHeaderEncoded ? atob(messageHeaderEncoded) : null
      
      if (!walletAddressHeader || !signatureHeader || !messageHeader) {
        console.warn('Missing authentication headers')
        return new Response(
          JSON.stringify({ error: 'Authentication required: wallet signature missing' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (!isValidEthAddress(walletAddressHeader)) {
        return new Response(
          JSON.stringify({ error: 'Invalid wallet address format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Verify the signature proves wallet ownership
      const isValidSignature = await verifyWalletSignature(
        walletAddressHeader,
        signatureHeader,
        messageHeader
      )
      
      if (!isValidSignature) {
        console.error('Invalid wallet signature for address:', walletAddressHeader)
        return new Response(
          JSON.stringify({ error: 'Invalid wallet signature' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // Check rate limiting for all operations (database-backed)
    const rateLimitResult = await checkRateLimit(supabase, walletAddressHeader, `deposit_${req.method.toLowerCase()}`)
    if (!rateLimitResult.allowed) {
      console.warn('Rate limit exceeded for wallet:', walletAddressHeader)
      return new Response(
        JSON.stringify({ 
          error: `Too many requests. Please wait ${rateLimitResult.retryAfter || 60} seconds before trying again.` 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Log access for audit trail (non-blocking)
    supabase.from('admin_actions').insert({
      action_type: `deposit_${req.method.toLowerCase()}_access`,
      wallet_address: walletAddressHeader.toLowerCase(),
      details: { 
        timestamp: new Date().toISOString(), 
        method: req.method,
        success: true
      }
    }).then(({ error }) => {
      if (error) console.warn('[deposits] Failed to log audit trail:', error)
    })

    // GET: Fetch user's deposits
    if (req.method === 'GET') {
      if (!isValidEthAddress(walletAddressHeader)) {
        return new Response(
          JSON.stringify({ error: 'Invalid wallet address format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log(`Fetching deposits for wallet: ${walletAddressHeader}`)
      
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', walletAddressHeader.toLowerCase())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching deposits:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch deposits' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Decrypt phone numbers for user's own deposits
      const { decryptPhoneNumber, isPhoneEncrypted } = await import('../_shared/phone-encryption.ts')
      
      const depositsWithDecryptedPhones = await Promise.all(
        (data || []).map(async (deposit) => {
          try {
            // Only decrypt if phone is marked as encrypted
            if (deposit.phone_encrypted && isPhoneEncrypted(deposit.phone_number)) {
              const decryptedPhone = await decryptPhoneNumber(deposit.phone_number)
              return { ...deposit, phone_number: decryptedPhone }
            }
            return deposit
          } catch (error) {
            console.error(`Failed to decrypt phone for deposit ${deposit.id}:`, error)
            // Return original if decryption fails
            return deposit
          }
        })
      )

      return new Response(
        JSON.stringify({ data: depositsWithDecryptedPhones }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST: Create new deposit
    if (req.method === 'POST') {
      const body = await req.json()
      const { amount, paymentMethod, phoneNumber } = body

      // Comprehensive input validation
      const normalizedMethod = (paymentMethod || '').toLowerCase()
      if (!amount || !paymentMethod || (normalizedMethod !== 'bank' && !phoneNumber)) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Validate amount
      const amountValidation = validateAmount(amount)
      if (!amountValidation.valid) {
        return new Response(
          JSON.stringify({ error: amountValidation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Validate payment method
      if (!VALID_PAYMENT_METHODS.includes(paymentMethod.toLowerCase())) {
        return new Response(
          JSON.stringify({ error: 'Invalid payment method' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Validate phone number (optional for bank)
      if (normalizedMethod !== 'bank') {
        const phoneValidation = validatePhoneNumber(phoneNumber)
        if (!phoneValidation.valid) {
          return new Response(
            JSON.stringify({ error: phoneValidation.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      console.log(`Creating deposit for wallet: ${walletAddressHeader}, amount: ${amount}, method: ${paymentMethod}`)

      // Get user's email for verification
      const { data: emailData, error: emailError } = await supabase
        .from('encrypted_emails')
        .select('encrypted_email')
        .eq('wallet_address', walletAddressHeader.toLowerCase())
        .single()

      if (emailError || !emailData) {
        return new Response(
          JSON.stringify({ error: 'Email not found. Please complete whitelist verification first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Decrypt email
      const { decryptEmail } = await import('../_shared/email-encryption.ts')
      const userEmail = await decryptEmail(emailData.encrypted_email)

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

// Hash the verification code before storing (security hardening)
let hashedCode: string | null = null
try {
  const { data: rpcHash, error: rpcErr } = await supabase.rpc('hash_verification_code', { code: verificationCode })
  if (!rpcErr && rpcHash) {
    hashedCode = rpcHash
  }
} catch (e) {
  console.warn('[deposits] RPC hash failed, falling back to WebCrypto:', e)
}
if (!hashedCode) {
  try {
    hashedCode = await sha256Hex(verificationCode)
  } catch (e) {
    console.error('[deposits] Failed to hash verification code (WebCrypto):', e)
    // Final fallback: store plain code (legacy compatibility)
    hashedCode = verificationCode
  }
}


      // Encrypt phone number for PII protection
      const { encryptPhoneNumber } = await import('../_shared/phone-encryption.ts')
      const phoneToStore = normalizedMethod === 'bank' && (!phoneNumber || phoneNumber.trim().length === 0)
        ? '+923000000000'
        : sanitizeString(phoneNumber)
      const encryptedPhone = await encryptPhoneNumber(phoneToStore)

      const { data, error } = await supabase
        .from('deposits')
        .insert({
          user_id: walletAddressHeader.toLowerCase(),
          amount_pkr: amount,
          payment_method: sanitizeString(paymentMethod.toLowerCase()),
          phone_number: encryptedPhone,
          phone_encrypted: true,
          phone_encryption_version: 1,
          status: 'draft',
          email_verified: false,
          verification_code: hashedCode,
          verification_expires_at: expiresAt.toISOString(),
          verification_attempts: 0
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating deposit:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to create deposit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Send verification email
      const { Resend } = await import('npm:resend@2.0.0')
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
      const fromEmail = Deno.env.get('FROM_EMAIL') || 'team@pkrsc.org'

      try {
        await resend.emails.send({
          from: `PKRSC <${fromEmail}>`,
          to: [userEmail],
          subject: 'Verify Your PKRSC Deposit Request',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #00A86B;">Verify Your Deposit Request</h2>
              <p>Hi,</p>
              <p>You've initiated a deposit request of <strong>PKR ${amount}</strong> via ${paymentMethod}.</p>
              <p>Please use the following verification code to confirm your request:</p>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${verificationCode}
              </div>
              <p style="color: #666; font-size: 14px;">This code expires in 15 minutes. You have 5 attempts to verify.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                If you didn't request this, please ignore this email.
              </p>
            </div>
          `,
        })
        console.log('Verification email sent to:', userEmail)
      } catch (emailSendError) {
        console.error('Failed to send verification email:', emailSendError)
      }

      return new Response(
        JSON.stringify({ 
          data, 
          message: 'Deposit created. Please check your email for verification code.' 
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH: Submit transaction proof (user submits TXID and receipt)
    if (req.method === 'PATCH') {
      const body = await req.json()
      const { depositId, transactionId, receiptUrl } = body

      if (!depositId || !transactionId || !receiptUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Submitting proof for deposit: ${depositId}`)

      // Verify deposit belongs to user
      const { data: deposit, error: fetchError } = await supabase
        .from('deposits')
        .select('*')
        .eq('id', depositId)
        .eq('user_id', walletAddressHeader.toLowerCase())
        .single()

      if (fetchError || !deposit) {
        return new Response(
          JSON.stringify({ error: 'Deposit not found or unauthorized' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update deposit with transaction proof
      const { data, error } = await supabase
        .from('deposits')
        .update({
          user_transaction_id: transactionId,
          receipt_url: receiptUrl,
          submitted_at: new Date().toISOString(),
          status: 'processing'
        })
        .eq('id', depositId)
        .select()
        .single()

      if (error) {
        console.error('Error updating deposit:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to submit proof' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE: Cancel draft deposit
    if (req.method === 'DELETE') {
      const url = new URL(req.url)
      const depositId = url.searchParams.get('depositId')

      if (!depositId) {
        return new Response(
          JSON.stringify({ error: 'Deposit ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Cancelling deposit: ${depositId}`)

      // Verify deposit belongs to user and is in draft status
      const { data: deposit, error: fetchError } = await supabase
        .from('deposits')
        .select('*')
        .eq('id', depositId)
        .eq('user_id', walletAddressHeader.toLowerCase())
        .eq('status', 'draft')
        .single()

      if (fetchError || !deposit) {
        return new Response(
          JSON.stringify({ error: 'Deposit not found, unauthorized, or cannot be cancelled' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update deposit status to rejected (cancelled by user)
      const { data, error } = await supabase
        .from('deposits')
        .update({
          status: 'rejected',
          rejection_reason: 'Cancelled by user',
          updated_at: new Date().toISOString()
        })
        .eq('id', depositId)
        .select()
        .single()

      if (error) {
        console.error('Error cancelling deposit:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to cancel deposit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Deposit ${depositId} successfully cancelled`)

      return new Response(
        JSON.stringify({ data, message: 'Deposit cancelled successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})