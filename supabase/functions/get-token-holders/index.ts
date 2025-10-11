import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PKRSC_CONTRACT_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e';
const BASE_RPCS = [
  'https://mainnet.base.org',
  'https://base.llamarpc.com',
  'https://base-rpc.publicnode.com'
];

const rpcHeaders = { 'Content-Type': 'application/json' } as const;

async function rpcFetch(method: string, params: any[], attempt = 0): Promise<any> {
  for (const rpc of BASE_RPCS) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: rpcHeaders,
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() })
      });
      const json = await res.json();
      if (json.error) throw Object.assign(new Error(json.error.message || 'RPC error'), { code: json.error.code, info: json.error });
      return json;
    } catch (e: any) {
      console.warn(`RPC ${rpc} failed for ${method}:`, e?.code || e?.message || e);
      continue; // try next endpoint
    }
  }
  if (attempt < 2) {
    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    return rpcFetch(method, params, attempt + 1);
  }
  throw new Error(`All RPC endpoints failed for ${method}`);
}

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

    // First verify the contract exists
    const codeData = await rpcFetch('eth_getCode', [PKRSC_CONTRACT_ADDRESS, 'latest']);
    if (!codeData.result || codeData.result === '0x' || codeData.result === '0x0') {
      console.error('Contract not found at address:', PKRSC_CONTRACT_ADDRESS);
      throw new Error('Contract not deployed at this address on Base mainnet');
    }
    console.log('Contract verified at address');

    // Discover token decimals
    let decimals = 6;
    try {
      const decRes = await rpcFetch('eth_call', [{ to: PKRSC_CONTRACT_ADDRESS, data: '0x313ce567' }, 'latest']);
      if (decRes.result) {
        decimals = parseInt(decRes.result, 16) || 6;
      }
      console.log('Token decimals:', decimals);
    } catch (e) {
      console.warn('Failed to fetch decimals, defaulting to 6');
    }
    const divisor = Math.pow(10, decimals);

    // Get the current block number
    const blockData = await rpcFetch('eth_blockNumber', []);
    const currentBlock = parseInt(blockData.result, 16);
    console.log('Current block:', currentBlock);

    // Scan Transfer logs across the entire chain in safe chunks to avoid RPC limits
    const CHUNK_SIZE = 200000;
    const combinedLogs: any[] = [];
    console.log(`Scanning logs in chunks of ${CHUNK_SIZE} blocks...`);

    for (let start = 0; start <= currentBlock; start += CHUNK_SIZE) {
      const end = Math.min(currentBlock, start + CHUNK_SIZE - 1);
      const fetchRange = async (from: number, to: number) => {
        return rpcFetch('eth_getLogs', [{
          fromBlock: '0x' + from.toString(16),
          toBlock: '0x' + to.toString(16),
          address: PKRSC_CONTRACT_ADDRESS,
          topics: [TRANSFER_EVENT_SIGNATURE]
        }]);
      };

      let data = await fetchRange(start, end);

      // If too many results / rate limited, split into smaller sub-chunks
      if (data?.error && (data.error.code === -32005 || String(data.error.message || '').toLowerCase().includes('limit'))) {
        const SUB = Math.max(20000, Math.floor(CHUNK_SIZE / 10));
        for (let subStart = start; subStart <= end; subStart += SUB) {
          const subEnd = Math.min(end, subStart + SUB - 1);
          const subData = await fetchRange(subStart, subEnd);
          if (subData?.result) combinedLogs.push(...subData.result);
        }
      } else if (Array.isArray(data?.result)) {
        combinedLogs.push(...data.result);
      } else if (data?.error) {
        console.warn('RPC error fetching logs chunk:', data.error);
      }
    }

    console.log('Total Transfer events found:', combinedLogs.length);
    const logsData = { result: combinedLogs };

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
    let holders: TokenHolder[] = [];
    
    for (const address of addressSet) {
      try {
        const balanceData = await rpcFetch('eth_call', [{
          to: PKRSC_CONTRACT_ADDRESS,
          data: '0x70a08231' + address.slice(2).padStart(64, '0') // balanceOf(address)
        }, 'latest']);
        
        if (balanceData.result) {
          const balanceWei = BigInt(balanceData.result);
          
          // Only include addresses with non-zero balance
          if (balanceWei > 0n) {
            const balanceFormatted = (Number(balanceWei) / divisor).toFixed(2);
            
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

    // Fallback: BaseScan API if available and no holders from RPC
    try {
      const apiKey = Deno.env.get('BASESCAN_API_KEY');
      if (holders.length === 0 && apiKey) {
        const bsHolders = await fetchHoldersFromBaseScan(decimals);
        if (bsHolders.length > 0) {
          holders = bsHolders;
          console.log('BaseScan fallback holders:', holders.length);
        }
      }
    } catch (e) {
      console.warn('BaseScan fallback failed:', e instanceof Error ? e.message : String(e));
    }

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
      JSON.stringify({ holders: [], error: error instanceof Error ? error.message : String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});
