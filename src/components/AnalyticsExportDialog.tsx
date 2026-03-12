import { useState } from 'react';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { formatPrice } from '@/lib/formatters';

type ReportType = 'orders' | 'products' | 'delivery' | 'revenue' | 'state';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filteredOrders: any[];
  topProducts: { name: string; totalOrders: number; totalQty: number; revenue: number }[];
  stateAnalytics: { state: string; orders: number; revenue: number }[];
  dateLabel: string;
}

export default function AnalyticsExportDialog({
  open, onOpenChange, filteredOrders, topProducts, stateAnalytics, dateLabel,
}: ExportDialogProps) {
  const [selected, setSelected] = useState<Set<ReportType>>(new Set(['orders']));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: ReportType) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const reports: { key: ReportType; label: string; desc: string }[] = [
    { key: 'orders', label: 'Orders Report', desc: 'All order details with payment info' },
    { key: 'revenue', label: 'Revenue Report', desc: 'Revenue summary with GST breakdown' },
    { key: 'products', label: 'Product Sales Report', desc: 'Top selling products with quantities' },
    { key: 'delivery', label: 'Delivery Charges Report', desc: 'Delivery charges per order' },
    { key: 'state', label: 'State-wise Report', desc: 'Orders & revenue by state' },
  ];

  const handleExport = () => {
    setError(null);
    if (selected.size === 0) {
      setError('Please select at least one report to export.');
      return;
    }
    if (!filteredOrders || filteredOrders.length === 0) {
      setError('No data available for the selected date range.');
      return;
    }

    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      if (selected.has('orders')) {
        const rows = filteredOrders.map(o => ({
          'Order #': o.order_number,
          'Date': format(new Date(o.created_at), 'dd/MM/yyyy HH:mm'),
          'Status': o.status,
          'Payment Method': o.payment_method,
          'Payment Status': o.payment_status,
          'Subtotal': Number(o.subtotal).toFixed(2),
          'Delivery': Number(o.delivery_charge).toFixed(2),
          'Discount': Number(o.discount).toFixed(2),
          'GST': Number(o.gst_amount).toFixed(2),
          'Total': Number(o.total).toFixed(2),
          'Coupon': o.coupon_code || '-',
          'State': o.delivery_state || '-',
        }));
        // Add totals row
        rows.push({
          'Order #': '',
          'Date': '',
          'Status': '',
          'Payment Method': '',
          'Payment Status': 'TOTALS',
          'Subtotal': filteredOrders.reduce((s, o) => s + Number(o.subtotal), 0).toFixed(2),
          'Delivery': filteredOrders.reduce((s, o) => s + Number(o.delivery_charge), 0).toFixed(2),
          'Discount': filteredOrders.reduce((s, o) => s + Number(o.discount), 0).toFixed(2),
          'GST': filteredOrders.reduce((s, o) => s + Number(o.gst_amount), 0).toFixed(2),
          'Total': filteredOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2),
          'Coupon': '',
          'State': '',
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      }

      if (selected.has('revenue')) {
        const totalRev = filteredOrders.reduce((s, o) => s + Number(o.total), 0);
        const totalGst = filteredOrders.reduce((s, o) => s + Number(o.gst_amount), 0);
        const totalCgst = filteredOrders.reduce((s, o) => s + Number(o.cgst_amount || 0), 0);
        const totalSgst = filteredOrders.reduce((s, o) => s + Number(o.sgst_amount || 0), 0);
        const totalIgst = filteredOrders.reduce((s, o) => s + Number(o.igst_amount || 0), 0);
        const rows = [
          { 'Metric': 'Total Orders', 'Value': filteredOrders.length },
          { 'Metric': 'Total Revenue', 'Value': totalRev.toFixed(2) },
          { 'Metric': 'Average Order Value', 'Value': (totalRev / (filteredOrders.length || 1)).toFixed(2) },
          { 'Metric': 'Total GST Collected', 'Value': totalGst.toFixed(2) },
          { 'Metric': 'CGST', 'Value': totalCgst.toFixed(2) },
          { 'Metric': 'SGST', 'Value': totalSgst.toFixed(2) },
          { 'Metric': 'IGST', 'Value': totalIgst.toFixed(2) },
          { 'Metric': 'Total Delivery Charges', 'Value': filteredOrders.reduce((s, o) => s + Number(o.delivery_charge), 0).toFixed(2) },
          { 'Metric': 'Total Discounts', 'Value': filteredOrders.reduce((s, o) => s + Number(o.discount), 0).toFixed(2) },
        ];
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 24 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Revenue');
      }

      if (selected.has('products')) {
        const rows = topProducts.map((p, i) => ({
          '#': i + 1,
          'Product Name': p.name,
          'Total Orders': p.totalOrders,
          'Total Qty Sold': p.totalQty,
          'Revenue': p.revenue.toFixed(2),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Product Sales');
      }

      if (selected.has('delivery')) {
        const rows = filteredOrders.map(o => ({
          'Order #': o.order_number,
          'Date': format(new Date(o.created_at), 'dd/MM/yyyy'),
          'State': o.delivery_state || '-',
          'Delivery Charge': Number(o.delivery_charge).toFixed(2),
          'Type': Number(o.delivery_charge) === 0 ? 'Free' : 'Paid',
          'Order Total': Number(o.total).toFixed(2),
        }));
        rows.push({
          'Order #': '',
          'Date': 'TOTALS',
          'State': '',
          'Delivery Charge': filteredOrders.reduce((s, o) => s + Number(o.delivery_charge), 0).toFixed(2),
          'Type': '',
          'Order Total': filteredOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2),
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Delivery');
      }

      if (selected.has('state')) {
        const rows = stateAnalytics.map((s, i) => ({
          '#': i + 1,
          'State': s.state,
          'Orders': s.orders,
          'Revenue': s.revenue.toFixed(2),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 4 }, { wch: 24 }, { wch: 10 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws, 'State-wise');
      }

      const fileName = `Analytics_Report_${format(new Date(), 'yyyy_MM_dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Excel report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Export Analytics Report
          </DialogTitle>
          <DialogDescription>
            Export filtered data ({dateLabel}) as Excel (.xlsx).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {reports.map(r => (
            <label
              key={r.key}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                selected.has(r.key) ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
            >
              <Checkbox
                checked={selected.has(r.key)}
                onCheckedChange={() => toggle(r.key)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </label>
          ))}

          {error && (
            <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm animate-in slide-in-from-top-2 duration-200">
              <p className="font-medium text-accent-foreground">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Exporting...</>
              : <><Download className="h-4 w-4 mr-2" /> Export Excel</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
