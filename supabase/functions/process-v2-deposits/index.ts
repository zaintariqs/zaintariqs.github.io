import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PKRSC_CONTRACT_ADDRESS = '0x3C63ff7e7fCC0033728AE5E001B2d7eE7C1C4498';
const BASE_RPC_URL = 'https://mainnet.base.org';
const MINT_FEE_PERCENTAGE = 0.25; // 0.25% fee

const PKRSC_ABI = [
  'function mint(address to, uint256 amount) external returns (bool)',
  'function decimals() view returns (uint8)'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const masterMinterKey = Deno.env.get('MASTER_MINTER_PRIVATE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing confirmed V2 deposits...');

    // Find deposits that are confirmed but not yet completed
    const { data: deposits, error: fetchError } = await supabase
      .from('v2_deposits')
      .select('*')
      .eq('status', 'confirmed')
      .is('transaction_hash', null)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching deposits:', fetchError);
      throw fetchError;
    }

    if (!deposits || deposits.length === 0) {
      console.log('No deposits to process');
      return new Response(
        JSON.stringify({ success: true, message: 'No deposits to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${deposits.length} deposits to process`);

    // Connect to Base network
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const wallet = new ethers.Wallet(masterMinterKey, provider);
    const pkrscContract = new ethers.Contract(PKRSC_CONTRACT_ADDRESS, PKRSC_ABI, wallet);

    const results = [];

    for (const deposit of deposits) {
      try {
        console.log(`Processing deposit ${deposit.id} for ${deposit.wallet_address}`);

        // Calculate net PKRSC amount after 0.25% mint fee
        const grossAmount = parseFloat(deposit.expected_pkr_amount);
        const feeAmount = grossAmount * (MINT_FEE_PERCENTAGE / 100);
        const netAmount = grossAmount - feeAmount;

        console.log(`Gross: ${grossAmount}, Fee (0.25%): ${feeAmount}, Net: ${netAmount}`);

        // Convert to token units (6 decimals for PKRSC)
        const amountInUnits = ethers.parseUnits(netAmount.toFixed(6), 6);

        // Mint PKRSC tokens
        console.log(`Minting ${netAmount} PKRSC to ${deposit.wallet_address}`);
        const tx = await pkrscContract.mint(deposit.wallet_address, amountInUnits);
        console.log(`Mint transaction sent: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`Mint transaction confirmed in block ${receipt.blockNumber}`);

        // Update deposit record
        const { error: updateError } = await supabase
          .from('v2_deposits')
          .update({
            status: 'completed',
            transaction_hash: tx.hash,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', deposit.id);

        if (updateError) {
          console.error(`Error updating deposit ${deposit.id}:`, updateError);
          results.push({
            depositId: deposit.id,
            success: false,
            error: updateError.message
          });
        } else {
          // Record transaction fee
          await supabase
            .from('transaction_fees')
            .insert({
              transaction_id: deposit.id,
              transaction_type: 'v2_deposit',
              user_id: deposit.wallet_address,
              original_amount: grossAmount,
              fee_percentage: MINT_FEE_PERCENTAGE,
              fee_amount: feeAmount,
              net_amount: netAmount
            });

          results.push({
            depositId: deposit.id,
            success: true,
            txHash: tx.hash,
            grossAmount,
            feeAmount,
            netAmount
          });
        }

      } catch (error) {
        console.error(`Error processing deposit ${deposit.id}:`, error);
        
        // Update deposit with error status
        await supabase
          .from('v2_deposits')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', deposit.id);

        results.push({
          depositId: deposit.id,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Processed ${successCount}/${results.length} deposits successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: successCount,
        failed: results.length - successCount,
        results
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
