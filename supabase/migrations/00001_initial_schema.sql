
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'store_keeper', 'hr', 'employee');

-- Item categories enum
CREATE TYPE public.item_category AS ENUM ('glass_sheets', 'hardware', 'tools', 'chemicals', 'frames', 'accessories', 'packaging', 'others');

-- Item unit enum
CREATE TYPE public.item_unit AS ENUM ('pcs', 'sqft', 'kg', 'ltr', 'box', 'roll', 'set', 'mtr');

-- Task priority enum
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Task status enum
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'done');

-- Leave type enum
CREATE TYPE public.leave_type AS ENUM ('casual', 'sick', 'annual', 'unpaid', 'other');

-- Leave/approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Gate pass status enum
CREATE TYPE public.gatepass_status AS ENUM ('pending', 'approved', 'returned', 'closed');

-- Stock transaction type
CREATE TYPE public.stock_transaction_type AS ENUM ('inward', 'outward');

-- Profiles table (synced with auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'employee',
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text,
  head_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Employees
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_code text UNIQUE NOT NULL,
  designation text NOT NULL DEFAULT '',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  joining_date date,
  basic_salary numeric(12,2) DEFAULT 0,
  address text,
  emergency_contact text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Attendance
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  status text NOT NULL DEFAULT 'present',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Leaves
CREATE TABLE public.leaves (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type public.leave_type NOT NULL DEFAULT 'casual',
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count integer NOT NULL DEFAULT 1,
  reason text,
  status public.approval_status NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payroll records
CREATE TABLE public.payroll (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  basic_salary numeric(12,2) NOT NULL DEFAULT 0,
  allowances numeric(12,2) DEFAULT 0,
  deductions numeric(12,2) DEFAULT 0,
  net_salary numeric(12,2) GENERATED ALWAYS AS (basic_salary + COALESCE(allowances, 0) - COALESCE(deductions, 0)) STORED,
  payment_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

-- Projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  color text DEFAULT '#2c5f8d',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subtasks
CREATE TABLE public.subtasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Task activities
CREATE TABLE public.task_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Items (inventory)
CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_code text UNIQUE NOT NULL,
  name text NOT NULL,
  category public.item_category NOT NULL DEFAULT 'others',
  unit public.item_unit NOT NULL DEFAULT 'pcs',
  description text,
  current_stock numeric(12,2) NOT NULL DEFAULT 0,
  min_stock numeric(12,2) DEFAULT 10,
  location text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Stock transactions
CREATE TABLE public.stock_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  transaction_type public.stock_transaction_type NOT NULL,
  quantity numeric(12,2) NOT NULL,
  supplier_vendor text,
  purpose text,
  reference_no text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Gate passes
CREATE TABLE public.gate_passes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gp_number text UNIQUE NOT NULL,
  gp_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.gatepass_status NOT NULL DEFAULT 'pending',
  person_name text NOT NULL,
  person_designation text,
  person_contact text,
  vehicle_number text,
  driver_name text,
  vehicle_type text,
  purpose text,
  is_returnable boolean NOT NULL DEFAULT false,
  expected_return_date date,
  notes text,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Gate pass items
CREATE TABLE public.gate_pass_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gate_pass_id uuid NOT NULL REFERENCES public.gate_passes(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_code text,
  quantity numeric(12,2) NOT NULL,
  unit text,
  description text,
  returned_quantity numeric(12,2) DEFAULT 0,
  return_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-generate gate pass number
CREATE SEQUENCE gp_number_seq START 1001;

CREATE OR REPLACE FUNCTION generate_gp_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.gp_number IS NULL OR NEW.gp_number = '' THEN
    NEW.gp_number := 'GP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('gp_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_gp_number
  BEFORE INSERT ON public.gate_passes
  FOR EACH ROW
  EXECUTE FUNCTION generate_gp_number();

-- Auto-generate employee code
CREATE SEQUENCE emp_code_seq START 1001;

CREATE OR REPLACE FUNCTION generate_employee_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.employee_code IS NULL OR NEW.employee_code = '' THEN
    NEW.employee_code := 'EMP-' || LPAD(nextval('emp_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_employee_code
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION generate_employee_code();

-- Update stock on transaction
CREATE OR REPLACE FUNCTION update_stock_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type = 'inward' THEN
    UPDATE public.items SET current_stock = current_stock + NEW.quantity, updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.transaction_type = 'outward' THEN
    IF (SELECT current_stock FROM public.items WHERE id = NEW.item_id) < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for item %', NEW.item_id;
    END IF;
    UPDATE public.items SET current_stock = current_stock - NEW.quantity, updated_at = now() WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_stock_transaction
  AFTER INSERT ON public.stock_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_transaction();

-- Handle new user (auth trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'employee'::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_gate_passes_updated_at BEFORE UPDATE ON gate_passes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
