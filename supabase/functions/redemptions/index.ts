import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

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
const PKRSC_TOKEN_ADDRESS = '0x1f192CB7B36d7acfBBdCA1E0C1d697361508F9D5'
const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD'
const PKRSC_DECIMALS = 6

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

// Rate limiting map (wallet address -> last request timestamp)
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 5000 // 5 seconds between requests

function checkRateLimit(walletAddress: string): boolean {
  const now = Date.now()
  const lastRequest = rateLimitMap.get(walletAddress.toLowerCase())
  
  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    return false // Rate limited
  }
  
  rateLimitMap.set(walletAddress.toLowerCase(), now)
  return true
}

serve(async (req) => {
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
    
    // Check rate limiting
    if (!checkRateLimit(walletAddressHeader)) {
      console.warn('Rate limit exceeded for wallet:', walletAddressHeader)
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }),
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

      // Branch: user already burned and provides a transaction hash
      if (body.existingBurnTx) {
        const burnTx: string = String(body.existingBurnTx)
        if (!/^0x[a-fA-F0-9]{64}$/.test(burnTx)) {
          return new Response(
            JSON.stringify({ error: 'Invalid transaction hash format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          const { ethers } = await import('https://esm.sh/ethers@6.9.0')
          const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
          const receipt = await provider.getTransactionReceipt(burnTx)

          if (!receipt || receipt.status !== 1) {
            return new Response(
              JSON.stringify({ error: 'Transaction not found or not successful' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Transfer(address,address,uint256) topic
          const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)')

          // Find Transfer log for PKRSC token to burn address from this wallet
          const targetLog = receipt.logs.find((log: any) => {
            if (log.address?.toLowerCase() !== PKRSC_TOKEN_ADDRESS.toLowerCase()) return false
            if (!log.topics || log.topics.length < 3) return false
            if (log.topics[0] !== TRANSFER_TOPIC) return false
            const fromTopic = log.topics[1].toLowerCase()
            const toTopic = log.topics[2].toLowerCase()
            // topics for indexed address are 32-byte left-padded, compare last 40 hex chars
            const fromAddr = '0x' + fromTopic.slice(-40)
            const toAddr = '0x' + toTopic.slice(-40)
            return fromAddr.toLowerCase() === body.walletAddress.toLowerCase() && toAddr.toLowerCase() === BURN_ADDRESS.toLowerCase()
          })

          if (!targetLog) {
            return new Response(
              JSON.stringify({ error: 'Provided transaction is not a PKRSC burn from this wallet' }),
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

          const { data, error } = await supabase
            .from('redemptions')
            .insert({
              user_id: body.walletAddress.toLowerCase(),
              pkrsc_amount: amount,
              bank_name: sanitizeString(body.bankName),
              account_number: sanitizeString(body.accountNumber),
              account_title: sanitizeString(body.accountTitle),
              burn_address: BURN_ADDRESS,
              transaction_hash: burnTx,
              status: 'burn_confirmed',
            })
            .select()
            .single()

          if (error) {
            console.error('[redemptions] Error creating redemption (existing burn):', error)
            return new Response(
              JSON.stringify({ error: 'Failed to create redemption with existing burn' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          await supabase.from('admin_actions').insert({
            action_type: 'redemption_created_from_existing_burn',
            wallet_address: body.walletAddress.toLowerCase(),
            details: { redemptionId: data.id, burnTx, amount, timestamp: new Date().toISOString() }
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

      const { data, error } = await supabase
        .from('redemptions')
        .insert({
          user_id: body.walletAddress.toLowerCase(),
          pkrsc_amount: body.pkrscAmount,
          bank_name: sanitizeString(body.bankName),
          account_number: sanitizeString(body.accountNumber),
          account_title: sanitizeString(body.accountTitle),
          burn_address: BURN_ADDRESS,
          status: 'pending'
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
      
      // Log success for audit
      await supabase.from('admin_actions').insert({
        action_type: 'redemption_created',
        wallet_address: body.walletAddress.toLowerCase(),
        details: { 
          redemptionId: data.id,
          amount: body.pkrscAmount,
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

      return new Response(
        JSON.stringify({ data }),
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
