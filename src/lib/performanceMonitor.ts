/**
 * Performance Monitoring & Optimization Utilities
 * Measures loading times and helps identify bottlenecks
 * Use this to verify 33% improvement
 */

// Core Web Vitals timing
export interface PerformanceMetrics {
  // Time to First Contentful Paint
  fcp: number;
  // Largest Contentful Paint
  lcp: number;
  // Cumulative Layout Shift
  cls: number;
  // First Input Delay
  fid: number;
  // Total Blocking Time
  tbt: number;
  // Custom: Time to First Product
  tfp: number;
  // Custom: Loading Screen Duration
  loadingScreenDuration: number;
  // Custom: Data Load Time
  dataLoadTime: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private marks: Record<string, number> = {};
  private measurementStartTime = 0;

  /**
   * Mark start of a performance measurement
   */
  mark(name: string): void {
    this.marks[name] = performance.now();
  }

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string): number {
    if (!this.marks[startMark]) {
      console.warn(`Start mark '${startMark}' not found`);
      return 0;
    }
    const duration = performance.now() - this.marks[startMark];
    this.metrics[name as keyof PerformanceMetrics] = duration as any;
    return duration;
  }

  /**
   * Get Core Web Vitals
   */
  async getWebVitals(): Promise<Partial<PerformanceMetrics>> {
    return new Promise((resolve) => {
      // FCP
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcp) {
          this.metrics.fcp = fcp.startTime;
          fcpObserver.disconnect();
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // LCP
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = (lastEntry as any).renderTime || (lastEntry as any).loadTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        this.metrics.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // FID
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          this.metrics.fid = (entries[0] as any).processingDuration;
          fidObserver.disconnect();
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Resolve after 5 seconds of observation
      setTimeout(() => {
        fcpObserver.disconnect();
        lcpObserver.disconnect();
        clsObserver.disconnect();
        resolve(this.metrics);
      }, 5000);
    });
  }

  /**
   * Measure loading screen duration
   */
  startLoadingScreen(): void {
    this.mark('loading-screen-start');
  }

  endLoadingScreen(): number {
    return this.measure('loadingScreenDuration', 'loading-screen-start');
  }

  /**
   * Measure data load time
   */
  startDataLoad(): void {
    this.mark('data-load-start');
  }

  endDataLoad(): number {
    return this.measure('dataLoadTime', 'data-load-start');
  }

  /**
   * Measure time to first product rendered
   */
  startFirstProduct(): void {
    this.mark('first-product-start');
  }

  endFirstProduct(): number {
    return this.measure('tfp', 'first-product-start');
  }

  /**
   * Get all metrics
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return this.metrics;
  }

  /**
   * Log metrics to console
   */
  logMetrics(): void {
    console.group('Performance Metrics');
    console.table(this.metrics);
    console.groupEnd();
  }

  /**
   * Send metrics to analytics
   */
  async sendToAnalytics(endpoint: string): Promise<void> {
    try {
      const vitals = await this.getWebVitals();
      const allMetrics = { ...this.metrics, ...vitals };

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allMetrics),
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to send metrics:', error);
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance Checklist for 33% improvement
 * ✅ = Implemented
 * 🔄 = In Progress
 * ❌ = Not Started
 */
export const PERFORMANCE_CHECKLIST = {
  loading_screen: {
    '✅ Reduce minLoadDuration to 700ms': true,
    '✅ Reduce maxLoadDuration to 1200ms': true,
    '🔄 Progressive content rendering': false,
    '❌ Early exit when critical data ready': false,
  },
  data_fetching: {
    '✅ IndexedDB caching for products': true,
    '🔄 Parallel data fetching': false,
    '❌ Query deduplication': false,
    '❌ Request batching': false,
  },
  image_optimization: {
    '✅ Hero banner eager loading': true,
    '🔄 Lazy loading for below-fold images': false,
    '❌ Image compression (WebP)': false,
    '❌ Responsive images (srcset)': false,
  },
  caching: {
    '✅ IndexedDB implementation': true,
    '❌ Service Worker caching': false,
    '❌ HTTP cache headers': false,
    '❌ Query result caching': false,
  },
};

/**
 * Generate performance report
 */
export function generatePerformanceReport(): string {
  const metrics = performanceMonitor.getMetrics();
  
  return `
╔════════════════════════════════════════════╗
║     PANDIYIN PERFORMANCE REPORT             ║
╚════════════════════════════════════════════╝

📊 METRICS:
  • Loading Screen Duration: ${metrics.loadingScreenDuration?.toFixed(0) || 'N/A'}ms
  • Data Load Time: ${metrics.dataLoadTime?.toFixed(0) || 'N/A'}ms
  • Time to First Product: ${metrics.tfp?.toFixed(0) || 'N/A'}ms
  • First Contentful Paint: ${metrics.fcp?.toFixed(0) || 'N/A'}ms
  • Largest Contentful Paint: ${metrics.lcp?.toFixed(0) || 'N/A'}ms

🎯 OPTIMIZATION STATUS:
${Object.entries(PERFORMANCE_CHECKLIST).map(([category, items]) => {
  return `\n  ${category.toUpperCase().replace(/_/g, ' ')}:\n` +
    Object.entries(items as Record<string, boolean>)
      .map(([item, done]) => `    ${item} ${done ? '✓' : '○'}`)
      .join('\n');
}).join('')}

🚀 ESTIMATED IMPROVEMENT:
  • Target Reduction: 33% (from 2-3s to 1.3-1.8s)
  • Current Loading Screen: ${metrics.loadingScreenDuration?.toFixed(0) || '?'}ms
  • Estimated After: ${metrics.loadingScreenDuration ? (metrics.loadingScreenDuration * 0.67).toFixed(0) : '?'}ms

📋 NEXT STEPS:
  1. Run Lighthouse audit (Performance tab)
  2. Monitor Core Web Vitals in Google Analytics
  3. Profile with DevTools (Performance tab)
  4. Test on slow 3G network
`;
}
