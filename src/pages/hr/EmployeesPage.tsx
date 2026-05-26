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
import { Plus, Search, Pencil, Trash2, User2, Phone, Briefcase, Download } from 'lucide-react';
import type { Employee, Department } from '@/types/types';
import { exportCSV } from '@/utils/exportData';

interface EmployeeForm {
  profile_id: string;
  designation: string;
  department_id: string;
  joining_date: string;
  basic_salary: string;
  address: string;
  emergency_contact: string;
  notes: string;
}

const DEFAULT_FORM: EmployeeForm = {
  profile_id: '', designation: '', department_id: '', joining_date: '',
  basic_salary: '', address: '', emergency_contact: '', notes: '',
};

export default function EmployeesPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; username: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const canWrite = ['admin', 'manager', 'hr'].includes(profile?.role || '');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [empRes, deptRes, profRes] = await Promise.all([
      supabase.from('employees').select('*, profile:profiles!employees_profile_id_fkey(id, username, full_name, phone), department:departments!employees_department_id_fkey(id, name)').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').order('name'),
      supabase.from('profiles').select('id, username, full_name').order('full_name'),
    ]);
    setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
    setProfiles(Array.isArray(profRes.data) ? profRes.data : []);
    setLoading(false);
  };

  const openCreate = () => { setForm(DEFAULT_FORM); setEditingId(null); setShowDialog(true); };
  const openEdit = (emp: Employee) => {
    setForm({
      profile_id: emp.profile_id || '',
      designation: emp.designation,
      department_id: emp.department_id || '',
      joining_date: emp.joining_date || '',
      basic_salary: emp.basic_salary?.toString() || '',
      address: emp.address || '',
      emergency_contact: emp.emergency_contact || '',
      notes: emp.notes || '',
    });
    setEditingId(emp.id);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.designation.trim()) { toast.error('Designation is required'); return; }
    setSaving(true);
    const payload = {
      profile_id: form.profile_id || null,
      designation: form.designation.trim(),
      department_id: form.department_id || null,
      joining_date: form.joining_date || null,
      basic_salary: form.basic_salary ? parseFloat(form.basic_salary) : 0,
      address: form.address || null,
      emergency_contact: form.emergency_contact || null,
      notes: form.notes || null,
    };
    if (editingId) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editingId);
      if (error) { toast.error('Failed to update employee'); setSaving(false); return; }
      toast.success('Employee updated');
    } else {
      const { error } = await supabase.from('employees').insert({ ...payload, employee_code: '' });
      if (error) { toast.error(error.message || 'Failed to add employee'); setSaving(false); return; }
      toast.success('Employee added');
    }
    setSaving(false);
    setShowDialog(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this employee record?')) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Employee removed');
    fetchAll();
  };

  const filtered = employees.filter(e => {
    const matchSearch = !search ||
      e.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.designation?.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code?.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'all' || e.department_id === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Employees</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCSV(
              employees.map(e => ({
                employee_code: e.employee_code,
                name: (e.profile as { full_name?: string })?.full_name || '',
                designation: e.designation,
                department: (e.department as { name?: string })?.name || '',
                joining_date: e.joining_date || '',
                basic_salary: e.basic_salary,
                emergency_contact: e.emergency_contact || '',
                address: e.address || '',
              })),
              'employees_export'
            )}
            disabled={employees.length === 0}
          >
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          {canWrite && (
            <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Employee</Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48 h-9" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Employee List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-36 bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No employees found.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(emp => (
            <Card key={emp.id} className="h-full flex flex-col hover:shadow-hover transition-shadow">
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <User2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{emp.profile?.full_name || 'No Name'}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp.designation}</p>
                    <Badge variant="secondary" className="text-xs mt-1">{emp.employee_code}</Badge>
                  </div>
                  {canWrite && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(emp)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(emp.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {emp.department && (
                    <div className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 shrink-0" /> {emp.department.name}</div>
                  )}
                  {emp.profile?.phone && (
                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" /> {emp.profile.phone}</div>
                  )}
                  {emp.joining_date && (
                    <p className="text-xs">Joined: {emp.joining_date}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Employee' : 'Add Employee'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Link to User Account</Label>
              <Select value={form.profile_id || 'none'} onValueChange={v => setForm(f => ({ ...f, profile_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select user (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked account</SelectItem>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.username}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Designation <span className="text-destructive">*</span></Label>
              <Input placeholder="Job title / designation" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Department</Label>
                <Select value={form.department_id || 'none'} onValueChange={v => setForm(f => ({ ...f, department_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Joining Date</Label>
                <Input type="date" value={form.joining_date} onChange={e => setForm(f => ({ ...f, joining_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Basic Salary</Label>
              <Input type="number" placeholder="0.00" value={form.basic_salary} onChange={e => setForm(f => ({ ...f, basic_salary: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Address</Label>
              <Input placeholder="Employee address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Emergency Contact</Label>
              <Input placeholder="Contact name & number" value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} />
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
