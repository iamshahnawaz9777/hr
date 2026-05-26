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
import { Plus, Download } from 'lucide-react';
import { exportCSV } from '@/utils/exportData';
import type { Payroll, Employee } from '@/types/types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PayrollPage() {
  const { profile } = useAuth();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ employee_id: '', month: (new Date().getMonth() + 1).toString(), year: new Date().getFullYear().toString(), basic_salary: '', allowances: '0', deductions: '0', payment_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const canWrite = ['admin', 'manager', 'hr'].includes(profile?.role || '');

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { fetchPayrolls(); }, [monthFilter, yearFilter]);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*, profile:profiles!employees_profile_id_fkey(id, full_name, username)').order('created_at');
    setEmployees(Array.isArray(data) ? data : []);
  };

  const fetchPayrolls = async () => {
    setLoading(true);
    const { data } = await supabase.from('payroll')
      .select('*, employee:employees!payroll_employee_id_fkey(id, employee_code, designation, basic_salary, profile:profiles!employees_profile_id_fkey(full_name, username))')
      .eq('month', monthFilter)
      .eq('year', yearFilter)
      .order('created_at', { ascending: false });
    setPayrolls(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.basic_salary) { toast.error('Employee and salary are required'); return; }
    setSaving(true);
    const { error } = await supabase.from('payroll').upsert({
      employee_id: form.employee_id,
      month: parseInt(form.month),
      year: parseInt(form.year),
      basic_salary: parseFloat(form.basic_salary),
      allowances: parseFloat(form.allowances) || 0,
      deductions: parseFloat(form.deductions) || 0,
      payment_date: form.payment_date || null,
      notes: form.notes || null,
    }, { onConflict: 'employee_id,month,year' });
    setSaving(false);
    if (error) { toast.error('Failed to save payroll'); return; }
    toast.success('Payroll saved');
    setShowDialog(false);
    fetchPayrolls();
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Payroll</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCSV(
              payrolls.map(p => {
                const emp = p.employee as Employee;
                const name = (emp?.profile as { full_name?: string })?.full_name || emp?.employee_code || '';
                return { employee: name, code: emp?.employee_code, month: MONTHS[p.month - 1], year: p.year, basic_salary: p.basic_salary, allowances: p.allowances, deductions: p.deductions, net_salary: p.net_salary, payment_date: p.payment_date || '' };
              }),
              `payroll_${MONTHS[monthFilter - 1]}_${yearFilter}`
            )}
            disabled={payrolls.length === 0}
          >
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          {canWrite && (
            <Button size="sm" onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-1" /> Add Payroll</Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={monthFilter.toString()} onValueChange={v => setMonthFilter(parseInt(v))}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={yearFilter.toString()} onValueChange={v => setYearFilter(parseInt(v))}>
          <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center">
          {payrolls.length} records · Total: {payrolls.reduce((s, p) => s + (p.net_salary || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-muted" />)}</div>
      ) : payrolls.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No payroll records for {MONTHS[monthFilter-1]} {yearFilter}.</CardContent></Card>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Employee</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Basic</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Allowances</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Deductions</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Net Salary</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map(p => {
                const emp = p.employee as Employee;
                const name = (emp?.profile as { full_name?: string; username?: string })?.full_name || (emp?.profile as { full_name?: string; username?: string })?.username || '—';
                return (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">{emp?.employee_code}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">₹{p.basic_salary?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-success whitespace-nowrap">+₹{p.allowances?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-destructive whitespace-nowrap">-₹{p.deductions?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right whitespace-nowrap">₹{p.net_salary?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{p.payment_date || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Add / Update Payroll</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Employee <span className="text-destructive">*</span></Label>
              <Select value={form.employee_id || 'none'} onValueChange={v => {
                const emp = employees.find(e => e.id === v);
                setForm(f => ({ ...f, employee_id: v === 'none' ? '' : v, basic_salary: emp?.basic_salary?.toString() || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select employee</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {(e.profile as { full_name?: string; username?: string })?.full_name || e.employee_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Month</Label>
                <Select value={form.month} onValueChange={v => setForm(f => ({ ...f, month: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Year</Label>
                <Select value={form.year} onValueChange={v => setForm(f => ({ ...f, year: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Basic Salary <span className="text-destructive">*</span></Label>
                <Input type="number" value={form.basic_salary} onChange={e => setForm(f => ({ ...f, basic_salary: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Allowances</Label>
                <Input type="number" value={form.allowances} onChange={e => setForm(f => ({ ...f, allowances: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Deductions</Label>
                <Input type="number" value={form.deductions} onChange={e => setForm(f => ({ ...f, deductions: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Payment Date</Label>
              <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
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
