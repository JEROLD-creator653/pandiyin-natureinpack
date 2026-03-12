import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [verifiedAdmin, setVerifiedAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || !user) {
      setVerifiedAdmin(null);
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        // Server-side verification via the has_role RPC (runs against RLS)
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });

        if (!cancelled) {
          setVerifiedAdmin(!error && data === true);
        }
      } catch {
        if (!cancelled) setVerifiedAdmin(false);
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [user, loading]);

  if (loading || verifiedAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!verifiedAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
