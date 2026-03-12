import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clearAllCache } from '@/lib/cacheService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminSettings() {
  const [store, setStore] = useState({ store_name: '', phone: '', whatsapp: '', email: '', address: '', gst_enabled: false, gst_number: '' });
  const [storeId, setStoreId] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.from('store_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setStore({
          store_name: data.store_name,
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          email: data.email || '',
          address: data.address || '',
          gst_enabled: (data as any).gst_enabled || false,
          gst_number: (data as any).gst_number || '',
        });
        setStoreId(data.id);
      }
    });
  }, []);

  const saveStore = async () => {
    setSaving(true);
    const { error } = await supabase.from('store_settings').update({
      phone: store.phone,
      whatsapp: store.whatsapp,
      email: store.email,
      address: store.address,
      gst_enabled: store.gst_enabled,
      gst_number: store.gst_number,
    } as any).eq('id', storeId);

    if (error) {
      toast({ title: 'Failed to save settings', description: error.message, variant: 'destructive' });
    } else {
      await clearAllCache();
      await queryClient.invalidateQueries();
      toast({ title: 'Store settings saved' });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Store Name</Label>
            <Input value={store.store_name} disabled className="bg-muted cursor-not-allowed" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Phone</Label><Input value={store.phone} onChange={e => setStore(s => ({ ...s, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>WhatsApp</Label><Input value={store.whatsapp} onChange={e => setStore(s => ({ ...s, whatsapp: e.target.value }))} /></div>
          </div>
          <div className="space-y-2"><Label>Email</Label><Input value={store.email} onChange={e => setStore(s => ({ ...s, email: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Address</Label><Input value={store.address} onChange={e => setStore(s => ({ ...s, address: e.target.value }))} /></div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">GST Settings</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Enable GST billing for invoices</p>
              </div>
              <Switch checked={store.gst_enabled} onCheckedChange={v => setStore(s => ({ ...s, gst_enabled: v }))} />
            </div>
            {store.gst_enabled && (
              <div className="space-y-3 pl-1 border-l-2 border-primary/20 ml-1">
                <div className="pl-3 space-y-2">
                  <Label className="text-xs">GST Number (GSTIN)</Label>
                  <Input value={store.gst_number} onChange={e => setStore(s => ({ ...s, gst_number: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
                  <p className="text-[10px] text-muted-foreground mt-1">GST percentage is set per-product in the Products section</p>
                </div>
              </div>
            )}
          </div>

          <Button onClick={saveStore} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Store Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
