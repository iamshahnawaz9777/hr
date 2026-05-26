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
import { Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import type { Leave, Employee } from '@/types/types';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  approved: 'bg-success text-success-foreground',
  rejected: 'bg-destructive text-destructive-foreground',
};

export default function LeavesPage() {
  const { profile } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ employee_id: '', leave_type: 'casual', start_date: '', end_date: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const canApprove = ['admin', 'manager', 'hr'].includes(profile?.role || '');

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('leaves')
      .select('*, employee:employees!leaves_employee_id_fkey(id, employee_code, designation, profile:profiles!employees_profile_id_fkey(full_name, username))')
      .order('created_at', { ascending: false });
    setLeaves(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*, profile:profiles!employees_profile_id_fkey(id, full_name, username)').order('created_at');
    setEmployees(Array.isArray(data) ? data : []);
  };

  const handleSubmit = async () => {
    if (!form.employee_id || !form.start_date || !form.end_date) { toast.error('Please fill all required fields'); return; }
    const days = differenceInDays(parseISO(form.end_date), parseISO(form.start_date)) + 1;
    if (days < 1) { toast.error('End date must be after start date'); return; }
    setSaving(true);
    const { error } = await supabase.from('leaves').insert({
      employee_id: form.employee_id,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      days_count: days,
      reason: form.reason || null,
      status: 'pending',
    });
    setSaving(false);
    if (error) { toast.error('Failed to submit leave request'); return; }
    toast.success('Leave request submitted');
    setShowDialog(false);
    setForm({ employee_id: '', leave_type: 'casual', start_date: '', end_date: '', reason: '' });
    fetchLeaves();
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('leaves').update({ status: 'approved', approved_by: profile?.id, approved_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to approve'); return; }
    toast.success('Leave approved');
    fetchLeaves();
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason (optional):');
    const { error } = await supabase.from('leaves').update({ status: 'rejected', rejection_reason: reason || null }).eq('id', id);
    if (error) { toast.error('Failed to reject'); return; }
    toast.success('Leave rejected');
    fetchLeaves();
  };

  const filtered = leaves.filter(l => statusFilter === 'all' || l.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Leave Requests</h1>
        <Button size="sm" onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-1" /> New Request</Button>
      </div>

      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'secondary'} size="sm" onClick={() => setStatusFilter(s)} className="h-8 capitalize">{s}</Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No leave requests found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(leave => {
            const emp = leave.employee as Employee;
            const empName = (emp?.profile as { full_name?: string; username?: string })?.full_name || (emp?.profile as { full_name?: string; username?: string })?.username || '—';
            return (
              <Card key={leave.id} className="hover:shadow-hover transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{empName}</p>
                        <Badge variant="secondary" className="text-xs">{emp?.employee_code}</Badge>
                        <Badge className={`text-xs ${STATUS_STYLES[leave.status]}`}>{leave.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="capitalize">{leave.leave_type.replace('_', ' ')}</span> · {leave.start_date} to {leave.end_date} · <strong>{leave.days_count} day{leave.days_count !== 1 ? 's' : ''}</strong>
                      </p>
                      {leave.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {leave.reason}</p>}
                      {leave.rejection_reason && <p className="text-xs text-destructive mt-1">Rejected: {leave.rejection_reason}</p>}
                    </div>
                    {canApprove && leave.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="h-8 bg-success text-success-foreground hover:bg-success/90" onClick={() => handleApprove(leave.id)}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleReject(leave.id)}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Employee <span className="text-destructive">*</span></Label>
              <Select value={form.employee_id || 'none'} onValueChange={v => setForm(f => ({ ...f, employee_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select employee</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {(e.profile as { full_name?: string; username?: string })?.full_name || (e.profile as { full_name?: string; username?: string })?.username || e.employee_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Leave Type</Label>
              <Select value={form.leave_type} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Start Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">End Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Reason</Label>
              <Textarea placeholder="Reason for leave..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>Submit Request</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
