import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'
import { decryptEmail } from '../_shared/email-encryption.ts'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'team@pkrsc.org'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const adminWallet = req.headers.get('x-wallet-address')
    
    if (!adminWallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin status
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_admin_wallet', { wallet_addr: adminWallet })
    
    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { walletAddress, reason } = body

    if (!walletAddress || !reason) {
      return new Response(
        JSON.stringify({ error: 'Wallet address and reason are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add to blacklist (upsert to handle already blacklisted addresses)
    const { error: blacklistError } = await supabase
      .from('blacklisted_addresses')
      .upsert({
        wallet_address: walletAddress.toLowerCase(),
        reason,
        blacklisted_by: adminWallet.toLowerCase(),
        is_active: true,
        blacklisted_at: new Date().toISOString()
      }, {
        onConflict: 'wallet_address'
      })

    if (blacklistError) {
      console.error('Error blacklisting user:', blacklistError)
      return new Response(
        JSON.stringify({ error: 'Failed to blacklist user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update whitelist_requests status to "blacklisted"
    const { error: updateError, data: updateData } = await supabase
      .from('whitelist_requests')
      .update({ 
        status: 'blacklisted',
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminWallet.toLowerCase()
      })
      .eq('wallet_address', walletAddress.toLowerCase())
      .select('id')

    if (updateError) {
      console.error('Error updating whitelist status:', updateError)
    } else {
      console.log('Whitelist status updated for:', walletAddress.toLowerCase(), 'rows affected:', updateData?.length ?? 0)
    }

    // Fetch whitelist data for email notification
    const { data: whitelistData } = await supabase
      .from('whitelist_requests')
      .select('wallet_address')
      .ilike('wallet_address', walletAddress)
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
            p_record_id: whitelistData.wallet_address,
            p_fields: ['email'],
            p_accessed_by: adminWallet.toLowerCase(),
            p_reason: 'blacklist_email_notification',
            p_ip: null
          })
          if (piiErr) console.warn('Failed to log PII access:', piiErr)
        } catch (error) {
          console.error('Failed to decrypt email:', error)
        }
      }
    }

    // Send email notification if email exists
    if (userEmail) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: [userEmail],
          subject: 'PKRSC Account Status - Urgent Action Required',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Account Access Restricted</h2>
              
              <p>Dear User,</p>
              
              <p>Your PKRSC account (${walletAddress}) has been temporarily restricted.</p>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
                <strong>Reason:</strong> ${reason}
              </div>
              
              <p><strong>What this means:</strong></p>
              <ul>
                <li>Your wallet address has been blocked from using PKRSC services</li>
                <li>You cannot make deposits or redemptions</li>
                <li>This action was taken to protect the integrity of our platform</li>
              </ul>
              
              <p><strong>Next Steps:</strong></p>
              <p>If you believe this is a mistake or have questions, please contact our team immediately:</p>
              
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <strong>Email:</strong> <a href="mailto:team@pkrsc.org">team@pkrsc.org</a>
              </div>
              
              <p>Please include your wallet address (${walletAddress}) in your correspondence.</p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #6b7280; font-size: 12px;">
                This is an automated notification from PKRSC. Please do not reply to this email.
              </p>
            </div>
          `,
        })
        
        console.log(`Blacklist notification sent to ${userEmail}`)
      } catch (emailError) {
        console.error('Error sending blacklist email:', emailError)
        // Don't fail the blacklist action if email fails
      }
    }

    // Log admin action
    await supabase.from('admin_actions').insert({
      action_type: 'user_blacklisted',
      wallet_address: adminWallet.toLowerCase(),
      details: { 
        blacklistedAddress: walletAddress.toLowerCase(),
        reason,
        emailSent: !!userEmail,
        timestamp: new Date().toISOString()
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent: !!userEmail 
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