import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiter per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per minute per user

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cart_items, delivery_state, currency = "INR", receipt, notes, coupon_code } = await req.json();

    // Validate inputs
    if (!cart_items || !Array.isArray(cart_items) || cart_items.length === 0) {
      return new Response(JSON.stringify({ error: "Cart is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cart_items.length > 50) {
      return new Response(JSON.stringify({ error: "Too many items in cart" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!delivery_state || typeof delivery_state !== "string") {
      return new Response(JSON.stringify({ error: "Delivery state is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate cart item structure
    for (const item of cart_items) {
      if (!item.product_id || typeof item.product_id !== "string") {
        return new Response(JSON.stringify({ error: "Invalid product ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100) {
        return new Response(JSON.stringify({ error: "Invalid quantity" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Server-side price calculation — never trust client amount
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const productIds = cart_items.map((i: any) => i.product_id);
    const { data: products, error: prodErr } = await adminClient
      .from("products")
      .select("id, price, stock_quantity, is_available, weight_kg, name")
      .in("id", productIds);

    if (prodErr || !products) {
      return new Response(JSON.stringify({ error: "Failed to fetch products" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productMap = new Map(products.map((p: any) => [p.id, p]));
    let subtotal = 0;
    let totalWeightKg = 0;

    for (const item of cart_items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return new Response(JSON.stringify({ error: `Product not found: ${item.product_id}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!product.is_available) {
        return new Response(JSON.stringify({ error: `${product.name} is no longer available` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (item.quantity > product.stock_quantity) {
        return new Response(JSON.stringify({ error: `${product.name}: only ${product.stock_quantity} in stock` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      subtotal += Number(product.price) * item.quantity;
      totalWeightKg += (Number(product.weight_kg) || 0) * item.quantity;
    }

    // Calculate delivery charge server-side
    const STATE_ZONES: Record<string, string> = {};
    ["Tamil Nadu", "Puducherry", "Pondicherry"].forEach((s) => (STATE_ZONES[s] = "local"));
    ["Kerala", "Karnataka", "Andhra Pradesh", "Telangana"].forEach((s) => (STATE_ZONES[s] = "nearby"));

    const zone = STATE_ZONES[delivery_state.trim()] || "rest_of_india";
    const chargedWeight = totalWeightKg > 0 ? Math.ceil(totalWeightKg) : 0;

    const { data: regions } = await adminClient
      .from("shipping_regions")
      .select("*")
      .eq("is_enabled", true);

    let perKgRate = 150;
    let freeAbove: number | null = null;

    if (regions) {
      const regionMatch = regions.find((r: any) => r.region_key === zone);
      if (regionMatch) {
        perKgRate = Number(regionMatch.per_kg_rate) || perKgRate;
        freeAbove = regionMatch.free_delivery_above ? Number(regionMatch.free_delivery_above) : null;
      }
    }

    let deliveryCharge = 0;
    if (chargedWeight > 0 && !(freeAbove !== null && subtotal >= freeAbove)) {
      deliveryCharge = chargedWeight * perKgRate;
    }

    let discount = 0;
    if (coupon_code && typeof coupon_code === 'string') {
      const { data: couponData, error: couponErr } = await adminClient.rpc('validate_coupon', {
        _coupon_code: coupon_code.toUpperCase(),
        _user_id: userId,
        _order_total: subtotal
      });
      if (!couponErr && couponData && couponData.length > 0 && couponData[0].is_valid) {
        const validation = couponData[0];
        discount = validation.discount_type === 'percentage'
          ? (subtotal * Number(validation.discount_value)) / 100
          : Number(validation.discount_value);
      } else if (couponErr || !couponData || couponData.length === 0 || !couponData[0].is_valid) {
        return new Response(JSON.stringify({ error: couponData?.[0]?.error_message || "Invalid coupon" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const serverTotal = subtotal + deliveryCharge - discount;

    if (serverTotal <= 0) {
      return new Response(JSON.stringify({ error: "Invalid order total" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Razorpay keys from environment ONLY — no hardcoded fallbacks
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID) {
      console.error("RAZORPAY_KEY_ID not configured");
      throw new Error("Payment gateway not configured");
    }
    if (!RAZORPAY_KEY_SECRET) {
      console.error("RAZORPAY_KEY_SECRET not configured");
      throw new Error("Payment gateway not configured");
    }

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(serverTotal * 100), // paise
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: { user_id: userId, ...(notes || {}) },
      }),
    });

    const razorpayOrder = await razorpayRes.json();

    if (!razorpayRes.ok) {
      console.error("Razorpay error:", razorpayOrder);
      return new Response(
        JSON.stringify({ error: razorpayOrder.error?.description || "Failed to create order" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log order creation event
    try {
      await adminClient.from("payment_logs").insert({
        user_id: userId,
        event_type: "order_created",
        razorpay_order_id: razorpayOrder.id,
        amount: serverTotal,
        currency,
        metadata: {
          subtotal,
          delivery_charge: deliveryCharge,
          delivery_state: delivery_state,
          items_count: cart_items.length,
        },
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      });
    } catch (logErr) {
      console.error("Failed to log payment event:", logErr);
      // Don't fail the request for logging errors
    }

    return new Response(JSON.stringify({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: RAZORPAY_KEY_ID, // Return public key so frontend doesn't need to hardcode it
      server_total: serverTotal,
      server_subtotal: subtotal,
      server_delivery_charge: deliveryCharge,
      server_discount: discount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
