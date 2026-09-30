-- FASE 3: BarberHub ERP - Agenda, Agendamentos, Bloqueios e Lista de Espera

CREATE TABLE IF NOT EXISTS public.appointments (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id text REFERENCES public.units(id) ON DELETE SET NULL,
    code text NOT NULL,
    token text NOT NULL UNIQUE,
    customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    duration_minutes int NOT NULL,
    total_price numeric(12, 2) NOT NULL DEFAULT 0.00,
    status text NOT NULL DEFAULT 'AGENDADO',
    is_fitting boolean NOT NULL DEFAULT false,
    notes text,
    cancellation_reason text,
    canceled_at timestamptz,
    rescheduled_from_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS appointments_tenant_id_idx ON public.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS appointments_tenant_employee_start_idx ON public.appointments(tenant_id, employee_id, start_time);
CREATE INDEX IF NOT EXISTS appointments_tenant_status_idx ON public.appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS appointments_time_range_idx ON public.appointments(start_time, end_time);

CREATE TABLE IF NOT EXISTS public.appointment_services (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    appointment_id text NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    service_id text NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    price numeric(12, 2) NOT NULL DEFAULT 0.00,
    duration_minutes int NOT NULL,
    commission_value numeric(12, 2) NOT NULL DEFAULT 0.00,
    UNIQUE (appointment_id, service_id)
);

CREATE TABLE IF NOT EXISTS public.appointment_status_history (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    appointment_id text NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    previous_status text,
    new_status text NOT NULL,
    reason text,
    changed_by_id text REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointment_status_history_appointment_id_idx ON public.appointment_status_history(appointment_id);

CREATE TABLE IF NOT EXISTS public.schedule_blocks (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id text REFERENCES public.employees(id) ON DELETE CASCADE,
    title text NOT NULL,
    reason text,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS schedule_blocks_tenant_id_idx ON public.schedule_blocks(tenant_id);
CREATE INDEX IF NOT EXISTS schedule_blocks_employee_time_idx ON public.schedule_blocks(employee_id, start_time, end_time);

CREATE TABLE IF NOT EXISTS public.waiting_list (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    service_id text NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    employee_id text REFERENCES public.employees(id) ON DELETE SET NULL,
    preferred_date timestamptz NOT NULL,
    preferred_period text NOT NULL DEFAULT 'QUALQUER',
    priority int NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'WAITING',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS waiting_list_tenant_id_idx ON public.waiting_list(tenant_id);
CREATE INDEX IF NOT EXISTS waiting_list_tenant_date_status_idx ON public.waiting_list(tenant_id, preferred_date, status);

GRANT ALL ON public.appointments, public.appointment_services, public.appointment_status_history, public.schedule_blocks, public.waiting_list TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER waiting_list_updated_at BEFORE UPDATE ON public.waiting_list FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
