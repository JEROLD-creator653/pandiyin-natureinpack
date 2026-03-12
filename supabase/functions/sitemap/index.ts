import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://pandiyin-natureinpack.vercel.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch products
    const { data: products } = await supabase
      .from("products")
      .select("id, name, updated_at, image_url, images, is_available")
      .eq("is_available", true)
      .order("created_at", { ascending: false });

    // Fetch categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, created_at")
      .order("sort_order");

    const now = new Date().toISOString().split("T")[0];

    // Static pages
    const staticPages = [
      { loc: "/", changefreq: "daily", priority: "1.0", lastmod: now },
      { loc: "/products", changefreq: "daily", priority: "0.9", lastmod: now },
      { loc: "/about", changefreq: "monthly", priority: "0.5", lastmod: now },
      { loc: "/privacy-policy", changefreq: "monthly", priority: "0.3", lastmod: now },
      { loc: "/terms", changefreq: "monthly", priority: "0.3", lastmod: now },
      { loc: "/return-refund", changefreq: "monthly", priority: "0.3", lastmod: now },
      { loc: "/shipping-policy", changefreq: "monthly", priority: "0.3", lastmod: now },
      { loc: "/cancellation-policy", changefreq: "monthly", priority: "0.3", lastmod: now },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // Static pages
    for (const page of staticPages) {
      xml += `
  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Category pages
    if (categories) {
      for (const cat of categories) {
        const lastmod = cat.created_at ? cat.created_at.split("T")[0] : now;
        xml += `
  <url>
    <loc>${SITE_URL}/products?category=${encodeURIComponent(cat.name)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    // Product pages with image sitemaps
    if (products) {
      for (const p of products) {
        const lastmod = p.updated_at ? p.updated_at.split("T")[0] : now;
        const allImages: string[] = [];
        if (p.image_url) allImages.push(p.image_url);
        if (p.images && Array.isArray(p.images)) {
          for (const img of p.images) {
            if (img && !allImages.includes(img)) allImages.push(img);
          }
        }

        xml += `
  <url>
    <loc>${SITE_URL}/products/${p.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>`;

        for (const img of allImages) {
          xml += `
    <image:image>
      <image:loc>${escapeXml(img)}</image:loc>
      <image:title>${escapeXml(p.name)}</image:title>
    </image:image>`;
        }

        xml += `
  </url>`;
      }
    }

    xml += `
</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response("Error generating sitemap", { status: 500 });
  }
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
