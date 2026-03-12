import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pincode } = await req.json();

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return new Response(JSON.stringify({ error: 'Valid 6-digit pincode is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Server-to-server request — no CORS restrictions
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`External API error: ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error('Pincode proxy error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
