import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
};

const USDT_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_RPC_URL = 'https://mainnet.base.org';
const REQUIRED_CONFIRMATIONS = 3;

const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function decimals() view returns (uint8)'
];

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

    const { depositId } = await req.json();

    if (!depositId) {
      return new Response(
        JSON.stringify({ error: 'Deposit ID required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Checking deposit ${depositId} for wallet ${walletAddress}`);

    // Fetch deposit details
    const { data: deposit, error: fetchError } = await supabase
      .from('v2_deposits')
      .select('*')
      .eq('id', depositId)
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (fetchError || !deposit) {
      return new Response(
        JSON.stringify({ error: 'Deposit not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (deposit.status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Deposit already completed',
          deposit 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Connect to Base network
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const currentBlock = await provider.getBlockNumber();
    
    console.log(`Current block: ${currentBlock}`);
    console.log(`Searching for USDT transfers to: ${deposit.deposit_address}`);

    // Search for USDT transfer events
    const usdtContract = new ethers.Contract(USDT_BASE_ADDRESS, ERC20_ABI, provider);
    const filter = usdtContract.filters.Transfer(null, deposit.deposit_address);
    
    // Search last 10000 blocks
    const fromBlock = Math.max(currentBlock - 10000, 0);
    const events = await usdtContract.queryFilter(filter, fromBlock, currentBlock);

    console.log(`Found ${events.length} USDT transfer events`);

    if (events.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No USDT transfer found yet',
          deposit 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get the latest transfer event
    const latestEvent = events[events.length - 1];
    const txHash = latestEvent.transactionHash;
    const blockNumber = latestEvent.blockNumber;
    const confirmations = currentBlock - blockNumber;

    console.log(`Found transaction: ${txHash} with ${confirmations} confirmations`);

    // Get transaction details
    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!tx || !receipt) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Decode the transfer amount
    const transferAmount = latestEvent.args![2]; // third argument is the amount
    const amountInUsdt = parseFloat(ethers.formatUnits(transferAmount, 6));

    console.log(`Transfer amount: ${amountInUsdt} USDT`);

    // Update deposit record
    const updateData: any = {
      transaction_hash: txHash,
      confirmations: confirmations,
      updated_at: new Date().toISOString()
    };

    if (confirmations >= REQUIRED_CONFIRMATIONS) {
      updateData.status = 'confirmed';
    }

    const { error: updateError } = await supabase
      .from('v2_deposits')
      .update(updateData)
      .eq('id', depositId);

    if (updateError) {
      console.error('Error updating deposit:', updateError);
      throw updateError;
    }

    // If confirmed, trigger minting process
    if (confirmations >= REQUIRED_CONFIRMATIONS) {
      console.log('Deposit confirmed, triggering mint process...');
      
      // Call process-v2-deposits function to mint tokens
      await supabase.functions.invoke('process-v2-deposits', {
        body: {}
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        txHash,
        confirmations,
        requiredConfirmations: REQUIRED_CONFIRMATIONS,
        confirmed: confirmations >= REQUIRED_CONFIRMATIONS,
        amountUsdt: amountInUsdt,
        message: confirmations >= REQUIRED_CONFIRMATIONS 
          ? 'Deposit confirmed, PKRSC minting in progress' 
          : `Waiting for confirmations (${confirmations}/${REQUIRED_CONFIRMATIONS})`
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
