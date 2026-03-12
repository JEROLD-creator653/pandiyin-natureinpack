/**
 * Admin GST Settings Panel
 * Configure GST, business details, and shipping settings
 */

import { useEffect, useState } from 'react';
import { Settings, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { validateGSTNumber } from '@/lib/gstCalculations';

interface GSTSettings {
  id: string;
  business_name: string;
  business_address: string;
  state: string;
  gst_number: string;
  gst_enabled: boolean;
  invoice_prefix: string;
  supported_gst_rates: number[];
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli',
  'Daman and Diu',
  'Delhi',
  'Lakshadweep',
  'Puducherry',
];

export default function AdminGSTSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GSTSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('gst_settings').select('*').single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSettings(
        data || {
          id: '',
          business_name: 'Pandiyin Organic',
          business_address: '',
          state: 'Tamil Nadu',
          gst_number: '',
          gst_enabled: true,
          invoice_prefix: 'INV',
          supported_gst_rates: [0, 5, 12, 18],
        }
      );
      setValidationErrors({});
    } catch (error) {
      toast.error('Failed to load GST settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = (): boolean => {
    const errors: Record<string, string> = {};

    if (!settings?.business_name?.trim()) {
      errors.business_name = 'Business name is required';
    }

    if (!settings?.business_address?.trim()) {
      errors.business_address = 'Business address is required';
    }

    if (!settings?.state?.trim()) {
      errors.state = 'State is required';
    }

    if (settings?.gst_enabled && settings.gst_number) {
      if (!validateGSTNumber(settings.gst_number)) {
        errors.gst_number = 'Invalid GST number format (should be 15 characters)';
      }
    }

    if (!settings?.invoice_prefix?.trim()) {
      errors.invoice_prefix = 'Invoice prefix is required';
    }

    if (settings?.invoice_prefix?.length > 10) {
      errors.invoice_prefix = 'Invoice prefix should be max 10 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateSettings()) {
      toast.error('Please fix validation errors');
      return;
    }

    if (!settings) return;

    try {
      setSaving(true);

      if (settings.id) {
        const { error } = await supabase
          .from('gst_settings')
          .update({
            business_name: settings.business_name,
            business_address: settings.business_address,
            state: settings.state,
            gst_number: settings.gst_number,
            gst_enabled: settings.gst_enabled,
            invoice_prefix: settings.invoice_prefix,
            supported_gst_rates: settings.supported_gst_rates,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('gst_settings').insert({
          business_name: settings.business_name,
          business_address: settings.business_address,
          state: settings.state,
          gst_number: settings.gst_number,
          gst_enabled: settings.gst_enabled,
          invoice_prefix: settings.invoice_prefix,
          supported_gst_rates: settings.supported_gst_rates,
        });

        if (error) throw error;
      }

      toast.success('GST settings saved successfully');
      loadSettings();
    } catch (error) {
      toast.error('Failed to save GST settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">GST & Shipping Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure GST rates, business details, and tax calculations
          </p>
        </div>
      </div>

      {/* GST Status Alert */}
      {settings?.gst_enabled ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            GST is enabled. Tax will be calculated on all orders.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            GST is disabled. No tax will be calculated on orders.
          </AlertDescription>
        </Alert>
      )}

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Your business details for invoices and GST compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business-name">Business Name *</Label>
              <Input
                id="business-name"
                value={settings?.business_name || ''}
                onChange={(e) =>
                  setSettings({ ...settings!, business_name: e.target.value })
                }
                placeholder="Pandiyin Organic"
                className={validationErrors.business_name ? 'border-red-500' : ''}
              />
              {validationErrors.business_name && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.business_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state">Business State *</Label>
              <Select
                value={settings?.state || 'Tamil Nadu'}
                onValueChange={(value) =>
                  setSettings({ ...settings!, state: value })
                }
              >
                <SelectTrigger id="state" className={validationErrors.state ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.state && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.state}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="business-address">Business Address *</Label>
            <textarea
              id="business-address"
              value={settings?.business_address || ''}
              onChange={(e) =>
                setSettings({ ...settings!, business_address: e.target.value })
              }
              placeholder="Enter your business address"
              className={`w-full px-3 py-2 border rounded-md text-sm font-sans ${
                validationErrors.business_address ? 'border-red-500' : 'border-input'
              }`}
              rows={3}
            />
            {validationErrors.business_address && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.business_address}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* GST Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>GST Configuration</CardTitle>
          <CardDescription>Enable GST and set your GSTIN details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div>
              <Label className="text-base cursor-pointer">Enable GST Tax System</Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, GST will be calculated on all orders
              </p>
            </div>
            <Switch
              checked={settings?.gst_enabled || false}
              onCheckedChange={(checked) =>
                setSettings({ ...settings!, gst_enabled: checked })
              }
            />
          </div>

          {settings?.gst_enabled && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="gst-number">GST Number (GSTIN)</Label>
                <Input
                  id="gst-number"
                  value={settings?.gst_number || ''}
                  onChange={(e) =>
                    setSettings({ ...settings!, gst_number: e.target.value.toUpperCase() })
                  }
                  placeholder="27AAAA0000A1Z5"
                  maxLength={15}
                  className={validationErrors.gst_number ? 'border-red-500' : ''}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: 2 state code + 5 char name + 4 digit number + 1 letter (15 chars total)
                </p>
                {validationErrors.gst_number && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.gst_number}</p>
                )}
                {settings.gst_number && validateGSTNumber(settings.gst_number) && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Valid GST format
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Settings</CardTitle>
          <CardDescription>Configure invoice numbering and supported GST rates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="invoice-prefix">Invoice Prefix *</Label>
            <Input
              id="invoice-prefix"
              value={settings?.invoice_prefix || 'INV'}
              onChange={(e) =>
                setSettings({
                  ...settings!,
                  invoice_prefix: e.target.value.toUpperCase().slice(0, 10),
                })
              }
              placeholder="INV"
              maxLength={10}
              className={validationErrors.invoice_prefix ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used as prefix for invoice numbers (e.g., INV000001)
            </p>
            {validationErrors.invoice_prefix && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.invoice_prefix}</p>
            )}
          </div>

          <div>
            <Label className="mb-3 block">Supported GST Rates</Label>
            <div className="flex flex-wrap gap-2">
              {[0, 5, 12, 18].map((rate) => (
                <Badge
                  key={rate}
                  variant={
                    settings?.supported_gst_rates?.includes(rate) ? 'default' : 'outline'
                  }
                  className="cursor-pointer px-3 py-1"
                  onClick={() => {
                    const rates = settings?.supported_gst_rates || [];
                    if (rates.includes(rate)) {
                      setSettings({
                        ...settings!,
                        supported_gst_rates: rates.filter((r) => r !== rate),
                      });
                    } else {
                      setSettings({
                        ...settings!,
                        supported_gst_rates: [...rates, rate].sort((a, b) => a - b),
                      });
                    }
                  }}
                >
                  GST {rate}%
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Click to toggle GST rates available for products (typically 0%, 5% for essential
              items, 12%, 18% for others)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Information */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Configuration</CardTitle>
          <CardDescription>Current shipping rates managed from Shipping Regions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="font-medium mb-1">Tamil Nadu & Pondicherry (Local)</p>
              <p className="text-muted-foreground">
                Base Charge: ₹40 | Free above ₹499 | GST: CGST + SGST
              </p>
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="font-medium mb-1">Other Indian States</p>
              <p className="text-muted-foreground">
                Base Charge: ₹80 | No free shipping | GST: IGST
              </p>
            </div>
            <Button variant="outline" className="w-full mt-4">
              Manage Shipping Regions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => loadSettings()}>
          Discard Changes
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">About GST Calculation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>CGST + SGST:</strong> Applied for delivery within Tamil Nadu & Puducherry
            (same state). Split 50-50 (e.g., 5% GST = 2.5% CGST + 2.5% SGST)
          </p>
          <p>
            <strong>IGST:</strong> Applied for inter-state delivery (entire GST is IGST)
          </p>
          <p>
            <strong>Tax inclusive:</strong> Prices shown include GST. Base price is calculated
            using formula: Base = Price × 100 / (100 + GST%)
          </p>
          <p>
            <strong>Shipping GST:</strong> Calculated at 5% on delivery charges
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
