import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, TrendingDown, Users, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export const WelcomeBonusMonitor = () => {
  const { address } = useAccount();

  // Fetch promotional reserves via edge function
  const { data: reservesData } = useQuery({
    queryKey: ["promotional-reserves", address],
    queryFn: async () => {
      if (!address) return null;
      
      const { data, error } = await supabase.functions.invoke('get-bank-reserves', {
        body: { walletAddress: address }
      });
      
      if (error) throw error;
      return data?.reserves?.find((r: any) => r.reserve_type === 'promotional');
    },
    enabled: !!address,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Fetch welcome bonuses
  const { data: bonuses } = useQuery({
    queryKey: ["welcome-bonuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("welcome_bonuses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const promotionalBalance = reservesData?.amount ? parseFloat(reservesData.amount.toString()) : 0;
  const totalDistributed = bonuses?.filter(b => b.status === "completed").length || 0;
  const remainingBonuses = Math.floor(promotionalBalance / 300);
  const totalBudget = 30000; // Initial budget
  const usedBudget = totalBudget - promotionalBalance;
  const usagePercentage = (usedBudget / totalBudget) * 100;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pending", variant: "secondary" },
      completed: { label: "Completed", variant: "default" },
      failed: { label: "Failed", variant: "destructive" },
      insufficient_funds: { label: "Insufficient Funds", variant: "outline" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promotional Budget</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promotionalBalance.toLocaleString()} PKR</div>
            <p className="text-xs text-muted-foreground">
              of {totalBudget.toLocaleString()} PKR total
            </p>
            <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonuses Distributed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDistributed}</div>
            <p className="text-xs text-muted-foreground">
              {totalDistributed * 300} PKRSC given
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Bonuses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{remainingBonuses}</div>
            <p className="text-xs text-muted-foreground">
              at 300 PKRSC each
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usagePercentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {usedBudget.toLocaleString()} PKR used
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Welcome Bonuses</CardTitle>
          <CardDescription>
            Track the latest 300 PKRSC welcome bonuses distributed to new users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wallet Address</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transaction Hash</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bonuses && bonuses.length > 0 ? (
                bonuses.map((bonus) => (
                  <TableRow key={bonus.id}>
                    <TableCell className="font-mono text-xs">
                      {bonus.wallet_address.slice(0, 6)}...{bonus.wallet_address.slice(-4)}
                    </TableCell>
                    <TableCell>{bonus.amount} PKRSC</TableCell>
                    <TableCell>{getStatusBadge(bonus.status)}</TableCell>
                    <TableCell>
                      {bonus.transaction_hash ? (
                        <a
                          href={`https://basescan.org/tx/${bonus.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs font-mono"
                        >
                          {bonus.transaction_hash.slice(0, 6)}...{bonus.transaction_hash.slice(-4)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(bonus.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No welcome bonuses distributed yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
