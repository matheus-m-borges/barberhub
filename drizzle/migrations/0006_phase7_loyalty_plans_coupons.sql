-- FASE 7: BarberHub ERP - Fidelidade (Pontos), Planos de Assinatura, Cupons e Promoções

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id text NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
    current_points int NOT NULL DEFAULT 0,
    lifetime_points int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, customer_id)
);
CREATE INDEX IF NOT EXISTS loyalty_accounts_tenant_id_idx ON public.loyalty_accounts(tenant_id);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    loyalty_account_id text NOT NULL REFERENCES public.loyalty_accounts(id) ON DELETE CASCADE,
    type text NOT NULL,
    points int NOT NULL,
    previous_points int NOT NULL,
    new_points int NOT NULL,
    sale_id text,
    reward_id text,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loyalty_transactions_tenant_id_idx ON public.loyalty_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS loyalty_transactions_account_id_idx ON public.loyalty_transactions(loyalty_account_id);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    points_required int NOT NULL,
    service_id text REFERENCES public.services(id) ON DELETE SET NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loyalty_rewards_tenant_id_idx ON public.loyalty_rewards(tenant_id);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    price numeric(12, 2) NOT NULL,
    interval_days int NOT NULL DEFAULT 30,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS subscription_plans_tenant_id_idx ON public.subscription_plans(tenant_id);

CREATE TABLE IF NOT EXISTS public.subscription_plan_items (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    plan_id text NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    service_id text NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    quantity_allowed int NOT NULL,
    UNIQUE (plan_id, service_id)
);

CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    plan_id text NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    start_date timestamptz NOT NULL DEFAULT now(),
    end_date timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE',
    canceled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_subscriptions_tenant_id_idx ON public.customer_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS customer_subscriptions_customer_id_idx ON public.customer_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS customer_subscriptions_tenant_status_idx ON public.customer_subscriptions(tenant_id, status);

CREATE TABLE IF NOT EXISTS public.subscription_usages (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subscription_id text NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
    service_id text NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    appointment_id text REFERENCES public.appointments(id) ON DELETE SET NULL,
    used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_usages_subscription_id_idx ON public.subscription_usages(subscription_id);

CREATE TABLE IF NOT EXISTS public.coupons (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    discount_type text NOT NULL DEFAULT 'PERCENTAGE',
    discount_value numeric(12, 2) NOT NULL,
    min_order_amount numeric(12, 2) NOT NULL DEFAULT 0.00,
    max_uses int,
    current_uses int NOT NULL DEFAULT 0,
    starts_at timestamptz,
    expires_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS coupons_tenant_id_idx ON public.coupons(tenant_id);
CREATE INDEX IF NOT EXISTS coupons_tenant_code_active_idx ON public.coupons(tenant_id, code, is_active);

GRANT ALL ON public.loyalty_accounts, public.loyalty_transactions, public.loyalty_rewards, public.subscription_plans, public.subscription_plan_items, public.customer_subscriptions, public.subscription_usages, public.coupons TO service_role;

ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER loyalty_accounts_updated_at BEFORE UPDATE ON public.loyalty_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER loyalty_rewards_updated_at BEFORE UPDATE ON public.loyalty_rewards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER customer_subscriptions_updated_at BEFORE UPDATE ON public.customer_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
