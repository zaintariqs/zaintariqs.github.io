import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { encryptBankDetails, decryptBankDetails, isEncrypted } from '../_shared/encryption_v2.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address, x-wallet-signature, x-signature-message',
  'Access-Control-Allow-Methods': 'POST,GET,PATCH,OPTIONS',
}

interface RedemptionRequest {
  walletAddress: string
  pkrscAmount: number
  bankName: string
  accountNumber: string
  accountTitle: string
}

// Validate Ethereum address format
function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Pakistani banks list for validation (matching frontend)
const PAKISTANI_BANKS = [
  'HBL Bank',
  'UBL Bank',
  'Meezan Bank',
  'Bank Alfalah',
  'MCB Bank',
  'Faysal Bank',
  'Standard Chartered',
  'Habib Metro Bank',
  'Soneri Bank',
  'Bank Al Habib',
  'JS Bank',
  'Askari Bank',
  'BOP Bank',
  'NBP Bank',
  'Allied Bank'
]

// PKRSC token details on Base
const PKRSC_TOKEN_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' // Proper burn address (contract burn function)
const PKRSC_DECIMALS = 6

// Get master minter address helper
async function getMasterMinterAddress(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from('master_minter_config')
    .select('master_minter_address')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error || !data) {
    throw new Error('Master minter address not configured')
  }
  
  return data.master_minter_address.toLowerCase()
}

// Comprehensive input validation
function validateBankDetails(bankName: string, accountNumber: string, accountTitle: string): { valid: boolean; error?: string } {
  // Validate bank name
  if (!bankName || bankName.trim().length === 0) {
    return { valid: false, error: 'Bank name is required' }
  }
  if (bankName.length > 100) {
    return { valid: false, error: 'Bank name must be less than 100 characters' }
  }
  if (!PAKISTANI_BANKS.includes(bankName)) {
    return { valid: false, error: 'Please select a valid Pakistani bank' }
  }
  
  // Validate account number (numeric, 10-24 digits typical for Pakistani banks)
  if (!accountNumber || accountNumber.trim().length === 0) {
    return { valid: false, error: 'Account number is required' }
  }
  const accountNumberClean = accountNumber.replace(/[\s-]/g, '') // Remove spaces and hyphens
  if (!/^\d{10,24}$/.test(accountNumberClean)) {
    return { valid: false, error: 'Account number must be 10-24 digits' }
  }
  
  // Validate account title (alphanumeric with limited special chars)
  if (!accountTitle || accountTitle.trim().length === 0) {
    return { valid: false, error: 'Account title is required' }
  }
  if (accountTitle.length < 3 || accountTitle.length > 100) {
    return { valid: false, error: 'Account title must be between 3 and 100 characters' }
  }
  if (!/^[a-zA-Z0-9\s.,'-]+$/.test(accountTitle)) {
    return { valid: false, error: 'Account title contains invalid characters. Only letters, numbers, spaces, and basic punctuation allowed' }
  }
  
  return { valid: true }
}

// Sanitize input to prevent SQL injection and XSS
function sanitizeString(input: string): string {
  return input.trim().substring(0, 255) // Limit length
}

// Verify wallet signature to prove ownership
async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    // Import ethers for signature verification
    const { ethers } = await import('https://esm.sh/ethers@6.9.0')
    
    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature)
    
    // Compare recovered address with claimed address (case-insensitive)
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
  operationType: string = 'redemption_operation',
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

