// BarberHub Pro ERP - Financial Service (Gestão Financeira, DRE & Contas a Pagar/Receber)
// Regras determinísticas de contas, fluxo de caixa e reconciliação monetária

import { z } from "zod";

export const FINANCIAL_TYPES = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

export type FinancialType = keyof typeof FINANCIAL_TYPES;

export const ACCOUNT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  RECEIVED: "RECEIVED",
  OVERDUE: "OVERDUE",
  CANCELED: "CANCELED",
} as const;

export type AccountStatus = keyof typeof ACCOUNT_STATUS;

export interface FinancialTransactionItem {
  id?: string;
  type: FinancialType;
  amount: number;
  date: Date;
  status: "CONFIRMED" | "CANCELED";
}

export interface CashFlowReport {
  initialBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalCommissions: number;
  netResult: number;      // Receitas - Despesas - Comissões
  finalBalance: number;   // Saldo Inicial + Resultado
  isProfitable: boolean;
}

/**
 * Calcula determinísticamente o Fluxo de Caixa e o Resultado Líquido
 */
export function calculateCashFlow(params: {
  initialBalance: number;
  transactions: FinancialTransactionItem[];
  commissionsPaidAmount?: number;
}): CashFlowReport {
  const { initialBalance, transactions, commissionsPaidAmount = 0 } = params;

  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    if (t.status === "CANCELED") continue; // Transações canceladas são desconsideradas

    const amount = Math.round(t.amount * 100) / 100;
    if (t.type === "INCOME") {
      totalIncome += amount;
    } else if (t.type === "EXPENSE") {
      totalExpense += amount;
    }
  }

  const roundedCommissions = Math.round(commissionsPaidAmount * 100) / 100;
  const netResult = Math.round((totalIncome - totalExpense - roundedCommissions) * 100) / 100;
  const finalBalance = Math.round((initialBalance + netResult) * 100) / 100;

  return {
    initialBalance: Math.round(initialBalance * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    totalCommissions: roundedCommissions,
    netResult,
    finalBalance,
    isProfitable: netResult >= 0,
  };
}

/**
 * Avalia se uma conta a pagar está vencida
 */
export function evaluatePayableStatus(
  dueDate: Date,
  currentStatus: AccountStatus,
  now = new Date()
): AccountStatus {
  if (currentStatus === "PAID" || currentStatus === "CANCELED") {
    return currentStatus;
  }
  if (now.getTime() > dueDate.getTime()) {
    return ACCOUNT_STATUS.OVERDUE;
  }
  return ACCOUNT_STATUS.PENDING;
}

/**
 * Liquidação de Conta a Pagar
 */
export function payAccountPayable(params: {
  currentStatus: AccountStatus;
  totalAmount: number;
  paidAmount: number;
  paidAt?: Date;
  paymentMethod?: string;
}): { status: AccountStatus; paidAmount: number; paidAt: Date; paymentMethod: string } {
  const { currentStatus, totalAmount, paidAmount, paidAt = new Date(), paymentMethod = "PIX" } =
    params;

  if (currentStatus === "CANCELED") {
    throw new Error("Não é possível liquidar uma conta a pagar cancelada.");
  }
  if (currentStatus === "PAID") {
    throw new Error("Esta conta a pagar já foi liquidada anteriormente.");
  }
  if (paidAmount <= 0) {
    throw new Error("O valor do pagamento deve ser maior que zero.");
  }
  if (paidAmount > totalAmount) {
    throw new Error("O valor pago não pode ser superior ao valor da fatura.");
  }

  return {
    status: ACCOUNT_STATUS.PAID,
    paidAmount: Math.round(paidAmount * 100) / 100,
    paidAt,
    paymentMethod,
  };
}

/**
 * Liquidação / Recebimento de Conta a Receber
 */
export function receiveAccountReceivable(params: {
  currentStatus: AccountStatus;
  totalAmount: number;
  receivedAmount: number;
  receivedAt?: Date;
  paymentMethod?: string;
}): { status: AccountStatus; receivedAmount: number; receivedAt: Date; paymentMethod: string } {
  const {
    currentStatus,
    totalAmount,
    receivedAmount,
    receivedAt = new Date(),
    paymentMethod = "PIX",
  } = params;

  if (currentStatus === "CANCELED") {
    throw new Error("Não é possível receber uma conta cancelada.");
  }
  if (currentStatus === "RECEIVED") {
    throw new Error("Esta conta a receber já foi liquidada anteriormente.");
  }
  if (receivedAmount <= 0) {
    throw new Error("O valor recebido deve ser maior que zero.");
  }
  if (receivedAmount > totalAmount) {
    throw new Error("O valor recebido não pode ser superior ao valor do título.");
  }

  return {
    status: ACCOUNT_STATUS.RECEIVED,
    receivedAmount: Math.round(receivedAmount * 100) / 100,
    receivedAt,
    paymentMethod,
  };
}
