import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';
import { decryptEmail } from '../_shared/email-encryption.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PKRSC_CONTRACT_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e';
const BASE_RPCS = [
  'https://mainnet.base.org',
  'https://base.llamarpc.com',
  'https://base-rpc.publicnode.com',
  'https://1rpc.io/base',
  'https://base.blockpi.network/v1/rpc/public',
  'https://base.meowrpc.com',
  'https://rpc.ankr.com/base',
  'https://endpoints.omniatech.io/v1/base/mainnet/public',
  'https://base.api.onfinality.io/public',
  'https://base.drpc.org'
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
  email?: string;
  label?: string;
  labelType?: string;
}

const LP_PROVIDER_ADDRESS = '0xcfbdcbfd1312a2d85545a88ca95c93c7523dd11b';
const UNISWAP_POOL_ADDRESS = '0x1bc6fb786b7b5ba4d31a7f47a75ec3fd3b26690e';
const MASTER_MINTER_ADDRESS = '0x50c46b0286028c3ab12b947003129feb39ccf082';

// Optional BaseScan API key for reliable holder lookup
const BASESCAN_API_KEY = Deno.env.get('BASESCAN_API_KEY');

// Calculate burned tokens using BaseScan tokentx (sum transfers to zero address)
async function calculateBurnedTokens(decimals: number): Promise<string> {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const divisor = Math.pow(10, decimals);
  if (!BASESCAN_API_KEY) return '0.00';

  try {
    console.log('Calculating burned tokens via BaseScan tokentx...');
    let total = 0n;
    const MAX_PAGES = 10; // safeguard

    for (let page = 1; page <= MAX_PAGES; page++) {
      const txUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${PKRSC_CONTRACT_ADDRESS}&page=${page}&offset=100&sort=asc&apikey=${BASESCAN_API_KEY}`;
      const txRes = await fetch(txUrl);
      const txJson = await txRes.json();
      if (txJson.status !== '1' || !Array.isArray(txJson.result) || txJson.result.length === 0) break;

      for (const t of txJson.result) {
        const to = String(t.to || '').toLowerCase();
        if (to === ZERO_ADDRESS) {
          // Etherscan-style API returns value as decimal string (raw units)
          try {
            const raw = BigInt(t.value || '0');
            total += raw;
          } catch (_) {}
        }
      }
      if (txJson.result.length < 100) break; // no more pages
    }

    const burnedFormatted = (Number(total) / divisor).toFixed(2);
    console.log('Burned (from BaseScan):', burnedFormatted);
    return burnedFormatted;
  } catch (e) {
    console.warn('Failed to calculate burned via BaseScan:', e);
    return '0.00';
  }
}

async function fetchHoldersFromBaseScan(decimals: number): Promise<TokenHolder[]> {
  if (!BASESCAN_API_KEY) {
    console.log('⚠️ No BASESCAN_API_KEY found, skipping BaseScan');
    return [];
  }
  
  console.log('📡 BaseScan API Key present, attempting tokenholderlist...');
  
  // Try tokenholderlist first (most reliable)
  try {
    const url = `https://api.basescan.org/api?module=token&action=tokenholderlist&contractaddress=${PKRSC_CONTRACT_ADDRESS}&page=1&offset=1000&apikey=${BASESCAN_API_KEY}`;
    console.log('📡 Calling BaseScan tokenholderlist endpoint...');
    const res = await fetch(url);
    const json = await res.json();
    
    console.log('📡 BaseScan tokenholderlist response:', {
      status: json.status,
      message: json.message,
      resultCount: Array.isArray(json.result) ? json.result.length : 0
    });

    if (json.status === '1' && Array.isArray(json.result) && json.result.length > 0) {
      const divisor = Math.pow(10, decimals);
      const holders: TokenHolder[] = json.result
        .map((r: any) => {
          const addr = (r.TokenHolderAddress || r.HolderAddress || r.holderAddress || r.TokenHolder || r.address || '').toLowerCase();
          const qtyStr = String(r.TokenHolderQuantity || r.TokenBalance || r.tokenHolderQuantity || r.tokenBalance || r.balance || '0');
          return { addr, qtyStr };
        })
        .filter((r: any) => r.addr && r.addr !== '0x0000000000000000000000000000000000000000' && r.addr !== '0x000000000000000000000000000000000000dead')
        .map((r: any) => {
          let rawWei: bigint;
          if (/^\d+$/.test(r.qtyStr)) {
            rawWei = BigInt(r.qtyStr);
          } else {
            const tokens = parseFloat(r.qtyStr.replace(/,/g, '')) || 0;
            rawWei = BigInt(Math.round(tokens * divisor));
          }
          return {
            address: r.addr,
            balance: rawWei.toString(),
            balanceFormatted: (Number(rawWei) / divisor).toFixed(2),
          } as TokenHolder;
        })
        .filter((h) => Number(h.balance) > 0)
        .sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));
      
      console.log(`✅ BaseScan tokenholderlist returned ${holders.length} holders`);
      return holders;
    } else {
      console.log(`⚠️ BaseScan tokenholderlist failed: status=${json.status}, message=${json.message}`);
    }
  } catch (e) {
    console.warn('❌ tokenholderlist request failed:', e);
  }

  // Fallback: Comprehensive tokentx scan
  console.log('📡 Falling back to tokentx analysis...');
  const addrSet = new Set<string>();
  
  // Scan more pages to catch all holders
  for (let page = 1; page <= 10; page++) {
    try {
      const txUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${PKRSC_CONTRACT_ADDRESS}&page=${page}&offset=100&sort=asc&apikey=${BASESCAN_API_KEY}`;
      const txRes = await fetch(txUrl);
      const txJson = await txRes.json();
      
      console.log(`📡 tokentx page ${page}: status=${txJson.status}, results=${Array.isArray(txJson.result) ? txJson.result.length : 0}`);
      
      if (txJson.status !== '1' || !Array.isArray(txJson.result) || txJson.result.length === 0) {
        if (page === 1) {
          console.log(`⚠️ tokentx page 1 failed: status=${txJson.status}, message=${txJson.message}`);
        }
        break;
      }
      
      for (const t of txJson.result) {
        if (t.from) addrSet.add(String(t.from).toLowerCase());
        if (t.to) addrSet.add(String(t.to).toLowerCase());
      }
      
      if (txJson.result.length < 100) break;
    } catch (e) {
      console.warn(`tokentx page ${page} failed:`, e);
      break;
    }
  }
  
  // Remove zero addresses
  addrSet.delete('0x0000000000000000000000000000000000000000');
  addrSet.delete('0x000000000000000000000000000000000000dead');
  
  console.log(`Found ${addrSet.size} unique addresses from tokentx, checking balances...`);
  
  const divisor = Math.pow(10, decimals);
  const holders: TokenHolder[] = [];
  
  for (const a of addrSet) {
    try {
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
    } catch (e) {
      console.warn(`Balance check failed for ${a}:`, e);
    }
  }

  holders.sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));
  console.log(`Built ${holders.length} holders from tokentx fallback`);
  return holders;
}

// Fallback using on-chain logs if BaseScan fails or is incomplete
async function fetchHoldersFromRpcLogs(decimals: number): Promise<TokenHolder[]> {
  try {
    console.log('🔎 Scanning RPC logs for Transfer events...');
    const latest = await rpcFetch('eth_blockNumber', []);
    const latestNum = parseInt(latest.result, 16);
    const step = 50_000;
    const span = 1_000_000; // last ~1M blocks
    const start = Math.max(0, latestNum - span);

    const addrSet = new Set<string>();

    for (let from = start; from <= latestNum; from += step) {
      const to = Math.min(latestNum, from + step - 1);
      try {
        const logs = await rpcFetch('eth_getLogs', [{
          address: PKRSC_CONTRACT_ADDRESS,
          fromBlock: '0x' + from.toString(16),
          toBlock: '0x' + to.toString(16),
          topics: [TRANSFER_EVENT_SIGNATURE]
        }]);

        if (Array.isArray(logs.result)) {
          for (const l of logs.result) {
            const topics: string[] = l.topics || [];
            if (topics.length >= 3) {
              const fromAddr = ('0x' + topics[1].slice(26)).toLowerCase();
              const toAddr = ('0x' + topics[2].slice(26)).toLowerCase();
              if (fromAddr !== '0x0000000000000000000000000000000000000000') addrSet.add(fromAddr);
              if (toAddr !== '0x0000000000000000000000000000000000000000' && toAddr !== '0x000000000000000000000000000000000000dead') addrSet.add(toAddr);
            }
          }
        }
      } catch (e) {
        console.warn(`eth_getLogs failed for range ${from}-${to}:`, e);
      }
    }

    console.log(`RPC logs discovered ${addrSet.size} candidate addresses`);

    const holders: TokenHolder[] = [];
    const divisor = Math.pow(10, decimals);
    for (const addr of addrSet) {
      try {
        const balRes = await rpcFetch('eth_call', [{
          to: PKRSC_CONTRACT_ADDRESS,
          data: '0x70a08231' + addr.slice(2).padStart(64, '0')
        }, 'latest']);
        if (balRes?.result) {
          const wei = BigInt(balRes.result);
          if (wei > 0n) {
            holders.push({
              address: addr,
              balance: wei.toString(),
              balanceFormatted: (Number(wei) / divisor).toFixed(2)
            });
          }
        }
      } catch (e) {
        console.warn('balanceOf failed for', addr, e);
      }
    }

    holders.sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));
    console.log(`RPC logs built ${holders.length} holders`);
    return holders;
  } catch (e) {
    console.warn('RPC logs fallback failed:', e);
    return [];
  }
}

// Enrich holders array with emails and special address labels from database
async function enrichHoldersWithEmails(supabase: any, holders: TokenHolder[]): Promise<string[]> {
  try {
    const addresses = holders.map(h => h.address.toLowerCase());
    
    // Fetch encrypted emails from encrypted_emails table
    const { data: encryptedEmails } = await supabase
      .from('encrypted_emails')
      .select('wallet_address, encrypted_email')
      .in('wallet_address', addresses);

    // Fetch special addresses from database
    const { data: specialAddresses } = await supabase
      .from('special_addresses')
      .select('address, label, label_type');

    // Create email lookup map
    const emailMap = new Map<string, string>();
    if (encryptedEmails) {
      for (const record of encryptedEmails) {
        if (record.wallet_address && record.encrypted_email) {
          emailMap.set(record.wallet_address.toLowerCase(), record.encrypted_email);
        }
      }
    }

    // Create special addresses lookup map
    const specialAddressMap = new Map<string, { label: string; labelType: string }>();
    const knownSpecialAddresses: string[] = [];
    if (specialAddresses) {
      for (const record of specialAddresses) {
        if (record.address) {
          const addr = record.address.toLowerCase();
          specialAddressMap.set(addr, {
            label: record.label,
            labelType: record.label_type
          });
          knownSpecialAddresses.push(addr);
        }
      }
    }

    // Enrich holders with DECRYPTED emails and special address labels
    for (const holder of holders) {
      const addr = holder.address.toLowerCase();
      const encryptedEmail = emailMap.get(addr);
      
      // Decrypt email if available
      if (encryptedEmail) {
        try {
          holder.email = await decryptEmail(encryptedEmail);
        } catch (e) {
          console.warn(`Failed to decrypt email for ${addr}:`, e);
          holder.email = undefined;
        }
      }
      
      // Apply special address label if exists
      const specialInfo = specialAddressMap.get(addr);
      if (specialInfo) {
        holder.label = specialInfo.label;
        holder.labelType = specialInfo.labelType;
      }
    }

    console.log(`Enriched ${holders.length} holders with decrypted email data and special labels`);
    return knownSpecialAddresses;
  } catch (e) {
    console.warn('Failed to enrich holders with emails:', e);
    return [];
  }
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
        const metrics = { totalMinted: '0', burned: '0', treasury: '0' } as { totalMinted: string; burned: string; treasury: string };
        
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

        // Ensure connected admin wallet is included if it holds tokens
        try {
          if (walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            const balRes = await rpcFetch('eth_call', [{
              to: PKRSC_CONTRACT_ADDRESS,
              data: '0x70a08231' + walletAddress.slice(2).padStart(64, '0')
            }, 'latest']);
            if (balRes.result) {
              const balWei = BigInt(balRes.result);
              if (balWei > 0n && !bsHolders.some(h => h.address.toLowerCase() === walletAddress.toLowerCase())) {
                bsHolders.unshift({
                  address: walletAddress.toLowerCase(),
                  balance: balWei.toString(),
                  balanceFormatted: (Number(balWei) / divisor).toFixed(2)
                });
              }
            }
          }
        } catch (e) {
          console.warn('Failed to include connected wallet balance:', e);
        }

        // Treasury = Master Minter's on-chain balance
        try {
          const { data: masterMinter } = await supabase.rpc('get_master_minter_address');
          if (masterMinter && /^0x[a-fA-F0-9]{40}$/.test(masterMinter)) {
            const mmLower = masterMinter.toLowerCase();
            const found = bsHolders.find(h => h.address.toLowerCase() === mmLower);
            if (found) {
              metrics.treasury = found.balanceFormatted;
            } else {
              const mmBal = await rpcFetch('eth_call', [{
                to: PKRSC_CONTRACT_ADDRESS,
                data: '0x70a08231' + mmLower.slice(2).padStart(64, '0')
              }, 'latest']);
              if (mmBal?.result) {
                const wei = BigInt(mmBal.result);
                metrics.treasury = (Number(wei) / divisor).toFixed(2);
                if (wei > 0n) {
                  bsHolders.unshift({ address: mmLower, balance: wei.toString(), balanceFormatted: metrics.treasury });
                }
              }
            }
          }
        } catch (e) {
          console.warn('Failed to compute treasury (master minter balance):', e);
        }

        // If BaseScan returned too few holders, enrich with RPC logs
        let holdersArr = bsHolders;
        if (holdersArr.length < 5) {
          console.log('Enriching holders via RPC logs fallback...');
          const rpcHolders = await fetchHoldersFromRpcLogs(decimals);
          const map = new Map<string, TokenHolder>();
          for (const h of [...holdersArr, ...rpcHolders]) {
            const key = h.address.toLowerCase();
            if (!map.has(key)) map.set(key, h);
          }
          holdersArr = Array.from(map.values()).sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));
          console.log('Merged holders count:', holdersArr.length);
        }

        // Always ensure special addresses from DB are included
        let knownSpecialAddresses: string[] = [];
        try {
          knownSpecialAddresses = await enrichHoldersWithEmails(supabase, holdersArr);
          
          // Check and add any missing special addresses
          for (const specialAddr of knownSpecialAddresses) {
            const exists = holdersArr.find(h => h.address.toLowerCase() === specialAddr);
            if (!exists) {
              let wei = 0n;
              try {
                const bal = await rpcFetch('eth_call', [{
                  to: PKRSC_CONTRACT_ADDRESS,
                  data: '0x70a08231' + specialAddr.slice(2).padStart(64, '0')
                }, 'latest']);
                if (bal?.result) {
                  wei = BigInt(bal.result);
                }
              } catch (e) {
                console.warn('Special address balance fetch failed:', specialAddr, e);
              }
              holdersArr.push({
                address: specialAddr,
                balance: wei.toString(),
                balanceFormatted: (Number(wei) / divisor).toFixed(2)
              });
              console.log('Ensured special address is present:', specialAddr, (Number(wei) / divisor).toFixed(2));
            }
          }
          
          // Re-enrich after adding missing addresses
          await enrichHoldersWithEmails(supabase, holdersArr);
        } catch (e) {
          console.warn('Failed to check special addresses:', e);
        }

        return new Response(
          JSON.stringify({ holders: holdersArr, metrics }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    } catch (e) {
      console.warn('BaseScan primary fetch failed:', e instanceof Error ? e.message : String(e));
    }

    // BaseScan unavailable — build holders from recent DB addresses and compute metrics
    console.log('BaseScan unavailable, building holders from recent DB addresses');
    let holders: TokenHolder[] = [];

    // Gather candidate addresses (recent users + admins + connected wallet)
    const candidateSet = new Set<string>();
    try {
      const [{ data: rds }, { data: deps }, { data: admins }] = await Promise.all([
        supabase.from('redemptions').select('user_id').order('created_at', { ascending: false }).limit(200),
        supabase.from('deposits_public').select('user_id').order('created_at', { ascending: false }).limit(200),
        supabase.from('admin_wallets').select('wallet_address').eq('is_active', true)
      ]);
      (rds || []).forEach((r: any) => r?.user_id && candidateSet.add(String(r.user_id).toLowerCase()));
      (deps || []).forEach((d: any) => d?.user_id && candidateSet.add(String(d.user_id).toLowerCase()));
      (admins || []).forEach((a: any) => a?.wallet_address && candidateSet.add(String(a.wallet_address).toLowerCase()));
    } catch (e) {
      console.warn('DB address collection failed:', e);
    }
    if (walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      candidateSet.add(walletAddress.toLowerCase());
    }
    candidateSet.delete('0x0000000000000000000000000000000000000000');
    candidateSet.delete('0x000000000000000000000000000000000000dead');

    // Query balances via RPC
    for (const addr of candidateSet) {
      try {
        const bal = await rpcFetch('eth_call', [{
          to: PKRSC_CONTRACT_ADDRESS,
          data: '0x70a08231' + addr.slice(2).padStart(64, '0')
        }, 'latest']);
        if (bal?.result) {
          const wei = BigInt(bal.result);
          if (wei > 0n) {
            holders.push({
              address: addr,
              balance: wei.toString(),
              balanceFormatted: (Number(wei) / divisor).toFixed(2)
            });
          }
        }
      } catch (e) {
        console.warn('balanceOf RPC failed for', addr, e);
      }
    }

    holders.sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));

    // Always ensure special addresses from DB are included
    let knownSpecialAddresses: string[] = [];
    try {
      knownSpecialAddresses = await enrichHoldersWithEmails(supabase, holders);
      
      // Check and add any missing special addresses
      for (const specialAddr of knownSpecialAddresses) {
        const exists = holders.find(h => h.address.toLowerCase() === specialAddr);
        if (!exists) {
          let wei = 0n;
          try {
            const bal = await rpcFetch('eth_call', [{
              to: PKRSC_CONTRACT_ADDRESS,
              data: '0x70a08231' + specialAddr.slice(2).padStart(64, '0')
            }, 'latest']);
            if (bal?.result) {
              wei = BigInt(bal.result);
            }
          } catch (e) {
            console.warn('Special address balance fetch failed (fallback):', specialAddr, e);
          }
          holders.push({
            address: specialAddr,
            balance: wei.toString(),
            balanceFormatted: (Number(wei) / divisor).toFixed(2)
          });
          console.log('Ensured special address is present (fallback):', specialAddr, (Number(wei) / divisor).toFixed(2));
        }
      }
      
      // Re-enrich after adding missing addresses
      await enrichHoldersWithEmails(supabase, holders);
    } catch (e) {
      console.warn('Failed to check special addresses (fallback):', e);
    }

    // Compute metrics from contract state + BaseScan burns
    const metrics = { totalMinted: '0', burned: '0', treasury: '0' };
    try {
      const totalSupplyData = await rpcFetch('eth_call', [{ to: PKRSC_CONTRACT_ADDRESS, data: '0x18160ddd' }, 'latest']);
      if (totalSupplyData.result) {
        const totalSupplyWei = BigInt(totalSupplyData.result);
        metrics.totalMinted = (Number(totalSupplyWei) / divisor).toFixed(2);
      }
    } catch (e) {
      console.warn('Failed to fetch totalSupply:', e);
    }
    try {
      metrics.burned = await calculateBurnedTokens(decimals);
    } catch (e) {
      console.warn('Failed to calculate burned tokens:', e);
    }

    // Treasury = Master Minter's on-chain balance (more accurate than guessing top holder)
    try {
      const { data: masterMinter } = await supabase.rpc('get_master_minter_address');
      if (masterMinter && /^0x[a-fA-F0-9]{40}$/.test(masterMinter)) {
        const mmLower = masterMinter.toLowerCase();
        const found = holders.find(h => h.address.toLowerCase() === mmLower);
        if (found) {
          metrics.treasury = found.balanceFormatted;
        } else {
          const mmBal = await rpcFetch('eth_call', [{
            to: PKRSC_CONTRACT_ADDRESS,
            data: '0x70a08231' + mmLower.slice(2).padStart(64, '0')
          }, 'latest']);
          if (mmBal?.result) {
            const wei = BigInt(mmBal.result);
            metrics.treasury = (Number(wei) / divisor).toFixed(2);
            if (wei > 0n) {
              holders.unshift({ address: mmLower, balance: wei.toString(), balanceFormatted: metrics.treasury });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to compute treasury in fallback path:', e);
    }

    return new Response(
      JSON.stringify({ holders, metrics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
