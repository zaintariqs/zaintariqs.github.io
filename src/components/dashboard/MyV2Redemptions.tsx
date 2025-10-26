import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BurnOperation {
  burn_tx_hash: string;
  burn_amount: number;
  created_at: string;
  status: string;
}

interface V2Redemption {
  id: string;
  pkrsc_amount: number;
  desired_pkr_amount: number;
  status: string;
  bank_name: string;
  account_number: string | null;
  account_title: string;
  transaction_hash: string | null;
  bank_transaction_id: string | null;
  created_at: string;
  burn_operations: BurnOperation[];
}

export const MyV2Redemptions = () => {
  const { address } = useAccount();
  const { toast } = useToast();
  const [redemptions, setRedemptions] = useState<V2Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      fetchRedemptions();
    }
  }, [address]);

  const fetchRedemptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('my-v2-redemptions', {
        headers: {
          'x-wallet-address': address
        }
      });

      if (error) throw error;

      if (data?.success) {
        setRedemptions(data.redemptions);
      }
    } catch (error) {
      console.error('Error fetching redemptions:', error);
      toast({
        title: "Error",
        description: "Failed to load redemption history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      completed: "default",
      cancelled: "destructive",
      rejected: "destructive",
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

  if (redemptions.length === 0) {
    return (
      <Card className="p-6 bg-white/5 border-white/10">
        <p className="text-white/70 text-center py-8">No redemptions yet</p>
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
              <TableHead className="text-white">PKRSC Amount</TableHead>
              <TableHead className="text-white">PKR Amount</TableHead>
              <TableHead className="text-white">Bank</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Burn TX</TableHead>
              <TableHead className="text-white">Bank TX</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {redemptions.map((redemption) => (
              <TableRow key={redemption.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white/90">
                  {format(new Date(redemption.created_at), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-white/90 font-semibold">
                  {redemption.pkrsc_amount.toLocaleString()} PKRSC
                </TableCell>
                <TableCell className="text-white/90">
                  {redemption.desired_pkr_amount.toLocaleString()} PKR
                </TableCell>
                <TableCell className="text-white/70 text-sm">
                  <div>
                    <div>{redemption.bank_name}</div>
                    <div className="text-xs text-white/50">{redemption.account_number}</div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(redemption.status)}</TableCell>
                <TableCell>
                  {redemption.burn_operations && redemption.burn_operations.length > 0 ? (
                    <a
                      href={`https://basescan.org/tx/${redemption.burn_operations[0].burn_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
                    >
                      {redemption.burn_operations[0].burn_tx_hash.slice(0, 6)}...
                      {redemption.burn_operations[0].burn_tx_hash.slice(-4)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-white/50 text-sm">Pending</span>
                  )}
                </TableCell>
                <TableCell>
                  {redemption.bank_transaction_id ? (
                    <span className="text-white/90 text-sm font-mono">
                      {redemption.bank_transaction_id}
                    </span>
                  ) : (
                    <span className="text-white/50 text-sm">Pending</span>
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
