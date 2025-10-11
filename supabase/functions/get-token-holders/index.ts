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

// Optional BaseScan API key for reliable holder lookup
const BASESCAN_API_KEY = Deno.env.get('BASESCAN_API_KEY');

// Calculate burned tokens by querying zero address balance
async function calculateBurnedTokens(decimals: number): Promise<string> {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const divisor = Math.pow(10, decimals);
  
  try {
    console.log('Fetching burned tokens from zero address balance...');
    
    // Query the zero address balance directly - much faster than scanning all events
    const balanceData = await rpcFetch('eth_call', [{
      to: PKRSC_CONTRACT_ADDRESS,
      data: '0x70a08231' + ZERO_ADDRESS.slice(2).padStart(64, '0') // balanceOf(0x000...000)
    }, 'latest']);
    
    if (balanceData.result) {
      const balanceWei = BigInt(balanceData.result);
      const burnedFormatted = (Number(balanceWei) / divisor).toFixed(2);
      console.log('Total burned tokens:', burnedFormatted);
      return burnedFormatted;
    }
  } catch (e) {
    console.warn('Failed to fetch burned tokens:', e);
  }
  
  return '0.00';
}

async function fetchHoldersFromBaseScan(decimals: number): Promise<TokenHolder[]> {
  if (!BASESCAN_API_KEY) return [];
  const url = `https://api.basescan.org/api?module=token&action=tokenholderlist&contractaddress=${PKRSC_CONTRACT_ADDRESS}&page=1&offset=200&apikey=${BASESCAN_API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();

  // Try tokenholderlist first
  if (json.status === '1' && Array.isArray(json.result) && json.result.length > 0) {
    const divisor = Math.pow(10, decimals);
    const holders: TokenHolder[] = json.result
      .map((r: any) => ({
        address: (r.TokenHolderAddress || r.holderAddress || '').toLowerCase(),
        raw: r.TokenHolderQuantity || r.tokenHolderQuantity || r.balance || '0',
      }))
      .filter((r: any) => r.address && r.raw)
      .map((r: any) => {
        const raw = BigInt(r.raw);
        return {
          address: r.address,
          balance: raw.toString(),
          balanceFormatted: (Number(raw) / divisor).toFixed(2),
        } as TokenHolder;
      })
      .filter((h) => Number(h.balance) > 0)
      .sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));
    return holders;
  }

  // Fallback: build holders from BaseScan transaction list (tokentx)
  const addrSet = new Set<string>();
  for (let page = 1; page <= 3; page++) {
    const txUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${PKRSC_CONTRACT_ADDRESS}&page=${page}&offset=100&sort=asc&apikey=${BASESCAN_API_KEY}`;
    const txRes = await fetch(txUrl);
    const txJson = await txRes.json();
    if (txJson.status !== '1' || !Array.isArray(txJson.result)) break;
    for (const t of txJson.result) {
      if (t.from) addrSet.add(String(t.from).toLowerCase());
      if (t.to) addrSet.add(String(t.to).toLowerCase());
    }
    if (txJson.result.length < 100) break; // no more pages
  }
  // Remove zero address
  addrSet.delete('0x0000000000000000000000000000000000000000');

  const divisor = Math.pow(10, decimals);
  const holders: TokenHolder[] = [];
  for (const a of addrSet) {
    const balUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${PKRSC_CONTRACT_ADDRESS}&address=${a}&tag=latest&apikey=${BASESCAN_API_KEY}`;
    const balRes = await fetch(balUrl);
    const balJson = await balRes.json();
    if (balJson.status === '1' && balJson.result) {
      const raw = BigInt(balJson.result);
      if (raw > 0n) {
        holders.push({
          address: a,
          balance: raw.toString(),
          balanceFormatted: (Number(raw) / divisor).toFixed(2),
        });
      }
    }
  }

  holders.sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));
  return holders;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get wallet address from request
    const { walletAddress } = await req.json();
    
    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }

    // Verify admin status strictly via wallet, no JWT required
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

    // Try BaseScan first for fast and reliable results
    try {
      const bsHolders = await fetchHoldersFromBaseScan(decimals);
      if (bsHolders.length > 0) {
        console.log('Returning holders from BaseScan:', bsHolders.length);
        
        // Calculate metrics even when using BaseScan data
        const metrics = { totalMinted: '0', burned: '0', treasury: '0' };
        
        // Get totalSupply from contract
        try {
          const totalSupplyData = await rpcFetch('eth_call', [{
            to: PKRSC_CONTRACT_ADDRESS,
            data: '0x18160ddd' // totalSupply()
          }, 'latest']);
          
          if (totalSupplyData.result) {
            const totalSupplyWei = BigInt(totalSupplyData.result);
            metrics.totalMinted = (Number(totalSupplyWei) / divisor).toFixed(2);
          }
        } catch (e) {
          console.warn('Failed to fetch totalSupply:', e);
        }

        // Calculate burned tokens from Transfer events to zero address
        try {
          metrics.burned = await calculateBurnedTokens(decimals);
        } catch (e) {
          console.warn('Failed to calculate burned tokens:', e);
        }

        // Find treasury wallet (largest holder excluding burn/zero addresses)
        const treasuryHolder = bsHolders.find(h => 
          h.address.toLowerCase() !== '0x0000000000000000000000000000000000000000' &&
          h.address.toLowerCase() !== '0x000000000000000000000000000000000000dead'
        );
        
        if (treasuryHolder) {
          metrics.treasury = treasuryHolder.balanceFormatted;
        }
        
        return new Response(
          JSON.stringify({ holders: bsHolders, metrics }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    } catch (e) {
      console.warn('BaseScan primary fetch failed:', e instanceof Error ? e.message : String(e));
    }

    // If BaseScan failed, return empty data with metrics instead of scanning entire chain
    console.log('BaseScan unavailable, returning metrics only from contract state');
    let holders: TokenHolder[] = [];

    // Calculate metrics: totalMinted, burned, treasury
    const metrics = { totalMinted: '0', burned: '0', treasury: '0' };
    
    // Get totalSupply from contract
    try {
      const totalSupplyData = await rpcFetch('eth_call', [{
        to: PKRSC_CONTRACT_ADDRESS,
        data: '0x18160ddd' // totalSupply()
      }, 'latest']);
      
      if (totalSupplyData.result) {
        const totalSupplyWei = BigInt(totalSupplyData.result);
        metrics.totalMinted = (Number(totalSupplyWei) / divisor).toFixed(2);
      }
    } catch (e) {
      console.warn('Failed to fetch totalSupply:', e);
    }

    // Calculate burned tokens from Transfer events to zero address
    try {
      metrics.burned = await calculateBurnedTokens(decimals);
    } catch (e) {
      console.warn('Failed to calculate burned tokens:', e);
    }

    // Find treasury wallet (largest holder excluding zero/burn addresses)
    const treasuryHolder = holders.find(h => 
      h.address.toLowerCase() !== '0x0000000000000000000000000000000000000000' &&
      h.address.toLowerCase() !== '0x000000000000000000000000000000000000dead'
    );
    
    if (treasuryHolder) {
      metrics.treasury = treasuryHolder.balanceFormatted;
    }

    return new Response(
      JSON.stringify({ holders, metrics }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in get-token-holders:', error);
    return new Response(
      JSON.stringify({ 
        holders: [], 
        metrics: { totalMinted: '0', burned: '0', treasury: '0' },
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});
