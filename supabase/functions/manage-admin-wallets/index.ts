import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, responseHeaders } from '../_shared/cors.ts'

interface AdminManagementRequest {
  requestingWallet: string;
  targetWallet: string;
  action: 'add' | 'revoke';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { requestingWallet, targetWallet, action }: AdminManagementRequest = await req.json()

    // Validate input
    if (!requestingWallet || !targetWallet || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: responseHeaders }
      )
    }

    if (!['add', 'revoke'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "add" or "revoke"' }),
        { status: 400, headers: responseHeaders }
      )
    }

    // Verify requesting user is an admin
    const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin_wallet', {
      wallet_addr: requestingWallet
    })

    if (adminCheckError || !isAdmin) {
      console.error('Unauthorized admin management attempt:', requestingWallet)
      await supabase.from('admin_actions').insert({
        wallet_address: requestingWallet,
        action_type: 'UNAUTHORIZED_ADMIN_MANAGEMENT_ATTEMPT',
        details: { targetWallet, action, error: 'Unauthorized' }
      })
      
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: responseHeaders }
      )
    }

    console.log(`Admin ${requestingWallet} attempting to ${action} admin privileges for ${targetWallet}`)

    let result;
    if (action === 'add') {
      // Add new admin wallet
      const { data: existingAdmin } = await supabase
        .from('admin_wallets')
        .select('*')
        .eq('wallet_address', targetWallet.toLowerCase())
        .single()

      if (existingAdmin) {
        if (existingAdmin.is_active) {
          return new Response(
            JSON.stringify({ error: 'This wallet is already an admin' }),
            { status: 400, headers: responseHeaders }
          )
        } else {
          // Reactivate deactivated admin
          const { data, error } = await supabase
            .from('admin_wallets')
            .update({ is_active: true })
            .eq('wallet_address', targetWallet.toLowerCase())
            .select()
            .single()

          if (error) throw error
          result = data
        }
      } else {
        // Insert new admin
        const { data, error } = await supabase
          .from('admin_wallets')
          .insert({
            wallet_address: targetWallet.toLowerCase(),
            is_active: true,
            added_by: null // Could link to auth.users if authentication is implemented
          })
          .select()
          .single()

        if (error) throw error
        result = data
      }
    } else {
      // Revoke admin access
      const { data, error } = await supabase
        .from('admin_wallets')
        .update({ is_active: false })
        .eq('wallet_address', targetWallet.toLowerCase())
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Admin wallet not found' }),
            { status: 404, headers: responseHeaders }
          )
        }
        throw error
      }
      result = data
    }

    // Log admin action
    await supabase.from('admin_actions').insert({
      wallet_address: requestingWallet,
      action_type: action === 'add' ? 'ADD_ADMIN' : 'REVOKE_ADMIN',
      details: {
        targetWallet,
        timestamp: new Date().toISOString(),
        success: true
      }
    })

    console.log(`Admin ${action} successful for ${targetWallet} by ${requestingWallet}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Admin privileges ${action === 'add' ? 'granted to' : 'revoked from'} ${targetWallet}`,
        result 
      }),
      { headers: responseHeaders }
    )

  } catch (error) {
    console.error('Error in manage-admin-wallets function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: responseHeaders }
    )
  }
})