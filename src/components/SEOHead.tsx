import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  ogImageWidth?: string;
  ogImageHeight?: string;
  noindex?: boolean;
  productMeta?: {
    price: number;
    currency?: string;
    availability?: 'in stock' | 'out of stock';
  };
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const SITE_NAME = 'PANDIYIN - Nature In Pack';
const DEFAULT_OG_IMAGE = '/logo.ico';
const SITE_URL = typeof window !== 'undefined' ? window.location.origin : '';

function setMeta(name: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export default function SEOHead({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage,
  ogImageWidth = '1200',
  ogImageHeight = '630',
  noindex = false,
  productMeta,
  jsonLd,
}: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    // Basic meta
    setMeta('description', description);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');
    setMeta('author', 'PANDIYIN');

    // Canonical
    const canonicalUrl = canonical || window.location.origin + window.location.pathname;
    setLink('canonical', canonicalUrl);

    // Open Graph
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:type', ogType, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:site_name', SITE_NAME, true);
    setMeta('og:locale', 'en_IN', true);
    const imageUrl = ogImage || `${window.location.origin}${DEFAULT_OG_IMAGE}`;
    setMeta('og:image', imageUrl, true);
    setMeta('og:image:width', ogImageWidth, true);
    setMeta('og:image:height', ogImageHeight, true);

    // Twitter
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', imageUrl);

    // Product meta
    if (productMeta) {
      setMeta('product:price:amount', String(productMeta.price), true);
      setMeta('product:price:currency', productMeta.currency || 'INR', true);
      setMeta('product:availability', productMeta.availability || 'in stock', true);
      setMeta('product:condition', 'new', true);
    }

    // JSON-LD
    // Remove old JSON-LD scripts
    document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());

    const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
    schemas.forEach((schema, i) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', String(i));
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());
    };
  }, [title, description, canonical, ogType, ogImage, ogImageWidth, ogImageHeight, noindex, productMeta, jsonLd]);

  return null;
}

// Reusable schema builders
export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PANDIYIN - Nature In Pack',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.ico`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
    },
    sameAs: [],
  };
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PANDIYIN - Nature In Pack',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBreadcrumbSchema(items: { name: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export function buildProductSchema(product: {
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  imageUrl?: string;
  images?: string[];
  inStock: boolean;
  category?: string;
  averageRating?: number;
  reviewCount?: number;
  url: string;
}) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    image: product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [],
    brand: { '@type': 'Brand', name: 'PANDIYIN' },
    offers: {
      '@type': 'Offer',
      url: product.url,
      priceCurrency: 'INR',
      price: product.price,
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'PANDIYIN - Nature In Pack' },
    },
  };

  if (product.averageRating && product.reviewCount && product.reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.averageRating,
      reviewCount: product.reviewCount,
    };
  }

  return schema;
}
