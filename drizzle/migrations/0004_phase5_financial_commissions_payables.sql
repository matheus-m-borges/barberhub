-- FASE 5: BarberHub ERP - Gestão Financeira, Comissões, Contas a Pagar/Receber e Fluxo de Caixa

CREATE TABLE IF NOT EXISTS public.financial_categories (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL,
    description text,
    color text DEFAULT '#10b981',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name, type)
);
CREATE INDEX IF NOT EXISTS financial_categories_tenant_id_idx ON public.financial_categories(tenant_id);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id text REFERENCES public.units(id) ON DELETE SET NULL,
    category_id text NOT NULL REFERENCES public.financial_categories(id) ON DELETE CASCADE,
    type text NOT NULL,
    amount numeric(12, 2) NOT NULL,
    payment_method text NOT NULL,
    description text NOT NULL,
    date timestamptz NOT NULL DEFAULT now(),
    sale_id text,
    status text NOT NULL DEFAULT 'CONFIRMED',
    canceled_at timestamptz,
    cancellation_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS financial_transactions_tenant_id_idx ON public.financial_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS financial_transactions_tenant_date_idx ON public.financial_transactions(tenant_id, date);
CREATE INDEX IF NOT EXISTS financial_transactions_tenant_type_idx ON public.financial_transactions(tenant_id, type);

CREATE TABLE IF NOT EXISTS public.accounts_payable (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id text REFERENCES public.units(id) ON DELETE SET NULL,
    category_id text NOT NULL REFERENCES public.financial_categories(id) ON DELETE CASCADE,
    supplier_name text NOT NULL,
    description text NOT NULL,
    amount numeric(12, 2) NOT NULL,
    due_date timestamptz NOT NULL,
    paid_at timestamptz,
    paid_amount numeric(12, 2),
    payment_method text,
    status text NOT NULL DEFAULT 'PENDING',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_payable_tenant_id_idx ON public.accounts_payable(tenant_id);
CREATE INDEX IF NOT EXISTS accounts_payable_tenant_due_status_idx ON public.accounts_payable(tenant_id, due_date, status);

CREATE TABLE IF NOT EXISTS public.accounts_receivable (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id text REFERENCES public.units(id) ON DELETE SET NULL,
    customer_id text REFERENCES public.customers(id) ON DELETE SET NULL,
    category_id text NOT NULL REFERENCES public.financial_categories(id) ON DELETE CASCADE,
    description text NOT NULL,
    amount numeric(12, 2) NOT NULL,
    due_date timestamptz NOT NULL,
    received_at timestamptz,
    received_amount numeric(12, 2),
    payment_method text,
    status text NOT NULL DEFAULT 'PENDING',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_receivable_tenant_id_idx ON public.accounts_receivable(tenant_id);
CREATE INDEX IF NOT EXISTS accounts_receivable_tenant_due_status_idx ON public.accounts_receivable(tenant_id, due_date, status);

CREATE TABLE IF NOT EXISTS public.employee_commissions (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    sale_id text NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    sale_item_id text,
    service_name text NOT NULL,
    service_price numeric(12, 2) NOT NULL,
    commission_rate numeric(12, 2) NOT NULL,
    commission_amount numeric(12, 2) NOT NULL,
    status text NOT NULL DEFAULT 'PENDING',
    paid_at timestamptz,
    cancellation_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS employee_commissions_tenant_id_idx ON public.employee_commissions(tenant_id);
CREATE INDEX IF NOT EXISTS employee_commissions_tenant_emp_status_idx ON public.employee_commissions(tenant_id, employee_id, status);
CREATE INDEX IF NOT EXISTS employee_commissions_sale_id_idx ON public.employee_commissions(sale_id);

GRANT ALL ON public.financial_categories, public.financial_transactions, public.accounts_payable, public.accounts_receivable, public.employee_commissions TO service_role;

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_commissions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER financial_categories_updated_at BEFORE UPDATE ON public.financial_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER accounts_payable_updated_at BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER accounts_receivable_updated_at BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER employee_commissions_updated_at BEFORE UPDATE ON public.employee_commissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
