import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/[email protected]';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// USDT contract address on Base mainnet
const USDT_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_RPC_URL = 'https://mainnet.base.org';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { depositId } = await req.json();

    console.log('Checking deposit status for:', depositId);

    // Get deposit details
    const { data: deposit, error } = await supabase
      .from('v2_deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (error || !deposit) {
      return new Response(
        JSON.stringify({ error: 'Deposit not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check blockchain for transactions to the deposit address
    // This is a simplified version - in production, use a proper indexer or blockchain API
    const response = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          fromBlock: 'latest',
          toBlock: 'latest',
          address: USDT_BASE_ADDRESS,
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event
            null,
            '0x' + deposit.deposit_address.slice(2).padStart(64, '0') // to address
          ]
        }],
        id: 1
      })
    });

    const rpcData = await response.json();
    console.log('Blockchain query result:', rpcData);

    return new Response(
      JSON.stringify({
        success: true,
        deposit,
        hasDeposit: rpcData.result && rpcData.result.length > 0,
        transactions: rpcData.result || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error monitoring deposit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
