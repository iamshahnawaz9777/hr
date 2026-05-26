import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, ArrowUpFromLine } from 'lucide-react';
import { format } from 'date-fns';
import type { StockTransaction, Item } from '@/types/types';

export default function StockOutwardPage() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ item_id: '', quantity: '', purpose: '', reference_no: '', transaction_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [saving, setSaving] = useState(false);

  const canWrite = ['admin', 'manager', 'store_keeper'].includes(profile?.role || '');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [txRes, itemRes] = await Promise.all([
      supabase.from('stock_transactions').select('*, item:items!stock_transactions_item_id_fkey(id, item_code, name, unit)').eq('transaction_type', 'outward').order('created_at', { ascending: false }).limit(100),
      supabase.from('items').select('id, item_code, name, unit, current_stock').order('item_code'),
    ]);
    setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
    setItems(Array.isArray(itemRes.data) ? (itemRes.data as Item[]) : []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.item_id || !form.quantity) { toast.error('Item and quantity are required'); return; }
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) { toast.error('Quantity must be a positive number'); return; }
    const selectedItem = items.find(i => i.id === form.item_id);
    if (selectedItem && qty > selectedItem.current_stock) {
      toast.error(`Insufficient stock. Available: ${selectedItem.current_stock} ${selectedItem.unit}`);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('stock_transactions').insert({
      item_id: form.item_id, transaction_type: 'outward', quantity: qty,
      purpose: form.purpose || null, reference_no: form.reference_no || null,
      transaction_date: form.transaction_date, notes: form.notes || null, created_by: profile?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Stock outward recorded');
    setShowDialog(false);
    setForm({ item_id: '', quantity: '', purpose: '', reference_no: '', transaction_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    fetchAll();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2"><ArrowUpFromLine className="w-5 h-5 text-destructive" /> Stock Outward</h1>
        {canWrite && <Button size="sm" onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-1" /> Record Outward</Button>}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 bg-muted" />)}</div>
      ) : transactions.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No outward transactions yet.</CardContent></Card>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[650px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Item</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Qty</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Purpose</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Ref No</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{tx.transaction_date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm font-medium">{(tx.item as Item)?.name}</p>
                    <p className="text-xs text-muted-foreground">{(tx.item as Item)?.item_code}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-right text-destructive whitespace-nowrap">-{tx.quantity} {(tx.item as Item)?.unit}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{tx.purpose || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{tx.reference_no || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{tx.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Record Stock Outward</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Item <span className="text-destructive">*</span></Label>
              <Select value={form.item_id || 'none'} onValueChange={v => setForm(f => ({ ...f, item_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select item</SelectItem>
                  {items.map(i => <SelectItem key={i.id} value={i.id}>{i.item_code} — {i.name} (Stock: {i.current_stock} {i.unit})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Quantity <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Date</Label>
                <Input type="date" value={form.transaction_date} onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Purpose</Label>
                <Input placeholder="Why it's being issued" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Reference No.</Label>
                <Input placeholder="Ref number" value={form.reference_no} onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Notes</Label>
              <Input placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>Record</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
