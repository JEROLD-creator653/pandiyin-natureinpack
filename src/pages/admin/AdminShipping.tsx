import { useEffect, useState } from 'react';
import { Save, Truck, Package, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ButtonLoader } from '@/components/ui/loader';

interface ShippingRegion {
  id: string;
  region_name: string;
  region_key: string;
  states: string[];
  base_charge: number;
  per_kg_rate: number;
  free_delivery_above: number | null;
  is_enabled: boolean;
  sort_order: number;
}

export default function AdminShipping() {
  const [regions, setRegions] = useState<ShippingRegion[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    const { data, error } = await supabase
      .from('shipping_regions')
      .select('*')
      .order('sort_order');
    if (error) {
      toast({ title: 'Failed to load shipping regions', variant: 'destructive' });
      return;
    }
    setRegions((data || []).map((r: any) => ({
      ...r,
      base_charge: Number(r.base_charge),
      per_kg_rate: Number(r.per_kg_rate),
      free_delivery_above: r.free_delivery_above ? Number(r.free_delivery_above) : null,
    })));
    setLoading(false);
  };

  const updateRegion = (id: string, field: string, value: any) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const region of regions) {
        const { error } = await supabase
          .from('shipping_regions')
          .update({
            per_kg_rate: region.per_kg_rate,
            base_charge: region.base_charge,
            free_delivery_above: region.free_delivery_above,
            is_enabled: region.is_enabled,
          })
          .eq('id', region.id);
        if (error) throw error;
      }
      toast({ title: 'Shipping settings saved successfully!' });
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading shipping settings...</div>;
  }

  const zoneIcons: Record<string, string> = {
    local: '🏠',
    nearby: '🚛',
    rest_of_india: '🇮🇳',
    international: '🌍',
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Shipping & Delivery</h1>
            <p className="text-sm text-muted-foreground">Configure delivery zones, rates per kg, and free delivery thresholds</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Package className="h-4 w-4" /> How Delivery Charges Work</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Total weight = sum of (product weight × quantity)</li>
            <li>Charged weight = total weight rounded UP to nearest kg (min 1 kg)</li>
            <li><strong>Delivery charge = charged weight × rate per kg</strong></li>
            <li>If order exceeds the free delivery threshold, delivery is FREE</li>
          </ul>
        </CardContent>
      </Card>

      {regions.map(region => (
        <Card key={region.id} className={!region.is_enabled ? 'opacity-60' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{zoneIcons[region.region_key] || '📦'}</span>
                  {region.region_name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {region.states.length > 0
                    ? region.states.join(', ')
                    : region.region_key === 'rest_of_india'
                      ? 'All other Indian states'
                      : 'No states assigned'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`enabled-${region.id}`} className="text-xs text-muted-foreground">
                  {region.is_enabled ? 'Active' : 'Disabled'}
                </Label>
                <Switch
                  id={`enabled-${region.id}`}
                  checked={region.is_enabled}
                  onCheckedChange={(checked) => updateRegion(region.id, 'is_enabled', checked)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium">Rate per kg (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={region.per_kg_rate}
                  onChange={e => updateRegion(region.id, 'per_kg_rate', Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  E.g. 2 kg order = ₹{region.per_kg_rate * 2}
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium">Base Charge (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={region.base_charge}
                  onChange={e => updateRegion(region.id, 'base_charge', Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Added on top of weight charge
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium">Free Delivery Above (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={region.free_delivery_above ?? ''}
                  placeholder="No free delivery"
                  onChange={e => {
                    const val = e.target.value;
                    updateRegion(region.id, 'free_delivery_above', val === '' ? null : Number(val));
                  }}
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leave empty for no free delivery
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> Zone Mapping</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Local:</strong> Tamil Nadu, Puducherry — lowest rates, free delivery option</p>
            <p><strong>Nearby:</strong> Kerala, Karnataka, Andhra Pradesh, Telangana</p>
            <p><strong>Rest of India:</strong> All other states and union territories</p>
          </div>
        </CardContent>
      </Card>

      {/* Sticky Save Button */}
      <div className="sticky bottom-4 z-10 flex sm:justify-end mt-4">
        <div className="bg-background/80 backdrop-blur-md p-2 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 w-full sm:w-auto">
          <Button onClick={saveAll} disabled={saving} size="lg" className="w-full sm:w-auto font-medium">
            {saving ? <ButtonLoader text="Saving..." /> : <><Save className="h-5 w-5 mr-2" /> Save Changes</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
