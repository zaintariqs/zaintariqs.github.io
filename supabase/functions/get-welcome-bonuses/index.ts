import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { walletAddress } = await req.json();
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: "walletAddress is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const addr = String(walletAddress).toLowerCase();

    // Verify caller is an active admin wallet
    const { data: adminWallet, error: adminErr } = await supabase
      .from("admin_wallets")
      .select("id, is_active, wallet_address")
      .ilike("wallet_address", addr)
      .eq("is_active", true)
      .maybeSingle();

    if (adminErr) {
      console.error("[get-welcome-bonuses] Admin check error:", adminErr);
      return new Response(
        JSON.stringify({ error: "Failed to verify admin" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!adminWallet) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch last 20 welcome bonuses
    const { data: bonuses, error: bonusesErr } = await supabase
      .from("welcome_bonuses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (bonusesErr) {
      console.error("[get-welcome-bonuses] Error fetching bonuses:", bonusesErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch welcome bonuses" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, bonuses }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[get-welcome-bonuses] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});