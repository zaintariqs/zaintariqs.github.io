import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ManualAttachTx() {
  const [loading, setLoading] = useState(false);

  const attachTransaction = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manual-attach-redemption-tx', {
        body: {
          redemption_id: 'b0c3a3e3-b7c0-451b-b234-90cc9d53340c',
          transaction_hash: '0xc78d48411dd1cb4f82c1b42e850f476e8899a3c16ac55a851e6e60e6cfdb4f27'
        }
      });

      if (error) throw error;
      
      toast.success("Transaction attached successfully! Your redemption is now pending burn.");
      console.log("Attach result:", data);
      
      // Reload page to show updated status
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error("Error attaching transaction:", error);
      toast.error(error.message || "Failed to attach transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-card rounded-lg border">
      <h3 className="text-lg font-semibold mb-2">Manual Transaction Attachment</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Click below to manually attach your verified transaction to the redemption.
      </p>
      <Button onClick={attachTransaction} disabled={loading}>
        {loading ? "Attaching..." : "Attach Transaction Now"}
      </Button>
    </div>
  );
}
