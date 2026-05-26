import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Printer, CheckCircle2, RotateCcw, XCircle, Car, User2, Package, Calendar } from 'lucide-react';
import type { GatePass, GatePassItem } from '@/types/types';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  approved: 'bg-info text-info-foreground',
  returned: 'bg-success text-success-foreground',
  closed: 'bg-muted text-muted-foreground',
};

export default function GatePassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [gp, setGp] = useState<GatePass | null>(null);
  const [loading, setLoading] = useState(true);

  const canApprove = ['admin', 'manager'].includes(profile?.role || '');
  const canManage = ['admin', 'manager', 'store_keeper'].includes(profile?.role || '');

  useEffect(() => { fetchGatePass(); }, [id]);

  const fetchGatePass = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase
      .from('gate_passes')
      .select('*, gate_pass_items(*), creator:profiles!gate_passes_created_by_fkey(full_name, username), approver:profiles!gate_passes_approved_by_fkey(full_name, username)')
      .eq('id', id)
      .maybeSingle();
    setGp(data);
    setLoading(false);
  };

  const updateStatus = async (status: string) => {
    if (!gp) return;
    const payload: Record<string, unknown> = { status };
    if (status === 'approved') { payload.approved_by = profile?.id; payload.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from('gate_passes').update(payload).eq('id', gp.id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Gate pass marked as ${status}`);
    fetchGatePass();
  };

  const handleMarkReturned = async (itemId: string) => {
    const qty = prompt('Enter returned quantity:');
    if (!qty || isNaN(parseFloat(qty))) return;
    const { error } = await supabase.from('gate_pass_items').update({ returned_quantity: parseFloat(qty), return_date: new Date().toISOString().slice(0, 10) }).eq('id', itemId);
    if (error) { toast.error('Failed to update'); return; }
    toast.success('Return recorded');
    fetchGatePass();
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Gate Pass - ${gp?.gp_number}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #000; }
        h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
        .subtitle { text-align: center; color: #555; margin-bottom: 16px; }
        .gp-number { font-size: 16px; font-weight: bold; text-align: center; margin: 8px 0; }
        .section { margin-bottom: 16px; }
        .section-title { font-weight: bold; font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .field { margin-bottom: 6px; }
        .field label { font-weight: bold; display: block; font-size: 11px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 11px; }
        th { background: #f5f5f5; font-weight: bold; }
        .sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; }
        .sig-box { border-top: 1px solid #000; padding-top: 4px; font-size: 11px; text-align: center; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; text-transform: uppercase; }
      </style></head><body>
      <h1>Glass Company ERP</h1>
      <div class="subtitle">Gate Pass</div>
      <div class="gp-number">${gp?.gp_number || ''}</div>
      ${content.innerHTML}
      <div class="sig-row">
        <div class="sig-box">Prepared By</div>
        <div class="sig-box">Approved By</div>
        <div class="sig-box">Security</div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48 bg-muted" />
      <Skeleton className="h-64 bg-muted" />
    </div>
  );

  if (!gp) return (
    <div className="text-center py-20 text-muted-foreground">
      Gate pass not found. <Button variant="link" onClick={() => navigate('/gatepasses')}>Back to list</Button>
    </div>
  );

  const items = (gp.gate_pass_items || []) as GatePassItem[];

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/gatepasses')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono">{gp.gp_number}</h1>
            <p className="text-xs text-muted-foreground">{gp.gp_date}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge className={`${STATUS_STYLES[gp.status]} capitalize`}>{gp.status}</Badge>
          <Button variant="secondary" size="sm" onClick={handlePrint} className="h-8">
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
          </Button>
          {canApprove && gp.status === 'pending' && (
            <Button size="sm" className="h-8 bg-success text-success-foreground hover:bg-success/90" onClick={() => updateStatus('approved')}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
          )}
          {canManage && gp.status === 'approved' && gp.is_returnable && (
            <Button size="sm" variant="secondary" className="h-8" onClick={() => updateStatus('returned')}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Mark Returned
            </Button>
          )}
          {canManage && ['approved', 'returned'].includes(gp.status) && (
            <Button size="sm" variant="secondary" className="h-8" onClick={() => updateStatus('closed')}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Close
            </Button>
          )}
        </div>
      </div>

      {/* Printable Area */}
      <div ref={printRef}>
        {/* Person */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User2 className="w-4 h-4" /> Person Responsible</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{gp.person_name}</p></div>
              {gp.person_designation && <div><p className="text-xs text-muted-foreground">Designation</p><p>{gp.person_designation}</p></div>}
              {gp.person_contact && <div><p className="text-xs text-muted-foreground">Contact</p><p>{gp.person_contact}</p></div>}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle */}
        {(gp.vehicle_number || gp.driver_name) && (
          <Card className="mt-4">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Car className="w-4 h-4" /> Vehicle Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {gp.vehicle_number && <div><p className="text-xs text-muted-foreground">Vehicle No.</p><p className="font-mono font-medium">{gp.vehicle_number}</p></div>}
                {gp.driver_name && <div><p className="text-xs text-muted-foreground">Driver</p><p>{gp.driver_name}</p></div>}
                {gp.vehicle_type && <div><p className="text-xs text-muted-foreground">Type</p><p className="capitalize">{gp.vehicle_type}</p></div>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card className="mt-4">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> Items</CardTitle></CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">#</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">Item</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">Qty</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">Description</th>
                    {gp.is_returnable && <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">Returned</th>}
                    {gp.is_returnable && canManage && <th className="px-3 py-2 whitespace-nowrap"></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-medium">{item.item_name}</p>
                        {item.item_code && <p className="text-xs text-muted-foreground font-mono">{item.item_code}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-right whitespace-nowrap">{item.quantity} {item.unit || ''}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">{item.description || '—'}</td>
                      {gp.is_returnable && (
                        <td className="px-3 py-2.5 text-sm text-right whitespace-nowrap">
                          {item.returned_quantity > 0 ? <span className="text-success">{item.returned_quantity} {item.unit}</span> : '—'}
                        </td>
                      )}
                      {gp.is_returnable && canManage && (
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {gp.status === 'approved' && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleMarkReturned(item.id)}>
                              <RotateCcw className="w-3 h-3 mr-1" /> Return
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Notes / Purpose */}
        {(gp.purpose || gp.notes || gp.expected_return_date) && (
          <Card className="mt-4">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {gp.purpose && <div><p className="text-xs text-muted-foreground">Purpose</p><p>{gp.purpose}</p></div>}
              {gp.expected_return_date && <div><p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Expected Return</p><p>{gp.expected_return_date}</p></div>}
              {gp.notes && <div className="md:col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p>{gp.notes}</p></div>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
