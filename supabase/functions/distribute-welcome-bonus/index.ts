import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const BONUS_AMOUNT = 300; // 300 PKRSC welcome bonus
const PKRSC_CONTRACT_ADDRESS = "0x1f192CB7B36d7acfBBdCA1E0C1d697361508F9D5";
const BASE_RPC_URL = "https://mainnet.base.org";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { walletAddress, triggeredBy } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: "Wallet address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting welcome bonus distribution for ${walletAddress}`);

    // Check if user already received a completed bonus (allow retries for failed bonuses)
    const { data: existingBonus } = await supabase
      .from("welcome_bonuses")
      .select("*")
      .eq("wallet_address", walletAddress.toLowerCase())
      .eq("status", "completed")
      .single();

    if (existingBonus) {
      console.log(`Bonus already distributed to ${walletAddress}`);
      return new Response(
        JSON.stringify({ 
          message: "Bonus already distributed",
          bonus: existingBonus 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check promotional reserve balance
    const { data: reserveBalance, error: reserveError } = await supabase
      .rpc("get_promotional_reserve_balance");

    if (reserveError) {
      console.error("Error checking promotional reserves:", reserveError);
      throw new Error("Failed to check promotional reserves");
    }

    if (!reserveBalance || parseFloat(reserveBalance) < BONUS_AMOUNT) {
      console.error(`Insufficient promotional reserves: ${reserveBalance} PKR`);
      
      // Create failed bonus record
      await supabase.from("welcome_bonuses").insert({
        wallet_address: walletAddress.toLowerCase(),
        amount: BONUS_AMOUNT,
        status: "insufficient_funds",
        error_message: `Promotional reserve balance too low: ${reserveBalance} PKR`
      });

      return new Response(
        JSON.stringify({ 
          error: "Insufficient promotional reserves",
          balance: reserveBalance 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create pending bonus record
    const { data: bonusRecord, error: bonusError } = await supabase
      .from("welcome_bonuses")
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        amount: BONUS_AMOUNT,
        status: "pending"
      })
      .select()
      .single();

    if (bonusError) {
      console.error("Error creating bonus record:", bonusError);
      throw new Error("Failed to create bonus record");
    }

    console.log(`Created bonus record:`, bonusRecord.id);

    // Mint tokens using master minter wallet
    try {
      const { ethers } = await import("https://esm.sh/ethers@6.9.0");
      
      const masterMinterKey = Deno.env.get("MASTER_MINTER_PRIVATE_KEY");
      if (!masterMinterKey) {
        throw new Error("Master minter private key not configured");
      }

      const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      const masterMinterWallet = new ethers.Wallet(masterMinterKey, provider);

      // ERC20 mint function ABI
      const mintAbi = [
        "function mint(address to, uint256 amount) external returns (bool)"
      ];

      const contract = new ethers.Contract(
        PKRSC_CONTRACT_ADDRESS,
        mintAbi,
        masterMinterWallet
      );

      // Convert 300 PKRSC to smallest unit (6 decimals)
      const amountWei = ethers.parseUnits(BONUS_AMOUNT.toString(), 6);

      console.log(`Minting ${BONUS_AMOUNT} PKRSC to ${walletAddress}`);
      
      const tx = await contract.mint(walletAddress, amountWei);
      console.log(`Transaction submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      // Update bonus record as completed
      await supabase
        .from("welcome_bonuses")
        .update({
          status: "completed",
          transaction_hash: tx.hash,
          distributed_at: new Date().toISOString()
        })
        .eq("id", bonusRecord.id);

      // Deduct from promotional reserves
      await supabase.rpc("update_promotional_reserves", {
        amount_change: -BONUS_AMOUNT,
        updated_by_wallet: triggeredBy || "system"
      });

      console.log(`Updated promotional reserves (-${BONUS_AMOUNT} PKR)`);

      // Log admin action
      await supabase.from("admin_actions").insert({
        action_type: "welcome_bonus_distributed",
        wallet_address: triggeredBy || "system",
        details: {
          recipient: walletAddress,
          amount: BONUS_AMOUNT,
          transaction_hash: tx.hash,
          remaining_reserves: parseFloat(reserveBalance) - BONUS_AMOUNT
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully distributed ${BONUS_AMOUNT} PKRSC welcome bonus`,
          transactionHash: tx.hash,
          bonusId: bonusRecord.id,
          remainingReserves: parseFloat(reserveBalance) - BONUS_AMOUNT
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (mintError: any) {
      console.error("Error minting tokens:", mintError);

      // Update bonus record as failed
      await supabase
        .from("welcome_bonuses")
        .update({
          status: "failed",
          error_message: mintError.message
        })
        .eq("id", bonusRecord.id);

      throw new Error(`Token minting failed: ${mintError.message}`);
    }

  } catch (error: any) {
    console.error("Error in distribute-welcome-bonus:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
