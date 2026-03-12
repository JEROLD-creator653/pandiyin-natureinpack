/**
 * authenticatedFetch — wraps fetch() with a fresh Supabase Bearer token.
 * Retries once on HTTP 401 after refreshing the token.
 */
import { supabase } from '@/integrations/supabase/client';

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  // If token is about to expire, refresh first
  const expiresAt = session.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);

  if (expiresAt - nowSec > 60) {
    return session.access_token;
  }

  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  return refreshed?.access_token ?? null;
}

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, { ...options, headers });

  // Retry once on 401 with a refreshed token
  if (response.status === 401 && token) {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    if (refreshed?.access_token) {
      headers.set('Authorization', `Bearer ${refreshed.access_token}`);
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
}
