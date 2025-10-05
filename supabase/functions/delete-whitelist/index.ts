import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wallet-address",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== "DELETE") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const walletAddress = req.headers.get("x-wallet-address");
    const { requestId } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: "Wallet address required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: "Request ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin status
    const { data: isAdmin } = await supabase
      .rpc("is_admin_wallet", { wallet_addr: walletAddress });

    if (!isAdmin) {
      console.log(`Unauthorized delete attempt by ${walletAddress}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${walletAddress} deleting whitelist request ${requestId}`);

    // Delete the whitelist request
    const { error: deleteError } = await supabase
      .from("whitelist_requests")
      .delete()
      .eq("id", requestId);

    if (deleteError) {
      console.error("Error deleting whitelist request:", deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the action
    await supabase.from("admin_actions").insert({
      action_type: "whitelist_deleted",
      wallet_address: walletAddress,
      details: { request_id: requestId, timestamp: new Date().toISOString() },
    });

    console.log(`Whitelist request ${requestId} deleted successfully`);

    return new Response(
      JSON.stringify({ message: "Whitelist request deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in delete-whitelist function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
