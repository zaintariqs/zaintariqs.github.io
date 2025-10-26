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

    const { usdtAmount, pkrAmount, exchangeRate, bankDetails } = await req.json();

    console.log('Generating deposit address for wallet:', walletAddress);

    // For now, using a master deposit address - in production, you'd generate unique addresses
    // or use a payment processor that provides unique deposit addresses
    const masterDepositAddress = '0x1234567890123456789012345678901234567890'; // Replace with actual master wallet

    // Create a deposit record with bank details
    const { data: deposit, error } = await supabase
      .from('v2_deposits')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        usdt_amount: usdtAmount,
        expected_pkr_amount: pkrAmount,
        exchange_rate_at_creation: exchangeRate,
        deposit_address: masterDepositAddress,
        status: 'pending',
        chain: 'base',
        bank_name: bankDetails?.bank,
        account_number: bankDetails?.iban,
        account_title: bankDetails?.accountHolderName
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating deposit:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create deposit record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Deposit created:', deposit.id);

    return new Response(
      JSON.stringify({
        success: true,
        depositId: deposit.id,
        depositAddress: masterDepositAddress,
        usdtAmount,
        pkrAmount,
        exchangeRate,
        chain: 'base',
        chainId: 8453 // Base mainnet
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
