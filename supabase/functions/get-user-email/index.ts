import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { corsHeaders, responseHeaders } from '../_shared/cors.ts'
import { decryptEmail } from '../_shared/email-encryption.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { walletAddress } = await req.json()

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: responseHeaders }
      )
    }

    // Fetch encrypted email from database
    const { data: emailData, error: emailError } = await supabase
      .from('encrypted_emails')
      .select('encrypted_email')
      .ilike('wallet_address', walletAddress)
      .maybeSingle()

    if (emailError) {
      console.error('Error fetching email:', emailError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch email' }),
        { status: 500, headers: responseHeaders }
      )
    }

    if (!emailData) {
      return new Response(
        JSON.stringify({ email: null }),
        { status: 200, headers: responseHeaders }
      )
    }

    // Decrypt email
    const decryptedEmail = await decryptEmail(emailData.encrypted_email)

    return new Response(
      JSON.stringify({ email: decryptedEmail }),
      { status: 200, headers: responseHeaders }
    )
  } catch (error) {
    console.error('Error in get-user-email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: responseHeaders }
    )
  }
})
