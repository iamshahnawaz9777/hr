
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_pass_items ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION is_admin_or_manager(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('admin', 'manager') FROM profiles WHERE id = uid;
$$;

-- Profiles policies
CREATE POLICY "Admins full access to profiles" ON profiles
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Users view own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

CREATE VIEW public_profiles AS
  SELECT id, username, full_name, role, avatar_url FROM profiles;

-- Departments: all authenticated can read, admin/manager can write
CREATE POLICY "Authenticated read departments" ON departments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manager write departments" ON departments
  FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid()));

-- Employees: all authenticated read, admin/hr/manager write
CREATE POLICY "Authenticated read employees" ON employees
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin hr manager write employees" ON employees
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) IN ('admin', 'manager', 'hr'));

-- Attendance: all authenticated read, admin/hr/manager write
CREATE POLICY "Authenticated read attendance" ON attendance
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin hr manager write attendance" ON attendance
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) IN ('admin', 'manager', 'hr'));

-- Leaves: all read, employee insert own, manager/hr/admin approve
CREATE POLICY "Authenticated read leaves" ON leaves
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin hr manager write leaves" ON leaves
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) IN ('admin', 'manager', 'hr'));
CREATE POLICY "Employee insert own leave" ON leaves
  FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid()));

-- Payroll: admin/hr/manager
CREATE POLICY "Admin hr manager read payroll" ON payroll
  FOR SELECT TO authenticated USING (get_user_role(auth.uid()) IN ('admin', 'manager', 'hr'));
CREATE POLICY "Admin hr manager write payroll" ON payroll
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) IN ('admin', 'manager', 'hr'));

-- Projects: all read, admin/manager write
CREATE POLICY "Authenticated read projects" ON projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manager write projects" ON projects
  FOR ALL TO authenticated USING (is_admin_or_manager(auth.uid()));

-- Tasks: all read, authenticated write
CREATE POLICY "Authenticated read tasks" ON tasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write tasks" ON tasks
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- Subtasks: all read, authenticated write
CREATE POLICY "Authenticated read subtasks" ON subtasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write subtasks" ON subtasks
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- Task activities: all read, authenticated insert
CREATE POLICY "Authenticated read task_activities" ON task_activities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert task_activities" ON task_activities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Items: all read, store_keeper/admin/manager write
CREATE POLICY "Authenticated read items" ON items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Store admin manager write items" ON items
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) IN ('admin', 'manager', 'store_keeper'));

-- Stock transactions: all read, store_keeper/admin/manager write
CREATE POLICY "Authenticated read stock_transactions" ON stock_transactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Store admin manager write stock_transactions" ON stock_transactions
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) IN ('admin', 'manager', 'store_keeper'));

-- Gate passes: all read, store_keeper/admin/manager write
CREATE POLICY "Authenticated read gate_passes" ON gate_passes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Store admin manager write gate_passes" ON gate_passes
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) IN ('admin', 'manager', 'store_keeper'));

-- Gate pass items: all read, store_keeper/admin/manager write
CREATE POLICY "Authenticated read gate_pass_items" ON gate_pass_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Store admin manager write gate_pass_items" ON gate_pass_items
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) IN ('admin', 'manager', 'store_keeper'));
