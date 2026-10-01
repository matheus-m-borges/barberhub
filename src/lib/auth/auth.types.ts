export type RoleSlug =
  | "PROPRIETARIO"
  | "ADMINISTRADOR"
  | "GERENTE"
  | "RECEPCIONISTA"
  | "BARBEIRO"
  | "CAIXA"
  | "ESTOQUISTA"
  | "CLIENTE";

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: RoleSlug;
  email: string;
  tenantId: string;
  companyName?: string;
  unitId?: string | null;
  mustChangePassword?: boolean;
}
