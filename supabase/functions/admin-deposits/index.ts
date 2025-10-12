import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address, x-wallet-signature, x-signature-message, x-nonce',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const walletAddress = req.headers.get('x-wallet-address')
    const signatureHeader = req.headers.get('x-wallet-signature')
    const messageHeaderEncoded = req.headers.get('x-signature-message')
    const nonceHeader = req.headers.get('x-nonce')
    const messageHeader = messageHeaderEncoded ? atob(messageHeaderEncoded) : null
    
    if (!walletAddress || !signatureHeader || !messageHeader || !nonceHeader) {
      console.warn('Missing authentication headers for admin-deposits')
      return new Response(
        JSON.stringify({ error: 'Authentication required: wallet signature missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the signature proves wallet ownership
    const isValidSignature = await verifyWalletSignature(
      walletAddress,
      signatureHeader,
      messageHeader
    )
    
    if (!isValidSignature) {
      console.error('Invalid wallet signature for admin-deposits:', walletAddress)
      return new Response(
        JSON.stringify({ error: 'Invalid wallet signature' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check nonce hasn't been used (replay attack prevention)
    const { data: nonceCheck } = await supabase
      .from('admin_actions')
      .select('id')
      .eq('nonce', nonceHeader)
      .single()
    
    if (nonceCheck) {
      console.error('Nonce already used - possible replay attack:', nonceHeader)
      return new Response(
        JSON.stringify({ error: 'Invalid nonce - possible replay attack detected' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin status with enhanced logging
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_admin_wallet', { wallet_addr: walletAddress })
    
    // Log admin authentication attempt with signature details
    await supabase.from('admin_actions').insert({
      action_type: isAdmin ? 'admin_auth_success' : 'admin_auth_failed',
      wallet_address: walletAddress.toLowerCase(),
      nonce: nonceHeader,
      signature: signatureHeader,
      signed_message: messageHeader,
      details: { 
        timestamp: new Date().toISOString(),
        endpoint: 'admin-deposits',
        success: !!isAdmin,
        signature_verified: isValidSignature
      }
    })
    
    if (adminError || !isAdmin) {
      console.error('Admin verification failed for wallet:', walletAddress, adminError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET or POST: Fetch all deposits (admin only)
    if (req.method === 'GET' || req.method === 'POST') {
      console.log(`Admin ${walletAddress} fetching all deposits (method: ${req.method})`)
      
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching deposits:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch deposits' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Decrypt phone numbers for admin view and log PII access
      const { decryptPhoneNumber, isPhoneEncrypted } = await import('../_shared/phone-encryption.ts')
      
      const depositsWithDecryptedPhones = await Promise.all(
        (data || []).map(async (deposit) => {
          try {
            // Only decrypt if phone is marked as encrypted
            if (deposit.phone_encrypted && isPhoneEncrypted(deposit.phone_number)) {
              const decryptedPhone = await decryptPhoneNumber(deposit.phone_number)
              
              // Log PII access for audit trail
              const { error: piiErr } = await supabase.rpc('log_pii_access', {
                p_table: 'deposits',
                p_record_id: deposit.id,
                p_fields: ['phone_number'],
                p_accessed_by: walletAddress.toLowerCase(),
                p_reason: 'admin_deposit_review',
                p_ip: null
              })
              if (piiErr) console.warn('Failed to log PII access:', piiErr)
              
              return { ...deposit, phone_number: decryptedPhone }
            }
            return deposit
          } catch (error) {
            console.error(`Failed to decrypt phone for deposit ${deposit.id}:`, error)
            // Return masked version if decryption fails
            return { ...deposit, phone_number: '********' + deposit.phone_number.slice(-4) }
          }
        })
      )

      // Log admin action
      await supabase.from('admin_actions').insert({
        action_type: 'admin_viewed_all_deposits',
        wallet_address: walletAddress.toLowerCase(),
        details: { timestamp: new Date().toISOString(), count: data?.length || 0 }
      })

      return new Response(
        JSON.stringify({ data: depositsWithDecryptedPhones }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH: Update deposit status (admin only)
    if (req.method === 'PATCH') {
      const body = await req.json()
      const { depositId, status, transactionId, rejectionReason } = body

      if (!depositId || !status) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const validStatuses = ['pending', 'processing', 'completed', 'rejected', 'cancelled']
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid status' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updateData: any = { status }
      if (transactionId) updateData.transaction_id = transactionId
      if (rejectionReason) updateData.rejection_reason = rejectionReason

      console.log(`Admin ${walletAddress} updating deposit ${depositId} to status ${status}`)

      const { data, error } = await supabase
        .from('deposits')
        .update(updateData)
        .eq('id', depositId)
        .select()
        .single()

      if (error) {
        console.error('Error updating deposit:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update deposit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log admin action
      await supabase.from('admin_actions').insert({
        action_type: 'admin_updated_deposit',
        wallet_address: walletAddress.toLowerCase(),
        details: { 
          depositId, 
          status, 
          transactionId,
          rejectionReason,
          timestamp: new Date().toISOString() 
        }
      })

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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})