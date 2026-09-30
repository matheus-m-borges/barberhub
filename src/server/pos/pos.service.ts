// BarberHub Pro ERP - POS (Frente de Caixa) & Payments Service
// Regras determinísticas de vendas, pagamentos divididos, troco e comissões

import crypto from "node:crypto";
import { z } from "zod";
import { calculateServiceCommission } from "../services/service.service";

export const PAYMENT_METHODS = {
  CASH: "CASH",
  PIX: "PIX",
  CREDIT_CARD: "CREDIT_CARD",
  DEBIT_CARD: "DEBIT_CARD",
  OTHER: "OTHER",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

/**
 * Gera um código human-readable curto e único para a venda (ex: VD-492817)
 */
export function generateSaleCode(): string {
  const num = crypto.randomInt(100000, 999999);
  return `VD-${num}`;
}

export const saleItemInputSchema = z.object({
  itemType: z.enum(["SERVICE", "PRODUCT"]).default("SERVICE"),
  itemId: z.string().min(1, "ID do item é obrigatório"),
  name: z.string().min(1, "Nome do item é obrigatório"),
  employeeId: z.string().optional().nullable(),
  unitPrice: z.number().positive("Preço unitário deve ser maior que zero"),
  quantity: z.number().int().positive("Quantidade deve ser positiva").default(1),
  commissionType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  commissionValue: z.number().min(0).default(0),
  employeeCustomRate: z.number().min(0).optional().nullable(),
});

export type SaleItemInput = z.infer<typeof saleItemInputSchema>;

export const paymentInputSchema = z.object({
  method: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]),
  amount: z.number().positive("Valor do pagamento deve ser maior que zero"),
  amountPaid: z.number().positive().optional().nullable(), // Para cálculo de troco em dinheiro
  notes: z.string().optional().nullable(),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

export interface CalculatedSaleItem {
  itemType: "SERVICE" | "PRODUCT";
  itemId: string;
  name: string;
  employeeId: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  commissionRate: number;
  commissionAmount: number;
}

export interface CalculatedPayment {
  method: PaymentMethod;
  amount: number;
  amountPaid: number | null;
  changeAmount: number;
  notes: string | null;
}

/**
 * Valida a permissão e teto máximo de desconto
 * Perfis operacionais (BARBEIRO, CAIXA, RECEPCIONISTA) têm teto de 10%
 * GERENTE tem teto de 25%
 * ADMINISTRADOR e PROPRIETARIO têm teto livre (até 100%)
 */
export function validateDiscountPermission(
  roles: string[],
  subtotal: number,
  discountAmount: number
): { allowed: boolean; maxAllowedDiscount: number; reason?: string } {
  if (discountAmount <= 0) return { allowed: true, maxAllowedDiscount: subtotal };
  if (discountAmount > subtotal) {
    return {
      allowed: false,
      maxAllowedDiscount: subtotal,
      reason: "Desconto não pode exceder o subtotal da venda.",
    };
  }

  const isOwnerOrAdmin = roles.includes("PROPRIETARIO") || roles.includes("ADMINISTRADOR");
  if (isOwnerOrAdmin) {
    return { allowed: true, maxAllowedDiscount: subtotal };
  }

  const isManager = roles.includes("GERENTE");
  const maxPercent = isManager ? 25 : 10;
  const maxAllowedDiscount = Math.round(((subtotal * maxPercent) / 100) * 100) / 100;

  if (discountAmount > maxAllowedDiscount) {
    return {
      allowed: false,
      maxAllowedDiscount,
      reason: `Desconto de R$ ${discountAmount.toFixed(
        2
      )} excede o limite permitido para seu perfil (${maxPercent}% = R$ ${maxAllowedDiscount.toFixed(
        2
      )}).`,
    };
  }

  return { allowed: true, maxAllowedDiscount };
}

/**
 * Calcula determinísticamente os itens da venda, subtotais e comissões individuais
 */
export function calculateSaleItems(items: SaleItemInput[]): {
  calculatedItems: CalculatedSaleItem[];
  subtotal: number;
  totalCommissions: number;
} {
  if (items.length === 0) {
    throw new Error("A venda deve conter ao menos um item.");
  }

  let subtotal = 0;
  let totalCommissions = 0;

  const calculatedItems: CalculatedSaleItem[] = items.map((raw) => {
    const item = saleItemInputSchema.parse(raw);
    const totalPrice = Math.round(item.unitPrice * item.quantity * 100) / 100;
    subtotal += totalPrice;

    // Cálculo da comissão do item
    let commissionAmount = 0;
    if (item.employeeId) {
      commissionAmount = calculateServiceCommission({
        servicePrice: totalPrice,
        commissionType: item.commissionType,
        commissionValue: item.commissionValue,
        employeeCustomRate: item.employeeCustomRate,
      });
      totalCommissions += commissionAmount;
    }

    return {
      itemType: item.itemType,
      itemId: item.itemId,
      name: item.name,
      employeeId: item.employeeId ?? null,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      totalPrice,
      commissionRate: item.employeeCustomRate ?? item.commissionValue,
      commissionAmount,
    };
  });

  return {
    calculatedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    totalCommissions: Math.round(totalCommissions * 100) / 100,
  };
}

/**
 * Validação rigorosa de pagamentos (múltiplos / divididos) e cálculo exato de troco
 */
export function validateAndCalculatePayments(
  saleTotal: number,
  payments: PaymentInput[]
): {
  calculatedPayments: CalculatedPayment[];
  totalPaid: number;
  totalChange: number;
} {
  if (payments.length === 0) {
    throw new Error("Informe ao menos uma forma de pagamento.");
  }

  let totalAllocated = 0;
  let totalChange = 0;

  const calculatedPayments: CalculatedPayment[] = payments.map((p) => {
    const payment = paymentInputSchema.parse(p);
    const amount = Math.round(payment.amount * 100) / 100;
    totalAllocated += amount;

    let changeAmount = 0;
    let amountPaid: number | null = null;

    // Para pagamentos em dinheiro com troco
    if (payment.method === "CASH" && payment.amountPaid) {
      amountPaid = Math.round(payment.amountPaid * 100) / 100;
      if (amountPaid < amount) {
        throw new Error(
          `Valor entregue em dinheiro (R$ ${amountPaid.toFixed(
            2
          )}) não pode ser inferior ao valor da parcela (R$ ${amount.toFixed(2)}).`
        );
      }
      changeAmount = Math.round((amountPaid - amount) * 100) / 100;
      totalChange += changeAmount;
    }

    return {
      method: payment.method,
      amount,
      amountPaid,
      changeAmount,
      notes: payment.notes ?? null,
    };
  });

  totalAllocated = Math.round(totalAllocated * 100) / 100;

  // A soma das parcelas de pagamento deve bater rigorosamente com o total líquido da venda
  if (Math.abs(totalAllocated - saleTotal) > 0.01) {
    throw new Error(
      `Soma dos pagamentos (R$ ${totalAllocated.toFixed(
        2
      )}) não confere com o total da venda (R$ ${saleTotal.toFixed(2)}).`
    );
  }

  return {
    calculatedPayments,
    totalPaid: totalAllocated,
    totalChange: Math.round(totalChange * 100) / 100,
  };
}

/**
 * Constrói payload completo da venda para persistência no banco
 */
export function buildSalePayload(params: {
  tenantId: string;
  cashRegisterId: string;
  createdById: string;
  unitId?: string | null;
  customerId?: string | null;
  appointmentId?: string | null;
  userRoles: string[];
  items: SaleItemInput[];
  discount?: number;
  payments: PaymentInput[];
}) {
  const {
    tenantId,
    cashRegisterId,
    createdById,
    unitId,
    customerId,
    appointmentId,
    userRoles,
    items,
    discount = 0,
    payments,
  } = params;

  if (!tenantId) throw new Error("tenantId é obrigatório para registrar venda.");
  if (!cashRegisterId) throw new Error("Caixa aberto é obrigatório para registrar venda.");
  if (!createdById) throw new Error("Operador responsável é obrigatório.");

  const { calculatedItems, subtotal } = calculateSaleItems(items);

  // Validação de desconto
  const discountCheck = validateDiscountPermission(userRoles, subtotal, discount);
  if (!discountCheck.allowed) {
    throw new Error(discountCheck.reason || "Desconto não autorizado.");
  }

  const finalTotal = Math.round((subtotal - discount) * 100) / 100;
  const { calculatedPayments } = validateAndCalculatePayments(finalTotal, payments);

  return {
    sale: {
      tenantId,
      unitId: unitId ?? null,
      code: generateSaleCode(),
      cashRegisterId,
      customerId: customerId ?? null,
      appointmentId: appointmentId ?? null,
      createdById,
      subtotal,
      discount: Math.round(discount * 100) / 100,
      total: finalTotal,
      status: "COMPLETED",
    },
    items: calculatedItems,
    payments: calculatedPayments,
  };
}
