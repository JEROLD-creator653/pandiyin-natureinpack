/**
 * Safety patches for third-party scripts (Razorpay checkout SDK).
 *
 * Razorpay's checkout.js loads sub-scripts (track, bundle.min.js,
 * loader.min.js, v2-entry.modern.js) that may:
 *   1. Access CORS-restricted response headers (e.g. x-rtb-fingerprint-id)
 *   2. Call browser APIs that throw in certain security contexts
 *
 * This module patches the relevant browser APIs so those calls fail
 * gracefully instead of surfacing console errors, without disabling
 * any analytics or tracking functionality.
 *
 * Must be called BEFORE any Razorpay script is loaded.
 */

const RAZORPAY_SCRIPT_PATTERNS = [
  'razorpay.com',
  'bundle.min.js',
  'loader.min.js',
  'v2-entry',
  '/track',
];

function isThirdPartyScriptError(source: string | undefined): boolean {
  if (!source) return false;
  return RAZORPAY_SCRIPT_PATTERNS.some((p) => source.includes(p));
}

export function installThirdPartySafetyPatch(): void {
  // 1. Patch Headers.prototype.get to safely handle CORS-opaque headers
  const originalHeadersGet = Headers.prototype.get;
  Headers.prototype.get = function safeHeadersGet(name: string): string | null {
    try {
      return originalHeadersGet.call(this, name);
    } catch {
      // Header access blocked by browser CORS policy — return null silently
      return null;
    }
  };

  // 2. Patch Headers.prototype.has for the same reason
  const originalHeadersHas = Headers.prototype.has;
  Headers.prototype.has = function safeHeadersHas(name: string): boolean {
    try {
      return originalHeadersHas.call(this, name);
    } catch {
      return false;
    }
  };

  // 3. Suppress uncaught errors originating from known third-party scripts
  window.addEventListener(
    'error',
    (event: ErrorEvent) => {
      if (isThirdPartyScriptError(event.filename)) {
        event.preventDefault();
      }
    },
    true, // capture phase so we intercept before console
  );

  // 4. Suppress unhandled promise rejections from those scripts
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    if (reason instanceof Error && isThirdPartyScriptError(reason.stack)) {
      event.preventDefault();
    }
    // Also catch rejection messages mentioning restricted header names
    if (typeof reason === 'string' && reason.includes('x-rtb-fingerprint-id')) {
      event.preventDefault();
    }
  });
}
