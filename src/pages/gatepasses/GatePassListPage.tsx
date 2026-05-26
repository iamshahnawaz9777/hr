import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, FileText, Car, User2, ExternalLink, Download, Package } from 'lucide-react';
import type { GatePass } from '@/types/types';
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
                        {gp.gate_pass_items.map((item, idx) => (
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
                  <Button variant="ghost" size="sm" asChild className="shrink-0 h-8">
                    <Link to={`/gatepasses/${gp.id}`} className="flex items-center gap-1">
                      View <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
