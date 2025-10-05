import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, UserMinus } from "lucide-react";

export const AdminWalletManagement = () => {
  const { address } = useAccount();
  const { toast } = useToast();
  const [targetWallet, setTargetWallet] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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
      </CardContent>
    </Card>
  );
};