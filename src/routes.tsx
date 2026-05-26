import type { ReactNode } from 'react';
import Dashboard from '@/pages/Dashboard';
import LoginPage from '@/pages/LoginPage';
import ProjectsPage from '@/pages/projects/ProjectsPage';
import EmployeesPage from '@/pages/hr/EmployeesPage';
import AttendancePage from '@/pages/hr/AttendancePage';
import LeavesPage from '@/pages/hr/LeavesPage';
import PayrollPage from '@/pages/hr/PayrollPage';
import DepartmentsPage from '@/pages/hr/DepartmentsPage';
import ItemsPage from '@/pages/store/ItemsPage';
import StockInwardPage from '@/pages/store/StockInwardPage';
import StockOutwardPage from '@/pages/store/StockOutwardPage';
import InventoryPage from '@/pages/store/InventoryPage';
import GatePassListPage from '@/pages/gatepasses/GatePassListPage';
import CreateGatePassPage from '@/pages/gatepasses/CreateGatePassPage';
import GatePassDetailPage from '@/pages/gatepasses/GatePassDetailPage';
import UsersPage from '@/pages/UsersPage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
  layout?: boolean;
}

export const routes: RouteConfig[] = [
  { name: 'Login', path: '/login', element: <LoginPage />, public: true, layout: false },
  { name: 'Dashboard', path: '/', element: <Dashboard />, layout: true },
  { name: 'Projects', path: '/projects', element: <ProjectsPage />, layout: true },
  { name: 'Employees', path: '/hr/employees', element: <EmployeesPage />, layout: true },
  { name: 'Attendance', path: '/hr/attendance', element: <AttendancePage />, layout: true },
  { name: 'Leaves', path: '/hr/leaves', element: <LeavesPage />, layout: true },
  { name: 'Payroll', path: '/hr/payroll', element: <PayrollPage />, layout: true },
  { name: 'Departments', path: '/hr/departments', element: <DepartmentsPage />, layout: true },
  { name: 'Items', path: '/store/items', element: <ItemsPage />, layout: true },
  { name: 'Stock Inward', path: '/store/inward', element: <StockInwardPage />, layout: true },
  { name: 'Stock Outward', path: '/store/outward', element: <StockOutwardPage />, layout: true },
  { name: 'Inventory', path: '/store/inventory', element: <InventoryPage />, layout: true },
  { name: 'Gate Passes', path: '/gatepasses', element: <GatePassListPage />, layout: true },
  { name: 'New Gate Pass', path: '/gatepasses/new', element: <CreateGatePassPage />, layout: true },
  { name: 'Gate Pass Detail', path: '/gatepasses/:id', element: <GatePassDetailPage />, layout: true },
  { name: 'Users', path: '/users', element: <UsersPage />, layout: true },
];
