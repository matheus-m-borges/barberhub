import { describe, it, expect } from "vitest";
import {
  buildCommissionRecordPayload,
  cancelCommission,
  markCommissionAsPaid,
  generateCommissionStatement,
  type CommissionRecord,
} from "../src/server/commissions/commission.service";
import {
  calculateCashFlow,
  evaluatePayableStatus,
  payAccountPayable,
  receiveAccountReceivable,
} from "../src/server/financial/financial.service";

describe("Fase 5: Motor de Comissões & Repasses", () => {
  it("deve criar payload de comissão auditável com status PENDING", () => {
    const payload = buildCommissionRecordPayload("tenant_123", {
      employeeId: "emp-barber-1",
      saleId: "sale-999",
      serviceName: "Corte Degradê",
      servicePrice: 60.0,
      commissionRate: 50.0,
      commissionAmount: 30.0,
    });

    expect(payload.tenantId).toBe("tenant_123");
    expect(payload.commissionAmount).toBe(30.0);
    expect(payload.status).toBe("PENDING");
    expect(payload.paidAt).toBeNull();
  });

  it("deve estornar/cancelar comissão com motivo obrigatório quando a venda for cancelada", () => {
    const commission: CommissionRecord = {
      id: "comm-1",
      tenantId: "t1",
      employeeId: "emp-1",
      saleId: "s-1",
      serviceName: "Barba",
      servicePrice: 40,
      commissionRate: 50,
      commissionAmount: 20,
      status: "PENDING",
      createdAt: new Date(),
    };

    const result = cancelCommission(commission, "Venda cancelada pelo cliente");
    expect(result.updatedStatus).toBe("CANCELED");
    expect(result.cancellationReason).toBe("Venda cancelada pelo cliente");
  });

  it("não deve permitir cancelar uma comissão que já foi paga ao colaborador", () => {
    const commissionPaid: CommissionRecord = {
      id: "comm-2",
      tenantId: "t1",
      employeeId: "emp-1",
      saleId: "s-2",
      serviceName: "Corte",
      servicePrice: 50,
      commissionRate: 50,
      commissionAmount: 25,
      status: "PAID",
      createdAt: new Date(),
    };

    expect(() =>
      cancelCommission(commissionPaid, "Tentativa de cancelamento")
    ).toThrow("Não é possível cancelar uma comissão que já foi paga ao profissional.");
  });

  it("deve liquidar comissão com status PAID", () => {
    const commission: CommissionRecord = {
      id: "comm-3",
      tenantId: "t1",
      employeeId: "emp-1",
      saleId: "s-3",
      serviceName: "Cabelo",
      servicePrice: 50,
      commissionRate: 40,
      commissionAmount: 20,
      status: "PENDING",
      createdAt: new Date(),
    };

    const paidResult = markCommissionAsPaid(commission);
    expect(paidResult.updatedStatus).toBe("PAID");
    expect(paidResult.paidAt).toBeDefined();
  });

  it("não deve permitir pagar uma comissão cancelada", () => {
    const commissionCanceled: CommissionRecord = {
      id: "comm-4",
      tenantId: "t1",
      employeeId: "emp-1",
      saleId: "s-4",
      serviceName: "Corte",
      servicePrice: 50,
      commissionRate: 40,
      commissionAmount: 20,
      status: "CANCELED",
      createdAt: new Date(),
    };

    expect(() => markCommissionAsPaid(commissionCanceled)).toThrow(
      "Comissão cancelada não pode ser paga."
    );
  });

  it("deve gerar espelho de comissões consolidado por colaborador", () => {
    const records: CommissionRecord[] = [
      {
        id: "c-1",
        tenantId: "t1",
        employeeId: "barber-joao",
        saleId: "s-1",
        serviceName: "Corte",
        servicePrice: 50,
        commissionRate: 50,
        commissionAmount: 25,
        status: "PAID",
        createdAt: new Date(),
      },
      {
        id: "c-2",
        tenantId: "t1",
        employeeId: "barber-joao",
        saleId: "s-2",
        serviceName: "Barba",
        servicePrice: 40,
        commissionRate: 50,
        commissionAmount: 20,
        status: "PENDING",
        createdAt: new Date(),
      },
      {
        id: "c-3",
        tenantId: "t1",
        employeeId: "barber-joao",
        saleId: "s-3",
        serviceName: "Pigmentação",
        servicePrice: 60,
        commissionRate: 50,
        commissionAmount: 30,
        status: "CANCELED",
        createdAt: new Date(),
      },
    ];

    const statement = generateCommissionStatement("barber-joao", records);
    expect(statement.totalGenerated).toBe(75.0); // 25 + 20 + 30
    expect(statement.totalPaid).toBe(25.0);
    expect(statement.totalPending).toBe(20.0);
    expect(statement.totalCanceled).toBe(30.0);
    expect(statement.itemsCount).toBe(3);
  });
});

