import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Wallet, Flame, TrendingUp, Vault, Search } from 'lucide-react';

interface TokenHolder {
  address: string;
  balance: string;
  balanceFormatted: string;
  email?: string;
  lpType?: 'provider' | 'uniswap' | 'master-minter';
}

interface TokenMetrics {
  totalMinted: string;
  burned: string;
  treasury: string;
}

export function UserBalances() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [filteredHolders, setFilteredHolders] = useState<TokenHolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [metrics, setMetrics] = useState<TokenMetrics>({ totalMinted: '0', burned: '0', treasury: '0' });
  const [loading, setLoading] = useState(false);

  const fetchBalances = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-token-holders', {
        body: { walletAddress: address }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const holdersList = data.holders || [];
      setHolders(holdersList);
      setFilteredHolders(holdersList);
      setMetrics({
        totalMinted: data.metrics?.totalMinted || '0',
        burned: data.metrics?.burned || '0',
        treasury: data.metrics?.treasury || '0'
      });
      
      toast({
        title: "Success",
        description: `Found ${data.holders?.length || 0} token holders`,
      });
    } catch (error: any) {
      console.error('Error fetching balances:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch token holder balances",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when wallet changes or page opens
  useEffect(() => {
    if (address) {
      fetchBalances();
    }
  }, [address]);

  // Filter holders based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHolders(holders);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = holders.filter(holder => 
      holder.address.toLowerCase().includes(query) ||
      holder.email?.toLowerCase().includes(query)
    );
    setFilteredHolders(filtered);
  }, [searchQuery, holders]);

  const calculateCirculatingSupply = () => {
    // Correct calculation: Total Minted - Treasury - Burned
    const totalMinted = parseFloat(metrics.totalMinted);
    const treasury = parseFloat(metrics.treasury);
    const burned = parseFloat(metrics.burned);
    return (totalMinted - treasury - burned).toFixed(2);
  };

  const calculateTotalHolderBalances = () => {
    // This is just the sum of fetched holder balances (may be incomplete if BaseScan fails)
    return holders.reduce((sum, holder) => {
      return sum + parseFloat(holder.balanceFormatted);
    }, 0).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">PKRSC Token Holders</h2>
        <p className="text-white/70">View all addresses holding PKRSC tokens and their balances</p>
      </div>

      <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-white/70">Total Holders</p>
              <p className="text-xl font-bold text-white">{holders.length}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-500/20">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-white/70">Total Minted</p>
              <p className="text-xl font-bold text-white">
                {loading ? '...' : `${parseFloat(metrics.totalMinted).toLocaleString()} PKRSC`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-orange-500/20">
              <Flame className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-white/70">Burned</p>
              <p className="text-xl font-bold text-white">
                {loading ? '...' : `${parseFloat(metrics.burned).toLocaleString()} PKRSC`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Vault className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-white/70">Treasury</p>
              <p className="text-xl font-bold text-white">
                {loading ? '...' : `${parseFloat(metrics.treasury).toLocaleString()} PKRSC`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-sm text-white/70 mb-1">Circulating Supply</p>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : `${parseFloat(calculateCirculatingSupply()).toLocaleString()} PKRSC`}
          </p>
          <p className="text-xs text-white/50 mt-1">
            Total Minted - Treasury - Burned
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              type="text"
              placeholder="Search by wallet address or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50"
            />
          </div>

          <Button 
            onClick={fetchBalances} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading Balances...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Fetch Token Holder Balances
              </>
            )}
          </Button>
        </div>
      </Card>

      {holders.length > 0 && (
        <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
          <div className="mb-4 text-sm text-white/70">
            Showing {filteredHolders.length} of {holders.length} holders
          </div>
          <div className="rounded-md border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-white/70">#</TableHead>
                  <TableHead className="text-white/70">Wallet Address</TableHead>
                  <TableHead className="text-white/70">Email</TableHead>
                  <TableHead className="text-right text-white/70">Balance (PKRSC)</TableHead>
                  <TableHead className="text-right text-white/70">% of Supply</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHolders.map((holder, index) => {
                  const circulatingSupply = parseFloat(calculateCirculatingSupply());
                  const percentage = circulatingSupply > 0 
                    ? ((parseFloat(holder.balanceFormatted) / circulatingSupply) * 100).toFixed(2)
                    : '0.00';
                  
                  return (
                    <TableRow 
                      key={holder.address} 
                      className="border-white/10 hover:bg-white/5"
                    >
                      <TableCell className="text-white/90">{index + 1}</TableCell>
                      <TableCell className="font-mono text-white/90">
                        <div>
                          {holder.address}
                          {holder.lpType === 'provider' && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                LIQUIDITY PROVIDER ADDRESS
                              </span>
                            </div>
                          )}
                          {holder.lpType === 'uniswap' && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                UNISWAP POOL ADDRESS
                              </span>
                            </div>
                          )}
                          {holder.lpType === 'master-minter' && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                MASTER MINTER ADDRESS
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/70 text-sm">
                        {holder.email ? (
                          <span className="break-all">{holder.email}</span>
                        ) : (
                          <span className="text-white/40 italic">No email</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-white/90 font-semibold">
                        {parseFloat(holder.balanceFormatted).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-white/90">
                        {percentage}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
