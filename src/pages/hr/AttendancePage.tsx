import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { Employee, Attendance } from '@/types/types';

export default function AttendancePage() {
  const { profile } = useAuth();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ employee_id: '', check_in: '', check_out: '', status: 'present', notes: '' });
  const [saving, setSaving] = useState(false);

  const canWrite = ['admin', 'manager', 'hr'].includes(profile?.role || '');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [date]);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*, profile:profiles!employees_profile_id_fkey(id, full_name, username)').order('created_at');
    setEmployees(Array.isArray(data) ? data : []);
  };

  const fetchAttendance = async () => {
    setLoading(true);
    const { data } = await supabase.from('attendance')
      .select('*, employee:employees!attendance_employee_id_fkey(id, employee_code, designation, profile:profiles!employees_profile_id_fkey(full_name, username))')
      .eq('date', date)
      .order('created_at');
    setAttendance(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.status) { toast.error('Employee and status are required'); return; }
    setSaving(true);
    const payload = {
      employee_id: form.employee_id,
      date,
      check_in: form.check_in ? `${date}T${form.check_in}:00` : null,
      check_out: form.check_out ? `${date}T${form.check_out}:00` : null,
      status: form.status,
      notes: form.notes || null,
    };
    const { error } = await supabase.from('attendance').upsert(payload, { onConflict: 'employee_id,date' });
    setSaving(false);
    if (error) { toast.error('Failed to save attendance'); return; }
    toast.success('Attendance saved');
    setShowDialog(false);
    setForm({ employee_id: '', check_in: '', check_out: '', status: 'present', notes: '' });
    fetchAttendance();
  };

  const statusIcon = (s: string) => {
    if (s === 'present') return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (s === 'absent') return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-warning" />;
  };

  const statusBadge = (s: string) => {
    if (s === 'present') return 'bg-success text-success-foreground';
    if (s === 'absent') return 'bg-destructive text-destructive-foreground';
    return 'bg-warning text-warning-foreground';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Attendance</h1>
        {canWrite && (
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> Mark Attendance
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44 h-9" />
        <span className="text-sm text-muted-foreground">
          {attendance.length} records · {attendance.filter(a => a.status === 'present').length} present
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 bg-muted" />)}</div>
      ) : attendance.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No attendance records for this date.</CardContent></Card>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Employee</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Employee Code</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Check In</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Check Out</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Notes</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map(att => (
                <tr key={att.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {(att.employee as Employee)?.profile?.full_name || (att.employee as Employee)?.profile?.username || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{(att.employee as Employee)?.employee_code}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge className={`text-xs ${statusBadge(att.status)}`}>{att.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {att.check_in ? format(new Date(att.check_in), 'hh:mm a') : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {att.check_out ? format(new Date(att.check_out), 'hh:mm a') : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{att.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Mark Attendance — {date}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Employee <span className="text-destructive">*</span></Label>
              <Select value={form.employee_id || 'none'} onValueChange={v => setForm(f => ({ ...f, employee_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select employee</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {(e.profile as { full_name?: string; username?: string })?.full_name || (e.profile as { full_name?: string; username?: string })?.username || e.employee_code} — {e.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Check In Time</Label>
                <Input type="time" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Check Out Time</Label>
                <Input type="time" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Notes</Label>
              <Input placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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
