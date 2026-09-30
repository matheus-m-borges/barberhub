-- FASE 2: BarberHub ERP - Clientes, Serviços, Funcionários e Configurações

CREATE TABLE IF NOT EXISTS public.customers (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text NOT NULL,
    email text,
    cpf text,
    birth_date timestamptz,
    address text,
    notes text,
    status text NOT NULL DEFAULT 'ACTIVE',
    total_spent numeric(12, 2) NOT NULL DEFAULT 0.00,
    appointments_count int NOT NULL DEFAULT 0,
    average_ticket numeric(12, 2) NOT NULL DEFAULT 0.00,
    last_visit_at timestamptz,
    no_show_count int NOT NULL DEFAULT 0,
    canceled_count int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS customers_tenant_id_idx ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS customers_tenant_name_idx ON public.customers(tenant_id, name);

CREATE TABLE IF NOT EXISTS public.customer_notes (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    author_id text REFERENCES public.users(id) ON DELETE SET NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_notes_tenant_id_idx ON public.customer_notes(tenant_id);
CREATE INDEX IF NOT EXISTS customer_notes_customer_id_idx ON public.customer_notes(customer_id);

CREATE TABLE IF NOT EXISTS public.service_categories (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    color text DEFAULT '#3b82f6',
    order_index int NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS service_categories_tenant_id_idx ON public.service_categories(tenant_id);

CREATE TABLE IF NOT EXISTS public.services (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_id text REFERENCES public.service_categories(id) ON DELETE SET NULL,
    name text NOT NULL,
    description text,
    price numeric(12, 2) NOT NULL DEFAULT 0.00,
    duration_minutes int NOT NULL DEFAULT 30,
    commission_type text NOT NULL DEFAULT 'PERCENTAGE',
    commission_value numeric(12, 2) NOT NULL DEFAULT 0.00,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS services_tenant_id_idx ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS services_tenant_category_idx ON public.services(tenant_id, category_id);

CREATE TABLE IF NOT EXISTS public.employees (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id text REFERENCES public.units(id) ON DELETE SET NULL,
    user_id text UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
    name text NOT NULL,
    cpf text,
    phone text NOT NULL,
    birth_date timestamptz,
    hire_date timestamptz NOT NULL DEFAULT now(),
    position text NOT NULL DEFAULT 'BARBEIRO',
    salary numeric(12, 2) NOT NULL DEFAULT 0.00,
    commission_rate numeric(12, 2) NOT NULL DEFAULT 0.00,
    pix_key text,
    status text NOT NULL DEFAULT 'ACTIVE',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS employees_tenant_id_idx ON public.employees(tenant_id);

CREATE TABLE IF NOT EXISTS public.employee_services (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    service_id text NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    custom_rate numeric(12, 2),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (employee_id, service_id)
);
CREATE INDEX IF NOT EXISTS employee_services_tenant_id_idx ON public.employee_services(tenant_id);

CREATE TABLE IF NOT EXISTS public.business_settings (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    business_name text NOT NULL,
    weekday_opening_time text NOT NULL DEFAULT '09:00',
    weekday_closing_time text NOT NULL DEFAULT '19:00',
    interval_minutes int NOT NULL DEFAULT 30,
    appointment_buffer_minutes int NOT NULL DEFAULT 0,
    cancellation_grace_minutes int NOT NULL DEFAULT 120,
    enable_online_booking boolean NOT NULL DEFAULT true,
    require_phone_confirmation boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.customers, public.customer_notes, public.service_categories, public.services, public.employees, public.employee_services, public.business_settings TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
