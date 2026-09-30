-- FASE 6: BarberHub ERP - Estoque, Produtos, Fornecedores e Ordens de Compra

CREATE TABLE IF NOT EXISTS public.product_categories (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS product_categories_tenant_id_idx ON public.product_categories(tenant_id);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    trade_name text,
    document text,
    phone text,
    email text,
    address text,
    pix_key text,
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS suppliers_tenant_id_idx ON public.suppliers(tenant_id);

CREATE TABLE IF NOT EXISTS public.products (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_id text REFERENCES public.product_categories(id) ON DELETE SET NULL,
    supplier_id text REFERENCES public.suppliers(id) ON DELETE SET NULL,
    name text NOT NULL,
    sku text,
    barcode text,
    cost_price numeric(12, 2) NOT NULL DEFAULT 0.00,
    sale_price numeric(12, 2) NOT NULL DEFAULT 0.00,
    current_stock int NOT NULL DEFAULT 0,
    min_stock int NOT NULL DEFAULT 5,
    unit text NOT NULL DEFAULT 'UN',
    status text NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS products_tenant_id_idx ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS products_tenant_sku_idx ON public.products(tenant_id, sku);

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type text NOT NULL,
    quantity int NOT NULL,
    previous_stock int NOT NULL,
    new_stock int NOT NULL,
    unit_cost numeric(12, 2) NOT NULL DEFAULT 0.00,
    reason text,
    sale_id text,
    purchase_order_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_movements_tenant_id_idx ON public.stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS stock_movements_product_id_idx ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS stock_movements_tenant_type_idx ON public.stock_movements(tenant_id, type);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id text REFERENCES public.units(id) ON DELETE SET NULL,
    supplier_id text NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    code text NOT NULL,
    created_by_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'DRAFT',
    total_amount numeric(12, 2) NOT NULL DEFAULT 0.00,
    expected_delivery_date timestamptz,
    received_at timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS purchase_orders_tenant_id_idx ON public.purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_id_idx ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS purchase_orders_tenant_status_idx ON public.purchase_orders(tenant_id, status);

CREATE TABLE IF NOT EXISTS public.purchase_items (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    purchase_order_id text NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity int NOT NULL,
    unit_cost numeric(12, 2) NOT NULL,
    total_cost numeric(12, 2) NOT NULL,
    UNIQUE (purchase_order_id, productId)
);

GRANT ALL ON public.product_categories, public.suppliers, public.products, public.stock_movements, public.purchase_orders, public.purchase_items TO service_role;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
