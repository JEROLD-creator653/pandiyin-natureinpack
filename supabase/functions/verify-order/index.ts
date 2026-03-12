import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// State → zone mapping
const STATE_ZONES: Record<string, string> = {};
['Tamil Nadu', 'Puducherry', 'Pondicherry'].forEach(s => STATE_ZONES[s] = 'local');
['Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana'].forEach(s => STATE_ZONES[s] = 'nearby');
// Everything else → rest_of_india (handled by default)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { cart_items, delivery_state, coupon_code } = await req.json();

    if (!cart_items || !Array.isArray(cart_items) || cart_items.length === 0) {
      return new Response(JSON.stringify({ error: 'Cart is empty' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!delivery_state || typeof delivery_state !== 'string') {
      return new Response(JSON.stringify({ error: 'Delivery state is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch latest product data
    const productIds = cart_items.map((i: any) => i.product_id);
    const { data: products, error: prodErr } = await adminClient
      .from('products')
      .select('id, price, stock_quantity, is_available, weight_kg, gst_percentage, hsn_code, tax_inclusive, name')
      .in('id', productIds);

    if (prodErr) throw prodErr;

    const productMap = new Map(products?.map(p => [p.id, p]) || []);

    // Validate all products
    const errors: string[] = [];
    const verifiedItems: any[] = [];
    let totalWeightKg = 0;
    let subtotal = 0;

    for (const item of cart_items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        errors.push(`Product ${item.product_id} not found`);
        continue;
      }
      if (!product.is_available) {
        errors.push(`${product.name} is no longer available`);
        continue;
      }
      if (item.quantity > product.stock_quantity) {
        errors.push(`${product.name}: only ${product.stock_quantity} in stock (requested ${item.quantity})`);
        continue;
      }
      const weightKg = Number(product.weight_kg) || 0;
      if (weightKg <= 0) {
        errors.push(`${product.name}: weight not configured`);
        continue;
      }
      totalWeightKg += weightKg * item.quantity;
      subtotal += Number(product.price) * item.quantity;
      verifiedItems.push({
        product_id: product.id,
        product_name: product.name,
        product_price: Number(product.price),
        quantity: item.quantity,
        total: Number(product.price) * item.quantity,
        gst_percentage: Number(product.gst_percentage) || 5,
        hsn_code: product.hsn_code || '',
        tax_inclusive: product.tax_inclusive ?? true,
        weight_kg: weightKg,
      });
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ valid: false, errors }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Calculate delivery charge
    const chargedWeight = totalWeightKg > 0 ? Math.ceil(totalWeightKg) : 0;
    const zone = STATE_ZONES[delivery_state.trim()] || 'rest_of_india';

    // Fetch shipping regions from DB
    const { data: regions } = await adminClient
      .from('shipping_regions')
      .select('*')
      .eq('is_enabled', true);

    let perKgRate = 150; // default rest_of_india
    let freeAbove: number | null = null;

    if (regions) {
      const regionMatch = regions.find((r: any) => r.region_key === zone);
      if (regionMatch) {
        perKgRate = Number(regionMatch.per_kg_rate) || perKgRate;
        freeAbove = regionMatch.free_delivery_above ? Number(regionMatch.free_delivery_above) : null;
      }
    }

    let deliveryCharge = 0;
    if (chargedWeight > 0) {
      if (freeAbove !== null && subtotal >= freeAbove) {
        deliveryCharge = 0;
      } else {
        deliveryCharge = chargedWeight * perKgRate;
      }
    }

    let discount = 0;
    if (coupon_code && typeof coupon_code === 'string') {
      const { data: couponData, error: couponErr } = await adminClient.rpc('validate_coupon', {
        _coupon_code: coupon_code.toUpperCase(),
        _user_id: user.id,
        _order_total: subtotal
      });
      if (!couponErr && couponData && couponData.length > 0 && couponData[0].is_valid) {
        const validation = couponData[0];
        discount = validation.discount_type === 'percentage'
          ? (subtotal * Number(validation.discount_value)) / 100
          : Number(validation.discount_value);
      } else if (couponErr || !couponData || couponData.length === 0 || !couponData[0].is_valid) {
        return new Response(JSON.stringify({
          valid: false,
          errors: [couponData?.[0]?.error_message || 'Invalid coupon']
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const grandTotal = subtotal - discount + deliveryCharge;

    return new Response(JSON.stringify({
      valid: true,
      subtotal,
      total_weight_kg: totalWeightKg,
      charged_weight: chargedWeight,
      delivery_zone: zone,
      delivery_charge: deliveryCharge,
      discount: discount,
      grand_total: grandTotal,
      items: verifiedItems,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
