import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiter per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", verified: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", verified: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub;

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: "Too many requests", verified: false }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Missing payment details", verified: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input formats
    if (typeof razorpay_order_id !== "string" || !razorpay_order_id.startsWith("order_")) {
      return new Response(
        JSON.stringify({ error: "Invalid order ID format", verified: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (typeof razorpay_payment_id !== "string" || !razorpay_payment_id.startsWith("pay_")) {
      return new Response(
        JSON.stringify({ error: "Invalid payment ID format", verified: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    if (!RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay key secret not configured");
    }

    // Verify signature using constant-time comparison
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = await hmacSha256(RAZORPAY_KEY_SECRET, body);
    const isValid = secureCompare(expectedSignature, razorpay_signature);

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null;

    let paymentMode: string | null = null;

    if (!isValid) {
      // Log signature verification failure
      try {
        await supabaseAdmin.from("payment_logs").insert({
          order_id: order_id || null,
          user_id: userId,
          event_type: "signature_failed",
          razorpay_order_id,
          razorpay_payment_id,
          metadata: { reason: "HMAC signature mismatch" },
          ip_address: clientIp,
        });
      } catch (logErr) {
        console.error("Failed to log signature failure:", logErr);
      }

      return new Response(
        JSON.stringify({ verified: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order_id) {
      // Verify order ownership: the order must belong to the authenticated user
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("user_id")
        .eq("id", order_id)
        .single();

      if (orderError || !orderData || orderData.user_id !== userId) {
        // Log unauthorized access attempt
        try {
          await supabaseAdmin.from("payment_logs").insert({
            order_id,
            user_id: userId,
            event_type: "unauthorized_access",
            razorpay_order_id,
            razorpay_payment_id,
            metadata: { reason: "Order not owned by user" },
            ip_address: clientIp,
          });
        } catch (logErr) {
          console.error("Failed to log unauthorized access:", logErr);
        }

        return new Response(
          JSON.stringify({ error: "Order not found or not owned by user", verified: false }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch payment details from Razorpay to get the method
      if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
        try {
          const paymentRes = await fetch(
            `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
            {
              headers: {
                Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
              },
            }
          );
          if (paymentRes.ok) {
            const paymentData = await paymentRes.json();
            paymentMode = paymentData.method || null;
          }
        } catch (e) {
          console.error("Failed to fetch payment method:", e);
        }
      }

      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          stripe_payment_id: razorpay_payment_id,
          payment_mode: paymentMode,
        })
        .eq("id", order_id);

      // Log successful payment verification
      try {
        await supabaseAdmin.from("payment_logs").insert({
          order_id,
          user_id: userId,
          event_type: "payment_success",
          razorpay_order_id,
          razorpay_payment_id,
          metadata: { payment_mode: paymentMode, signature_verified: true },
          ip_address: clientIp,
        });
      } catch (logErr) {
        console.error("Failed to log payment success:", logErr);
      }
    }

    return new Response(
      JSON.stringify({ verified: isValid, payment_mode: paymentMode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Verification error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", verified: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
