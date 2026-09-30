export type RoleSlug =
  | "PROPRIETARIO"
  | "ADMINISTRADOR"
  | "GERENTE"
  | "RECEPCIONISTA"
  | "BARBEIRO"
  | "CAIXA"
  | "ESTOQUISTA";

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: RoleSlug;
  email: string;
  tenantId: string;
  unitId?: string | null;
}
