import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders, responseHeaders } from '../_shared/cors.ts';
import { decryptEmail } from '../_shared/email-encryption.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Get the from email from environment or use default
// IMPORTANT: For production, set FROM_EMAIL to an email from your verified domain
// Example: "PKRSC <noreply@yourdomain.com>"
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "PKRSC <onboarding@resend.dev>";

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
          { status: 400, headers: responseHeaders }
        );
      }

      // Check if user is admin
      const { data: adminCheck } = await supabase
        .rpc("is_admin_wallet", { wallet_addr: walletAddress });

      if (!adminCheck) {
        return new Response(
          JSON.stringify({ error: "Unauthorized - Admin access required" }),
          { status: 403, headers: responseHeaders }
        );
      }

      if (!requestId || !action || !["approve", "reject"].includes(action)) {
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
          { status: 400, headers: responseHeaders }
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
          { status: 404, headers: responseHeaders }
        );
      }

      // Fetch and decrypt email from encrypted_emails table
      const { data: emailData } = await supabase
        .from('encrypted_emails')
        .select('encrypted_email')
        .eq('wallet_address', request.wallet_address)
        .single()

      let userEmail = null
      if (emailData?.encrypted_email) {
        try {
          userEmail = await decryptEmail(emailData.encrypted_email)
          
          // Log PII access for audit trail
          const { error: piiErr } = await supabase.rpc('log_pii_access', {
            p_table: 'encrypted_emails',
            p_record_id: request.id,
            p_fields: ['email'],
            p_accessed_by: walletAddress,
            p_reason: `whitelist_${action}_email_notification`,
            p_ip: null
          })
          if (piiErr) console.warn('Failed to log PII access:', piiErr)
        } catch (error) {
          console.error('Failed to decrypt email:', error)
          // Continue without email - don't fail the approval
        }
      }

      if (!userEmail) {
        console.warn(`No email found for wallet ${request.wallet_address}`)
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
          { status: 500, headers: responseHeaders }
        );
      }

      // Trigger welcome bonus distribution if approved
      if (action === "approve") {
        try {
          console.log(`Triggering welcome bonus for ${request.wallet_address}`);
          
          const bonusResponse = await supabase.functions.invoke('distribute-welcome-bonus', {
            body: {
              walletAddress: request.wallet_address,
              triggeredBy: walletAddress
            }
          });

          if (bonusResponse.error) {
            console.error("Error distributing welcome bonus:", bonusResponse.error);
            // Don't fail the approval, just log the error
          } else {
            console.log("Welcome bonus distributed:", bonusResponse.data);
          }
        } catch (bonusError: any) {
          console.error("Failed to trigger welcome bonus:", bonusError);
          // Don't fail the approval process
        }
      }

      // Send email notification
      let emailSubject = "";
      let emailHtml = "";

      if (action === "approve") {
        emailSubject = "Welcome to PKRSC! 🎉 + Your 300 PKRSC Welcome Bonus";
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #00875A;">Welcome Onboard!</h1>
            <p>Congratulations! Your whitelist request has been approved.</p>
            <p><strong>Wallet Address:</strong> <code style="background: #f4f4f4; padding: 4px 8px; border-radius: 4px;">${request.wallet_address}</code></p>
            
            <div style="margin: 30px 0; padding: 20px; background: #e6f7f0; border: 2px solid #00875A; border-radius: 8px; text-align: center;">
              <h2 style="color: #00875A; margin: 0 0 10px 0;">🎁 Welcome Bonus!</h2>
              <p style="font-size: 24px; font-weight: bold; margin: 10px 0; color: #00875A;">300 PKRSC</p>
              <p style="margin: 5px 0; color: #333;">has been credited to your wallet!</p>
            </div>

            <p>You're now part of the PKRSC community and can start using our services. Connect your wallet to see your welcome bonus!</p>
            <div style="margin: 30px 0; padding: 20px; background: #f9f9f9; border-left: 4px solid #00875A; border-radius: 4px;">
              <p style="margin: 0;"><strong>Next Steps:</strong></p>
              <ol style="margin: 10px 0;">
                <li>Visit our platform</li>
                <li>Connect your approved wallet</li>
                <li>Check your 300 PKRSC welcome bonus</li>
                <li>Start exploring PKRSC features</li>
              </ol>
            </div>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p style="margin-top: 30px;">Best regards,<br><strong>Team PKRSC</strong></p>
          </div>
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

      // Send email notification if email exists
      if (userEmail) {
        try {
          console.log(`Attempting to send email to: ${userEmail}`);
          console.log(`Using from address: ${FROM_EMAIL}`);
          
          const emailResponse = await resend.emails.send({
            from: FROM_EMAIL,
            to: [userEmail],
            subject: emailSubject,
            html: emailHtml,
          });

          console.log("Email sent successfully:", JSON.stringify(emailResponse));
          
          // Log successful email in admin_actions for tracking
          await supabase.from("admin_actions").insert({
            action_type: 'email_sent_whitelist',
            wallet_address: walletAddress,
            details: {
              request_id: requestId,
              email_id: emailResponse.id,
              action: action
            },
          });
          
        } catch (emailError: any) {
          console.error("❌ Error sending email:", {
            error: emailError.message,
            statusCode: emailError.statusCode,
            name: emailError.name,
            from: FROM_EMAIL,
          });
          
          // Log failed email attempt
          await supabase.from("admin_actions").insert({
            action_type: 'email_failed_whitelist',
            wallet_address: walletAddress,
            details: {
              request_id: requestId,
              error: emailError.message,
              action: action
            },
          });
        }
      } else {
        console.warn(`Skipping email notification - no email found for wallet ${request.wallet_address}`)
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
        { status: 200, headers: responseHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: responseHeaders }
    );

  } catch (error: any) {
    console.error("Error in approve-whitelist function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: responseHeaders }
    );
  }
});