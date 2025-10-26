import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TreasuryStats {
  totalMinted: string;
  totalBurned: string;
  totalExchanges: number;
  totalFees: string;
  pendingDeposits: number;
  pendingRedemptions: number;
}

export function V2TreasuryDashboard() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    if (!address) return;

    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/v2-treasury-stats',
        {
          method: 'GET',
          headers: {
            'x-wallet-address': address,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch treasury stats');

      const { data } = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching treasury stats:', error);
      toast({
        title: "Error",
        description: "Failed to load treasury statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [address]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Minted</CardTitle>
          <TrendingUp className="h-4 w-4 text-crypto-green" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-crypto-green">
            {parseFloat(stats.totalMinted).toLocaleString()} PKRSC
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.pendingDeposits} pending deposits
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Burned</CardTitle>
          <TrendingDown className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">
            {parseFloat(stats.totalBurned).toLocaleString()} PKRSC
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.pendingRedemptions} pending transfers
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Exchanges</CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {stats.totalExchanges}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Completed transactions
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
          <DollarSign className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-500">
            {parseFloat(stats.totalFees).toLocaleString()} PKRSC
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            0.5% per transaction
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
