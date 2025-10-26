import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const walletAddress = req.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify admin status
    const { data: adminData, error: adminError } = await supabase
      .from('admin_wallets')
      .select('is_active')
      .ilike('wallet_address', walletAddress)
      .eq('is_active', true)
      .maybeSingle();

    if (adminError || !adminData) {
      console.warn('Non-admin attempted to access treasury stats:', walletAddress);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log(`Admin ${walletAddress} fetching V2 treasury stats`);

    // Get total PKRSC minted (from completed v2_deposits)
    const { data: mintedData } = await supabase
      .from('v2_deposits')
      .select('expected_pkr_amount')
      .eq('status', 'completed');

    const totalMinted = mintedData?.reduce((sum, d) => sum + parseFloat(d.expected_pkr_amount), 0) || 0;

    // Get total PKRSC burned (from burn_operations linked to v2 deposits)
    const { data: burnedData } = await supabase
      .from('burn_operations')
      .select('burn_amount');

    const totalBurned = burnedData?.reduce((sum, b) => sum + parseFloat(b.burn_amount), 0) || 0;

    // Get total exchanges executed (completed v2_deposits count)
    const { count: totalExchanges } = await supabase
      .from('v2_deposits')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // Get total fees accumulated from v2_deposit transactions
    const { data: feesData } = await supabase
      .from('transaction_fees')
      .select('fee_amount')
      .eq('transaction_type', 'v2_deposit');

    const totalFees = feesData?.reduce((sum, f) => sum + parseFloat(f.fee_amount), 0) || 0;

    // Get pending deposits
    const { count: pendingDeposits } = await supabase
      .from('v2_deposits')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed']);

    // Get pending redemptions (bank transfers)
    const { count: pendingRedemptions } = await supabase
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'burn_confirmed');

    // Get recent deposits (last 10)
    const { data: recentDeposits } = await supabase
      .from('v2_deposits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent redemptions (last 10)
    const { data: recentRedemptions } = await supabase
      .from('redemptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const stats = {
      totalMinted: totalMinted.toFixed(2),
      totalBurned: totalBurned.toFixed(2),
      totalExchanges: totalExchanges || 0,
      totalFees: totalFees.toFixed(2),
      pendingDeposits: pendingDeposits || 0,
      pendingRedemptions: pendingRedemptions || 0,
      recentDeposits: recentDeposits || [],
      recentRedemptions: recentRedemptions || []
    };

    // Log admin action
    await supabase.from('admin_actions').insert({
      action_type: 'admin_viewed_v2_treasury_stats',
      wallet_address: walletAddress.toLowerCase(),
      details: { 
        timestamp: new Date().toISOString(),
        stats
      }
    });

    return new Response(
      JSON.stringify({ success: true, data: stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
