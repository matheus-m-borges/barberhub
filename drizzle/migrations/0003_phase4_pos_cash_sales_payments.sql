-- FASE 4: BarberHub ERP - Frente de Caixa (PDV), Caixa Diário, Vendas e Pagamentos

CREATE TABLE IF NOT EXISTS public.cash_registers (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id text REFERENCES public.units(id) ON DELETE SET NULL,
    opened_by_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    closed_by_id text REFERENCES public.users(id) ON DELETE SET NULL,
    opened_at timestamptz NOT NULL DEFAULT now(),
    closed_at timestamptz,
    initial_balance numeric(12, 2) NOT NULL DEFAULT 0.00,
    expected_balance numeric(12, 2),
    counted_balance numeric(12, 2),
    difference numeric(12, 2),
    status text NOT NULL DEFAULT 'OPEN',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cash_registers_tenant_id_idx ON public.cash_registers(tenant_id);
CREATE INDEX IF NOT EXISTS cash_registers_tenant_status_idx ON public.cash_registers(tenant_id, status);

CREATE TABLE IF NOT EXISTS public.cash_movements (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    cash_register_id text NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type text NOT NULL,
    amount numeric(12, 2) NOT NULL,
    payment_method text NOT NULL DEFAULT 'CASH',
    reason text,
    sale_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cash_movements_register_id_idx ON public.cash_movements(cash_register_id);
CREATE INDEX IF NOT EXISTS cash_movements_tenant_id_idx ON public.cash_movements(tenant_id);

CREATE TABLE IF NOT EXISTS public.sales (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id text REFERENCES public.units(id) ON DELETE SET NULL,
    code text NOT NULL,
    cash_register_id text NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    customer_id text REFERENCES public.customers(id) ON DELETE SET NULL,
    appointment_id text REFERENCES public.appointments(id) ON DELETE SET NULL,
    created_by_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subtotal numeric(12, 2) NOT NULL DEFAULT 0.00,
    discount numeric(12, 2) NOT NULL DEFAULT 0.00,
    total numeric(12, 2) NOT NULL DEFAULT 0.00,
    status text NOT NULL DEFAULT 'COMPLETED',
    canceled_at timestamptz,
    cancellation_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS sales_tenant_id_idx ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS sales_cash_register_id_idx ON public.sales(cash_register_id);
CREATE INDEX IF NOT EXISTS sales_tenant_status_idx ON public.sales(tenant_id, status);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sale_id text NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    item_type text NOT NULL DEFAULT 'SERVICE',
    item_id text NOT NULL,
    name text NOT NULL,
    employee_id text REFERENCES public.employees(id) ON DELETE SET NULL,
    unit_price numeric(12, 2) NOT NULL DEFAULT 0.00,
    quantity int NOT NULL DEFAULT 1,
    total_price numeric(12, 2) NOT NULL DEFAULT 0.00,
    commission_rate numeric(12, 2) NOT NULL DEFAULT 0.00,
    commission_amount numeric(12, 2) NOT NULL DEFAULT 0.00
);
CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS sale_items_employee_id_idx ON public.sale_items(employee_id);

CREATE TABLE IF NOT EXISTS public.payments (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sale_id text NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    method text NOT NULL,
    amount numeric(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid numeric(12, 2),
    change_amount numeric(12, 2) NOT NULL DEFAULT 0.00,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_sale_id_idx ON public.payments(sale_id);
CREATE INDEX IF NOT EXISTS payments_tenant_id_idx ON public.payments(tenant_id);

GRANT ALL ON public.cash_registers, public.cash_movements, public.sales, public.sale_items, public.payments TO service_role;

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER cash_registers_updated_at BEFORE UPDATE ON public.cash_registers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
