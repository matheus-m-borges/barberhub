-- ============================================================================
-- NAVOR BARBERHUB — MIGRATION 03: PRIMEIRO ACESSO, CONVITES SEGUROS & FUNÇÕES
-- Data: 2026-10-01
-- Descrição: Fluxo oficial de Primeiro Acesso NAVOR (padrão LawHub), tokens de convite e auditoria.
-- ============================================================================

-- TABELA DE CONVITES SEGUROS (PRIMEIRO ACESSO)
CREATE TABLE IF NOT EXISTS "user_invites" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'BARBEIRO',
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, EXPIRED, REVOKED
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    CONSTRAINT "user_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_invites_token_key" ON "user_invites"("token");
CREATE INDEX IF NOT EXISTS "user_invites_tenant_id_idx" ON "user_invites"("tenant_id");
CREATE INDEX IF NOT EXISTS "user_invites_email_idx" ON "user_invites"("email");

ALTER TABLE "user_invites" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_invites_isolation" ON "user_invites"
    FOR ALL USING (tenant_id = current_tenant_id() OR auth.role() = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR auth.role() = 'service_role');

-- FUNÇÃO: CRIAR CONVITE DE PRIMEIRO ACESSO (Chamado pelo Administrador / Proprietário)
CREATE OR REPLACE FUNCTION create_user_invite(
    p_tenant_id TEXT,
    p_email TEXT,
    p_name TEXT,
    p_role TEXT,
    p_token TEXT,
    p_hours_valid INT DEFAULT 48
)
RETURNS JSONB AS $$
DECLARE
    v_invite_id TEXT;
    v_expires_at TIMESTAMP(3);
BEGIN
    v_invite_id := 'inv_' || encode(gen_random_bytes(12), 'hex');
    v_expires_at := CURRENT_TIMESTAMP + (p_hours_valid || ' hours')::INTERVAL;

    -- Invalida convites pendentes anteriores para o mesmo email no tenant
    UPDATE "user_invites"
    SET "status" = 'REVOKED'
    WHERE "tenant_id" = p_tenant_id AND "email" = LOWER(p_email) AND "status" = 'PENDING';

    INSERT INTO "user_invites" (
        "id", "tenant_id", "email", "name", "role", "token", "status", "expires_at"
    ) VALUES (
        v_invite_id, p_tenant_id, LOWER(p_email), p_name, p_role, p_token, 'PENDING', v_expires_at
    );

    RETURN jsonb_build_object(
        'success', true,
        'inviteId', v_invite_id,
        'email', LOWER(p_email),
        'expiresAt', v_expires_at,
        'inviteUrl', 'https://barberhub.navorbr.com/primeiro-acesso?token=' || p_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNÇÃO: CONCLUIR PRIMEIRO ACESSO E CRIAR SENHA PRÓPRIA
CREATE OR REPLACE FUNCTION accept_user_invite(
    p_token TEXT,
    p_password_hash TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_invite RECORD;
    v_user_id TEXT;
BEGIN
    SELECT * INTO v_invite
    FROM "user_invites"
    WHERE "token" = p_token AND "status" = 'PENDING';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token de convite inválido ou já utilizado.');
    END IF;

    IF v_invite.expires_at < CURRENT_TIMESTAMP THEN
        UPDATE "user_invites" SET "status" = 'EXPIRED' WHERE "id" = v_invite.id;
        RETURN jsonb_build_object('success', false, 'error', 'Este link de primeiro acesso expirou. Solicite um novo convite ao administrador.');
    END IF;

    -- Cria ou atualiza usuário no banco com sua senha definitiva
    v_user_id := 'usr_' || encode(gen_random_bytes(12), 'hex');

    INSERT INTO "users" (
        "id", "tenant_id", "name", "email", "password_hash", "status"
    ) VALUES (
        v_user_id, v_invite.tenant_id, v_invite.name, v_invite.email, p_password_hash, 'ACTIVE'
    )
    ON CONFLICT ("tenant_id", "email") DO UPDATE
    SET "password_hash" = EXCLUDED."password_hash",
        "status" = 'ACTIVE',
        "failed_attempts" = 0,
        "locked_until" = NULL,
        "updated_at" = CURRENT_TIMESTAMP;

    -- Marca convite como aceito
    UPDATE "user_invites"
    SET "status" = 'ACCEPTED',
        "accepted_at" = CURRENT_TIMESTAMP
    WHERE "id" = v_invite.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Senha cadastrada com sucesso! Seu acesso oficial ao BarberHub está ativo.',
        'email', v_invite.email,
        'tenantId', v_invite.tenant_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
