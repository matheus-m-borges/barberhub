// BarberHub Pro ERP - Commission Service (Motor de Comissões e Repasses)
// Regras determinísticas de cálculo, estorno e espelho de comissões

import { z } from "zod";

export const COMMISSION_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  CANCELED: "CANCELED",
} as const;

export type CommissionStatus = keyof typeof COMMISSION_STATUS;

export interface CommissionItemInput {
  employeeId: string;
  saleId: string;
  saleItemId?: string | null;
  serviceName: string;
  servicePrice: number;
  commissionRate: number;
  commissionAmount: number;
}

export interface CommissionRecord extends CommissionItemInput {
  id: string;
  tenantId: string;
  status: CommissionStatus;
  paidAt?: Date | null;
  cancellationReason?: string | null;
  createdAt: Date;
}

export interface CommissionStatement {
  employeeId: string;
  totalGenerated: number;
  totalPending: number;
  totalPaid: number;
  totalCanceled: number;
  itemsCount: number;
}

/**
 * Cria payload para registro auditável de comissão vinculada a um item de venda
 */
export function buildCommissionRecordPayload(
  tenantId: string,
  input: CommissionItemInput
) {
  if (!tenantId) throw new Error("tenantId é obrigatório para registrar comissão.");
  if (!input.employeeId) throw new Error("employeeId é obrigatório.");
  if (!input.saleId) throw new Error("saleId é obrigatório.");
  if (input.commissionAmount < 0) {
    throw new Error("Valor da comissão não pode ser negativo.");
  }

  return {
    tenantId,
    employeeId: input.employeeId,
    saleId: input.saleId,
    saleItemId: input.saleItemId ?? null,
    serviceName: input.serviceName,
    servicePrice: Math.round(input.servicePrice * 100) / 100,
    commissionRate: Math.round(input.commissionRate * 100) / 100,
    commissionAmount: Math.round(input.commissionAmount * 100) / 100,
    status: COMMISSION_STATUS.PENDING,
    paidAt: null,
    cancellationReason: null,
  };
}

/**
 * Cancela/Estorna uma comissão quando a venda original for cancelada ou estornada
 */
export function cancelCommission(
  commission: CommissionRecord,
  cancellationReason: string
): { updatedStatus: CommissionStatus; cancellationReason: string } {
  if (!cancellationReason || cancellationReason.trim().length < 3) {
    throw new Error("Motivo do cancelamento da comissão é obrigatório.");
  }
  if (commission.status === "CANCELED") {
    throw new Error("Esta comissão já se encontra cancelada.");
  }
  if (commission.status === "PAID") {
    throw new Error("Não é possível cancelar uma comissão que já foi paga ao profissional.");
  }

  return {
    updatedStatus: COMMISSION_STATUS.CANCELED,
    cancellationReason: cancellationReason.trim(),
  };
}

/**
 * Liquida/Registra pagamento de uma comissão ao colaborador
 */
export function markCommissionAsPaid(
  commission: CommissionRecord,
  paidAt = new Date()
): { updatedStatus: CommissionStatus; paidAt: Date } {
  if (commission.status === "CANCELED") {
    throw new Error("Comissão cancelada não pode ser paga.");
  }
  if (commission.status === "PAID") {
    throw new Error("Esta comissão já foi liquidada anteriormente.");
  }

  return {
    updatedStatus: COMMISSION_STATUS.PAID,
    paidAt,
  };
}

/**
 * Gera espelho e extrato consolidado de comissões por colaborador
 */
export function generateCommissionStatement(
  employeeId: string,
  records: CommissionRecord[]
): CommissionStatement {
  let totalGenerated = 0;
  let totalPending = 0;
  let totalPaid = 0;
  let totalCanceled = 0;

  const employeeRecords = records.filter((r) => r.employeeId === employeeId);

  for (const r of employeeRecords) {
    const amount = Math.round(r.commissionAmount * 100) / 100;
    totalGenerated += amount;

    if (r.status === "PENDING") {
      totalPending += amount;
    } else if (r.status === "PAID") {
      totalPaid += amount;
    } else if (r.status === "CANCELED") {
      totalCanceled += amount;
    }
  }

  return {
    employeeId,
    totalGenerated: Math.round(totalGenerated * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalCanceled: Math.round(totalCanceled * 100) / 100,
    itemsCount: employeeRecords.length,
  };
}
