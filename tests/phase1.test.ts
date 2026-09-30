import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/server/auth/password";
import {
  assertTenantOwnership,
  scopedTenantWhere,
  SecurityViolationError,
} from "../src/server/auth/tenant";
import {
  hasPermission,
  assertPermission,
  PERMISSIONS,
} from "../src/server/auth/rbac";
import {
  registerFailedAttempt,
  resetAttemptsOnSuccess,
  isAccountLocked,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
} from "../src/server/auth/bruteforce";
import {
  generateSessionToken,
  hashSessionToken,
  calculateSessionExpiration,
  isSessionExpired,
  SESSION_DURATION_DAYS,
} from "../src/server/auth/session";
import {
  buildAuditLogPayload,
  sanitizeAuditData,
} from "../src/server/audit/audit.service";

describe("Fase 1: Autenticação & Criptografia de Senhas", () => {
  it("deve criar um hash bcrypt seguro para a senha", async () => {
    const hash = await hashPassword("SenhaForte@2026");
    expect(hash).toBeDefined();
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
  });

  it("deve validar corretamente a senha correta", async () => {
    const hash = await hashPassword("BarbeariaMaster#1");
    const isValid = await verifyPassword("BarbeariaMaster#1", hash);
    expect(isValid).toBe(true);
  });

  it("deve rejeitar uma senha incorreta", async () => {
    const hash = await hashPassword("BarbeariaMaster#1");
    const isValid = await verifyPassword("SenhaErrada", hash);
    expect(isValid).toBe(false);
  });

  it("deve exigir no mínimo 8 caracteres para a senha", async () => {
    await expect(hashPassword("1234567")).rejects.toThrow(
      "A senha deve possuir no mínimo 8 caracteres."
    );
  });
});

describe("Fase 1: Isolamento Estrito Multi-Tenant", () => {
  it("deve permitir acesso quando os tenantIds forem idênticos", () => {
    expect(() =>
      assertTenantOwnership("tenant_empresa_a", "tenant_empresa_a")
    ).not.toThrow();
  });

  it("deve bloquear e lançar SecurityViolationError quando tentar acessar tenant de outra empresa", () => {
    expect(() =>
      assertTenantOwnership("tenant_empresa_b", "tenant_empresa_a")
    ).toThrow(SecurityViolationError);
  });

  it("deve aplicar tenantId automaticamente nas consultas Prisma", () => {
    const query = scopedTenantWhere("tenant_123", { status: "ACTIVE" });
    expect(query).toEqual({ tenantId: "tenant_123", status: "ACTIVE" });
  });
});

describe("Fase 1: Matriz de Permissões RBAC (7 Perfis)", () => {
  it("PROPRIETARIO deve ter acesso total a todos os módulos e configurações críticas", () => {
    expect(hasPermission(["PROPRIETARIO"], PERMISSIONS.CONFIGURACOES_MANAGE)).toBe(true);
    expect(hasPermission(["PROPRIETARIO"], PERMISSIONS.FINANCEIRO_READ)).toBe(true);
    expect(hasPermission(["PROPRIETARIO"], PERMISSIONS.CAIXA_CLOSE)).toBe(true);
  });

  it("ADMINISTRADOR deve ter acesso operacional amplo mas não altera configs exclusivas do proprietário", () => {
    expect(hasPermission(["ADMINISTRADOR"], PERMISSIONS.FINANCEIRO_READ)).toBe(true);
    expect(hasPermission(["ADMINISTRADOR"], PERMISSIONS.CONFIGURACOES_MANAGE)).toBe(false);
  });

  it("BARBEIRO só pode ver a própria agenda e própria comissão; NÃO pode abrir caixa ou ver financeiro", () => {
    expect(hasPermission(["BARBEIRO"], PERMISSIONS.AGENDA_OWN_ONLY)).toBe(true);
    expect(hasPermission(["BARBEIRO"], PERMISSIONS.COMISSAO_OWN_READ)).toBe(true);
    expect(hasPermission(["BARBEIRO"], PERMISSIONS.CAIXA_OPEN)).toBe(false);
    expect(hasPermission(["BARBEIRO"], PERMISSIONS.FINANCEIRO_READ)).toBe(false);
    expect(hasPermission(["BARBEIRO"], PERMISSIONS.COMISSAO_MANAGE)).toBe(false);
  });

  it("CAIXA deve operar PDV e Caixa, mas NÃO pode gerenciar funcionários ou comissões", () => {
    expect(hasPermission(["CAIXA"], PERMISSIONS.PDV_SALE)).toBe(true);
    expect(hasPermission(["CAIXA"], PERMISSIONS.CAIXA_OPEN)).toBe(true);
    expect(hasPermission(["CAIXA"], PERMISSIONS.FUNCIONARIOS_WRITE)).toBe(false);
    expect(hasPermission(["CAIXA"], PERMISSIONS.COMISSAO_MANAGE)).toBe(false);
  });

  it("assertPermission deve lançar erro explícito quando o perfil for insuficiente", () => {
    expect(() =>
      assertPermission(["BARBEIRO"], PERMISSIONS.CAIXA_OPEN)
    ).toThrow("Acesso negado");
  });
});

