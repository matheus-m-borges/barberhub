// BarberHub Pro ERP - Employees Service
// Regras determinísticas de colaboradores, barbeiros e elegibilidade

import { z } from "zod";
import { isValidCPF, sanitizePhone } from "../customers/customer.service";

export const employeeInputSchema = z.object({
  unitId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").trim(),
  cpf: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || isValidCPF(val), {
      message: "CPF inválido",
    }),
  phone: z.string().min(10, "Telefone inválido"),
  birthDate: z.coerce.date().optional().nullable(),
  hireDate: z.coerce.date().default(() => new Date()),
  position: z.enum(["BARBEIRO", "RECEPCIONISTA", "GERENTE", "CAIXA", "ESTOQUISTA"]).default("BARBEIRO"),
  salary: z.number().min(0, "Salário base não pode ser negativo").default(0),
  commissionRate: z.number().min(0).max(100, "Comissão base percentual deve estar entre 0 e 100%").default(0),
  pixKey: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "VACATION", "TERMINATED"]).default("ACTIVE"),
  notes: z.string().optional().nullable(),
});

export type EmployeeInput = z.infer<typeof employeeInputSchema>;

/**
 * Verifica se o colaborador está apto para receber agendamentos na agenda
 */
export function isEmployeeEligibleForAppointments(employee: {
  position: string;
  status: string;
}): { eligible: boolean; reason?: string } {
  if (employee.position !== "BARBEIRO") {
    return { eligible: false, reason: "Apenas colaboradores no cargo de BARBEIRO recebem agendamentos." };
  }
  if (employee.status !== "ACTIVE") {
    return { eligible: false, reason: `Colaborador não está ativo (Status atual: ${employee.status}).` };
  }
  return { eligible: true };
}

/**
 * Constrói payload seguro para criação com garantia de tenant
 */
export function buildEmployeeCreatePayload(tenantId: string, input: EmployeeInput) {
  if (!tenantId) {
    throw new Error("tenantId é obrigatório para cadastrar colaborador.");
  }
  const validated = employeeInputSchema.parse(input);
  const cleanPhone = sanitizePhone(validated.phone);

  return {
    tenantId,
    unitId: validated.unitId ?? null,
    userId: validated.userId ?? null,
    name: validated.name,
    cpf: validated.cpf ? validated.cpf.replace(/\D/g, "") : null,
    phone: cleanPhone,
    birthDate: validated.birthDate ?? null,
    hireDate: validated.hireDate,
    position: validated.position,
    salary: validated.salary,
    commissionRate: validated.commissionRate,
    pixKey: validated.pixKey ?? null,
    status: validated.status,
    notes: validated.notes ?? null,
  };
}
