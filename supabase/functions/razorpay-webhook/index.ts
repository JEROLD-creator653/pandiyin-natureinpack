import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

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

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature
    const expectedSignature = await hmacSha256(RAZORPAY_WEBHOOK_SECRET, rawBody);
    if (!secureCompare(expectedSignature, signature)) {
      console.error("Webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null;

    // Log webhook event
    try {
      await supabaseAdmin.from("payment_logs").insert({
        event_type: `webhook_${event}`,
        razorpay_order_id: paymentEntity?.order_id || null,
        razorpay_payment_id: paymentEntity?.id || null,
        amount: paymentEntity?.amount ? paymentEntity.amount / 100 : null,
        currency: paymentEntity?.currency || "INR",
        metadata: {
          event,
          status: paymentEntity?.status,
          method: paymentEntity?.method,
          error_code: paymentEntity?.error_code,
          error_description: paymentEntity?.error_description,
        },
        ip_address: clientIp,
      });
    } catch (logErr) {
      console.error("Failed to log webhook event:", logErr);
    }

    // Handle specific events
    if (event === "payment.captured" && paymentEntity) {
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;
      const paymentMode = paymentEntity.method || null;

      // Find the order by checking if stripe_payment_id is not yet set
      // or by matching the razorpay order notes
      if (razorpayOrderId) {
        // Look for orders where payment might not have been confirmed via frontend
        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select("id, payment_status")
          .eq("payment_status", "pending")
          .order("created_at", { ascending: false })
          .limit(50);

        // Since we store razorpay_payment_id as stripe_payment_id,
        // check if any pending order needs updating
        if (orders && orders.length > 0) {
          // Update any order that has this payment but wasn't confirmed
          const { data: existingLog } = await supabaseAdmin
            .from("payment_logs")
            .select("order_id")
            .eq("razorpay_order_id", razorpayOrderId)
            .eq("event_type", "order_created")
            .limit(1);

          if (existingLog && existingLog.length > 0 && existingLog[0].order_id) {
            const orderId = existingLog[0].order_id;
            
            // Only update if still pending (idempotent)
            await supabaseAdmin
              .from("orders")
              .update({
                payment_status: "paid",
                stripe_payment_id: razorpayPaymentId,
                payment_mode: paymentMode,
              })
              .eq("id", orderId)
              .eq("payment_status", "pending");
          }
        }
      }
    } else if (event === "payment.failed" && paymentEntity) {
      const razorpayOrderId = paymentEntity.order_id;
      if (razorpayOrderId) {
        const { data: existingLog } = await supabaseAdmin
          .from("payment_logs")
          .select("order_id")
          .eq("razorpay_order_id", razorpayOrderId)
          .eq("event_type", "order_created")
          .limit(1);

        if (existingLog && existingLog.length > 0 && existingLog[0].order_id) {
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "failed" })
            .eq("id", existingLog[0].order_id)
            .eq("payment_status", "pending");
        }
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
