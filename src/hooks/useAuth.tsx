import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signUpWithPhone: (phone: string, fullName: string) => Promise<{ error: any }>;
  signInWithPhone: (phone: string) => Promise<{ error: any }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: any }>;
  resendOtp: (phone: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helpers ──────────────────────────────────────────────────
/** Purge every stale Supabase key + our legacy custom key from localStorage */
function purgeStaleAuthKeys() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key === 'pandiyin_auth_session')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage may be unavailable (incognito, quota exceeded)
  }
}

/** Returns a valid session or null. Refreshes if the access token is expired / about to expire. */
async function getSafeSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // If token expires within 60 s, proactively refresh
    const expiresAt = session.expires_at ?? 0; // unix seconds
    const nowSec = Math.floor(Date.now() / 1000);

    if (expiresAt - nowSec > 60) {
      return session; // still fresh
    }

    // Try refresh
    const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
    if (error || !refreshed) {
      console.warn('[auth] Token refresh failed, signing out:', error?.message);
      purgeStaleAuthKeys();
      await supabase.auth.signOut();
      return null;
    }
    return refreshed;
  } catch (err) {
    console.error('[auth] getSafeSession error:', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    let mounted = true;

    // ── 1. Set up the auth state listener FIRST (Supabase best practice) ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (event === 'TOKEN_REFRESHED') {
          console.log('[auth] Token refreshed');
        }

        if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          return;
        }

        setSession(newSession);
        setUser(newSession.user ?? null);

        if (newSession.user) {
          // Use setTimeout to avoid Supabase deadlock when calling DB inside onAuthStateChange
          setTimeout(() => {
            if (mounted) checkAdmin(newSession.user.id);
          }, 0);
        }
      }
    );

    // ── 2. Then get the initial session with expiry check ──
    const initializeAuth = async () => {
      try {
        // Remove legacy custom key if it still exists
        try { localStorage.removeItem('pandiyin_auth_session'); } catch {}

        const safeSession = await getSafeSession();

        if (mounted) {
          setSession(safeSession);
          setUser(safeSession?.user ?? null);
          if (safeSession?.user) {
            await checkAdmin(safeSession.user.id);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('[auth] Initialization error:', error);
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error || !data?.url) return { error: error || new Error('No auth URL returned') };

    // Open Google login in a centered popup
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      data.url,
      'googleLogin',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
    );

    if (!popup) return { error: new Error('Popup blocked. Please allow popups for this site.') };

    // Poll until popup closes — session is picked up by onAuthStateChange
    // Use try/catch to handle COOP restrictions on popup.closed
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(timer);
            resolve();
          }
        } catch {
          // COOP policy blocks popup.closed access — fall back to timeout
          clearInterval(timer);
          resolve();
        }
      }, 500);
    });

    return { error: null };
  };

  const signUpWithPhone = async (phone: string, fullName: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    return { error };
  };

  const resendOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    purgeStaleAuthKeys();
    toast.success('Signed out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signUp, signIn, signInWithGoogle, signUpWithPhone, signInWithPhone, verifyOtp, resendOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
