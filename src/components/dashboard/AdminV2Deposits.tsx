import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ArrowDownUp, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface V2Deposit {
  id: string;
  wallet_address: string;
  usdt_amount: number;
  expected_pkr_amount: number;
  exchange_rate_at_creation: number;
  deposit_address: string;
  status: string;
  transaction_hash?: string;
  burn_tx_hash?: string;
  redemption_id?: string;
  bank_name?: string;
  account_number?: string;
  account_title?: string;
  created_at: string;
  completed_at?: string;
}

export function AdminV2Deposits() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<V2Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeposits = async () => {
    if (!address) return;

    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/admin-v2-deposits',
        {
          method: 'GET',
          headers: {
            'x-wallet-address': address,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch V2 deposits');

      const { data } = await response.json();
      setDeposits(data || []);
    } catch (error) {
      console.error('Error fetching V2 deposits:', error);
      toast({
        title: "Error",
        description: "Failed to load V2 deposits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, [address]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
      pending: { variant: "secondary", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
      confirmed: { variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      completed: { variant: "default", className: "bg-crypto-green/10 text-crypto-green border-crypto-green/20" },
      failed: { variant: "destructive", className: "bg-red-500/10 text-red-500 border-red-500/20" },
    };

    const config = variants[status] || variants.pending;

    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-primary" />
            All V2 Deposits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-primary" />
            All V2 Deposits
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDeposits()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {deposits.length === 0 ? (
          <div className="text-center py-12">
            <ArrowDownUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No V2 deposits yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>USDT</TableHead>
                  <TableHead>Expected PKRSC</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mint TX</TableHead>
                  <TableHead>Burn TX</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell className="font-medium">
                      {format(new Date(deposit.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                          {deposit.wallet_address.slice(0, 6)}...{deposit.wallet_address.slice(-4)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(deposit.wallet_address);
                            toast({
                              title: "Address copied",
                              description: "Wallet address copied to clipboard",
                            });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-crypto-green">
                      {deposit.usdt_amount} USDT
                    </TableCell>
                    <TableCell>
                      {deposit.expected_pkr_amount.toLocaleString()} PKRSC
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {deposit.exchange_rate_at_creation.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {deposit.bank_name ? (
                        <div className="max-w-[180px]">
                          <div className="font-medium text-sm">{deposit.bank_name}</div>
                          <div className="text-xs text-muted-foreground">{deposit.account_title}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {deposit.account_number}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                    <TableCell>
                      {deposit.transaction_hash ? (
                        <a
                          href={`https://basescan.org/tx/${deposit.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <span className="text-xs font-mono">
                            {deposit.transaction_hash.slice(0, 6)}...
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {deposit.burn_tx_hash ? (
                        <a
                          href={`https://basescan.org/tx/${deposit.burn_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-orange-500 hover:underline"
                        >
                          <span className="text-xs font-mono">
                            {deposit.burn_tx_hash.slice(0, 6)}...
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
