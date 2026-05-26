import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import type { Item, ItemCategory, ItemUnit } from '@/types/types';

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'glass_sheets', label: 'Glass Sheets' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'tools', label: 'Tools' },
  { value: 'chemicals', label: 'Chemicals' },
  { value: 'frames', label: 'Frames' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'others', label: 'Others' },
];

const UNITS: { value: ItemUnit; label: string }[] = [
  { value: 'pcs', label: 'Pieces' }, { value: 'sqft', label: 'Sq. Ft' },
  { value: 'kg', label: 'Kg' }, { value: 'ltr', label: 'Litre' },
  { value: 'box', label: 'Box' }, { value: 'roll', label: 'Roll' },
  { value: 'set', label: 'Set' }, { value: 'mtr', label: 'Meter' },
];

const DEFAULT_FORM = { item_code: '', name: '', category: 'glass_sheets' as ItemCategory, unit: 'pcs' as ItemUnit, description: '', current_stock: '0', min_stock: '10', location: '' };

export default function ItemsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const canWrite = ['admin', 'manager', 'store_keeper'].includes(profile?.role || '');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('items').select('*').order('item_code');
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const openCreate = () => { setForm(DEFAULT_FORM); setEditingId(null); setShowDialog(true); };
  const openEdit = (item: Item) => {
    setForm({ item_code: item.item_code, name: item.name, category: item.category, unit: item.unit, description: item.description || '', current_stock: item.current_stock.toString(), min_stock: item.min_stock.toString(), location: item.location || '' });
    setEditingId(item.id); setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.item_code.trim() || !form.name.trim()) { toast.error('Item code and name are required'); return; }
    setSaving(true);
    const payload = { item_code: form.item_code.trim(), name: form.name.trim(), category: form.category, unit: form.unit, description: form.description || null, min_stock: parseFloat(form.min_stock) || 0, location: form.location || null, created_by: profile?.id };
    if (editingId) {
      const { error } = await supabase.from('items').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Item updated');
    } else {
      const { error } = await supabase.from('items').insert({ ...payload, current_stock: parseFloat(form.current_stock) || 0 });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Item created');
    }
    setSaving(false); setShowDialog(false); fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item? This will also delete all stock transactions.')) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Item deleted'); fetchItems();
  };

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.item_code.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || item.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Item Master</h1>
        {canWrite && <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48 h-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No items found.</CardContent></Card>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Code</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Category</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Stock</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Min</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                {canWrite && <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isLow = item.current_stock <= item.min_stock;
                return (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono whitespace-nowrap">{item.item_code}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.location && <p className="text-xs text-muted-foreground">{item.location}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="secondary" className="text-xs">{CATEGORIES.find(c => c.value === item.category)?.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold whitespace-nowrap">{item.current_stock} {item.unit}</td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground whitespace-nowrap">{item.min_stock}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isLow ? (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                        </span>
                      ) : (
                        <span className="text-xs text-success">In Stock</span>
                      )}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Item' : 'Add Item'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Item Code <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. GS-001" value={form.item_code} onChange={e => setForm(f => ({ ...f, item_code: e.target.value }))} disabled={!!editingId} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as ItemCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Item Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Item name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v as ItemUnit }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Min Stock Level</Label>
                <Input type="number" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} />
              </div>
            </div>
            {!editingId && (
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Opening Stock</Label>
                <Input type="number" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Location / Rack</Label>
              <Input placeholder="Storage location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Description</Label>
              <Textarea placeholder="Item description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
