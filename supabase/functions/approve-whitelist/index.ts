import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wallet-address",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "POST") {
      const walletAddress = req.headers.get("x-wallet-address");
      const { requestId, action, rejectionReason } = await req.json();

      if (!walletAddress) {
        return new Response(
          JSON.stringify({ error: "Wallet address required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user is admin
      const { data: adminCheck } = await supabase
        .rpc("is_admin_wallet", { wallet_addr: walletAddress });

      if (!adminCheck) {
        return new Response(
          JSON.stringify({ error: "Unauthorized - Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!requestId || !action || !["approve", "reject"].includes(action)) {
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the whitelist request
      const { data: request, error: fetchError } = await supabase
        .from("whitelist_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError || !request) {
        return new Response(
          JSON.stringify({ error: "Whitelist request not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update the request status
      const newStatus = action === "approve" ? "approved" : "rejected";
      const { error: updateError } = await supabase
        .from("whitelist_requests")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: walletAddress,
          rejection_reason: action === "reject" ? rejectionReason : null,
        })
        .eq("id", requestId);

      if (updateError) {
        console.error("Error updating whitelist request:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send email notification
      let emailSubject = "";
      let emailHtml = "";

      if (action === "approve") {
        emailSubject = "Your PKRSC Whitelist Request has been Approved";
        emailHtml = `
          <h1>Welcome to PKRSC!</h1>
          <p>Great news! Your whitelist request has been approved.</p>
          <p><strong>Wallet Address:</strong> ${request.wallet_address}</p>
          <p>You can now connect your wallet and start using our services.</p>
          <p>Best regards,<br>The PKRSC Team</p>
        `;
      } else {
        emailSubject = "Your PKRSC Whitelist Request Update";
        emailHtml = `
          <h1>Whitelist Request Update</h1>
          <p>Thank you for your interest in PKRSC.</p>
          <p><strong>Wallet Address:</strong> ${request.wallet_address}</p>
          <p><strong>Status:</strong> Your whitelist request has been reviewed.</p>
          ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ""}
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>The PKRSC Team</p>
        `;
      }

      try {
        const emailResponse = await resend.emails.send({
          from: "PKRSC <onboarding@resend.dev>",
          to: [request.email],
          subject: emailSubject,
          html: emailHtml,
        });

        console.log("Email sent successfully:", emailResponse);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the request if email fails
      }

      // Log admin action
      await supabase.from("admin_actions").insert({
        action_type: `whitelist_${action}`,
        wallet_address: walletAddress,
        details: {
          request_id: requestId,
          target_wallet: request.wallet_address,
          rejection_reason: rejectionReason,
        },
      });

      return new Response(
        JSON.stringify({ 
          message: `Whitelist request ${action}d successfully`,
          status: newStatus
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in approve-whitelist function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});