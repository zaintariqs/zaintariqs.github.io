import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PKRSC_CONTRACT_ADDRESS = '0x52c49c498150e5e9C7dECC70e24A6bD791cf7F76';
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

interface TokenHolder {
  address: string;
  balance: string;
  balanceFormatted: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get wallet address from request
    const { walletAddress } = await req.json();
    
    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }

    // Verify admin status
    const { data: isAdmin } = await supabase.rpc('is_admin_wallet', {
      wallet_addr: walletAddress
    });

    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    console.log('Fetching token holders for PKRSC contract:', PKRSC_CONTRACT_ADDRESS);

    // Get the current block number
    const blockResponse = await fetch(BASE_SEPOLIA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    
    const blockData = await blockResponse.json();
    const currentBlock = parseInt(blockData.result, 16);
    console.log('Current block:', currentBlock);

    // Fetch Transfer events to get all addresses that have interacted with the token
    const logsResponse = await fetch(BASE_SEPOLIA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          fromBlock: '0x0',
          toBlock: 'latest',
          address: PKRSC_CONTRACT_ADDRESS,
          topics: [TRANSFER_EVENT_SIGNATURE]
        }],
        id: 2
      })
    });

    const logsData = await logsResponse.json();
    console.log('Transfer events found:', logsData.result?.length || 0);

    // Extract unique addresses from Transfer events
    const addressSet = new Set<string>();
    
    if (logsData.result) {
      for (const log of logsData.result) {
        // Topics: [0] = event signature, [1] = from, [2] = to
        if (log.topics[1]) {
          const from = '0x' + log.topics[1].slice(26); // Remove padding
          addressSet.add(from.toLowerCase());
        }
        if (log.topics[2]) {
          const to = '0x' + log.topics[2].slice(26);
          addressSet.add(to.toLowerCase());
        }
      }
    }

    // Remove zero address
    addressSet.delete('0x0000000000000000000000000000000000000000');
    
    console.log('Unique addresses found:', addressSet.size);

    // Fetch balance for each address
    const holders: TokenHolder[] = [];
    
    for (const address of addressSet) {
      try {
        const balanceResponse = await fetch(BASE_SEPOLIA_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: PKRSC_CONTRACT_ADDRESS,
              data: '0x70a08231' + address.slice(2).padStart(64, '0') // balanceOf(address)
            }, 'latest'],
            id: 3
          })
        });

        const balanceData = await balanceResponse.json();
        
        if (balanceData.result) {
          const balanceWei = BigInt(balanceData.result);
          
          // Only include addresses with non-zero balance
          if (balanceWei > 0n) {
            const balanceFormatted = (Number(balanceWei) / 1e18).toFixed(2);
            
            holders.push({
              address: address,
              balance: balanceWei.toString(),
              balanceFormatted: balanceFormatted
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching balance for ${address}:`, error);
      }
    }

    // Sort by balance descending
    holders.sort((a, b) => {
      const balanceA = BigInt(a.balance);
      const balanceB = BigInt(b.balance);
      return balanceA > balanceB ? -1 : balanceA < balanceB ? 1 : 0;
    });

    console.log('Token holders with balance:', holders.length);

    return new Response(
      JSON.stringify({ holders }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in get-token-holders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
