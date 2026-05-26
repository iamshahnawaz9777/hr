import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import type { Item } from '@/types/types';

interface GatePassItemRow {
  item_id: string;
  item_name: string;
  item_code: string;
  quantity: string;
  unit: string;
  description: string;
}

export default function CreateGatePassPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    gp_date: new Date().toISOString().slice(0, 10),
    person_name: '', person_designation: '', person_contact: '',
    vehicle_number: '', driver_name: '', vehicle_type: '',
    purpose: '', is_returnable: false, expected_return_date: '',
    notes: '',
  });

  const [gpItems, setGpItems] = useState<GatePassItemRow[]>([
    { item_id: '', item_name: '', item_code: '', quantity: '1', unit: 'pcs', description: '' }
  ]);

  useEffect(() => {
    supabase.from('items').select('id, item_code, name, unit, current_stock').order('item_code').then(({ data }) => {
      setItems(Array.isArray(data) ? (data as Item[]) : []);
    });
  }, []);

  const addRow = () => setGpItems(rows => [...rows, { item_id: '', item_name: '', item_code: '', quantity: '1', unit: 'pcs', description: '' }]);
  const removeRow = (i: number) => setGpItems(rows => rows.filter((_, idx) => idx !== i));

  const updateRow = (i: number, field: keyof GatePassItemRow, value: string) => {
    setGpItems(rows => rows.map((row, idx) => {
      if (idx !== i) return row;
      if (field === 'item_id' && value !== 'manual') {
        const item = items.find(it => it.id === value);
        if (item) return { ...row, item_id: value, item_name: item.name, item_code: item.item_code, unit: item.unit };
      }
      return { ...row, [field]: value };
    }));
  };

  const handleSubmit = async () => {
    if (!form.person_name.trim()) { toast.error('Person name is required'); return; }
    const validItems = gpItems.filter(r => r.item_name.trim() && parseFloat(r.quantity) > 0);
    if (validItems.length === 0) { toast.error('At least one item is required'); return; }

    setSaving(true);
    const { data: gpData, error: gpError } = await supabase.from('gate_passes').insert({
      gp_date: form.gp_date,
      person_name: form.person_name.trim(),
      person_designation: form.person_designation || null,
      person_contact: form.person_contact || null,
      vehicle_number: form.vehicle_number || null,
      driver_name: form.driver_name || null,
      vehicle_type: form.vehicle_type || null,
      purpose: form.purpose || null,
      is_returnable: form.is_returnable,
      expected_return_date: form.expected_return_date || null,
      notes: form.notes || null,
      status: 'pending',
      created_by: profile?.id,
      gp_number: '',
    }).select().single();

    if (gpError || !gpData) { toast.error(gpError?.message || 'Failed to create gate pass'); setSaving(false); return; }

    const itemRows = validItems.map(row => ({
      gate_pass_id: gpData.id,
      item_id: row.item_id || null,
      item_name: row.item_name.trim(),
      item_code: row.item_code || null,
      quantity: parseFloat(row.quantity),
      unit: row.unit || null,
      description: row.description || null,
    }));

    const { error: itemsError } = await supabase.from('gate_pass_items').insert(itemRows);
    if (itemsError) { toast.error('Gate pass created but failed to add items'); }

    setSaving(false);
    toast.success(`Gate Pass ${gpData.gp_number} created successfully`);
    navigate(`/gatepasses/${gpData.id}`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/gatepasses')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold">New Gate Pass</h1>
      </div>

      {/* Person Details */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Person Responsible</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Full Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Person's name" value={form.person_name} onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Designation</Label>
              <Input placeholder="Job title" value={form.person_designation} onChange={e => setForm(f => ({ ...f, person_designation: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Contact Number</Label>
              <Input placeholder="Phone number" value={form.person_contact} onChange={e => setForm(f => ({ ...f, person_contact: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Gate Pass Date</Label>
              <Input type="date" value={form.gp_date} onChange={e => setForm(f => ({ ...f, gp_date: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Details */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Vehicle Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Vehicle Number</Label>
              <Input placeholder="e.g. KA-01-AB-1234" value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Driver Name</Label>
              <Input placeholder="Driver's name" value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Vehicle Type</Label>
              <Select value={form.vehicle_type || 'none'} onValueChange={v => setForm(f => ({ ...f, vehicle_type: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Items</CardTitle>
          <Button size="sm" variant="secondary" onClick={addRow} className="h-7"><Plus className="w-3.5 h-3.5 mr-1" /> Add Row</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {gpItems.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 md:col-span-4 space-y-1">
                <Label className="text-xs font-normal">Item from Store</Label>
                <Select value={row.item_id || 'manual'} onValueChange={v => updateRow(i, 'item_id', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select or enter manually" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual entry</SelectItem>
                    {items.map(it => <SelectItem key={it.id} value={it.id}>{it.item_code} — {it.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-7 md:col-span-3 space-y-1">
                <Label className="text-xs font-normal">Item Name <span className="text-destructive">*</span></Label>
                <Input className="h-9" placeholder="Item name" value={row.item_name} onChange={e => updateRow(i, 'item_name', e.target.value)} />
              </div>
              <div className="col-span-5 md:col-span-2 space-y-1">
                <Label className="text-xs font-normal">Qty / Unit</Label>
                <div className="flex gap-1">
                  <Input className="h-9 w-16" type="number" value={row.quantity} onChange={e => updateRow(i, 'quantity', e.target.value)} />
                  <Input className="h-9 w-16" placeholder="unit" value={row.unit} onChange={e => updateRow(i, 'unit', e.target.value)} />
                </div>
              </div>
              <div className="col-span-11 md:col-span-2 space-y-1">
                <Label className="text-xs font-normal">Description</Label>
                <Input className="h-9" placeholder="Optional" value={row.description} onChange={e => updateRow(i, 'description', e.target.value)} />
              </div>
              <div className="col-span-1 flex items-end pb-0.5">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive mt-5" onClick={() => removeRow(i)} disabled={gpItems.length === 1}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Additional Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">Purpose</Label>
            <Input placeholder="Purpose of gate pass" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="returnable" checked={form.is_returnable} onCheckedChange={v => setForm(f => ({ ...f, is_returnable: !!v }))} />
            <label htmlFor="returnable" className="text-sm cursor-pointer">Items are returnable</label>
          </div>
          {form.is_returnable && (
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Expected Return Date</Label>
              <Input type="date" value={form.expected_return_date} onChange={e => setForm(f => ({ ...f, expected_return_date: e.target.value }))} className="w-48" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">Notes</Label>
            <Textarea placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate('/gatepasses')}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="w-4 h-4 mr-1.5" /> Create Gate Pass
        </Button>
      </div>
    </div>
  );
}
