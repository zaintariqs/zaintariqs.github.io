import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TransactionFee {
  id: string;
  transaction_type: string;
  transaction_id: string;
  user_id: string;
  original_amount: number;
  fee_percentage: number;
  fee_amount: number;
  net_amount: number;
  created_at: string;
}

interface FeeStats {
  totalFees: number;
  depositFees: number;
  redemptionFees: number;
  transactionCount: number;
}

export const TransactionFees = () => {
  const { address } = useAccount();
  const [fees, setFees] = useState<TransactionFee[]>([]);
  const [stats, setStats] = useState<FeeStats>({
    totalFees: 0,
    depositFees: 0,
    redemptionFees: 0,
    transactionCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFees = async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/get-transaction-fees',
        {
          method: 'GET',
          headers: {
            'x-wallet-address': address,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkanJldXhodnptem9ja3VkdXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDY4NzYsImV4cCI6MjA3NDU4Mjg3Nn0.KJYwFwrpN19mBJ2uj9I8tX1z_T9qfhd-KNXLGn5Zric',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkanJldXhodnptem9ja3VkdXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDY4NzYsImV4cCI6MjA3NDU4Mjg3Nn0.KJYwFwrpN19mBJ2uj9I8tX1z_T9qfhd-KNXLGn5Zric',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch transaction fees');
      }

      const { fees: feeData, stats: statsData } = await response.json();
      
      setFees(feeData);
      setStats(statsData);
    } catch (error: any) {
      console.error("Error fetching transaction fees:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load transaction fees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, [address]);

  const formatCurrency = (amount: number, type: string) => {
    return `${amount.toFixed(2)} ${type === 'deposit' ? 'PKR' : 'PKRSC'}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFees.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Combined PKR & PKRSC
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deposit Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.depositFees.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">PKR collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redemption Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.redemptionFees.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">PKRSC collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transactionCount}</div>
            <p className="text-xs text-muted-foreground">Fee-generating txs</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transaction Fees (Last 50)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading fees...</div>
          ) : fees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transaction fees recorded yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Original Amount</TableHead>
                    <TableHead>Fee (0.5%)</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell>
                        <Badge
                          variant={
                            fee.transaction_type === "deposit"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {fee.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {fee.user_id.slice(0, 6)}...{fee.user_id.slice(-4)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(Number(fee.original_amount), fee.transaction_type)}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatCurrency(Number(fee.fee_amount), fee.transaction_type)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(Number(fee.net_amount), fee.transaction_type)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(fee.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
