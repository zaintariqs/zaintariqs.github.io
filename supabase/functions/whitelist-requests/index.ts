import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wallet-address, x-wallet-signature, x-signature-message, x-nonce",
};

// Verify wallet signature to prevent fake requests
async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    const { ethers } = await import('https://esm.sh/ethers@6.9.0')
    const recoveredAddress = ethers.verifyMessage(message, signature)
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase()
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

// Import email encryption utilities
import { encryptEmail, decryptEmail } from '../_shared/email-encryption.ts'

// Rate limiting configuration
const RATE_LIMIT_MS = 60000; // 1 minute
const rateLimitMap = new Map<string, number>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(identifier);
  
  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    return false;
  }
  
  rateLimitMap.set(identifier, now);
  
  // Clean up old entries
  if (rateLimitMap.size > 10000) {
    const cutoff = now - RATE_LIMIT_MS * 2;
    for (const [key, timestamp] of rateLimitMap.entries()) {
      if (timestamp < cutoff) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "GET") {
      // Get all whitelist requests (admin only)
      const walletAddress = req.headers.get("x-wallet-address");
      
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
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch all whitelist requests
      const { data, error } = await supabase
        .from("whitelist_requests")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) {
        console.error("Error fetching whitelist requests:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch and decrypt emails for each request
      const requestsWithEmails = await Promise.all(
        (data || []).map(async (request) => {
          try {
            // Fetch encrypted email from encrypted_emails table
            const { data: emailData } = await supabase
              .from('encrypted_emails')
              .select('encrypted_email')
              .eq('wallet_address', request.wallet_address)
              .single()

            if (emailData?.encrypted_email) {
              const decryptedEmail = await decryptEmail(emailData.encrypted_email)
              
              // Log PII access for audit trail
              await supabase.rpc('log_pii_access', {
                p_table: 'encrypted_emails',
                p_record_id: request.id,
                p_fields: ['email'],
                p_accessed_by: walletAddress.toLowerCase(),
                p_reason: 'admin_whitelist_review',
                p_ip: null
              }).catch(err => console.warn('Failed to log PII access:', err))
              
              return { ...request, email: decryptedEmail }
            }
            
            return { ...request, email: null }
          } catch (error) {
            console.error(`Failed to decrypt email for request ${request.id}:`, error)
            return { ...request, email: '[decryption failed]' }
          }
        })
      )

      return new Response(
        JSON.stringify({ requests: requestsWithEmails }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      // Create new whitelist request with signature verification
      const { walletAddress, email } = await req.json();
      const signatureHeader = req.headers.get('x-wallet-signature')
      const messageHeaderEncoded = req.headers.get('x-signature-message')
      const nonceHeader = req.headers.get('x-nonce')
      const messageHeader = messageHeaderEncoded ? atob(messageHeaderEncoded) : null

      if (!walletAddress || !email) {
        return new Response(
          JSON.stringify({ error: "Wallet address and email are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Require signature verification to prevent spam/harvesting
      if (!signatureHeader || !messageHeader || !nonceHeader) {
        return new Response(
          JSON.stringify({ error: "Wallet signature required for verification" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify signature
      const isValidSignature = await verifyWalletSignature(
        walletAddress,
        signatureHeader,
        messageHeader
      )
      
      if (!isValidSignature) {
        console.error('Invalid signature for whitelist request:', walletAddress)
        return new Response(
          JSON.stringify({ error: "Invalid wallet signature" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limiting by wallet address and IP
      const clientIp = req.headers.get("x-forwarded-for") || "unknown";
      const rateLimitKey = `${walletAddress.toLowerCase()}-${clientIp}`;
      
      if (!checkRateLimit(rateLimitKey)) {
        console.log(`Rate limit exceeded for ${rateLimitKey}`);
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in 1 minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if wallet is already whitelisted or has pending request
      const { data: existing } = await supabase
        .from("whitelist_requests")
        .select("*")
        .eq("wallet_address", walletAddress.toLowerCase())
        .single();

      if (existing) {
        if (existing.status === "approved") {
          return new Response(
            JSON.stringify({ error: "This wallet address is already whitelisted" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else if (existing.status === "pending") {
          return new Response(
            JSON.stringify({ error: "A whitelist request for this wallet address is already pending" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Encrypt email and store separately
      const encryptedEmail = await encryptEmail(email.toLowerCase())
      
      // Store encrypted email
      await supabase.from('encrypted_emails').insert({
        wallet_address: walletAddress.toLowerCase(),
        encrypted_email: encryptedEmail
      })

      // Create new whitelist request without email (stored separately encrypted)
      const { data, error } = await supabase
        .from("whitelist_requests")
        .insert({
          wallet_address: walletAddress.toLowerCase(),
          status: "pending",
          signature: signatureHeader,
          nonce: nonceHeader,
          client_ip: clientIp
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating whitelist request:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Whitelist request created:", data);

      return new Response(
        JSON.stringify({ 
          message: "Whitelist request submitted successfully",
          request: data 
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in whitelist-requests function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});