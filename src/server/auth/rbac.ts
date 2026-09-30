export type RoleSlug =
  | "PROPRIETARIO"
  | "ADMINISTRADOR"
  | "GERENTE"
  | "RECEPCIONISTA"
  | "BARBEIRO"
  | "CAIXA"
  | "ESTOQUISTA";

export const PERMISSIONS = {
  // Agenda
  AGENDA_READ: "agenda:read",
  AGENDA_WRITE: "agenda:write",
  AGENDA_DELETE: "agenda:delete",
  AGENDA_OWN_ONLY: "agenda:own_only", // Barbeiro: apenas a própria agenda

  // Clientes
  CLIENTES_READ: "clientes:read",
  CLIENTES_WRITE: "clientes:write",
  CLIENTES_DELETE: "clientes:delete",

  // Serviços
  SERVICOS_READ: "servicos:read",
  SERVICOS_WRITE: "servicos:write",

  // Funcionários & Jornada
  FUNCIONARIOS_READ: "funcionarios:read",
  FUNCIONARIOS_WRITE: "funcionarios:write",
  JORNADA_READ: "jornada:read",
  JORNADA_WRITE: "jornada:write",

  // Atendimento & PDV
  ATENDIMENTO_FLOW: "atendimento:flow",
  PDV_SALE: "pdv:sale",

  // Caixa
  CAIXA_READ: "caixa:read",
  CAIXA_OPEN: "caixa:open",
  CAIXA_CLOSE: "caixa:close",
  CAIXA_MOVEMENT: "caixa:movement", // Sangria / suprimento

  // Comissões
  COMISSAO_OWN_READ: "comissao:own_read",
  COMISSAO_MANAGE: "comissao:manage",

  // Financeiro & Contas
  FINANCEIRO_READ: "financeiro:read",
  FINANCEIRO_WRITE: "financeiro:write",

  // Estoque & Compras
  ESTOQUE_READ: "estoque:read",
  ESTOQUE_WRITE: "estoque:write",
  COMPRAS_MANAGE: "compras:manage",

  // Fidelidade & Planos
  FIDELIDADE_MANAGE: "fidelidade:manage",
  PLANOS_MANAGE: "planos:manage",

  // Relatórios & Auditoria
  RELATORIOS_READ: "relatorios:read",
  AUDITORIA_READ: "auditoria:read",

  // Configurações
  CONFIGURACOES_MANAGE: "configuracoes:manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Matriz estrita de permissões padrão por perfil
 */
export const ROLE_PERMISSIONS_MAP: Record<RoleSlug, PermissionCode[]> = {
  PROPRIETARIO: Object.values(PERMISSIONS),

  ADMINISTRADOR: Object.values(PERMISSIONS).filter(
    (p) => p !== PERMISSIONS.CONFIGURACOES_MANAGE // Somente o proprietário altera dados críticos da empresa
  ),

  GERENTE: [
    PERMISSIONS.AGENDA_READ,
    PERMISSIONS.AGENDA_WRITE,
    PERMISSIONS.AGENDA_DELETE,
    PERMISSIONS.CLIENTES_READ,
    PERMISSIONS.CLIENTES_WRITE,
    PERMISSIONS.SERVICOS_READ,
    PERMISSIONS.FUNCIONARIOS_READ,
    PERMISSIONS.JORNADA_READ,
    PERMISSIONS.JORNADA_WRITE,
    PERMISSIONS.ATENDIMENTO_FLOW,
    PERMISSIONS.PDV_SALE,
    PERMISSIONS.CAIXA_READ,
    PERMISSIONS.CAIXA_OPEN,
    PERMISSIONS.CAIXA_CLOSE,
    PERMISSIONS.CAIXA_MOVEMENT,
    PERMISSIONS.COMISSAO_MANAGE,
    PERMISSIONS.FINANCEIRO_READ,
    PERMISSIONS.ESTOQUE_READ,
    PERMISSIONS.ESTOQUE_WRITE,
    PERMISSIONS.RELATORIOS_READ,
    PERMISSIONS.AUDITORIA_READ,
  ],

  RECEPCIONISTA: [
    PERMISSIONS.AGENDA_READ,
    PERMISSIONS.AGENDA_WRITE,
    PERMISSIONS.CLIENTES_READ,
    PERMISSIONS.CLIENTES_WRITE,
    PERMISSIONS.SERVICOS_READ,
    PERMISSIONS.ATENDIMENTO_FLOW,
    PERMISSIONS.PDV_SALE,
    PERMISSIONS.CAIXA_READ,
    PERMISSIONS.CAIXA_OPEN,
    PERMISSIONS.CAIXA_CLOSE,
    PERMISSIONS.CAIXA_MOVEMENT,
  ],

  BARBEIRO: [
    PERMISSIONS.AGENDA_READ,
    PERMISSIONS.AGENDA_OWN_ONLY,
    PERMISSIONS.CLIENTES_READ,
    PERMISSIONS.ATENDIMENTO_FLOW,
    PERMISSIONS.COMISSAO_OWN_READ,
  ],

  CAIXA: [
    PERMISSIONS.PDV_SALE,
    PERMISSIONS.CAIXA_READ,
    PERMISSIONS.CAIXA_OPEN,
    PERMISSIONS.CAIXA_CLOSE,
    PERMISSIONS.CAIXA_MOVEMENT,
    PERMISSIONS.CLIENTES_READ,
  ],

  ESTOQUISTA: [
    PERMISSIONS.ESTOQUE_READ,
    PERMISSIONS.ESTOQUE_WRITE,
    PERMISSIONS.COMPRAS_MANAGE,
  ],
};

/**
 * Avalia se uma coleção de papéis do usuário possui a permissão requerida.
 */
export function hasPermission(
  userRoles: RoleSlug[],
  requiredPermission: PermissionCode
): boolean {
  if (!userRoles || userRoles.length === 0) return false;

  for (const role of userRoles) {
    const permissions = ROLE_PERMISSIONS_MAP[role] || [];
    if (permissions.includes(requiredPermission)) {
      return true;
    }
  }

  return false;
}

/**
 * Valida a permissão e lança erro seguro caso não possua acesso.
 */
export function assertPermission(
  userRoles: RoleSlug[],
  requiredPermission: PermissionCode
): void {
  if (!hasPermission(userRoles, requiredPermission)) {
    throw new Error(
      `Acesso negado: o usuário não possui a permissão '${requiredPermission}'.`
    );
  }
}
