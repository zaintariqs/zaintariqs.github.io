import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface V2Deposit {
  id: string;
  usdt_amount: number;
  expected_pkr_amount: number;
  exchange_rate_at_creation: number;
  deposit_address: string;
  transaction_hash: string | null;
  burn_tx_hash: string | null;
  status: string;
  confirmations: number;
  created_at: string;
  completed_at: string | null;
}

export const MyV2Deposits = () => {
  const { address } = useAccount();
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<V2Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingDeposit, setCheckingDeposit] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      fetchDeposits();
    }
  }, [address]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('my-v2-deposits', {
        headers: {
          'x-wallet-address': address
        }
      });

      if (error) throw error;

      if (data?.success) {
        setDeposits(data.deposits);
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast({
        title: "Error",
        description: "Failed to load deposit history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckDeposit = async (depositId: string) => {
    if (!address) return;
    
    setCheckingDeposit(depositId);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-v2-deposit', {
        headers: {
          'x-wallet-address': address
        },
        body: { depositId }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || 'Deposit checked successfully',
        });
        fetchDeposits();
      } else {
        toast({
          title: "Info",
          description: data.message || 'No transaction found yet',
        });
      }
    } catch (err: any) {
      console.error('Error checking deposit:', err);
      toast({
        title: "Error",
        description: err.message || 'Failed to check deposit',
        variant: "destructive",
      });
    } finally {
      setCheckingDeposit(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      completed: "default",
      failed: "destructive",
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="p-6 bg-white/5 border-white/10">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (deposits.length === 0) {
    return (
      <Card className="p-6 bg-white/5 border-white/10">
        <p className="text-white/70 text-center py-8">No deposits yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white/5 border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white">Date</TableHead>
              <TableHead className="text-white">USDT Amount</TableHead>
              <TableHead className="text-white">PKR Amount</TableHead>
              <TableHead className="text-white">Exchange Rate</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Mint TX</TableHead>
              <TableHead className="text-white">Burn TX</TableHead>
              <TableHead className="text-white">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deposits.map((deposit) => (
              <TableRow key={deposit.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white/90">
                  {format(new Date(deposit.created_at), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-white/90 font-semibold">
                  {deposit.usdt_amount} USDT
                </TableCell>
                <TableCell className="text-white/90">
                  {deposit.expected_pkr_amount.toLocaleString()} PKR
                </TableCell>
                <TableCell className="text-white/70 text-sm">
                  1 USD = {deposit.exchange_rate_at_creation.toFixed(2)} PKR
                </TableCell>
                <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                <TableCell>
                  {deposit.transaction_hash ? (
                    <a
                      href={`https://basescan.org/tx/${deposit.transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
                    >
                      {deposit.transaction_hash.slice(0, 6)}...{deposit.transaction_hash.slice(-4)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-white/50 text-sm">Pending</span>
                  )}
                </TableCell>
                <TableCell>
                  {deposit.burn_tx_hash ? (
                    <a
                      href={`https://basescan.org/tx/${deposit.burn_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
                    >
                      {deposit.burn_tx_hash.slice(0, 6)}...{deposit.burn_tx_hash.slice(-4)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-white/50 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {deposit.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleCheckDeposit(deposit.id)}
                      disabled={checkingDeposit === deposit.id}
                    >
                      {checkingDeposit === deposit.id ? 'Checking...' : 'Check Status'}
                    </Button>
                  )}
                  {deposit.status === 'confirmed' && (
                    <span className="text-sm text-white/70">Minting...</span>
                  )}
                  {deposit.status === 'completed' && (
                    <span className="text-sm text-green-400">✓ Complete</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
