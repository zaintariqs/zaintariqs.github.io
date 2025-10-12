import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encryptEmail } from '../_shared/email-encryption.ts'
import { isDisposableEmail, getDisposableEmailError } from '../_shared/disposable-email-checker.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const adminWallet = req.headers.get('x-wallet-address')
    if (!adminWallet) {
      return new Response(JSON.stringify({ error: 'x-wallet-address header required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify admin
    const { data: isAdmin } = await supabase.rpc('is_admin_wallet', { wallet_addr: adminWallet })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { requestId, email } = await req.json()
    if (!requestId || !email) {
      return new Response(JSON.stringify({ error: 'requestId and email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Basic email validation
    const emailStr = String(email).trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailStr) || emailStr.length > 254) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check for disposable email addresses
    if (isDisposableEmail(emailStr)) {
      console.warn('Disposable email rejected:', emailStr)
      return new Response(JSON.stringify({ error: getDisposableEmailError() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the request to extract wallet_address
    const { data: request, error: fetchErr } = await supabase
      .from('whitelist_requests')
      .select('id, wallet_address')
      .eq('id', requestId)
      .single()

    if (fetchErr || !request) {
      return new Response(JSON.stringify({ error: 'Whitelist request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Encrypt email and upsert into encrypted_emails
    const encrypted = await encryptEmail(emailStr)

    // Try update first
    const { error: updateErr, count } = await supabase
      .from('encrypted_emails')
      .update({ encrypted_email: encrypted })
      .eq('wallet_address', request.wallet_address.toLowerCase())
      .select('id', { count: 'exact', head: true })

    if (updateErr) {
      console.warn('Update encrypted_emails failed, will try insert:', updateErr)
    }

    if (!count || count === 0) {
      const { error: insertErr } = await supabase.from('encrypted_emails').insert({
        wallet_address: request.wallet_address.toLowerCase(),
        encrypted_email: encrypted,
      })
      if (insertErr) {
        return new Response(JSON.stringify({ error: 'Failed to store encrypted email' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Log admin action
    await supabase.from('admin_actions').insert({
      action_type: 'admin_set_whitelist_email',
      wallet_address: adminWallet.toLowerCase(),
      details: {
        request_id: requestId,
        target_wallet: request.wallet_address,
        timestamp: new Date().toISOString(),
      },
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error in set-whitelist-email:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
