
-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
  ('Management', 'Company management and administration'),
  ('Production', 'Glass production and fabrication'),
  ('Sales', 'Sales and customer relations'),
  ('Stores', 'Inventory and store management'),
  ('HR & Admin', 'Human resources and administration'),
  ('Accounts', 'Finance and accounts');

-- Insert sample items
INSERT INTO public.items (item_code, name, category, unit, description, current_stock, min_stock) VALUES
  ('GS-001', 'Clear Float Glass 4mm', 'glass_sheets', 'sqft', 'Clear float glass 4mm thickness', 500, 100),
  ('GS-002', 'Tinted Glass 6mm Bronze', 'glass_sheets', 'sqft', 'Bronze tinted glass 6mm thickness', 250, 50),
  ('GS-003', 'Tempered Glass 8mm', 'glass_sheets', 'sqft', 'Toughened tempered safety glass 8mm', 150, 30),
  ('GS-004', 'Laminated Glass 6.38mm', 'glass_sheets', 'sqft', 'Laminated safety glass with PVB interlayer', 100, 20),
  ('HW-001', 'Aluminum Spacer Bar', 'hardware', 'mtr', 'Aluminum spacer bar for IGU manufacturing', 200, 50),
  ('HW-002', 'Glass Clamps SS', 'hardware', 'pcs', 'Stainless steel glass clamps', 100, 20),
  ('HW-003', 'Spider Fittings', 'hardware', 'pcs', 'Stainless steel spider fittings for glass facade', 50, 10),
  ('TL-001', 'Glass Cutter', 'tools', 'pcs', 'Diamond tip glass cutter tool', 15, 5),
  ('TL-002', 'Suction Cups (pair)', 'tools', 'pcs', 'Heavy duty suction cup lifters for glass handling', 20, 5),
  ('CH-001', 'Silicone Sealant Clear', 'chemicals', 'box', 'Neutral cure silicone sealant clear 600ml', 80, 20),
  ('CH-002', 'Glass Edge Polishing Compound', 'chemicals', 'kg', 'CeO2 polishing compound for glass edge finishing', 30, 10),
  ('PK-001', 'Foam Packing Roll', 'packaging', 'roll', 'PE foam protective packing roll for glass', 50, 10),
  ('FR-001', 'Aluminum Frame Profile', 'frames', 'mtr', 'Powder coated aluminum frame profile', 300, 50),
  ('AC-001', 'Glass Rubber Gasket', 'accessories', 'mtr', 'EPDM rubber gasket for glass framing', 200, 40);
