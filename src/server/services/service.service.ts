// BarberHub Pro ERP - Services & Categories Service
// Regras determinísticas de serviços, catálogo e cálculo de comissões

import { z } from "zod";

export const serviceCategorySchema = z.object({
  name: z.string().min(2, "Nome da categoria deve ter no mínimo 2 caracteres").trim(),
  description: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato hexadecimal (#RRGGBB)").default("#3b82f6"),
  orderIndex: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type ServiceCategoryInput = z.infer<typeof serviceCategorySchema>;

export const serviceSchema = z.object({
  categoryId: z.string().optional().nullable(),
  name: z.string().min(2, "Nome do serviço deve ter no mínimo 2 caracteres").trim(),
  description: z.string().optional().nullable(),
  price: z.number().positive("Preço do serviço deve ser maior que zero"),
  durationMinutes: z
    .number()
    .int()
    .min(5, "Duração mínima é de 5 minutos")
    .max(480, "Duração máxima é de 8 horas"),
  commissionType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  commissionValue: z.number().min(0, "Valor da comissão não pode ser negativo"),
  isActive: z.boolean().default(true),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

export interface CommissionCalculationParams {
  servicePrice: number;
  commissionType: "PERCENTAGE" | "FIXED";
  commissionValue: number;
  employeeCustomRate?: number | null | undefined; // Se informado, tem prioridade
}

/**
 * Calcula determinísticamente a comissão em Reais devida ao profissional
 */
export function calculateServiceCommission(params: CommissionCalculationParams): number {
  const { servicePrice, commissionType, commissionValue, employeeCustomRate } = params;

  if (servicePrice <= 0) return 0;

  // 1. Se o colaborador possui taxa customizada específica
  if (employeeCustomRate !== undefined && employeeCustomRate !== null) {
    if (employeeCustomRate < 0) throw new Error("Taxa customizada não pode ser negativa.");
    // Trata como percentual se for taxa de colaborador
    const amount = (servicePrice * employeeCustomRate) / 100;
    return Math.round(amount * 100) / 100;
  }

  // 2. Cálculo padrão do serviço
  if (commissionType === "PERCENTAGE") {
    if (commissionValue > 100) {
      throw new Error("Comissão percentual não pode exceder 100%.");
    }
    const amount = (servicePrice * commissionValue) / 100;
    return Math.round(amount * 100) / 100;
  }

  if (commissionType === "FIXED") {
    // Não pode exceder o valor total do serviço
    const amount = Math.min(commissionValue, servicePrice);
    return Math.round(amount * 100) / 100;
  }

  return 0;
}

/**
 * Constrói payload de criação de serviço com isolamento por tenant
 */
export function buildServiceCreatePayload(tenantId: string, input: ServiceInput) {
  if (!tenantId) {
    throw new Error("tenantId é obrigatório para cadastrar serviço.");
  }
  const validated = serviceSchema.parse(input);

  if (validated.commissionType === "PERCENTAGE" && validated.commissionValue > 100) {
    throw new Error("Comissão percentual não pode ser maior que 100%.");
  }

  return {
    tenantId,
    categoryId: validated.categoryId ?? null,
    name: validated.name,
    description: validated.description ?? null,
    price: validated.price,
    durationMinutes: validated.durationMinutes,
    commissionType: validated.commissionType,
    commissionValue: validated.commissionValue,
    isActive: validated.isActive,
  };
}
