-- ============================================================================
-- NAVOR BARBERHUB — MIGRATION 02: ROW LEVEL SECURITY (RLS) & ISOLAMENTO TENANT
-- Data: 2026-10-01
-- Descrição: Políticas estritas de RLS por tenant_id. Prevenção de vazamento de dados.
-- ============================================================================

-- HABILITAR RLS NAS TABELAS
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waiting_list" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_commissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_registers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sale_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "loyalty_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "loyalty_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_settings" ENABLE ROW LEVEL SECURITY;

-- FUNÇÃO AUXILIAR DE TENANT DO USUÁRIO CONECTADO
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_tenant_id', true),
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id'),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- POLÍTICAS ESTROUTAS MULTI-TENANT: O USUÁRIO SÓ ENXERGA E GRAVA DADOS DO SEU TENANT
-- 1. Tenants: visualização do próprio tenant
CREATE POLICY "tenants_isolation_select" ON "tenants"
    FOR SELECT USING (id = current_tenant_id() OR auth.role() = 'service_role');

-- 2. Clientes: isolamento estrito
CREATE POLICY "customers_isolation_all" ON "customers"
    FOR ALL USING (tenant_id = current_tenant_id() OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR auth.role() = 'service_role');

-- 3. Serviços: visualização pública para agendamento online se tenant ativo, gravação apenas do tenant
CREATE POLICY "services_isolation_select" ON "services"
    FOR SELECT USING (is_active = true OR tenant_id = current_tenant_id() OR auth.role() = 'service_role');

CREATE POLICY "services_isolation_modify" ON "services"
    FOR ALL USING (tenant_id = current_tenant_id() OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR auth.role() = 'service_role');

-- 4. Agendamentos: isolamento estrito
CREATE POLICY "appointments_isolation_all" ON "appointments"
    FOR ALL USING (tenant_id = current_tenant_id() OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR auth.role() = 'service_role');

-- 5. Colaboradores: isolamento estrito
CREATE POLICY "employees_isolation_all" ON "employees"
    FOR ALL USING (tenant_id = current_tenant_id() OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR auth.role() = 'service_role');

-- 6. Vendas e Frente de Caixa: isolamento estrito
CREATE POLICY "sales_isolation_all" ON "sales"
    FOR ALL USING (tenant_id = current_tenant_id() OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR auth.role() = 'service_role');

CREATE POLICY "cash_registers_isolation_all" ON "cash_registers"
    FOR ALL USING (tenant_id = current_tenant_id() OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR auth.role() = 'service_role');

-- 7. Produtos e Estoque: isolamento estrito
CREATE POLICY "products_isolation_all" ON "products"
    FOR ALL USING (tenant_id = current_tenant_id() OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR auth.role() = 'service_role');

-- 8. Configurações da Barbearia: leitura pública para dados institucionais, modificação apenas do proprietário
CREATE POLICY "business_settings_select" ON "business_settings"
    FOR SELECT USING (true);

CREATE POLICY "business_settings_modify" ON "business_settings"
    FOR ALL USING (tenant_id = current_tenant_id() OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR auth.role() = 'service_role');

-- 9. Auditoria: somente inserção e consulta do próprio tenant
CREATE POLICY "audit_logs_isolation_select" ON "audit_logs"
    FOR SELECT USING (tenant_id = current_tenant_id() OR auth.role() = 'service_role');

CREATE POLICY "audit_logs_isolation_insert" ON "audit_logs"
    FOR INSERT WITH CHECK (tenant_id = current_tenant_id() OR auth.role() = 'service_role');
