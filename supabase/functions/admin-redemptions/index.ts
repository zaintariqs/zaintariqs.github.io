import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'
import { decryptEmail } from '../_shared/email-encryption.ts'
import { decryptBankDetails, isEncrypted } from '../_shared/encryption_v2.ts'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'team@pkrsc.org'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
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
    
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin status
    const { data: adminData, error: adminError } = await supabase
      .from('admin_wallets')
      .select('is_active')
      .ilike('wallet_address', walletAddress)
      .eq('is_active', true)
      .maybeSingle()

    if (adminError || !adminData) {
      console.warn('Non-admin attempted to access admin redemptions:', walletAddress, adminError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET or POST: Fetch all redemptions (admin only)
    if (req.method === 'GET' || req.method === 'POST') {
      console.log(`Admin ${walletAddress} fetching all redemptions`)
      
      const { data, error } = await supabase
        .from('redemptions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching redemptions:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch redemptions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Decrypt bank details for admin view
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

      // Fetch burn transaction hashes from burn_operations
      const redemptionIds = decryptedData.map(r => r.id)
      let burnData: any[] = []
      
      if (redemptionIds.length > 0) {
        const { data: burns } = await supabase
          .from('burn_operations')
          .select('redemption_id, burn_tx_hash')
          .in('redemption_id', redemptionIds)
        
        burnData = burns || []
      }

      // Merge burn proof with redemptions
      const enrichedData = decryptedData.map(redemption => {
        const burn = burnData.find(b => b.redemption_id === redemption.id)
        return {
          ...redemption,
          burn_tx_hash: burn?.burn_tx_hash || null
        }
      })

      // Log admin action with bank details access
      await supabase.from('admin_actions').insert({
        action_type: 'admin_viewed_all_redemptions',
        wallet_address: walletAddress.toLowerCase(),
        details: { 
          timestamp: new Date().toISOString(), 
          count: enrichedData?.length || 0,
          bank_details_accessed: true
        }
      })

      return new Response(
        JSON.stringify({ data: enrichedData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH: Update redemption status (admin only)
    if (req.method === 'PATCH') {
      const body = await req.json()
      const { redemptionId, status, bankTransactionId, userTransferHash, cancellationReason, burnTransactionHash, attachOnly, retriggerBurn } = body

      if (!redemptionId) {
        return new Response(
          JSON.stringify({ error: 'Missing redemption ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Handle re-trigger burn operation (reset completed to pending_burn)
      if (retriggerBurn) {
        console.log('Re-triggering burn for redemption:', redemptionId)
        
        // Verify redemption is completed
        const { data: redemption, error: checkError } = await supabase
          .from('redemptions')
          .select('status, pkrsc_amount')
          .eq('id', redemptionId)
          .single()
        
        if (checkError || !redemption) {
          return new Response(
            JSON.stringify({ error: 'Redemption not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        if (redemption.status !== 'completed') {
          return new Response(
            JSON.stringify({ error: 'Can only re-trigger burn for completed redemptions' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Reset to pending_burn to allow cron to pick it up
        const { error: updateError } = await supabase
          .from('redemptions')
          .update({ status: 'pending_burn' })
          .eq('id', redemptionId)
        
        if (updateError) {
          console.error('Error resetting redemption to pending_burn:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to re-trigger burn' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Log the action
        await supabase.from('admin_actions').insert({
          action_type: 'redemption_burn_retriggered',
          wallet_address: walletAddress,
          details: {
            redemptionId,
            amount: redemption.pkrsc_amount,
            timestamp: new Date().toISOString()
          }
        })
        
        console.log(`✓ Burn re-triggered for redemption ${redemptionId}. Cron job will process it within 5 minutes.`)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Burn re-triggered successfully. The contract burn() function will be called within 5 minutes to permanently destroy tokens.',
            data: { status: 'pending_burn' }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Skip status validation for attach-only operations
      if (!attachOnly) {
        if (!status) {
          return new Response(
            JSON.stringify({ error: 'Missing status' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const validStatuses = ['pending', 'waiting_for_burn', 'burn_confirmed', 'processing_transfer', 'completed', 'cancelled']
        if (!validStatuses.includes(status)) {
          return new Response(
            JSON.stringify({ error: 'Invalid status' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Validate required fields based on status (skip for attach-only)
      if (!attachOnly) {
        if (status === 'completed' && !bankTransactionId) {
          return new Response(
            JSON.stringify({ error: 'Bank transaction ID required for completed redemptions' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (status === 'cancelled' && !cancellationReason) {
          return new Response(
            JSON.stringify({ error: 'Cancellation reason required when cancelling redemptions' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      const updateData: any = {}
      
      // Handle attach-only operations (no status change)
      if (attachOnly) {
        console.log('Attach-only operation - updating transaction hashes without status change')
        if (userTransferHash) {
          updateData.transaction_hash = userTransferHash
        }
        // Note: burn proofs are stored in burn_operations, not redemptions
        if (burnTransactionHash) {
          const { error: burnUpdateErr } = await supabase
            .from('burn_operations')
            .update({ burn_tx_hash: burnTransactionHash })
            .eq('redemption_id', redemptionId)
          if (burnUpdateErr) {
            console.warn('Burn operations update skipped or failed:', burnUpdateErr)
          }
        }
      } else {
        // Handle normal status change operations
        
        // Special handling for completion - check if burn happened first
        if (status === 'completed') {
          // Check if tokens have been burned via burn_operations table
          const { data: burnCheck } = await supabase
            .from('burn_operations')
            .select('id, burn_tx_hash')
            .eq('redemption_id', redemptionId)
            .single()
          
          if (!burnCheck) {
            // No burn record exists - need to burn tokens first
            console.log('Completion requested but no burn found - setting status to pending_burn')
            updateData.status = 'pending_burn'
            if (userTransferHash) updateData.transaction_hash = userTransferHash
          } else {
            // Burn already happened, proceed with completion
            console.log('Burn confirmed, proceeding with completion')
            updateData.status = 'completed'
            if (bankTransactionId) updateData.bank_transaction_id = bankTransactionId
            if (userTransferHash) updateData.transaction_hash = userTransferHash
          }
        } else {
          // Non-completion status changes
          updateData.status = status
          if (bankTransactionId) updateData.bank_transaction_id = bankTransactionId
          if (userTransferHash) updateData.transaction_hash = userTransferHash
        }
        
        if (cancellationReason) updateData.cancellation_reason = cancellationReason
        if (burnTransactionHash && !userTransferHash) updateData.transaction_hash = burnTransactionHash
      }

      // Get redemption details before updating
      const { data: redemptionData, error: fetchError } = await supabase
        .from('redemptions')
        .select('pkrsc_amount, desired_pkr_amount')
        .eq('id', redemptionId)
        .single()

      if (fetchError) {
        console.error('Error fetching redemption:', fetchError)
        return new Response(
          JSON.stringify({ error: 'Redemption not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Admin ${walletAddress} updating redemption ${redemptionId} to status ${status}`)

      const { data, error } = await supabase
        .from('redemptions')
        .update(updateData)
        .eq('id', redemptionId)
        .select()
        .single()

      if (error) {
        console.error('Error updating redemption:', error)
        const statusCode = (error as any)?.code === '23505' ? 409 : 500
        const message = (error as any)?.code === '23505'
          ? 'This transaction hash is already linked to another redemption'
          : 'Failed to update redemption'
        return new Response(
          JSON.stringify({ error: message, details: error }),
          { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update PKR reserves when redemption is completed (skip for attach-only)
      // Bank transfers the whole PKR amount from desired_pkr_amount field
      let reserveUpdated = false
      if (!attachOnly && status === 'completed' && redemptionData) {
        const wholePKRAmount = redemptionData.desired_pkr_amount || Math.floor(redemptionData.pkrsc_amount / 1.005)

        console.log(`Redemption completion: Bank transfers ${wholePKRAmount} PKR (whole number) to user`)

        // Update PKR reserves (subtract whole PKR amount)
        const { error: reserveError } = await supabase.rpc('update_pkr_reserves', {
          amount_change: -wholePKRAmount,
          updated_by_wallet: walletAddress.toLowerCase()
        })

        if (reserveError) {
          console.error('Error updating PKR reserves:', reserveError)
        } else {
          reserveUpdated = true
          console.log(`Updated PKR reserves: -${wholePKRAmount} PKR`)
        }
      }

      // Delete fee record when redemption is cancelled
      let feeDeleted = false
      if (!attachOnly && status === 'cancelled') {
        console.log(`Redemption cancelled: Deleting associated transaction fee for redemption ${redemptionId}`)
        
        const { error: feeDeleteError } = await supabase
          .from('transaction_fees')
          .delete()
          .eq('transaction_id', redemptionId)
        
        if (feeDeleteError) {
          console.error('Error deleting transaction fee:', feeDeleteError)
        } else {
          feeDeleted = true
          console.log('Transaction fee deleted successfully')
        }
      }

      // Log admin action
      await supabase.from('admin_actions').insert({
        action_type: attachOnly ? 'admin_attached_tx_hashes' : 'admin_updated_redemption',
        wallet_address: walletAddress.toLowerCase(),
        details: { 
          redemptionId, 
          status: attachOnly ? undefined : status,
          attachOnly,
          userTransferHash: attachOnly ? userTransferHash : undefined,
          burnTransactionHash: attachOnly ? burnTransactionHash : undefined,
          bankTransactionId,
          cancellationReason,
          reserveUpdated,
          feeDeleted,
          amount: redemptionData?.pkrsc_amount,
          timestamp: new Date().toISOString() 
        }
      })

      // Send email notification (skip for attach-only operations)
      if (!attachOnly) {
        const { data: whitelistData } = await supabase
          .from('whitelist_requests')
          .select('wallet_address')
          .ilike('wallet_address', data.user_id)
          .single()

        // Fetch and decrypt email if available
        let userEmail = null
        if (whitelistData) {
        const { data: emailData } = await supabase
          .from('encrypted_emails')
          .select('encrypted_email')
          .eq('wallet_address', whitelistData.wallet_address)
          .single()
        
        if (emailData?.encrypted_email) {
          try {
            userEmail = await decryptEmail(emailData.encrypted_email)
            
            // Log PII access for audit trail
            const { error: piiErr } = await supabase.rpc('log_pii_access', {
              p_table: 'encrypted_emails',
              p_record_id: data.id,
              p_fields: ['email'],
              p_accessed_by: walletAddress.toLowerCase(),
              p_reason: `redemption_${status}_email_notification`,
              p_ip: null
            })
            if (piiErr) console.warn('Failed to log PII access:', piiErr)
          } catch (error) {
            console.error('Failed to decrypt email:', error)
          }
        }
      }

      if (userEmail) {
        try {
          if (status === 'completed') {
            // Success email
            await resend.emails.send({
              from: FROM_EMAIL,
              to: [userEmail],
              subject: 'PKRSC Redemption Completed',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #059669;">Redemption Successful!</h2>
                  
                  <p>Dear User,</p>
                  
                  <p>Your PKRSC redemption has been successfully completed and funds have been transferred to your bank account.</p>
                  
                  <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 20px 0;">
                    <strong>Redemption Details:</strong><br><br>
                    <strong>PKRSC Amount Redeemed:</strong> ${data.pkrsc_amount} PKRSC<br>
                    <strong>Transaction Fee (0.5%):</strong> ${(data.pkrsc_amount * 0.005).toFixed(2)} PKR<br>
                    <strong>PKR Amount Received:</strong> ${(data.pkrsc_amount * 0.995).toFixed(2)} PKR<br>
                    <strong>Your Wallet:</strong> ${data.user_id}
                  </div>
                  
                  ${burnTransactionHash ? `
                    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                      <strong>Burn Transaction:</strong><br>
                      <a href="https://basescan.org/tx/${burnTransactionHash}" style="color: #2563eb; word-break: break-all;">
                        ${burnTransactionHash}
                      </a>
                    </div>
                  ` : ''}
                  
                  ${bankTransactionId ? `
                    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                      <strong>Bank Transaction ID:</strong> ${bankTransactionId}
                    </div>
                  ` : ''}
                  
                  <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <strong>Bank Account Details:</strong><br>
                    <strong>Bank:</strong> ${data.bank_name}<br>
                    <strong>Account:</strong> ${data.account_number}<br>
                    <strong>Title:</strong> ${data.account_title}
                  </div>
                  
                  <p>Please allow 1-2 business days for the funds to appear in your bank account.</p>
                  
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  
                  <p style="color: #6b7280; font-size: 12px;">
                    If you have any questions, contact us at <a href="mailto:team@pkrsc.org">team@pkrsc.org</a>
                  </p>
                </div>
              `,
            })
            console.log(`Redemption success email sent to ${userEmail}`)
          } else if (status === 'cancelled') {
            // Cancellation email
            await resend.emails.send({
              from: FROM_EMAIL,
              to: [userEmail],
              subject: 'PKRSC Redemption Cancelled',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #dc2626;">Redemption Cancelled</h2>
                  
                  <p>Dear User,</p>
                  
                  <p>Your PKRSC redemption request has been cancelled.</p>
                  
                  <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
                    <strong>Redemption Details:</strong><br><br>
                    <strong>PKRSC Amount:</strong> ${data.pkrsc_amount} PKRSC<br>
                    <strong>Your Wallet:</strong> ${data.user_id}
                  </div>
                  
                  ${cancellationReason ? `
                    <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin: 20px 0;">
                      <strong>Reason:</strong> ${cancellationReason}
                    </div>
                  ` : ''}
                  
                  <p><strong>What to do next:</strong></p>
                  <ul>
                    <li>Review the cancellation reason</li>
                    <li>Correct any issues if applicable</li>
                    <li>Submit a new redemption request if needed</li>
                  </ul>
                  
                  <p>Your PKRSC tokens remain in your wallet and have not been burned.</p>
                  
                  <p>If you need assistance or have questions, please contact us:</p>
                  
                  <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <strong>Email:</strong> <a href="mailto:team@pkrsc.org">team@pkrsc.org</a>
                  </div>
                  
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  
                  <p style="color: #6b7280; font-size: 12px;">
                    This is an automated notification from PKRSC.
                  </p>
                </div>
              `,
            })
            console.log(`Redemption cancellation email sent to ${userEmail}`)
          }
        } catch (emailError) {
          console.error('Error sending redemption email:', emailError)
        }
      }
      } // End of !attachOnly email notification block

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