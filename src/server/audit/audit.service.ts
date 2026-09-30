export type AuditAction =
  | "USER_LOGIN"
  | "USER_LOGIN_FAILED"
  | "USER_LOGOUT"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_PASSWORD_CHANGE"
  | "USER_LOCKOUT"
  | "ROLE_ASSIGNED"
  | "PERMISSION_UPDATE"
  | "CONFIG_UPDATE"
  | "SALE_CREATE"
  | "SALE_CANCEL"
  | "DISCOUNT_APPLIED"
  | "CASH_OPEN"
  | "CASH_CLOSE"
  | "CASH_BLEED"
  | "CASH_SUPPLY"
  | "PRICE_CHANGE"
  | "SERVICE_CREATE"
  | "SERVICE_UPDATE"
  | "SERVICE_DELETE"
  | "COMMISSION_UPDATE"
  | "COMMISSION_PAID"
  | "COMMISSION_CANCEL"
  | "STOCK_INBOUND"
  | "STOCK_CONSUMPTION"
  | "STOCK_LOSS"
  | "STOCK_ADJUSTMENT"
  | "APPOINTMENT_CREATE"
  | "APPOINTMENT_UPDATE"
  | "APPOINTMENT_CANCEL"
  | "EXPENSE_CREATE"
  | "EXPENSE_PAID"
  | (string & {});

export interface AuditLogEntry {
  tenantId: string;
  unitId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
}

/**
 * Prepara e sanitiza uma entrada de auditoria.
 * Remove dados sensíveis como senhas ou tokens antes da serialização.
 */
export function sanitizeAuditData(data?: Record<string, any> | null): string | null {
  if (!data) return null;
  const clone = { ...data };

  // Remove campos confidenciais
  delete clone["password"];
  delete clone["passwordHash"];
  delete clone["token"];
  delete clone["tokenHash"];

  return JSON.stringify(clone);
}

/**
 * Cria payload validado para inserção na tabela de logs de auditoria.
 */
export function buildAuditLogPayload(entry: AuditLogEntry) {
  if (!entry.tenantId) {
    throw new Error("Log de auditoria requer tenantId obrigatório.");
  }
  return {
    tenantId: entry.tenantId,
    unitId: entry.unitId || null,
    userId: entry.userId || null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId || null,
    oldValues: sanitizeAuditData(entry.oldValues),
    newValues: sanitizeAuditData(entry.newValues),
    ipAddress: entry.ipAddress || null,
  };
}
