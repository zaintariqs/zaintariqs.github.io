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

    console.log('Fetching redemptions for wallet:', walletAddress);

    // Fetch user's redemptions with burn operations
    const { data: redemptions, error } = await supabase
      .from('redemptions')
      .select(`
        *,
        burn_operations (
          burn_tx_hash,
          burn_amount,
          created_at,
          status
        )
      `)
      .eq('user_id', walletAddress.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching redemptions:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch redemptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Mask sensitive bank details for security
    const maskedRedemptions = redemptions?.map(redemption => ({
      id: redemption.id,
      pkrsc_amount: redemption.pkrsc_amount,
      desired_pkr_amount: redemption.desired_pkr_amount,
      status: redemption.status,
      bank_name: redemption.bank_name,
      account_number: redemption.account_number ? `****${redemption.account_number.slice(-4)}` : null,
      account_title: redemption.account_title,
      transaction_hash: redemption.transaction_hash,
      bank_transaction_id: redemption.bank_transaction_id,
      created_at: redemption.created_at,
      updated_at: redemption.updated_at,
      burn_operations: redemption.burn_operations
    }));

    console.log(`Found ${maskedRedemptions?.length || 0} redemptions`);

    return new Response(
      JSON.stringify({
        success: true,
        redemptions: maskedRedemptions || []
      }),
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