describe("Fase 1: Proteção contra Força Bruta (Brute-Force Lockout)", () => {
  it("deve incrementar tentativas falhas e não bloquear antes do limite", () => {
    const state = { failedAttempts: 0, lockedUntil: null };
    const result = registerFailedAttempt(state);
    expect(result.newAttempts).toBe(1);
    expect(result.isNowLocked).toBe(false);
  });

  it("deve bloquear a conta por 15 minutos ao atingir 5 tentativas falhas", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    const state = { failedAttempts: MAX_FAILED_ATTEMPTS - 1, lockedUntil: null };
    const result = registerFailedAttempt(state, now);

    expect(result.newAttempts).toBe(5);
    expect(result.isNowLocked).toBe(true);
    expect(result.newLockedUntil).toEqual(
      new Date("2026-09-29T12:15:00Z")
    );
  });

  it("deve resetar o contador para zero após login com sucesso", () => {
    const reset = resetAttemptsOnSuccess();
    expect(reset.failedAttempts).toBe(0);
    expect(reset.lockedUntil).toBeNull();
  });
});

describe("Fase 1: Gerenciamento Seguro de Sessões", () => {
  it("deve gerar um token aleatório seguro de 64 bytes (128 hex chars)", () => {
    const token = generateSessionToken();
    expect(token).toHaveLength(128);
  });

  it("deve gerar hash SHA-256 determinístico para persistência no banco", () => {
    const token = "fixed_test_token_sample";
    const hash1 = hashSessionToken(token);
    const hash2 = hashSessionToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("deve calcular a expiração correta da sessão para 7 dias", () => {
    const now = new Date("2026-09-29T10:00:00Z");
    const expiresAt = calculateSessionExpiration(now);
    const expected = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
    expect(expiresAt.getTime()).toBe(expected.getTime());
  });
});

describe("Fase 1: Auditoria Imutável (Audit Logs)", () => {
  it("deve sanitizar senhas e dados confidenciais do log", () => {
    const raw = {
      name: "Barbeiro Teste",
      email: "teste@barberhub.com",
      password: "secret_password",
      passwordHash: "bcrypt_hash_secret",
      token: "secret_token",
    };
    const sanitized = JSON.parse(sanitizeAuditData(raw)!);
    expect(sanitized.name).toBe("Barbeiro Teste");
    expect(sanitized.email).toBe("teste@barberhub.com");
    expect(sanitized.password).toBeUndefined();
    expect(sanitized.passwordHash).toBeUndefined();
    expect(sanitized.token).toBeUndefined();
  });

  it("deve exigir tenantId obrigatório para criar log de auditoria", () => {
    expect(() =>
      buildAuditLogPayload({
        tenantId: "",
        action: "USER_LOGIN",
        entity: "User",
      })
    ).toThrow("Log de auditoria requer tenantId obrigatório.");
  });
});
