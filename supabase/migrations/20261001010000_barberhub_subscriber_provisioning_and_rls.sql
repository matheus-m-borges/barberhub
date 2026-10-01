-- ==============================================================================
-- MIGRATION: 20261001010000_barberhub_subscriber_provisioning_and_rls.sql
-- DESCRIÇÃO: Provisionamento transacional do assinante BarberHub, governança
--            de metadados JWT/sessão e políticas rigorosas de RLS no schema barberhub.
-- ==============================================================================

-- 1. TRIGGER DE PROVISIONAMENTO DE TENANT NA CONTA CENTRAL
CREATE OR REPLACE FUNCTION public.sync_barberhub_tenant_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, barberhub, auth, extensions
AS $$
DECLARE
    v_barberhub_product_id UUID;
    v_default_unit_id TEXT;
    v_slug TEXT;
BEGIN
    SELECT id INTO v_barberhub_product_id FROM public.products WHERE slug = 'barberhub' LIMIT 1;
    
    -- Executa exclusivamente quando a conta pertencer ao produto BarberHub
    IF NEW.product_id = v_barberhub_product_id THEN
        v_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
        IF v_slug = '' OR v_slug IS NULL THEN
            v_slug := 'barbearia-' || substr(NEW.id::text, 1, 8);
        ELSE
            v_slug := v_slug || '-' || substr(NEW.id::text, 1, 6);
        END IF;

        -- 1.1 Cria ou sincroniza o tenant no schema barberhub com os dados reais contratados
        INSERT INTO barberhub.tenants (
            id, name, slug, trade_name, document, phone, email, status, active, created_at, updated_at
        ) VALUES (
            NEW.id::text,
            NEW.name,
            v_slug,
            COALESCE(NEW.name, 'Barbearia'),
            NEW.document,
            NEW.contact_phone,
            NEW.contact_email,
            'ACTIVE',
            true,
            NEW.created_at,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            trade_name = EXCLUDED.name,
            document = COALESCE(EXCLUDED.document, barberhub.tenants.document),
            phone = COALESCE(EXCLUDED.phone, barberhub.tenants.phone),
            email = COALESCE(EXCLUDED.email, barberhub.tenants.email),
            updated_at = CURRENT_TIMESTAMP;

        -- 1.2 Cria a unidade operacional padrão utilizando estritamente o nome real da barbearia
        -- (Proibido o uso de termos demonstrativos como 'Matriz', 'Centro', etc.)
        v_default_unit_id := 'unit_' || substr(NEW.id::text, 1, 8);
        INSERT INTO barberhub.units (
            id, tenant_id, name, phone, is_active, created_at, updated_at
        ) VALUES (
            v_default_unit_id,
            NEW.id::text,
            NEW.name,
            NEW.contact_phone,
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            phone = COALESCE(EXCLUDED.phone, barberhub.units.phone),
            updated_at = CURRENT_TIMESTAMP;

        -- 1.3 Cria parâmetros de negócio institucionais limpos e sem seeds artificiais
        INSERT INTO barberhub.business_settings (
            id, tenant_id, business_name, cnpj, phone, enable_online_booking, updated_at
        ) VALUES (
            'set_' || substr(NEW.id::text, 1, 8),
            NEW.id::text,
            NEW.name,
            NEW.document,
            NEW.contact_phone,
            true,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (tenant_id) DO UPDATE
        SET business_name = EXCLUDED.business_name,
            cnpj = COALESCE(EXCLUDED.cnpj, barberhub.business_settings.cnpj),
            phone = COALESCE(EXCLUDED.phone, barberhub.business_settings.phone),
            updated_at = CURRENT_TIMESTAMP;

        -- 1.4 Provisiona os papéis RBAC padrão do tenant
        INSERT INTO barberhub.roles (id, tenant_id, name, slug, description, is_system, created_at, updated_at)
        VALUES
            ('role_prop_' || substr(NEW.id::text, 1, 8), NEW.id::text, 'Proprietário', 'PROPRIETARIO', 'Acesso administrativo total à barbearia', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('role_ger_'  || substr(NEW.id::text, 1, 8), NEW.id::text, 'Gerente', 'GERENTE', 'Acesso gerencial, financeiro e operacional', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('role_barb_' || substr(NEW.id::text, 1, 8), NEW.id::text, 'Barbeiro', 'BARBEIRO', 'Agenda individual e comissões da cadeira', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('role_rec_'  || substr(NEW.id::text, 1, 8), NEW.id::text, 'Recepcionista', 'RECEPCIONISTA', 'Recepção, agendamento de clientes e PDV', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (COALESCE(tenant_id, '__system__'), slug) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_barberhub_tenant_provisioning ON public.accounts;
CREATE TRIGGER trg_sync_barberhub_tenant_provisioning
    AFTER INSERT OR UPDATE ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_barberhub_tenant_provisioning();

-- 2. TRIGGER DE VÍNCULO DE MEMBROS E USUÁRIOS BARBERHUB
CREATE OR REPLACE FUNCTION public.sync_barberhub_admin_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, barberhub, auth, extensions
AS $$
DECLARE
    v_barberhub_product_id UUID;
    v_account RECORD;
    v_role_id TEXT;
    v_unit_id TEXT;
BEGIN
    SELECT id INTO v_barberhub_product_id FROM public.products WHERE slug = 'barberhub' LIMIT 1;

    SELECT * INTO v_account FROM public.accounts WHERE id = NEW.account_id;
    IF NOT FOUND OR v_account.product_id != v_barberhub_product_id THEN
        RETURN NEW;
    END IF;

    v_unit_id := 'unit_' || substr(NEW.account_id::text, 1, 8);

    IF NEW.role = 'admin' THEN
        -- Cria ou atualiza o usuário no schema barberhub
        INSERT INTO barberhub.users (
            id, tenant_id, unit_id, name, email, password_hash, status, created_at, updated_at
        ) VALUES (
            NEW.user_id::text,
            NEW.account_id::text,
            v_unit_id,
            COALESCE(v_account.responsible_name, v_account.name, 'Administrador'),
            LOWER(v_account.contact_email),
            'SUPABASE_AUTH_MANAGED',
            'ACTIVE',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE
        SET tenant_id = EXCLUDED.tenant_id,
            unit_id = EXCLUDED.unit_id,
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            status = 'ACTIVE',
            updated_at = CURRENT_TIMESTAMP;

        -- Localiza papel PROPRIETARIO
        SELECT id INTO v_role_id FROM barberhub.roles 
        WHERE tenant_id = NEW.account_id::text AND slug = 'PROPRIETARIO' 
        LIMIT 1;

        IF v_role_id IS NOT NULL THEN
            INSERT INTO barberhub.user_roles (id, user_id, role_id)
            VALUES (
                'ur_' || substr(NEW.user_id::text, 1, 8) || '_' || substr(v_role_id, 1, 8),
                NEW.user_id::text,
                v_role_id
            )
            ON CONFLICT (id) DO NOTHING;
        END IF;

        -- Sincroniza metadados no auth.users para garantir tenant_id, role e product_slug no JWT
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
                'tenant_id', NEW.account_id::text,
                'role', 'PROPRIETARIO',
                'product_slug', 'barberhub'
            ),
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
                'tenant_id', NEW.account_id::text,
                'role', 'PROPRIETARIO',
                'product_slug', 'barberhub'
            )
        WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_barberhub_admin_member ON public.account_members;
CREATE TRIGGER trg_sync_barberhub_admin_member
    AFTER INSERT OR UPDATE ON public.account_members
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_barberhub_admin_member();

-- 3. POLÍTICAS RLS RIGOROSAS POR TENANT NO SCHEMA BARBERHUB
ALTER TABLE barberhub.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberhub.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberhub.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberhub.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberhub.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberhub.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberhub.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberhub.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberhub.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberhub.products ENABLE ROW LEVEL SECURITY;

-- 3.1 Tenants: isolamento restrito
DROP POLICY IF EXISTS tenants_auth_all ON barberhub.tenants;
DROP POLICY IF EXISTS tenants_authenticated_isolation ON barberhub.tenants;
CREATE POLICY tenants_authenticated_isolation ON barberhub.tenants
    FOR ALL TO authenticated
    USING (
        id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = id
    )
    WITH CHECK (
        id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = id
    );

-- 3.2 Users: isolamento restrito
DROP POLICY IF EXISTS users_tenant_isolation ON barberhub.users;
CREATE POLICY users_tenant_isolation ON barberhub.users
    FOR ALL TO authenticated
    USING (
        tenant_id = barberhub.current_tenant_id() 
        OR id = auth.uid()::text
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    )
    WITH CHECK (
        tenant_id = barberhub.current_tenant_id() 
        OR id = auth.uid()::text
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    );

-- 3.3 Units: isolamento restrito
DROP POLICY IF EXISTS units_tenant_isolation ON barberhub.units;
CREATE POLICY units_tenant_isolation ON barberhub.units
    FOR ALL TO authenticated
    USING (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    )
    WITH CHECK (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    );

-- 3.4 Business Settings: isolamento restrito
DROP POLICY IF EXISTS business_settings_tenant_isolation ON barberhub.business_settings;
CREATE POLICY business_settings_tenant_isolation ON barberhub.business_settings
    FOR ALL TO authenticated
    USING (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    )
    WITH CHECK (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    );

-- 3.5 Customers: isolamento restrito
DROP POLICY IF EXISTS customers_tenant_isolation ON barberhub.customers;
CREATE POLICY customers_tenant_isolation ON barberhub.customers
    FOR ALL TO authenticated
    USING (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    )
    WITH CHECK (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    );

-- 3.6 Appointments: isolamento restrito
DROP POLICY IF EXISTS appointments_tenant_isolation ON barberhub.appointments;
CREATE POLICY appointments_tenant_isolation ON barberhub.appointments
    FOR ALL TO authenticated
    USING (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    )
    WITH CHECK (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    );

-- 3.7 Cash Registers: isolamento restrito
DROP POLICY IF EXISTS cash_registers_tenant_isolation ON barberhub.cash_registers;
CREATE POLICY cash_registers_tenant_isolation ON barberhub.cash_registers
    FOR ALL TO authenticated
    USING (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    )
    WITH CHECK (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    );

-- 3.8 Cash Movements: isolamento restrito por vínculo com cash_registers
DROP POLICY IF EXISTS cash_movements_tenant_isolation ON barberhub.cash_movements;
CREATE POLICY cash_movements_tenant_isolation ON barberhub.cash_movements
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM barberhub.cash_registers cr 
            WHERE cr.id = cash_movements.cash_register_id 
              AND (cr.tenant_id = barberhub.current_tenant_id() OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = cr.tenant_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM barberhub.cash_registers cr 
            WHERE cr.id = cash_movements.cash_register_id 
              AND (cr.tenant_id = barberhub.current_tenant_id() OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = cr.tenant_id)
        )
    );

-- 3.9 Services: isolamento restrito
DROP POLICY IF EXISTS services_tenant_isolation ON barberhub.services;
CREATE POLICY services_tenant_isolation ON barberhub.services
    FOR ALL TO authenticated
    USING (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    )
    WITH CHECK (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    );

-- 3.10 Products: isolamento restrito
DROP POLICY IF EXISTS products_tenant_isolation ON barberhub.products;
CREATE POLICY products_tenant_isolation ON barberhub.products
    FOR ALL TO authenticated
    USING (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    )
    WITH CHECK (
        tenant_id = barberhub.current_tenant_id() 
        OR (auth.jwt() -> 'app_metadata' ->> 'tenant_id') = tenant_id
    );

-- Grants nos schemas
GRANT USAGE ON SCHEMA barberhub TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA barberhub TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA barberhub TO anon;
