import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wallet-address",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  console.log("Delete whitelist function called:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Initializing Supabase client");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!(req.method === "DELETE" || req.method === "POST")) {
      console.log("Invalid method:", req.method);
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Reading request body");
    const walletAddress = req.headers.get("x-wallet-address");
    let requestId;
    
    try {
      const body = await req.json();
      requestId = body.requestId;
      console.log("Request data:", { walletAddress, requestId });
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!walletAddress) {
      console.log("Missing wallet address");
      return new Response(
        JSON.stringify({ error: "Wallet address required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!requestId) {
      console.log("Missing request ID");
      return new Response(
        JSON.stringify({ error: "Request ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin status
    console.log("Verifying admin status for:", walletAddress);
    const { data: isAdmin, error: adminError } = await supabase
      .rpc("is_admin_wallet", { wallet_addr: walletAddress });

    if (adminError) {
      console.error("Error verifying admin:", adminError);
      return new Response(
        JSON.stringify({ error: "Error verifying admin status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      console.log(`Unauthorized delete attempt by ${walletAddress}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin access required" }),
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
    console.log("Logging admin action");
    const { error: logError } = await supabase.from("admin_actions").insert({
      action_type: "whitelist_deleted",
      wallet_address: walletAddress,
      details: { request_id: requestId, timestamp: new Date().toISOString() },
    });

    if (logError) {
      console.error("Error logging action:", logError);
    }

    console.log(`Whitelist request ${requestId} deleted successfully`);

    return new Response(
      JSON.stringify({ message: "Whitelist request deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unhandled error in delete-whitelist function:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
