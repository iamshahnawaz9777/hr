
-- 1. Auto-compute net_salary on payroll insert/update
CREATE OR REPLACE FUNCTION compute_net_salary()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.net_salary := COALESCE(NEW.basic_salary, 0) + COALESCE(NEW.allowances, 0) - COALESCE(NEW.deductions, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_net_salary
  BEFORE INSERT OR UPDATE ON payroll
  FOR EACH ROW EXECUTE FUNCTION compute_net_salary();

-- 2. Allow all authenticated users to read all profiles (needed for user lists, task assignment)
DROP POLICY IF EXISTS "Authenticated read all profiles" ON profiles;
CREATE POLICY "Authenticated read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- 3. Allow employees to self-insert leave requests
DROP POLICY IF EXISTS "Employee self update leave status" ON leaves;

-- 4. Allow store keeper to manage stock transactions (they might not be admin/manager)
DROP POLICY IF EXISTS "Store keeper write stock_transactions" ON stock_transactions;
CREATE POLICY "Store keeper write stock_transactions"
  ON stock_transactions FOR ALL
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('admin', 'manager', 'store_keeper')
  );

-- 5. Allow store keeper to manage items
DROP POLICY IF EXISTS "Store keeper write items" ON items;
CREATE POLICY "Store keeper write items"
  ON items FOR ALL
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('admin', 'manager', 'store_keeper')
  );

-- 6. Allow store keeper to manage gate passes
DROP POLICY IF EXISTS "Store keeper write gate_passes" ON gate_passes;
CREATE POLICY "Store keeper write gate_passes"
  ON gate_passes FOR ALL
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('admin', 'manager', 'store_keeper')
  );

DROP POLICY IF EXISTS "Store keeper write gate_pass_items" ON gate_pass_items;
CREATE POLICY "Store keeper write gate_pass_items"
  ON gate_pass_items FOR ALL
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('admin', 'manager', 'store_keeper')
  );