describe("Fase 5: Gestão Financeira & Fluxo de Caixa", () => {
  it("deve calcular o fluxo de caixa, DRE simples e resultado líquido com precisão", () => {
    const initialBalance = 1000.0; // Saldo de abertura do mês

    const transactions = [
      { type: "INCOME" as const, amount: 5000.0, date: new Date(), status: "CONFIRMED" as const }, // Vendas de serviços
      { type: "INCOME" as const, amount: 1500.0, date: new Date(), status: "CONFIRMED" as const }, // Vendas de produtos
      { type: "EXPENSE" as const, amount: 2000.0, date: new Date(), status: "CONFIRMED" as const }, // Aluguel + Energia
      { type: "EXPENSE" as const, amount: 500.0, date: new Date(), status: "CONFIRMED" as const }, // Produtos p/ estoque
      { type: "EXPENSE" as const, amount: 300.0, date: new Date(), status: "CANCELED" as const }, // Cancelada (não entra)
    ];

    const commissionsPaid = 1200.0; // Repasses pagos aos barbeiros

    const report = calculateCashFlow({
      initialBalance,
      transactions,
      commissionsPaidAmount: commissionsPaid,
    });

    // Receitas = 5000 + 1500 = 6500
    expect(report.totalIncome).toBe(6500.0);
    // Despesas = 2000 + 500 = 2500 (300 cancelado ignorado)
    expect(report.totalExpense).toBe(2500.0);
    expect(report.totalCommissions).toBe(1200.0);
    // Resultado = 6500 - 2500 - 1200 = 2800
    expect(report.netResult).toBe(2800.0);
    // Saldo Final = 1000 + 2800 = 3800
    expect(report.finalBalance).toBe(3800.0);
    expect(report.isProfitable).toBe(true);
  });
});

describe("Fase 5: Contas a Pagar & Contas a Receber", () => {
  it("evaluatePayableStatus deve identificar conta vencida quando now > dueDate", () => {
    const yesterday = new Date("2026-09-28T00:00:00Z");
    const tomorrow = new Date("2026-09-30T00:00:00Z");
    const today = new Date("2026-09-29T12:00:00Z");

    expect(evaluatePayableStatus(yesterday, "PENDING", today)).toBe("OVERDUE");
    expect(evaluatePayableStatus(tomorrow, "PENDING", today)).toBe("PENDING");
    // Se já foi paga, status permanece PAID
    expect(evaluatePayableStatus(yesterday, "PAID", today)).toBe("PAID");
  });

  it("deve liquidar conta a pagar com validação de valor", () => {
    const result = payAccountPayable({
      currentStatus: "PENDING",
      totalAmount: 450.0,
      paidAmount: 450.0,
      paymentMethod: "PIX",
    });

    expect(result.status).toBe("PAID");
    expect(result.paidAmount).toBe(450.0);
    expect(result.paymentMethod).toBe("PIX");
  });

  it("deve rejeitar pagamento maior que o valor da fatura", () => {
    expect(() =>
      payAccountPayable({
        currentStatus: "PENDING",
        totalAmount: 100.0,
        paidAmount: 120.0, // Inválido
      })
    ).toThrow("O valor pago não pode ser superior ao valor da fatura.");
  });

  it("deve liquidar conta a receber com status RECEIVED", () => {
    const result = receiveAccountReceivable({
      currentStatus: "PENDING",
      totalAmount: 99.0,
      receivedAmount: 99.0,
      paymentMethod: "CARTAO_CREDITO",
    });

    expect(result.status).toBe("RECEIVED");
    expect(result.receivedAmount).toBe(99.0);
  });
});
