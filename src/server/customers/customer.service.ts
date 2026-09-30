// BarberHub Pro ERP - Customer (CRM) Service
// Regras determinísticas de CRM, validação e métricas de clientes

import { z } from "zod";

/**
 * Validador estrito de CPF com checagem dos dígitos verificadores
 */
export function isValidCPF(cpfRaw: string): boolean {
  const cpf = cpfRaw.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  // Bloquear sequências repetidas conhecidas (111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}

/**
 * Higieniza números de telefone (remove caracteres especiais mantendo DDI/DDD)
 */
export function sanitizePhone(phoneRaw: string): string {
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) {
    throw new Error("Telefone inválido. Deve conter DDD e número (mínimo 10 dígitos).");
  }
  return digits;
}

/**
 * Schema Zod para criação/edição de clientes
 */
export const customerInputSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").trim(),
  phone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("E-mail com formato inválido").optional().nullable(),
  cpf: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || isValidCPF(val), {
      message: "CPF inválido",
    }),
  birthDate: z.coerce.date().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).default("ACTIVE"),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

export interface CustomerMetrics {
  totalSpent: number;
  appointmentsCount: number;
  averageTicket: number;
  lastVisitAt?: Date | null;
  noShowCount: number;
  canceledCount: number;
}

/**
 * Calcula o ticket médio determinístico com precisão monetária (2 casas)
 */
export function calculateAverageTicket(totalSpent: number, appointmentsCount: number): number {
  if (appointmentsCount <= 0 || totalSpent <= 0) return 0;
  return Math.round((totalSpent / appointmentsCount) * 100) / 100;
}

/**
 * Atualiza o histórico do cliente após atendimento finalizado e pago
 */
export function registerCustomerAttendance(
  current: CustomerMetrics,
  saleAmount: number,
  attendanceDate = new Date()
): CustomerMetrics {
  if (saleAmount < 0) {
    throw new Error("Valor do atendimento não pode ser negativo.");
  }
  const newTotal = Math.round((current.totalSpent + saleAmount) * 100) / 100;
  const newCount = current.appointmentsCount + 1;
  const newAverage = calculateAverageTicket(newTotal, newCount);

  return {
    ...current,
    totalSpent: newTotal,
    appointmentsCount: newCount,
    averageTicket: newAverage,
    lastVisitAt: attendanceDate,
  };
}

/**
 * Registra não comparecimento (falta) do cliente
 */
export function registerNoShow(current: CustomerMetrics): CustomerMetrics {
  return {
    ...current,
    noShowCount: current.noShowCount + 1,
  };
}

/**
 * Registra cancelamento solicitado pelo cliente
 */
export function registerCancellation(current: CustomerMetrics): CustomerMetrics {
  return {
    ...current,
    canceledCount: current.canceledCount + 1,
  };
}

/**
 * Constrói payload seguro para criação com garantia de tenant
 */
export function buildCustomerCreatePayload(tenantId: string, input: CustomerInput) {
  if (!tenantId) {
    throw new Error("tenantId é obrigatório para cadastrar cliente.");
  }
  const validated = customerInputSchema.parse(input);
  const cleanPhone = sanitizePhone(validated.phone);

  return {
    tenantId,
    name: validated.name,
    phone: cleanPhone,
    email: validated.email ?? null,
    cpf: validated.cpf ? validated.cpf.replace(/\D/g, "") : null,
    birthDate: validated.birthDate ?? null,
    address: validated.address ?? null,
    notes: validated.notes ?? null,
    status: validated.status,
    totalSpent: 0,
    appointmentsCount: 0,
    averageTicket: 0,
    noShowCount: 0,
    canceledCount: 0,
  };
}
