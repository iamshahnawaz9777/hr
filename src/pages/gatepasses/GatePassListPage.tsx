import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, FileText, Car, User2, ExternalLink, Download, Package, Pencil, RotateCcw, Loader2 } from 'lucide-react';
import type { GatePass, GatePassItem } from '@/types/types';
import { exportCSV } from '@/utils/exportData';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  approved: 'bg-info text-info-foreground',
  returned: 'bg-success text-success-foreground',
  closed: 'bg-muted text-muted-foreground',
};

export default function GatePassListPage() {
  const { profile } = useAuth();
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit dialog state
  const [editGp, setEditGp] = useState<GatePass | null>(null);
  const [editForm, setEditForm] = useState<Partial<GatePass>>({});
  const [saving, setSaving] = useState(false);

  // Return dialog state
  const [returnGp, setReturnGp] = useState<GatePass | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, string>>({});
  const [returning, setReturning] = useState(false);

  const canWrite = ['admin', 'manager', 'store_keeper'].includes(profile?.role || '');

  useEffect(() => { fetchPasses(); }, []);

  const fetchPasses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gate_passes')
      .select('*, gate_pass_items(*)')
      .order('created_at', { ascending: false });
    setPasses(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const filtered = passes.filter(gp => {
    const itemNames = (gp.gate_pass_items || [])
      .map(i => `${i.item_name} ${i.item_code || ''}`.toLowerCase())
      .join(' ');
    const matchSearch = !search ||
      gp.gp_number.toLowerCase().includes(search.toLowerCase()) ||
      gp.person_name.toLowerCase().includes(search.toLowerCase()) ||
      (gp.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      itemNames.includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || gp.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Edit handlers
  const openEdit = (gp: GatePass) => {
    setEditGp(gp);
    setEditForm({
      person_name: gp.person_name,
      person_designation: gp.person_designation || '',
      person_contact: gp.person_contact || '',
      vehicle_number: gp.vehicle_number || '',
      driver_name: gp.driver_name || '',
      vehicle_type: gp.vehicle_type || '',
      purpose: gp.purpose || '',
      notes: gp.notes || '',
      gp_date: gp.gp_date,
      status: gp.status,
      expected_return_date: gp.expected_return_date || '',
    });
  };

  const saveEdit = async () => {
    if (!editGp) return;
    if (!editForm.person_name?.trim()) { toast.error('Person name is required'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('gate_passes')
      .update({
        person_name: editForm.person_name?.trim(),
        person_designation: editForm.person_designation?.trim() || null,
        person_contact: editForm.person_contact?.trim() || null,
        vehicle_number: editForm.vehicle_number?.trim() || null,
        driver_name: editForm.driver_name?.trim() || null,
        vehicle_type: editForm.vehicle_type?.trim() || null,
        purpose: editForm.purpose?.trim() || null,
        notes: editForm.notes?.trim() || null,
        gp_date: editForm.gp_date,
        status: editForm.status,
        expected_return_date: editForm.expected_return_date?.trim() || null,
      })
      .eq('id', editGp.id);
    setSaving(false);
    if (error) { toast.error('Failed to save changes'); return; }
    toast.success('Gate pass updated');
    setEditGp(null);
    fetchPasses();
  };

  // Return handlers
  const openReturn = (gp: GatePass) => {
    setReturnGp(gp);
    const init: Record<string, string> = {};
    (gp.gate_pass_items || []).forEach(i => { init[i.id] = String(i.returned_quantity || 0); });
    setReturnQtys(init);
  };

  const saveReturn = async () => {
    if (!returnGp) return;
    setReturning(true);
    const items = (returnGp.gate_pass_items || []) as GatePassItem[];
    const errors: string[] = [];
    for (const item of items) {
      const { error } = await supabase
        .from('gate_pass_items')
        .update({
          returned_quantity: parseFloat(returnQtys[item.id] || '0') || 0,
          return_date: new Date().toISOString().slice(0, 10),
        })
        .eq('id', item.id);
      if (error) errors.push(item.id);
    }
    setReturning(false);
    if (errors.length) { toast.error('Some items failed to update'); return; }
    toast.success('Return quantities saved');
    setReturnGp(null);
    fetchPasses();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Gate Passes</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCSV(
              filtered.map(gp => ({
                gp_number: gp.gp_number,
                date: gp.gp_date,
                status: gp.status,
                person_name: gp.person_name,
                person_designation: gp.person_designation || '',
                vehicle_number: gp.vehicle_number || '',
                driver_name: gp.driver_name || '',
                purpose: gp.purpose || '',
                is_returnable: gp.is_returnable ? 'Yes' : 'No',
              })),
              'gatepasses_export'
            )}
            disabled={filtered.length === 0}
          >
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          {canWrite && (
            <Button size="sm" asChild>
              <Link to="/gatepasses/new"><Plus className="w-4 h-4 mr-1" /> New Gate Pass</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search GP no., person, item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64 h-9" />
        </div>
        {['all', 'pending', 'approved', 'returned', 'closed'].map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'secondary'} size="sm" onClick={() => setStatusFilter(s)} className="h-8 capitalize">{s}</Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No gate passes found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(gp => (
            <Card key={gp.id} className="hover:shadow-hover transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-semibold text-sm font-mono">{gp.gp_number}</span>
                      <Badge className={`text-xs ${STATUS_STYLES[gp.status]}`}>{gp.status}</Badge>
                      {gp.is_returnable && <Badge variant="outline" className="text-xs">Returnable</Badge>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <User2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{gp.person_name}{gp.person_designation ? ` · ${gp.person_designation}` : ''}</span>
                      </span>
                      {gp.vehicle_number && (
                        <span className="flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 shrink-0" />
                          <span>{gp.vehicle_number}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        {gp.gate_pass_items?.length || 0} item(s) · {gp.gp_date}
                      </span>
                    </div>
                    {/* Item names row */}
                    {gp.gate_pass_items && gp.gate_pass_items.length > 0 && (
                      <div className="flex items-start gap-1.5 mt-2 flex-wrap">
                        <Package className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" />
                        {gp.gate_pass_items.map((item) => (
                          <Badge
                            key={item.id}
                            variant="secondary"
                            className={`text-xs font-normal px-1.5 py-0 h-5 ${search && (item.item_name.toLowerCase().includes(search.toLowerCase()) || (item.item_code?.toLowerCase().includes(search.toLowerCase()) ?? false)) ? 'ring-1 ring-primary' : ''}`}
                          >
                            {item.item_name}
                            {item.item_code && <span className="text-muted-foreground ml-1 font-mono">({item.item_code})</span>}
                            <span className="text-muted-foreground ml-1">× {item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                    {gp.purpose && <p className="text-xs text-muted-foreground mt-1.5">Purpose: {gp.purpose}</p>}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {canWrite && (
                      <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => openEdit(gp)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    )}
                    {canWrite && gp.is_returnable && gp.status === 'approved' && (
                      <Button variant="secondary" size="sm" className="h-8 px-2.5" onClick={() => openReturn(gp)}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Return
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" asChild className="h-8 px-2.5">
                      <Link to={`/gatepasses/${gp.id}`} className="flex items-center gap-1">
                        View <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editGp} onOpenChange={open => { if (!open) setEditGp(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Gate Pass — {editGp?.gp_number}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Date</Label>
              <Input type="date" value={editForm.gp_date || ''} onChange={e => setEditForm(f => ({ ...f, gp_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Status</Label>
              <Select value={editForm.status || ''} onValueChange={v => setEditForm(f => ({ ...f, status: v as GatePass['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['pending', 'approved', 'returned', 'closed'].map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Person Name <span className="text-destructive">*</span></Label>
              <Input value={editForm.person_name || ''} onChange={e => setEditForm(f => ({ ...f, person_name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Designation</Label>
              <Input value={editForm.person_designation || ''} onChange={e => setEditForm(f => ({ ...f, person_designation: e.target.value }))} placeholder="e.g. Manager" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Contact</Label>
              <Input value={editForm.person_contact || ''} onChange={e => setEditForm(f => ({ ...f, person_contact: e.target.value }))} placeholder="Phone number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Vehicle Number</Label>
              <Input value={editForm.vehicle_number || ''} onChange={e => setEditForm(f => ({ ...f, vehicle_number: e.target.value }))} placeholder="e.g. ABC-1234" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Driver Name</Label>
              <Input value={editForm.driver_name || ''} onChange={e => setEditForm(f => ({ ...f, driver_name: e.target.value }))} placeholder="Driver full name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Vehicle Type</Label>
              <Input value={editForm.vehicle_type || ''} onChange={e => setEditForm(f => ({ ...f, vehicle_type: e.target.value }))} placeholder="e.g. Truck, Van" />
            </div>
            {editGp?.is_returnable && (
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Expected Return Date</Label>
                <Input type="date" value={editForm.expected_return_date || ''} onChange={e => setEditForm(f => ({ ...f, expected_return_date: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-normal">Purpose</Label>
              <Input value={editForm.purpose || ''} onChange={e => setEditForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Purpose of gate pass" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-normal">Notes</Label>
              <Textarea value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditGp(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Items Dialog */}
      <Dialog open={!!returnGp} onOpenChange={open => { if (!open) setReturnGp(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Returns — {returnGp?.gp_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Enter returned quantity for each item below.</p>
            {(returnGp?.gate_pass_items || []).map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.item_code && <span className="font-mono mr-2">{item.item_code}</span>}
                    Issued: <strong>{item.quantity} {item.unit || ''}</strong>
                    {item.returned_quantity > 0 && (
                      <span className="ml-2 text-success">· Previously returned: {item.returned_quantity}</span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 w-28">
                  <Label className="text-xs text-muted-foreground mb-1 block">Qty Returned</Label>
                  <Input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={returnQtys[item.id] ?? '0'}
                    onChange={e => setReturnQtys(q => ({ ...q, [item.id]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReturnGp(null)}>Cancel</Button>
            <Button onClick={saveReturn} disabled={returning}>
              {returning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Returns
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