// Hash helper using Web Crypto API (fallback if DB RPC unavailable)
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authentication headers
    const walletAddressHeader = req.headers.get('x-wallet-address')
    
    // GET requests only need wallet address
    if (req.method === 'GET') {
      if (!walletAddressHeader) {
        return new Response(
          JSON.stringify({ error: 'Wallet address required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // Continue to GET handler
    } else {
      // POST and PATCH require full signature verification
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
    
    // Check rate limiting (database-backed)
    const rateLimitResult = await checkRateLimit(supabase, walletAddressHeader, `redemption_${req.method.toLowerCase()}`)
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
      action_type: `redemption_${req.method.toLowerCase()}_access`,
      wallet_address: walletAddressHeader.toLowerCase(),
      details: { 
        timestamp: new Date().toISOString(), 
        method: req.method,
        success: true
      }
    }).then(({ error }) => {
      if (error) console.warn('[redemptions] Failed to log audit trail:', error)
    })
    
    if (req.method === 'POST') {
      const body: any = await req.json()
      
      // Validate wallet address
      if (!body.walletAddress || !isValidEthAddress(body.walletAddress)) {
        return new Response(
          JSON.stringify({ error: 'Invalid wallet address' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify header matches body (prevent address spoofing)
      if (walletAddressHeader.toLowerCase() !== body.walletAddress.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: 'Wallet address mismatch' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Check if wallet is blacklisted
      const { data: blacklisted } = await supabase
        .from('blacklisted_addresses')
        .select('id')
        .eq('wallet_address', body.walletAddress.toLowerCase())
        .eq('is_active', true)
        .single()
      
      if (blacklisted) {
        console.warn('Blacklisted wallet attempted redemption:', body.walletAddress)
        return new Response(
          JSON.stringify({ error: 'Wallet address is not authorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate and sanitize bank details
      const validation = validateBankDetails(body.bankName, body.accountNumber, body.accountTitle)
      if (!validation.valid) {
        console.warn('Invalid bank details:', validation.error, 'for wallet:', body.walletAddress)
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Branch: user transferred tokens to master minter for redemption
      if (body.existingTransferTx) {
        const transferTx: string = String(body.existingTransferTx)
        if (!/^0x[a-fA-F0-9]{64}$/.test(transferTx)) {
          return new Response(
            JSON.stringify({ error: 'Invalid transaction hash format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          const { ethers } = await import('https://esm.sh/ethers@6.9.0')
          const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
          const receipt = await provider.getTransactionReceipt(transferTx)

          if (!receipt || receipt.status !== 1) {
            return new Response(
              JSON.stringify({ error: 'Transaction not found or not successful' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // SECURITY: Check if transaction hash has already been used (replay attack prevention)
          const { data: existingRedemption, error: replayCheckError } = await supabase
            .from('redemptions')
            .select('id, user_id, created_at, status')
            .eq('transaction_hash', transferTx.toLowerCase())
            .maybeSingle()

          if (replayCheckError) {
            console.error('[redemptions] Error checking for transaction replay:', replayCheckError)
          }

          if (existingRedemption) {
            console.warn('[redemptions] Transaction hash replay attempt detected:', {
              txHash: transferTx,
              existingRedemptionId: existingRedemption.id,
              existingUser: existingRedemption.user_id,
              newUser: body.walletAddress,
              existingStatus: existingRedemption.status
            })

            // Log security incident
            await supabase.from('admin_actions').insert({
              action_type: 'redemption_replay_attack_prevented',
              wallet_address: body.walletAddress.toLowerCase(),
              details: {
                transactionHash: transferTx,
                existingRedemptionId: existingRedemption.id,
                existingUser: existingRedemption.user_id,
                existingCreatedAt: existingRedemption.created_at,
                severity: 'high',
                timestamp: new Date().toISOString()
              }
            })

            return new Response(
              JSON.stringify({ 
                error: 'This transaction has already been used for a redemption. Each transaction can only be redeemed once.',
                existingRedemptionCreated: existingRedemption.created_at
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Get master minter address
          const masterMinterAddress = await getMasterMinterAddress(supabase)

          // Transfer(address,address,uint256) topic
          const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)')

          // Find Transfer log for PKRSC token TO master minter FROM this wallet
          const targetLog = receipt.logs.find((log: any) => {
            if (log.address?.toLowerCase() !== PKRSC_TOKEN_ADDRESS.toLowerCase()) return false
            if (!log.topics || log.topics.length < 3) return false
            if (log.topics[0] !== TRANSFER_TOPIC) return false
            const fromTopic = log.topics[1].toLowerCase()
            const toTopic = log.topics[2].toLowerCase()
            // topics for indexed address are 32-byte left-padded, compare last 40 hex chars
            const fromAddr = '0x' + fromTopic.slice(-40)
            const toAddr = '0x' + toTopic.slice(-40)
            return fromAddr.toLowerCase() === body.walletAddress.toLowerCase() && toAddr.toLowerCase() === masterMinterAddress.toLowerCase()
          })

          if (!targetLog) {
            return new Response(
              JSON.stringify({ error: `Provided transaction is not a valid PKRSC transfer to master minter wallet from your address. Please transfer tokens to ${masterMinterAddress}` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Parse amount from log.data (uint256)
          const value = ethers.toBigInt(targetLog.data)
          const amount = Number(value) / 10 ** PKRSC_DECIMALS

          if (!amount || amount < 100) {
            return new Response(
              JSON.stringify({ error: 'Burn amount must be at least 100 PKRSC' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Calculate 0.5% transaction fee
          const FEE_PERCENTAGE = 0.5
          const feeAmount = (amount * FEE_PERCENTAGE) / 100
          const netAmount = amount - feeAmount

          console.log(`[redemptions] Fee calculation (transfer to master minter): Original=${amount} PKRSC, Fee=${feeAmount} PKRSC (${FEE_PERCENTAGE}%), Net=${netAmount} PKRSC to burn`)

          // Get user's email for verification
          const { data: emailData, error: emailFetchError } = await supabase
            .from('encrypted_emails')
            .select('encrypted_email')
            .eq('wallet_address', body.walletAddress.toLowerCase())
            .single()

          if (emailFetchError || !emailData) {
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

          // Hash the verification code (DB RPC first, fallback to WebCrypto)
          let hashedCode: string | null = null
          try {
            const { data: rpcHash, error: rpcErr } = await supabase.rpc('hash_verification_code', { code: verificationCode })
            if (!rpcErr && rpcHash) {
              hashedCode = rpcHash
            }
          } catch (e) {
            console.warn('[redemptions] RPC hash failed, falling back to WebCrypto:', e)
          }
          if (!hashedCode) {
            try {
              hashedCode = await sha256Hex(verificationCode)
            } catch (e) {
              console.error('[redemptions] Failed to hash verification code (WebCrypto):', e)
              // Final fallback: store plain code (legacy compatibility)
              hashedCode = verificationCode
            }
          }

          // Encrypt bank details before storing
          const encryptedBankDetails = await encryptBankDetails({
            bankName: sanitizeString(body.bankName),
            accountNumber: sanitizeString(body.accountNumber),
            accountTitle: sanitizeString(body.accountTitle)
          })

          const { data, error } = await supabase
            .from('redemptions')
            .insert({
              user_id: body.walletAddress.toLowerCase(),
              pkrsc_amount: netAmount, // Store net amount (what user will receive in PKR)
              bank_name: encryptedBankDetails.bankName,
              account_number: encryptedBankDetails.accountNumber,
              account_title: encryptedBankDetails.accountTitle,
              burn_address: masterMinterAddress, // Transferred to master minter
              transaction_hash: transferTx,
              status: 'pending_burn', // Needs backend to burn the tokens
              email_verified: false,
              verification_code: hashedCode,
              verification_expires_at: expiresAt.toISOString(),
              verification_attempts: 0
            })
            .select()
            .single()

          if (error) {
            console.error('[redemptions] Error creating redemption (transfer to master minter):', error)
            return new Response(
              JSON.stringify({ error: 'Failed to create redemption with transfer' }),
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
              subject: 'Verify Your PKRSC Redemption Request',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #00A86B;">Verify Your Redemption Request</h2>
                  <p>Hi,</p>
                  <p>You've initiated a redemption request of <strong>${netAmount} PKRSC</strong> (after 0.5% fee).</p>
                  <p>Transfer Amount: <strong>${amount} PKRSC</strong></p>
                  <p>Transaction Hash: <code>${transferTx}</code></p>
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

          // Record transaction fee
          await supabase.from('transaction_fees').insert({
            transaction_type: 'redemption',
            transaction_id: data.id,
            user_id: body.walletAddress.toLowerCase(),
            original_amount: amount,
            fee_percentage: FEE_PERCENTAGE,
            fee_amount: feeAmount,
            net_amount: netAmount
          })

          await supabase.from('admin_actions').insert({
            action_type: 'redemption_created_from_transfer',
            wallet_address: body.walletAddress.toLowerCase(),
            details: { 
              redemptionId: data.id, 
              transferTx, 
              totalAmount: amount, 
              feeAmount, 
              netAmountToBurn: netAmount,
              masterMinter: masterMinterAddress,
              timestamp: new Date().toISOString() 
            }
          })

          return new Response(
            JSON.stringify({ data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (err) {
          console.error('Error verifying existing burn tx:', err)
          return new Response(
            JSON.stringify({ error: 'Failed to verify burn transaction' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Default flow: user will burn after creating redemption
      if (!body.pkrscAmount || body.pkrscAmount < 100) {
        return new Response(
          JSON.stringify({ error: 'Minimum redemption is 100 PKRSC' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Calculate 0.5% transaction fee
      const FEE_PERCENTAGE = 0.5
      const feeAmount = (body.pkrscAmount * FEE_PERCENTAGE) / 100
      const netAmount = body.pkrscAmount - feeAmount

      console.log(`[redemptions] Fee calculation (v2): Original=${body.pkrscAmount} PKRSC, Fee=${feeAmount} PKRSC (${FEE_PERCENTAGE}%), Net=${netAmount} PKRSC`)

      // Get user's email for verification
      const { data: emailData, error: emailFetchError } = await supabase
        .from('encrypted_emails')
        .select('encrypted_email')
        .eq('wallet_address', body.walletAddress.toLowerCase())
        .single()

      if (emailFetchError || !emailData) {
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

      // Hash the verification code (DB RPC first, fallback to WebCrypto)
      let hashedCode: string | null = null
      try {
        const { data: rpcHash, error: rpcErr } = await supabase.rpc('hash_verification_code', { code: verificationCode })
        if (!rpcErr && rpcHash) {
          hashedCode = rpcHash
        }
      } catch (e) {
        console.warn('[redemptions] RPC hash failed, falling back to WebCrypto:', e)
      }
      if (!hashedCode) {
        try {
          hashedCode = await sha256Hex(verificationCode)
        } catch (e) {
          console.error('[redemptions] Failed to hash verification code (WebCrypto):', e)
          // Final fallback: store plain code (legacy compatibility)
          hashedCode = verificationCode
        }
      }


      // Encrypt bank details before storing
      const encryptedBankDetails = await encryptBankDetails({
        bankName: sanitizeString(body.bankName),
        accountNumber: sanitizeString(body.accountNumber),
        accountTitle: sanitizeString(body.accountTitle)
      })

      const { data, error } = await supabase
        .from('redemptions')
        .insert({
          user_id: body.walletAddress.toLowerCase(),
          pkrsc_amount: body.pkrscAmount,
          bank_name: encryptedBankDetails.bankName,
          account_number: encryptedBankDetails.accountNumber,
          account_title: encryptedBankDetails.accountTitle,
          burn_address: ZERO_ADDRESS,
          status: 'draft',
          email_verified: false,
          verification_code: hashedCode,
          verification_expires_at: expiresAt.toISOString(),
          verification_attempts: 0
        })
        .select()
        .single()

      if (error) {
        console.error('[redemptions] Error creating redemption:', error)
        // Log failure for audit
        await supabase.from('admin_actions').insert({
          action_type: 'redemption_creation_failed',
          wallet_address: body.walletAddress.toLowerCase(),
          details: { 
            error: error.message,
            timestamp: new Date().toISOString()
          }
        })
        return new Response(
          JSON.stringify({ error: 'Failed to create redemption request' }),
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
          subject: 'Verify Your PKRSC Redemption Request',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #00A86B;">Verify Your Redemption Request</h2>
              <p>Hi,</p>
              <p>You've initiated a redemption request of <strong>${body.pkrscAmount} PKRSC</strong>.</p>
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

      // Record transaction fee
      await supabase.from('transaction_fees').insert({
        transaction_type: 'redemption',
        transaction_id: data.id,
        user_id: body.walletAddress.toLowerCase(),
        original_amount: body.pkrscAmount,
        fee_percentage: FEE_PERCENTAGE,
        fee_amount: feeAmount,
        net_amount: netAmount
      })
      
      // Log success for audit
      await supabase.from('admin_actions').insert({
        action_type: 'redemption_created',
        wallet_address: body.walletAddress.toLowerCase(),
        details: { 
          redemptionId: data.id,
          amount: body.pkrscAmount,
          feeAmount,
          netAmount,
          timestamp: new Date().toISOString()
        }
      })
      
      console.log('[redemptions] Redemption created successfully:', data.id, 'for wallet:', body.walletAddress)

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      // GET requests don't require signature - just wallet address for filtering
      if (!walletAddressHeader || !isValidEthAddress(walletAddressHeader)) {
        return new Response(
          JSON.stringify({ error: 'Valid wallet address required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get redemptions for the wallet address
      const { data, error } = await supabase
        .from('redemptions')
        .select('id, pkrsc_amount, status, created_at, updated_at, burn_address, transaction_hash, bank_name, account_number, account_title, cancellation_reason, bank_transaction_id')
        .eq('user_id', walletAddressHeader.toLowerCase())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching redemptions:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch redemptions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Decrypt bank details for user's own redemptions
      const decryptedData = await Promise.all(
        (data || []).map(async (redemption: any) => {
          try {
            // Only decrypt if data appears to be encrypted
            if (isEncrypted(redemption.bank_name)) {
              const decrypted = await decryptBankDetails({
                bankName: redemption.bank_name,
                accountNumber: redemption.account_number,
                accountTitle: redemption.account_title
              })
              return { ...redemption, ...decrypted }
            }
            // Return as-is for old unencrypted data
            return redemption
          } catch (decryptError) {
            console.error('Failed to decrypt redemption data:', decryptError)
            // Return original if decryption fails (backward compatibility)
            return redemption
          }
        })
      )

      return new Response(
        JSON.stringify({ data: decryptedData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'PATCH') {
      // Update redemption status (for transaction hash)
      const body = await req.json()
      const { redemptionId, transactionHash, status } = body
      
      // Validate transaction hash format
      if (transactionHash && !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
        return new Response(
          JSON.stringify({ error: 'Invalid transaction hash format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify ownership before update
      const { data: existing, error: fetchError } = await supabase
        .from('redemptions')
        .select('user_id')
        .eq('id', redemptionId)
        .single()

      if (fetchError || !existing) {
        return new Response(
          JSON.stringify({ error: 'Redemption not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existing.user_id.toLowerCase() !== walletAddressHeader.toLowerCase()) {
        console.error('Unauthorized PATCH attempt:', walletAddressHeader, 'for redemption:', redemptionId)
        return new Response(
          JSON.stringify({ error: 'Unauthorized: You can only update your own redemptions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update the redemption
      const { data, error } = await supabase
        .from('redemptions')
        .update({
          transaction_hash: transactionHash,
          status: status
        })
        .eq('id', redemptionId)
        .select()
        .single()

      if (error) {
        console.error('Error updating redemption:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update redemption' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ data }),
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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
