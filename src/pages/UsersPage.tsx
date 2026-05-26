import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { UserCog, ShieldCheck, ShieldOff, Search } from 'lucide-react';
import type { Profile, UserRole } from '@/types/types';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator', manager: 'Manager',
  store_keeper: 'Store Keeper', hr: 'HR', employee: 'Employee',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-destructive text-destructive-foreground',
  manager: 'bg-info text-info-foreground',
  store_keeper: 'bg-warning text-warning-foreground',
  hr: 'bg-success text-success-foreground',
  employee: 'bg-muted text-muted-foreground',
};

export default function UsersPage() {
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', editingUser.id);
    setSaving(false);
    if (error) { toast.error('Failed to update role'); return; }
    toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
    setEditingUser(null);
    fetchUsers();
  };

  const handleToggleActive = async (user: Profile) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) return;
    const { error } = await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    if (error) { toast.error('Failed to update user status'); return; }
    toast.success(`User ${action}d`);
    fetchUsers();
  };

  const filtered = users.filter(u =>
    !search ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  if (currentProfile?.role !== 'admin') {
    return <div className="text-center py-20 text-muted-foreground">Access denied. Admin only.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2"><UserCog className="w-5 h-5" /> User Management</h1>
        <span className="text-sm text-muted-foreground">{users.length} users</span>
      </div>

      <div className="relative w-64">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No users found.</CardContent></Card>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">User</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Role</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Joined</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${!user.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-primary font-semibold text-xs">
                          {user.full_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge className={`text-xs ${ROLE_COLORS[user.role as UserRole] || 'bg-muted'}`}>
                      {ROLE_LABELS[user.role as UserRole] || user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs font-medium ${user.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-2 justify-end">
                      {user.id !== currentProfile.id && (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingUser(user); setNewRole(user.role as UserRole); }}>
                            Change Role
                          </Button>
                          <Button variant="ghost" size="sm" className={`h-7 text-xs ${user.is_active ? 'text-destructive hover:text-destructive' : 'text-success hover:text-success'}`} onClick={() => handleToggleActive(user)}>
                            {user.is_active ? <><ShieldOff className="w-3.5 h-3.5 mr-1" /> Deactivate</> : <><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Activate</>}
                          </Button>
                        </>
                      )}
                      {user.id === currentProfile.id && (
                        <span className="text-xs text-muted-foreground pr-2">You</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={v => { if (!v) setEditingUser(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>Change User Role</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Updating role for: <strong>{editingUser?.full_name || editingUser?.username}</strong>
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">New Role</Label>
              <Select value={newRole} onValueChange={v => setNewRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button onClick={handleUpdateRole} disabled={saving}>Update Role</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
