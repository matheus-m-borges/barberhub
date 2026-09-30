// BarberHub Pro ERP - Purchases & Suppliers Service
// Ordens de Compra, Fornecedores e Integração com Estoque e Contas a Pagar

import crypto from "node:crypto";
import { z } from "zod";

export const PURCHASE_STATUS = {
  DRAFT: "DRAFT",
  ORDERED: "ORDERED",
  RECEIVED: "RECEIVED",
  CANCELED: "CANCELED",
} as const;

export type PurchaseStatus = keyof typeof PURCHASE_STATUS;

export function generatePurchaseOrderCode(): string {
  const num = crypto.randomInt(100000, 999999);
  return `PC-${num}`;
}

export const supplierInputSchema = z.object({
  name: z.string().min(2, "Nome/Razão Social deve ter no mínimo 2 caracteres").trim(),
  tradeName: z.string().optional().nullable(),
  document: z.string().optional().nullable(), // CNPJ ou CPF
  phone: z.string().optional().nullable(),
  email: z.string().email("E-mail com formato inválido").optional().nullable(),
  address: z.string().optional().nullable(),
  pixKey: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type SupplierInput = z.infer<typeof supplierInputSchema>;

export const purchaseItemInputSchema = z.object({
  productId: z.string().min(1, "Produto é obrigatório"),
  quantity: z.number().int().positive("Quantidade deve ser maior que zero"),
  unitCost: z.number().positive("Custo unitário deve ser maior que zero"),
});

export type PurchaseItemInput = z.infer<typeof purchaseItemInputSchema>;

export interface CalculatedPurchaseItem {
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

/**
 * Calcula determinísticamente os itens da compra e o valor total do pedido
 */
export function calculatePurchaseOrderItems(items: PurchaseItemInput[]): {
  calculatedItems: CalculatedPurchaseItem[];
  totalAmount: number;
} {
  if (items.length === 0) {
    throw new Error("O pedido de compra deve conter ao menos um produto.");
  }

  let totalAmount = 0;
  const calculatedItems = items.map((raw) => {
    const item = purchaseItemInputSchema.parse(raw);
    const totalCost = Math.round(item.quantity * item.unitCost * 100) / 100;
    totalAmount += totalCost;

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost,
    };
  });

  return {
    calculatedItems,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Prepara o recebimento da compra: gera entradas no estoque e fatura no Contas a Pagar
 */
export function buildPurchaseReceiptPlan(params: {
  purchaseOrderId: string;
  orderCode: string;
  supplierName: string;
  totalAmount: number;
  items: CalculatedPurchaseItem[];
  paymentDueDate: Date;
  receivedAt?: Date;
}): {
  status: PurchaseStatus;
  receivedAt: Date;
  stockInbounds: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
    movementType: "INBOUND";
    reason: string;
  }>;
  accountPayablePayload: {
    supplierName: string;
    description: string;
    amount: number;
    dueDate: Date;
    status: "PENDING";
  };
} {
  const {
    purchaseOrderId,
    orderCode,
    supplierName,
    totalAmount,
    items,
    paymentDueDate,
    receivedAt = new Date(),
  } = params;

  // 1. Entradas para o estoque físico
  const stockInbounds = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitCost: item.unitCost,
    movementType: "INBOUND" as const,
    reason: `Entrada referente à Ordem de Compra ${orderCode}`,
  }));

  // 2. Fatura no Contas a Pagar
  const accountPayablePayload = {
    supplierName,
    description: `Fatura da Ordem de Compra ${orderCode}`,
    amount: totalAmount,
    dueDate: paymentDueDate,
    status: "PENDING" as const,
  };

  return {
    status: PURCHASE_STATUS.RECEIVED,
    receivedAt,
    stockInbounds,
    accountPayablePayload,
  };
}
