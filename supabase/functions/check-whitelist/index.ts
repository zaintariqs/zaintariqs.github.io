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

    const walletAddress = req.headers.get("x-wallet-address");

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: "Wallet address required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin (admins bypass whitelist)
    const { data: isAdmin } = await supabase
      .rpc("is_admin_wallet", { wallet_addr: walletAddress });

    if (isAdmin) {
      return new Response(
        JSON.stringify({ 
          isWhitelisted: true, 
          isAdmin: true,
          message: "Admin access granted"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if wallet is whitelisted
    const { data: isWhitelisted } = await supabase
      .rpc("is_wallet_whitelisted", { wallet_addr: walletAddress });

    // Get request status if exists
    const { data: request } = await supabase
      .from("whitelist_requests")
      .select("status, rejection_reason")
      .eq("wallet_address", walletAddress.toLowerCase())
      .single();

    return new Response(
      JSON.stringify({ 
        isWhitelisted: !!isWhitelisted,
        isAdmin: false,
        status: request?.status || null,
        rejectionReason: request?.rejection_reason || null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-whitelist function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});