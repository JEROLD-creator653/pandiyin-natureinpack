import { useState } from 'react';
import { Download, CalendarIcon, Loader2 } from 'lucide-react';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type RangePreset = '1week' | '1month' | '3months' | 'custom';

interface RevenueExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RevenueExportDialog({ open, onOpenChange }: RevenueExportDialogProps) {
  const [preset, setPreset] = useState<RangePreset>('1week');
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDateRange = (): { from: Date; to: Date } | null => {
    const now = new Date();
    switch (preset) {
      case '1week':
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case '1month':
        return { from: startOfDay(subMonths(now, 1)), to: endOfDay(now) };
      case '3months':
        return { from: startOfDay(subMonths(now, 3)), to: endOfDay(now) };
      case 'custom':
        if (!customFrom || !customTo) return null;
        return { from: startOfDay(customFrom), to: endOfDay(customTo) };
    }
  };

  const handleExport = async () => {
    setError(null);
    const range = getDateRange();
    if (!range) {
      setError('Please select both start and end dates for the custom range.');
      return;
    }
    if (range.from > range.to) {
      setError('Start date cannot be after end date.');
      return;
    }

    setExporting(true);
    try {
      const { data: orders, error: fetchErr } = await supabase
        .from('orders')
        .select('order_number, created_at, subtotal, delivery_charge, discount, gst_amount, total, status, payment_status, payment_method, coupon_code')
        .gte('created_at', range.from.toISOString())
        .lte('created_at', range.to.toISOString())
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      if (!orders || orders.length === 0) {
        setError('No orders found in the selected date range.');
        setExporting(false);
        return;
      }

      // Build CSV
      const headers = ['Order #', 'Date', 'Subtotal', 'Delivery', 'Discount', 'GST', 'Total', 'Status', 'Payment Status', 'Payment Method', 'Coupon'];
      const rows = orders.map(o => [
        o.order_number,
        format(new Date(o.created_at), 'dd/MM/yyyy HH:mm'),
        Number(o.subtotal).toFixed(2),
        Number(o.delivery_charge).toFixed(2),
        Number(o.discount).toFixed(2),
        Number(o.gst_amount).toFixed(2),
        Number(o.total).toFixed(2),
        o.status,
        o.payment_status,
        o.payment_method,
        o.coupon_code || '-',
      ]);

      const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
      rows.push([]);
      rows.push(['', '', '', '', '', 'Total Revenue', totalRevenue.toFixed(2), '', '', '', '']);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue_${format(range.from, 'yyyyMMdd')}_to_${format(range.to, 'yyyyMMdd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to export revenue data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const presets: { key: RangePreset; label: string }[] = [
    { key: '1week', label: 'Last 7 Days' },
    { key: '1month', label: 'Last 1 Month' },
    { key: '3months', label: 'Last 3 Months' },
    { key: 'custom', label: 'Custom Range' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Revenue Report
          </DialogTitle>
          <DialogDescription>Select a date range to export your revenue data as CSV.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Preset buttons */}
          <div className="grid grid-cols-2 gap-2">
            {presets.map(p => (
              <Button
                key={p.key}
                variant={preset === p.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setPreset(p.key); setError(null); }}
                className="text-sm"
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Custom date pickers */}
          {preset === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !customFrom && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customFrom ? format(customFrom, 'PPP') : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customFrom}
                      onSelect={(d) => { setCustomFrom(d); setError(null); }}
                      disabled={(d) => d > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !customTo && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customTo ? format(customTo, 'PPP') : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customTo}
                      onSelect={(d) => { setCustomTo(d); setError(null); }}
                      disabled={(d) => d > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Themed error banner */}
          {error && (
            <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground animate-in slide-in-from-top-2 duration-200">
              <p className="font-medium text-accent-foreground">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Exporting...</> : <><Download className="h-4 w-4 mr-2" /> Export CSV</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
