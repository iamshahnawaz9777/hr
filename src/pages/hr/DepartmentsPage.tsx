import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building2, Users } from 'lucide-react';
import type { Department } from '@/types/types';

export default function DepartmentsPage() {
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; username: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', head_id: '' });
  const [saving, setSaving] = useState(false);
  const [empCounts, setEmpCounts] = useState<Record<string, number>>({});

  const canWrite = ['admin', 'manager', 'hr'].includes(profile?.role || '');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [deptRes, profRes, empRes] = await Promise.all([
      supabase.from('departments').select('*, head:profiles!departments_head_id_fkey(id, username, full_name)').order('name'),
      supabase.from('profiles').select('id, username, full_name').order('full_name'),
      supabase.from('employees').select('id, department_id'),
    ]);
    setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
    setProfiles(Array.isArray(profRes.data) ? profRes.data : []);
    const counts: Record<string, number> = {};
    (empRes.data || []).forEach((e: { department_id: string }) => {
      if (e.department_id) counts[e.department_id] = (counts[e.department_id] || 0) + 1;
    });
    setEmpCounts(counts);
    setLoading(false);
  };

  const openCreate = () => { setForm({ name: '', description: '', head_id: '' }); setEditingId(null); setShowDialog(true); };
  const openEdit = (d: Department) => {
    setForm({ name: d.name, description: d.description || '', head_id: d.head_id || '' });
    setEditingId(d.id); setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Department name is required'); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), description: form.description || null, head_id: form.head_id || null };
    if (editingId) {
      const { error } = await supabase.from('departments').update(payload).eq('id', editingId);
      if (error) { toast.error('Failed to update'); setSaving(false); return; }
      toast.success('Department updated');
    } else {
      const { error } = await supabase.from('departments').insert(payload);
      if (error) { toast.error(error.message || 'Failed to create'); setSaving(false); return; }
      toast.success('Department created');
    }
    setSaving(false); setShowDialog(false); fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Department deleted'); fetchAll();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Departments</h1>
        {canWrite && <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Department</Button>}
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 bg-muted" />)}
        </div>
      ) : departments.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No departments yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {departments.map(d => (
            <Card key={d.id} className="h-full hover:shadow-hover transition-shadow">
              <CardContent className="p-4 flex flex-col h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3" /> {empCounts[d.id] || 0} employees
                      </p>
                    </div>
                  </div>
                  {canWrite && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>
                {d.description && <p className="text-xs text-muted-foreground mt-3 text-pretty">{d.description}</p>}
                {d.head && (
                  <p className="text-xs text-muted-foreground mt-2">Head: {(d.head as { full_name?: string; username?: string }).full_name || (d.head as { full_name?: string; username?: string }).username}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Department' : 'New Department'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Department name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Description</Label>
              <Textarea placeholder="Optional description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Department Head</Label>
              <Select value={form.head_id || 'none'} onValueChange={v => setForm(f => ({ ...f, head_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select head (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.username}</SelectItem>)}
                </SelectContent>
              </Select>
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
