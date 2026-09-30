// BarberHub Pro ERP - Stock & Inventory Service
// Regras determinísticas de produtos, estoque mínimo e movimentações

import { z } from "zod";

export const STOCK_MOVEMENT_TYPES = {
  INBOUND: "INBOUND",       // Entrada por compra ou avulsa
  SALE: "SALE",             // Saída por venda no PDV
  CONSUMPTION: "CONSUMPTION", // Consumo interno na bancada pelo barbeiro
  LOSS: "LOSS",             // Perda, avaria ou validade
  ADJUSTMENT: "ADJUSTMENT", // Ajuste por contagem de inventário
  RETURN: "RETURN",         // Devolução de produto ao estoque
} as const;

export type StockMovementType = keyof typeof STOCK_MOVEMENT_TYPES;

export const productInputSchema = z.object({
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  name: z.string().min(2, "Nome do produto deve ter no mínimo 2 caracteres").trim(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  costPrice: z.number().min(0, "Preço de custo não pode ser negativo").default(0),
  salePrice: z.number().min(0, "Preço de venda não pode ser negativo").default(0),
  currentStock: z.number().int().default(0),
  minStock: z.number().int().min(0, "Estoque mínimo não pode ser negativo").default(5),
  unit: z.string().default("UN"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type ProductInput = z.infer<typeof productInputSchema>;

/**
 * Calcula a margem bruta de lucro sobre o preço de venda
 */
export function calculateGrossMargin(costPrice: number, salePrice: number): {
  marginAmount: number;
  marginPercent: number;
} {
  if (salePrice <= 0) {
    return { marginAmount: 0, marginPercent: 0 };
  }
  const marginAmount = Math.round((salePrice - costPrice) * 100) / 100;
  const marginPercent = Math.round(((marginAmount / salePrice) * 100) * 100) / 100;

  return { marginAmount, marginPercent };
}

/**
 * Verifica se o produto atingiu o nível de alerta de estoque mínimo
 */
export function isLowStock(currentStock: number, minStock: number): boolean {
  return currentStock <= minStock;
}

/**
 * Executa determinísticamente uma movimentação de estoque com cálculo de saldo e travas de segurança
 */
export function calculateStockMovement(params: {
  currentStock: number;
  movementType: StockMovementType;
  quantity: number;
  unitCost: number;
  reason?: string;
}): {
  previousStock: number;
  quantityApplied: number;
  newStock: number;
  isLowStockAlert: boolean;
} {
  const { currentStock, movementType, quantity, unitCost, reason } = params;

  if (quantity <= 0 && movementType !== "ADJUSTMENT") {
    throw new Error("Quantidade a movimentar deve ser maior que zero.");
  }
  if (unitCost < 0) {
    throw new Error("Custo unitário não pode ser negativo.");
  }

  let newStock = currentStock;
  let quantityApplied = quantity;

  switch (movementType) {
    case "INBOUND":
    case "RETURN":
      newStock = currentStock + quantity;
      quantityApplied = quantity;
      break;

    case "SALE":
    case "CONSUMPTION":
    case "LOSS":
      if (quantity > currentStock) {
        throw new Error(
          `Saldo insuficiente em estoque (Atual: ${currentStock}, Solicitado: ${quantity}).`
        );
      }
      newStock = currentStock - quantity;
      quantityApplied = -quantity;
      break;

    case "ADJUSTMENT":
      // No ajuste de inventário, 'quantity' representa o saldo físico apurado
      if (quantity < 0) {
        throw new Error("Saldo de inventário apurado não pode ser negativo.");
      }
      quantityApplied = quantity - currentStock;
      newStock = quantity;
      break;

    default:
      throw new Error(`Tipo de movimentação inválido: ${movementType}`);
  }

  return {
    previousStock: currentStock,
    quantityApplied,
    newStock,
    isLowStockAlert: newStock <= 5,
  };
}
