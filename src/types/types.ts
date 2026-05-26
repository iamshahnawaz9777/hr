export type UserRole = 'admin' | 'manager' | 'store_keeper' | 'hr' | 'employee';
export type ItemCategory = 'glass_sheets' | 'hardware' | 'tools' | 'chemicals' | 'frames' | 'accessories' | 'packaging' | 'others';
export type ItemUnit = 'pcs' | 'sqft' | 'kg' | 'ltr' | 'box' | 'roll' | 'set' | 'mtr';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type LeaveType = 'casual' | 'sick' | 'annual' | 'unpaid' | 'other';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type GatepassStatus = 'pending' | 'approved' | 'returned' | 'closed';
export type StockTransactionType = 'inward' | 'outward';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  head_id?: string;
  created_at: string;
  head?: Profile;
}

export interface Employee {
  id: string;
  profile_id?: string;
  employee_code: string;
  designation: string;
  department_id?: string;
  joining_date?: string;
  basic_salary: number;
  address?: string;
  emergency_contact?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  department?: Department;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: string;
  notes?: string;
  created_at: string;
  employee?: Employee;
}

export interface Leave {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  status: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  employee?: Employee;
  approver?: Profile;
}

export interface Payroll {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_date?: string;
  notes?: string;
  created_at: string;
  employee?: Employee;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  color: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  task_count?: number;
  done_count?: number;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  due_date?: string;
  position: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
  creator?: Profile;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id?: string;
  action: string;
  created_at: string;
  user?: Profile;
}

export interface Item {
  id: string;
  item_code: string;
  name: string;
  category: ItemCategory;
  unit: ItemUnit;
  description?: string;
  current_stock: number;
  min_stock: number;
  location?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StockTransaction {
  id: string;
  item_id: string;
  transaction_type: StockTransactionType;
  quantity: number;
  supplier_vendor?: string;
  purpose?: string;
  reference_no?: string;
  transaction_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  item?: Item;
  creator?: Profile;
}

export interface GatePass {
  id: string;
  gp_number: string;
  gp_date: string;
  status: GatepassStatus;
  person_name: string;
  person_designation?: string;
  person_contact?: string;
  vehicle_number?: string;
  driver_name?: string;
  vehicle_type?: string;
  purpose?: string;
  is_returnable: boolean;
  expected_return_date?: string;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  gate_pass_items?: GatePassItem[];
  creator?: Profile;
  approver?: Profile;
}

export interface GatePassItem {
  id: string;
  gate_pass_id: string;
  item_id?: string;
  item_name: string;
  item_code?: string;
  quantity: number;
  unit?: string;
  description?: string;
  returned_quantity: number;
  return_date?: string;
  created_at: string;
  item?: Item;
}
