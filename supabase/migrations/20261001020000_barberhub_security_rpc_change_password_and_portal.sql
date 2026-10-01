-- ==============================================================================
-- MIGRATION: 20261001020000_barberhub_security_rpc_change_password_and_portal.sql
-- DESCRIÇÃO: RPC segura de troca de senha (SECURITY DEFINER), resolução de identidade
--            técnica exclusiva BarberHub e verificação autorizada do Portal do Cliente.
-- ==============================================================================

-- Remove declarações prévias para evitar conflitos de parâmetros padrão
DROP FUNCTION IF EXISTS barberhub.resolve_product_auth_email(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.resolve_product_auth_email(TEXT, TEXT);
DROP FUNCTION IF EXISTS barberhub.barberhub_change_password(TEXT);
DROP FUNCTION IF EXISTS public.barberhub_change_password(TEXT);
DROP FUNCTION IF EXISTS public.barberhub_is_customer_portal_enabled(TEXT);
DROP FUNCTION IF EXISTS barberhub.barberhub_is_customer_portal_enabled(TEXT);

-- 1. RESOLUÇÃO DE IDENTIDADE TÉCNICA EXCLUSIVA BARBERHUB
CREATE OR REPLACE FUNCTION public.resolve_product_auth_email(
    p_product_slug TEXT,
    p_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_product_id UUID;
    v_exists BOOLEAN;
    v_hash TEXT;
BEGIN
    SELECT id INTO v_product_id FROM public.products WHERE slug = COALESCE(p_product_slug, 'barberhub');
    IF v_product_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.product_login_identities 
        WHERE product_id = v_product_id AND login_email = LOWER(TRIM(p_email))
    ) INTO v_exists;

    IF v_exists THEN
        v_hash := encode(sha256(convert_to(COALESCE(p_product_slug, 'barberhub') || ':' || LOWER(TRIM(p_email)), 'UTF8')), 'hex');
        RETURN COALESCE(p_product_slug, 'barberhub') || '.' || substr(v_hash, 1, 40) || '@login.navor.internal';
    END IF;

    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_product_auth_email(TEXT, TEXT) TO authenticated, anon;

-- Espelho no schema barberhub para compatibilidade de chamada direta
CREATE OR REPLACE FUNCTION barberhub.resolve_product_auth_email(
    p_product_slug TEXT,
    p_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
    RETURN public.resolve_product_auth_email(p_product_slug, p_email);
END;
$$;

GRANT EXECUTE ON FUNCTION barberhub.resolve_product_auth_email(TEXT, TEXT) TO authenticated, anon;

-- 2. RPC SEGURA DE TROCA DE SENHA ATÔMICA E OBRIGATÓRIA (BARBERHUB)
CREATE OR REPLACE FUNCTION barberhub.barberhub_change_password(p_new_password TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = barberhub, public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_is_barberhub_user BOOLEAN := false;
    v_hash TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado.');
    END IF;

    -- Validação de segurança: verifica se o usuário autenticado pertence ao produto BarberHub
    SELECT EXISTS (
        SELECT 1 FROM barberhub.users WHERE id = v_user_id::text
        UNION
        SELECT 1 FROM public.product_login_identities pli
        JOIN public.products p ON pli.product_id = p.id
        WHERE pli.auth_user_id = v_user_id AND p.slug = 'barberhub'
        UNION
        SELECT 1 FROM auth.users
        WHERE id = v_user_id AND (
            email ILIKE 'barberhub.%@login.navor.internal' OR
            raw_app_meta_data ->> 'product_slug' = 'barberhub'
        )
    ) INTO v_is_barberhub_user;

    IF NOT v_is_barberhub_user THEN
        RETURN jsonb_build_object('success', false, 'error', 'Operação não permitida: Usuário não pertence ao produto BarberHub.');
    END IF;

    -- Validação de complexidade mínima da senha
    IF p_new_password IS NULL OR length(trim(p_new_password)) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'A nova senha deve possuir no mínimo 8 caracteres.');
    END IF;

    -- 2.1 Atualiza atomicamente auth.users com a nova senha e limpa o flag obrigatório
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        raw_user_meta_data = (COALESCE(raw_user_meta_data, '{}'::jsonb) - 'must_change_password') || '{"must_change_password": false}'::jsonb,
        raw_app_meta_data = (COALESCE(raw_app_meta_data, '{}'::jsonb) - 'must_change_password') || '{"must_change_password": false}'::jsonb,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id;

    -- 2.2 Sincroniza barberhub.users
    v_hash := crypt(p_new_password, gen_salt('bf'));
    UPDATE barberhub.users
    SET password_hash = v_hash,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id::text;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Senha alterada com sucesso.',
        'userId', v_user_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION barberhub.barberhub_change_password(TEXT) TO authenticated, anon;

-- Espelho no schema public
CREATE OR REPLACE FUNCTION public.barberhub_change_password(p_new_password TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = barberhub, public, auth, extensions
AS $$
BEGIN
    RETURN barberhub.barberhub_change_password(p_new_password);
END;
$$;

GRANT EXECUTE ON FUNCTION public.barberhub_change_password(TEXT) TO authenticated, anon;

-- 3. RPC DE CONSULTA AUTORIZADA DO MÓDULO PORTAL DO CLIENTE
CREATE OR REPLACE FUNCTION public.barberhub_is_customer_portal_enabled(p_tenant_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, barberhub, auth, extensions
AS $$
DECLARE
    v_account_id UUID;
    v_enabled BOOLEAN := false;
BEGIN
    IF p_tenant_id IS NOT NULL AND trim(p_tenant_id) != '' THEN
        BEGIN
            v_account_id := p_tenant_id::UUID;
        EXCEPTION WHEN OTHERS THEN
            RETURN false;
        END;
    ELSE
        BEGIN
            v_account_id := (COALESCE(
                auth.jwt() -> 'app_metadata' ->> 'tenant_id',
                auth.jwt() -> 'user_metadata' ->> 'tenant_id'
            ))::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_account_id := NULL;
        END;
    END IF;

    IF v_account_id IS NULL THEN
        RETURN false;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.account_modules am
        JOIN public.system_modules sm ON am.module_id = sm.id
        WHERE am.account_id = v_account_id
          AND sm.key = 'customer_portal'
          AND sm.is_active = true
    ) INTO v_enabled;

    RETURN v_enabled;
END;
$$;

GRANT EXECUTE ON FUNCTION public.barberhub_is_customer_portal_enabled(TEXT) TO authenticated, anon;

-- Espelho no schema barberhub
CREATE OR REPLACE FUNCTION barberhub.barberhub_is_customer_portal_enabled(p_tenant_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, barberhub, auth, extensions
AS $$
BEGIN
    RETURN public.barberhub_is_customer_portal_enabled(p_tenant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION barberhub.barberhub_is_customer_portal_enabled(TEXT) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
