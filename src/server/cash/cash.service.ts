// BarberHub Pro ERP - Cash Register Service (Controle Diário de Caixa)
// Regras determinísticas de abertura, movimentação, sangrias e fechamento cego

export const CASH_MOVEMENT_TYPES = {
  OPENING: "OPENING",
  SALE: "SALE",
  SUPPLY: "SUPPLY",       // Suprimento (reforço de troco)
  WITHDRAWAL: "WITHDRAWAL", // Sangria (retirada para cofre/despesa)
  REFUND: "REFUND",       // Estorno de venda
} as const;

export type CashMovementType = keyof typeof CASH_MOVEMENT_TYPES;

export interface CashMovementSummary {
  type: CashMovementType;
  amount: number;
  paymentMethod: string;
}

export interface CashRegisterReport {
  initialBalance: number;
  totalCashSales: number;
  totalPixSales: number;
  totalCardSales: number;
  totalSupplies: number;
  totalWithdrawals: number;
  totalRefunds: number;
  expectedCashInDrawer: number; // Saldo físico esperado em cédulas/moedas na gaveta
  totalGrossRevenue: number;    // Faturamento bruto total somando todos os métodos
}

/**
 * Calcula determinísticamente os totais e o saldo esperado em cédulas da gaveta
 */
export function calculateCashRegisterTotals(
  initialBalance: number,
  movements: CashMovementSummary[]
): CashRegisterReport {
  let totalCashSales = 0;
  let totalPixSales = 0;
  let totalCardSales = 0;
  let totalSupplies = 0;
  let totalWithdrawals = 0;
  let totalRefunds = 0;

  for (const m of movements) {
    const amount = Math.round(m.amount * 100) / 100;

    switch (m.type) {
      case "SALE":
        if (m.paymentMethod === "CASH") {
          totalCashSales += amount;
        } else if (m.paymentMethod === "PIX") {
          totalPixSales += amount;
        } else {
          totalCardSales += amount;
        }
        break;

      case "SUPPLY":
        totalSupplies += amount;
        break;

      case "WITHDRAWAL":
        totalWithdrawals += amount;
        break;

      case "REFUND":
        if (m.paymentMethod === "CASH") {
          totalRefunds += amount;
        }
        break;

      default:
        break;
    }
  }

  // O saldo físico esperado na gaveta considera apenas dinheiro vivo:
  // Saldo Inicial + Vendas em Dinheiro + Suprimentos - Sangrias - Estornos em Dinheiro
  const expectedCashInDrawer =
    initialBalance + totalCashSales + totalSupplies - totalWithdrawals - totalRefunds;

  const totalGrossRevenue = totalCashSales + totalPixSales + totalCardSales;

  return {
    initialBalance: Math.round(initialBalance * 100) / 100,
    totalCashSales: Math.round(totalCashSales * 100) / 100,
    totalPixSales: Math.round(totalPixSales * 100) / 100,
    totalCardSales: Math.round(totalCardSales * 100) / 100,
    totalSupplies: Math.round(totalSupplies * 100) / 100,
    totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
    totalRefunds: Math.round(totalRefunds * 100) / 100,
    expectedCashInDrawer: Math.round(expectedCashInDrawer * 100) / 100,
    totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
  };
}

/**
 * Validação rigorosa de Sangria (Retirada de Dinheiro)
 */
export function validateWithdrawal(params: {
  currentCashInDrawer: number;
  withdrawalAmount: number;
  reason: string;
}): { valid: boolean; reason?: string } {
  const { currentCashInDrawer, withdrawalAmount, reason } = params;

  if (!reason || reason.trim().length < 3) {
    return { valid: false, reason: "Motivo da sangria é obrigatório (mínimo 3 caracteres)." };
  }

  if (withdrawalAmount <= 0) {
    return { valid: false, reason: "Valor da sangria deve ser maior que zero." };
  }

  if (withdrawalAmount > currentCashInDrawer) {
    return {
      valid: false,
      reason: `Saldo insuficiente na gaveta (Disponível em dinheiro: R$ ${currentCashInDrawer.toFixed(
        2
      )}, Solicitado: R$ ${withdrawalAmount.toFixed(2)}).`,
    };
  }

  return { valid: true };
}

/**
 * Validação rigorosa de Suprimento (Reforço de Troco)
 */
export function validateSupply(params: {
  supplyAmount: number;
  reason: string;
}): { valid: boolean; reason?: string } {
  const { supplyAmount, reason } = params;

  if (!reason || reason.trim().length < 3) {
    return { valid: false, reason: "Motivo do suprimento é obrigatório (mínimo 3 caracteres)." };
  }

  if (supplyAmount <= 0) {
    return { valid: false, reason: "Valor do suprimento deve ser maior que zero." };
  }

  return { valid: true };
}

/**
 * Fechamento Cego de Caixa: Calcula a conferência entre o valor contado e o esperado
 */
export function calculateClosingDifference(
  countedAmount: number,
  expectedAmount: number
): {
  difference: number;
  status: "EXACT" | "SHORTAGE" | "SURPLUS"; // Exato, Quebra/Falta, Sobra
  formattedDifference: string;
} {
  const difference = Math.round((countedAmount - expectedAmount) * 100) / 100;

  if (difference === 0) {
    return { difference: 0, status: "EXACT", formattedDifference: "R$ 0,00 (Exato)" };
  }

  if (difference < 0) {
    return {
      difference,
      status: "SHORTAGE",
      formattedDifference: `- R$ ${Math.abs(difference).toFixed(2)} (Falta / Quebra)`,
    };
  }

  return {
    difference,
    status: "SURPLUS",
    formattedDifference: `+ R$ ${difference.toFixed(2)} (Sobra)`,
  };
}
