import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, FolderKanban, Users, Package, FileText,
  LogOut, Menu, ChevronRight, Building2, UserCog, X,
  ClipboardList, ArrowDownToLine, ArrowUpFromLine, BarChart2,
  UserCheck, Calendar, DollarSign, Briefcase
} from 'lucide-react';
import type { UserRole } from '@/types/types';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  roles?: UserRole[];
  children?: { label: string; path: string; icon: React.ComponentType<{ className?: string }> }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    label: 'Projects', icon: FolderKanban, path: '/projects',
    roles: ['admin', 'manager', 'employee', 'hr', 'store_keeper'],
  },
  {
    label: 'HR Management', icon: Users, path: '/hr',
    roles: ['admin', 'manager', 'hr'],
    children: [
      { label: 'Employees', path: '/hr/employees', icon: Briefcase },
      { label: 'Attendance', path: '/hr/attendance', icon: UserCheck },
      { label: 'Leave Requests', path: '/hr/leaves', icon: Calendar },
      { label: 'Payroll', path: '/hr/payroll', icon: DollarSign },
      { label: 'Departments', path: '/hr/departments', icon: Building2 },
    ],
  },
  {
    label: 'Store', icon: Package, path: '/store',
    roles: ['admin', 'manager', 'store_keeper'],
    children: [
      { label: 'Item Master', path: '/store/items', icon: ClipboardList },
      { label: 'Stock Inward', path: '/store/inward', icon: ArrowDownToLine },
      { label: 'Stock Outward', path: '/store/outward', icon: ArrowUpFromLine },
      { label: 'Inventory', path: '/store/inventory', icon: BarChart2 },
    ],
  },
  {
    label: 'Gate Passes', icon: FileText, path: '/gatepasses',
    roles: ['admin', 'manager', 'store_keeper'],
  },
  {
    label: 'User Management', icon: UserCog, path: '/users',
    roles: ['admin'],
  },
];

interface SidebarContentProps {
  onClose?: () => void;
}

function SidebarContent({ onClose }: SidebarContentProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string[]>([]);

  const userRole = profile?.role as UserRole | undefined;

  const isVisible = (item: NavItem) => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const toggleExpand = (label: string) => {
    setExpanded(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
    onClose?.();
  };

  const roleLabel: Record<UserRole, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    store_keeper: 'Store Keeper',
    hr: 'HR',
    employee: 'Employee',
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 rounded bg-sidebar-primary flex items-center justify-center shrink-0">
          <span className="text-sidebar-primary-foreground font-bold text-lg">G</span>
        </div>
        <div className="min-w-0">
          <p className="text-sidebar-accent-foreground font-semibold text-sm leading-tight truncate">GlassERP</p>
          <p className="text-sidebar-foreground text-xs opacity-70 truncate">Management System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.filter(isVisible).map(item => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expanded.includes(item.label);
          const active = isActive(item.path);

          return (
            <div key={item.path}>
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-0.5 ${
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="ml-7 mb-1 space-y-0.5 border-l border-sidebar-border pl-3">
                      {item.children!.map(child => {
                        const ChildIcon = child.icon;
                        const childActive = location.pathname === child.path;
                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={onClose}
                            className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors ${
                              childActive
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }`}
                          >
                            <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-0.5 ${
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md mb-1">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-sidebar-primary-foreground font-semibold text-sm">
              {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.username?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-accent-foreground text-sm font-medium truncate">
              {profile?.full_name || profile?.username || 'User'}
            </p>
            {userRole && (
              <Badge variant="outline" className="text-xs border-sidebar-border text-sidebar-foreground px-1.5 py-0 h-4">
                {roleLabel[userRole]}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-40">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-foreground">GlassERP</span>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
