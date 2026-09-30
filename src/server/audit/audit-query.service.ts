import type { AuditAction } from "./audit.service";

export interface StoredAuditLog {
  id: string;
  tenantId: string;
  unitId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  oldValues?: string | null;
  newValues?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  user?: {
    name: string;
    email: string;
  } | null;
}

export interface AuditQueryFilters {
  tenantId: string;
  unitId?: string | null;
  userId?: string | null;
  action?: AuditAction | null;
  entity?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  searchQuery?: string | null;
  page?: number;
  pageSize?: number;
}

export interface HumanizedAuditEntry {
  id: string;
  timestamp: string;
  userName: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  description: string;
  ipAddress: string | null;
  hasChanges: boolean;
}

export interface AuditQueryResult {
  items: HumanizedAuditEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Gera uma descrição em linguagem natural e amigável para a visualização no painel.
 */
export function humanizeAuditEntry(log: StoredAuditLog): string {
  const userName = log.user?.name || "Sistema / Desconhecido";
  const oldVals = log.oldValues ? JSON.parse(log.oldValues) : {};
  const newVals = log.newValues ? JSON.parse(log.newValues) : {};

  switch (log.action) {
    case "USER_LOGIN":
      return `${userName} realizou login com sucesso.`;
    case "USER_LOGIN_FAILED":
      return `Tentativa de login falha com o email ${newVals.email || "não informado"}.`;
    case "USER_LOCKOUT":
      return `Conta ${newVals.email} bloqueada temporariamente por excesso de tentativas.`;
    case "SALE_CREATE":
      return `${userName} concluiu a venda #${log.entityId} no valor de R$ ${Number(newVals.total || 0).toFixed(2)}.`;
    case "SALE_CANCEL":
      return `${userName} cancelou a venda #${log.entityId}. Motivo: ${newVals.reason || "Não informado"}.`;
    case "DISCOUNT_APPLIED":
      return `Desconto de R$ ${Number(newVals.discount || 0).toFixed(2)} concedido na venda #${log.entityId}.`;
    case "CASH_OPEN":
      return `${userName} abriu o caixa com saldo inicial de R$ ${Number(newVals.initialCash || 0).toFixed(2)}.`;
    case "CASH_CLOSE":
      return `${userName} fechou o caixa com saldo apurado de R$ ${Number(newVals.closingCash || 0).toFixed(2)}.`;
    case "CASH_BLEED":
      return `${userName} realizou sangria de R$ ${Number(newVals.amount || 0).toFixed(2)}. Motivo: ${newVals.reason || "Não informado"}.`;
    case "PRICE_CHANGE":
      return `${userName} alterou o preço de R$ ${Number(oldVals.price || 0).toFixed(2)} para R$ ${Number(newVals.price || 0).toFixed(2)}.`;
    case "COMMISSION_PAID":
      return `Repasse de comissão de R$ ${Number(newVals.amount || 0).toFixed(2)} liquidado para o colaborador.`;
    case "COMMISSION_CANCEL":
      return `Comissão #${log.entityId} cancelada devido a estorno da venda correspondente.`;
    case "STOCK_INBOUND":
      return `Entrada de ${newVals.quantity} unidade(s) do produto #${log.entityId}.`;
    case "STOCK_LOSS":
      return `Baixa por perda/avaria de ${newVals.quantity} unidade(s) do produto #${log.entityId}.`;
    case "APPOINTMENT_CREATE":
      return `Agendamento #${log.entityId} criado para ${newVals.customerName || "cliente"}.`;
    case "APPOINTMENT_CANCEL":
      return `Agendamento #${log.entityId} cancelado.`;
    case "CONFIG_UPDATE":
      return `${userName} alterou as configurações gerais do estabelecimento.`;
    default:
      return `Ação [${log.action}] executada na entidade ${log.entity} (#${log.entityId || "N/A"}).`;
  }
}

/**
 * Consulta determinística e filtragem em memória para registros de auditoria com isolamento multi-tenant.
 */
export function queryAuditLogs(
  logs: StoredAuditLog[],
  filters: AuditQueryFilters
): AuditQueryResult {
  if (!filters.tenantId) {
    throw new Error("Consulta de auditoria requer tenantId para isolamento estrito.");
  }

  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));

  // 1. Filtragem estrita por tenantId
  let filtered = logs.filter((l) => l.tenantId === filters.tenantId);

  // 2. Filtro por unidade
  if (filters.unitId) {
    filtered = filtered.filter((l) => l.unitId === filters.unitId);
  }

  // 3. Filtro por usuário
  if (filters.userId) {
    filtered = filtered.filter((l) => l.userId === filters.userId);
  }

  // 4. Filtro por ação
  if (filters.action) {
    filtered = filtered.filter((l) => l.action === filters.action);
  }

  // 5. Filtro por entidade
  if (filters.entity) {
    filtered = filtered.filter((l) => l.entity === filters.entity);
  }

  // 6. Filtro por data inicial
  if (filters.startDate) {
    const startMs = filters.startDate.getTime();
    filtered = filtered.filter((l) => l.createdAt.getTime() >= startMs);
  }

  // 7. Filtro por data final
  if (filters.endDate) {
    const endMs = filters.endDate.getTime();
    filtered = filtered.filter((l) => l.createdAt.getTime() <= endMs);
  }

  // 8. Busca textual (termo no ID, oldValues, newValues ou nome do usuário)
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const query = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter((l) => {
      const matchEntityId = l.entityId?.toLowerCase().includes(query);
      const matchOld = l.oldValues?.toLowerCase().includes(query);
      const matchNew = l.newValues?.toLowerCase().includes(query);
      const matchUserName = l.user?.name.toLowerCase().includes(query);
      const matchUserEmail = l.user?.email.toLowerCase().includes(query);
      return Boolean(matchEntityId || matchOld || matchNew || matchUserName || matchUserEmail);
    });
  }

  // 9. Ordenação decrescente por data/hora
  filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const offset = (page - 1) * pageSize;
  const pagedItems = filtered.slice(offset, offset + pageSize);

  const humanized = pagedItems.map((item) => ({
    id: item.id,
    timestamp: item.createdAt.toISOString(),
    userName: item.user?.name || "Sistema",
    action: item.action,
    entity: item.entity,
    entityId: item.entityId || null,
    description: humanizeAuditEntry(item),
    ipAddress: item.ipAddress || null,
    hasChanges: Boolean(item.oldValues || item.newValues),
  }));

  return {
    items: humanized,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}
