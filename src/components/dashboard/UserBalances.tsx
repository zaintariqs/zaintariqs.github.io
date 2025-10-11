import { useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Wallet } from 'lucide-react';

interface TokenHolder {
  address: string;
  balance: string;
  balanceFormatted: string;
}

export function UserBalances() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [holders, setHolders] = useState<TokenHolder[]>([]);
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

      setHolders(data.holders || []);
      
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

  const calculateTotalSupply = () => {
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/20">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-white/70">Total Holders</p>
              <p className="text-2xl font-bold text-white">{holders.length}</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-white/70">Circulating Supply</p>
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : holders.length > 0 ? `${calculateTotalSupply()} PKRSC` : '0.00 PKRSC'}
            </p>
          </div>
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
      </Card>

      {holders.length > 0 && (
        <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
          <div className="rounded-md border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-white/70">#</TableHead>
                  <TableHead className="text-white/70">Wallet Address</TableHead>
                  <TableHead className="text-right text-white/70">Balance (PKRSC)</TableHead>
                  <TableHead className="text-right text-white/70">% of Supply</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holders.map((holder, index) => {
                  const totalSupply = parseFloat(calculateTotalSupply());
                  const percentage = totalSupply > 0 
                    ? ((parseFloat(holder.balanceFormatted) / totalSupply) * 100).toFixed(2)
                    : '0.00';
                  
                  return (
                    <TableRow 
                      key={holder.address} 
                      className="border-white/10 hover:bg-white/5"
                    >
                      <TableCell className="text-white/90">{index + 1}</TableCell>
                      <TableCell className="font-mono text-white/90">
                        {holder.address}
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
