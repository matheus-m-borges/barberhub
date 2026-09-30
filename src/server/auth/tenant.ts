export interface TenantContext {
  tenantId: string;
  unitId?: string | null;
  userId: string;
  roles: string[];
}

export class SecurityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityViolationError";
  }
}

/**
 * Garante que a entidade acessada pertence estritamente ao tenant autenticado.
 * NUNCA permite que dados de uma empresa vazem para outra.
 */
export function assertTenantOwnership(
  resourceTenantId: string,
  authenticatedTenantId: string,
  resourceName = "Recurso"
): void {
  if (!resourceTenantId || !authenticatedTenantId) {
    throw new SecurityViolationError(
      "Identificador de empresa inválido ou ausente."
    );
  }

  if (resourceTenantId !== authenticatedTenantId) {
    throw new SecurityViolationError(
      `Violação de segurança detectada: Tentativa de acesso não autorizado ao ${resourceName} de outra empresa.`
    );
  }
}

/**
 * Cria a cláusula WHERE padrão do Prisma filtrando obrigatoriamente por tenantId.
 */
export function scopedTenantWhere<T extends Record<string, any>>(
  tenantId: string,
  additionalConditions?: T
): T & { tenantId: string } {
  if (!tenantId) {
    throw new SecurityViolationError("Tenant ID obrigatório para consulta.");
  }
  return {
    ...(additionalConditions || ({} as T)),
    tenantId,
  };
}
