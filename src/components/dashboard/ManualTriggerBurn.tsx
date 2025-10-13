import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flame } from "lucide-react";

export function ManualTriggerBurn() {
  const [loading, setLoading] = useState(false);

  const triggerBurn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-redemption-burns', {
        body: { manual_trigger: true }
      });

      if (error) throw error;
      
      toast.success("Burn process triggered! Your tokens will be burned shortly.");
      console.log("Burn result:", data);
      
      // Reload page after 5 seconds to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } catch (error: any) {
      console.error("Error triggering burn:", error);
      toast.error(error.message || "Failed to trigger burn process");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-card rounded-lg border border-primary/20">
      <div className="flex items-start gap-3">
        <Flame className="h-5 w-5 text-primary mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">Ready to Burn</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Your transaction is verified and ready for burning. The automatic burn runs every 5 minutes, 
            or you can trigger it manually now.
          </p>
          <Button onClick={triggerBurn} disabled={loading} variant="default">
            {loading ? "Processing..." : "Trigger Burn Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
