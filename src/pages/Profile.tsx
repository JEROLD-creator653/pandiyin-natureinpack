import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { clearAllCache } from '@/lib/cacheService';
import AddressManager from '@/components/AddressManager';
import { Loader } from '@/components/ui/loader';
import SEOHead from '@/components/SEOHead';

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Wait for auth loading to complete before redirecting
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    // Only load profile if user exists
    if (user) {
      setEmail(user.email || '');
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data) {
          setFullName(data.full_name || '');
          setPhone(data.phone || '');
        }
      });
    }
  }, [user, loading]);

  const queryClient = useQueryClient();

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('user_id', user.id);
    if (error) {
      setSaving(false);
      toast({ title: 'Failed to update profile', variant: 'destructive' });
      return;
    }

    // Sync the updated name into all existing reviews by this user
    await (supabase as any)
      .from('product_reviews')
      .update({ user_name: fullName })
      .eq('user_id', user.id);

    // Invalidate all cached data so other pages reflect the change
    await clearAllCache();
    queryClient.invalidateQueries();

    setSaving(false);
    toast({ title: 'Profile updated successfully!' });
  };

  // Show loading state while auth is initializing
  if (loading) {
    return <Loader text="Loading your data..." className="min-h-[60vh]" delay={200} />;
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-2xl">
      <SEOHead title="My Profile" description="Manage your PANDIYIN account profile and addresses." noindex />
      <h1 className="text-3xl font-display font-bold mb-8">My Profile</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" /> Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">Email</Label>
              <Input value={email} disabled className="bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm">Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter your Mobile Number" />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" /> My Addresses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddressManager />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
