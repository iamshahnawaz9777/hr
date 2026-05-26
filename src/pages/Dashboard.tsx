import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package, FileText, Users, FolderKanban,
  AlertTriangle, Clock, CheckCircle2, TrendingUp, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import type { GatePass, Item } from '@/types/types';

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  pendingLeaves: number;
  totalItems: number;
  lowStockItems: number;
  pendingGatePasses: number;
  activeProjects: number;
  totalTasks: number;
  doneTasks: number;
}

const GATEPASS_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  approved: 'bg-info text-info-foreground',
  returned: 'bg-success text-success-foreground',
  closed: 'bg-muted text-muted-foreground',
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [recentGatePasses, setRecentGatePasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [empRes, attRes, leaveRes, itemRes, gpRes, projRes, taskRes] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', today).eq('status', 'present'),
        supabase.from('leaves').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('items').select('id, current_stock, min_stock', { count: 'exact' }),
        supabase.from('gate_passes').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tasks').select('id, status'),
      ]);

      const items = (Array.isArray(itemRes.data) ? itemRes.data : []) as Item[];
      const lowStock = items.filter((i) => i.current_stock <= i.min_stock);
      const tasks = Array.isArray(taskRes.data) ? taskRes.data : [];
      const doneTasks = tasks.filter((t: { status: string }) => t.status === 'done').length;

      setStats({
        totalEmployees: empRes.count || 0,
        presentToday: attRes.count || 0,
        pendingLeaves: leaveRes.count || 0,
        totalItems: itemRes.count || 0,
        lowStockItems: lowStock.length,
        pendingGatePasses: gpRes.count || 0,
        activeProjects: projRes.count || 0,
        totalTasks: tasks.length,
        doneTasks,
      });

      // Fetch items where current_stock <= min_stock manually
      const { data: allItems } = await supabase
        .from('items')
        .select('*')
        .order('current_stock', { ascending: true })
        .limit(20);
      const filtered = (allItems || []).filter((i) => (i as Item).current_stock <= (i as Item).min_stock).slice(0, 5) as Item[];
      setLowStockItems(filtered);

      // Recent gate passes
      const { data: gpData } = await supabase
        .from('gate_passes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentGatePasses(Array.isArray(gpData) ? gpData : []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'text-info', link: '/hr/employees' },
    { label: 'Present Today', value: stats.presentToday, icon: CheckCircle2, color: 'text-success', link: '/hr/attendance' },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: Clock, color: 'text-warning', link: '/hr/leaves' },
    { label: 'Inventory Items', value: stats.totalItems, icon: Package, color: 'text-primary', link: '/store/items' },
    { label: 'Low Stock Alerts', value: stats.lowStockItems, icon: AlertTriangle, color: 'text-destructive', link: '/store/inventory' },
    { label: 'Pending Gate Passes', value: stats.pendingGatePasses, icon: FileText, color: 'text-warning', link: '/gatepasses' },
    { label: 'Active Projects', value: stats.activeProjects, icon: FolderKanban, color: 'text-info', link: '/projects' },
    { label: 'Task Completion', value: stats.totalTasks > 0 ? `${Math.round((stats.doneTasks / stats.totalTasks) * 100)}%` : '—', icon: TrendingUp, color: 'text-success', link: '/projects' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground text-balance">
          Welcome back, {profile?.full_name || profile?.username || 'User'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="h-full"><CardContent className="p-4"><Skeleton className="h-16 bg-muted" /></CardContent></Card>
            ))
          : statCards.map(card => {
              const Icon = card.icon;
              return (
                <Link key={card.label} to={card.link}>
                  <Card className="h-full hover:shadow-hover transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-muted-foreground text-xs text-pretty">{card.label}</p>
                          <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                        </div>
                        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${card.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Low Stock Alerts
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="shrink-0 h-7 text-xs">
              <Link to="/store/inventory" className="flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 bg-muted" />)}
              </div>
            ) : lowStockItems.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No low stock alerts</p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.item_code}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-destructive">{item.current_stock} {item.unit}</p>
                      <p className="text-xs text-muted-foreground">Min: {item.min_stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Gate Passes */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Recent Gate Passes
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="shrink-0 h-7 text-xs">
              <Link to="/gatepasses" className="flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 bg-muted" />)}
              </div>
            ) : recentGatePasses.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No gate passes yet</p>
            ) : (
              <div className="space-y-2">
                {recentGatePasses.map(gp => (
                  <Link key={gp.id} to={`/gatepasses/${gp.id}`} className="block">
                    <div className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0 hover:bg-muted/30 rounded px-1 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{gp.gp_number}</p>
                        <p className="text-xs text-muted-foreground truncate">{gp.person_name}</p>
                      </div>
                      <Badge className={`text-xs shrink-0 ${GATEPASS_STATUS_COLORS[gp.status]}`}>
                        {gp.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
