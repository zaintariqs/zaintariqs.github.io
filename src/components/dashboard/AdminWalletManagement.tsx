import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, UserMinus, Crown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AdminWallet {
  id: string;
  wallet_address: string;
  is_active: boolean;
  added_at: string;
}

export const AdminWalletManagement = () => {
  const { address } = useAccount();
  const { toast } = useToast();
  const [targetWallet, setTargetWallet] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminWallets, setAdminWallets] = useState<AdminWallet[]>([]);
  const [masterMinterAddress, setMasterMinterAddress] = useState<string>("");

  // Check if current user is master minter
  const isMasterMinter = address?.toLowerCase() === masterMinterAddress.toLowerCase();

  // Fetch master minter address and admin wallets
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch master minter address from secure database function
        const { data: masterMinter, error: masterMinterError } = await supabase.rpc('get_master_minter_address')
        if (!masterMinterError && masterMinter) {
          setMasterMinterAddress(masterMinter)
        }
        
        console.log("[AdminWalletManagement] Fetching admin wallets for:", address);
        const { data, error } = await supabase.functions.invoke("manage-admin-wallets", {
          body: {
            requestingWallet: address,
            action: "list",
          },
        });

        console.log("[AdminWalletManagement] Response:", { data, error });

        if (error) throw error;
        if (data?.wallets) {
          console.log("[AdminWalletManagement] Setting wallets:", data.wallets);
          setAdminWallets(data.wallets);
        } else {
          console.log("[AdminWalletManagement] No wallets in response");
        }
      } catch (error) {
        console.error("[AdminWalletManagement] Error fetching admin wallets:", error);
      }
    };

    if (address) {
      console.log("[AdminWalletManagement] Fetching data");
      fetchData();
    }
  }, [address, supabase]);

  // Don't render if not master minter
  if (!isMasterMinter) {
    return null;
  }

  const handleAdminAction = async (action: "add" | "revoke") => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive",
      });
      return;
    }

    if (!targetWallet || !targetWallet.startsWith("0x")) {
      toast({
        title: "Error",
        description: "Please enter a valid wallet address",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-admin-wallets", {
        body: {
          requestingWallet: address,
          targetWallet: targetWallet,
          action: action,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message,
      });

      setTargetWallet("");
      
      // Refresh the list
      const listResponse = await supabase.functions.invoke("manage-admin-wallets", {
        body: {
          requestingWallet: address,
          action: "list",
        },
      });
      if (listResponse.data?.wallets) {
        setAdminWallets(listResponse.data.wallets);
      }
    } catch (error: any) {
      console.error("Admin management error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to manage admin privileges",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Wallet Management
        </CardTitle>
        <CardDescription>
          Add or revoke admin privileges for wallet addresses. All actions are logged for security audit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="targetWallet">Wallet Address</Label>
          <Input
            id="targetWallet"
            type="text"
            placeholder="0x..."
            value={targetWallet}
            onChange={(e) => setTargetWallet(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleAdminAction("add")}
            disabled={isProcessing || !targetWallet}
            className="flex-1"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Grant Admin Access
          </Button>
          <Button
            onClick={() => handleAdminAction("revoke")}
            disabled={isProcessing || !targetWallet}
            variant="destructive"
            className="flex-1"
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Revoke Admin Access
          </Button>
        </div>

        <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted rounded-md">
          <p className="font-semibold mb-1">⚠️ Security Note:</p>
          <p>Admin privileges grant full access to sensitive operations including deposit/redemption management, market maker controls, and whitelist approvals. Only grant to trusted addresses.</p>
        </div>

        {/* Admin Wallets List */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Admin Wallets
          </h3>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Master Minter - Always show first */}
                {masterMinterAddress && (
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-mono text-xs">
                      {masterMinterAddress}
                    </TableCell>
                  <TableCell>
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">
                      <Crown className="h-3 w-3 mr-1" />
                      Master Minter
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    System
                    </TableCell>
                  </TableRow>
                )}

                {/* Other Admin Wallets */}
                {adminWallets
                  .filter(wallet => wallet.wallet_address.toLowerCase() !== masterMinterAddress.toLowerCase())
                  .map((wallet) => (
                    <TableRow key={wallet.id}>
                      <TableCell className="font-mono text-xs">
                        {wallet.wallet_address}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Admin</Badge>
                      </TableCell>
                      <TableCell>
                        {wallet.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Revoked</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(wallet.added_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                
                {adminWallets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No additional admin wallets configured
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};