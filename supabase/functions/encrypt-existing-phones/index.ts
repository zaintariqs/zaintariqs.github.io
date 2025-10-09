import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address, x-wallet-signature, x-signature-message',
}

/**
 * ONE-TIME MIGRATION FUNCTION
 * Encrypts all unencrypted phone numbers in the deposits table
 * 
 * This function should be called once by an admin to encrypt all existing
 * plaintext phone numbers in the database. After this migration, all new
 * deposits will have encrypted phone numbers automatically.
 * 
 * Security: Only admins can run this migration
 */

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify admin authentication
    const walletAddress = req.headers.get('x-wallet-address')
    const signatureHeader = req.headers.get('x-wallet-signature')
    const messageHeaderEncoded = req.headers.get('x-signature-message')
    const messageHeader = messageHeaderEncoded ? atob(messageHeaderEncoded) : null
    
    if (!walletAddress || !signatureHeader || !messageHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isValidSignature = await verifyWalletSignature(
      walletAddress,
      signatureHeader,
      messageHeader
    )
    
    if (!isValidSignature) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet signature' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin status
    const { data: isAdmin } = await supabase
      .rpc('is_admin_wallet', { wallet_addr: walletAddress })
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin ${walletAddress} starting phone number encryption migration`)

    // Fetch all deposits with unencrypted phone numbers
    const { data: unencryptedDeposits, error: fetchError } = await supabase
      .from('deposits')
      .select('id, phone_number, phone_encrypted')
      .or('phone_encrypted.is.null,phone_encrypted.eq.false')

    if (fetchError) {
      console.error('Error fetching unencrypted deposits:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch deposits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!unencryptedDeposits || unencryptedDeposits.length === 0) {
      console.log('No unencrypted phone numbers found')
      return new Response(
        JSON.stringify({ 
          message: 'All phone numbers are already encrypted',
          encrypted_count: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${unencryptedDeposits.length} deposits with unencrypted phone numbers`)

    // Import encryption utilities
    const { encryptPhoneNumber, isPhoneEncrypted } = await import('../_shared/phone-encryption.ts')

    let successCount = 0
    let errorCount = 0
    const errors: { id: string; error: string }[] = []

    // Process each deposit
    for (const deposit of unencryptedDeposits) {
      try {
        // Skip if already encrypted (extra safety check)
        if (isPhoneEncrypted(deposit.phone_number)) {
          console.log(`Deposit ${deposit.id} phone already encrypted, skipping`)
          continue
        }

        // Encrypt the phone number
        const encryptedPhone = await encryptPhoneNumber(deposit.phone_number)

        // Update the deposit
        const { error: updateError } = await supabase
          .from('deposits')
          .update({
            phone_number: encryptedPhone,
            phone_encrypted: true,
            phone_encryption_version: 1
          })
          .eq('id', deposit.id)

        if (updateError) {
          console.error(`Failed to update deposit ${deposit.id}:`, updateError)
          errorCount++
          errors.push({ id: deposit.id, error: updateError.message })
        } else {
          successCount++
          console.log(`Encrypted phone for deposit ${deposit.id}`)
        }
      } catch (error) {
        console.error(`Error processing deposit ${deposit.id}:`, error)
        errorCount++
        errors.push({ id: deposit.id, error: error.message })
      }
    }

    // Log the migration
    await supabase.from('admin_actions').insert({
      action_type: 'phone_encryption_migration',
      wallet_address: walletAddress.toLowerCase(),
      details: {
        timestamp: new Date().toISOString(),
        total_deposits: unencryptedDeposits.length,
        success_count: successCount,
        error_count: errorCount,
        errors: errors
      }
    })

    return new Response(
      JSON.stringify({
        message: 'Phone number encryption migration completed',
        total_processed: unencryptedDeposits.length,
        encrypted_count: successCount,
        error_count: errorCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})