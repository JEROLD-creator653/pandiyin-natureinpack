/**
 * Performance utilities for document head optimization
 * - Preload critical resources
 * - DNS prefetch external services
 * - Prefetch next likely pages
 */

export function setupPerformanceOptimizations() {
  // Prefetch DNS for external services
  const dns = [
    'https://cdn.supabase.io',
  ];

  dns.forEach((hostname) => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = hostname;
    document.head.appendChild(link);
  });

  // Preconnect to Supabase (actual project URL for storage/API)
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'adgihdeigquuoozmvfai'}.supabase.co`;
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);
}

/**
 * Optimize LCP (Largest Contentful Paint) by preloading critical images
 */
export function preloadCriticalImages(imageUrls: string[]) {
  imageUrls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.type = 'image/webp';
    document.head.appendChild(link);
  });
}

/**
 * Lazy load non-critical CSS
 */
export function lazyLoadCSS(href: string) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };
  document.head.appendChild(link);
}

/**
 * Monitor Web Vitals silently (no console.log in production)
 */
export function trackWebVitals() {
  // Web Vitals tracking is handled by browser DevTools and Lighthouse
  // No runtime logging needed — reduces console noise
}
