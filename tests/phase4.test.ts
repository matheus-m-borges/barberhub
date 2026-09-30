import { describe, it, expect } from "vitest";
import {
  generateSaleCode,
  validateDiscountPermission,
  calculateSaleItems,
  validateAndCalculatePayments,
  buildSalePayload,
} from "../src/server/pos/pos.service";
import {
  calculateCashRegisterTotals,
  validateWithdrawal,
  validateSupply,
  calculateClosingDifference,
  type CashMovementSummary,
} from "../src/server/cash/cash.service";

describe("Fase 4: Frente de Caixa (PDV) - Cálculos & Itens", () => {
  it("deve calcular subtotal e comissões individuais dos itens da venda", () => {
    const items = [
      {
        itemType: "SERVICE" as const,
        itemId: "srv-corte",
        name: "Corte Tradicional",
        employeeId: "emp-barber-1",
        unitPrice: 50.0,
        quantity: 1,
        commissionType: "PERCENTAGE" as const,
        commissionValue: 40.0, // 40% = R$ 20.00
      },
      {
        itemType: "PRODUCT" as const,
        itemId: "prod-pomada",
        name: "Pomada Modeladora",
        employeeId: "emp-barber-1",
        unitPrice: 30.0,
        quantity: 2, // 2 x 30 = R$ 60.00
        commissionType: "PERCENTAGE" as const,
        commissionValue: 10.0, // 10% de R$ 60.00 = R$ 6.00
      },
    ];

    const result = calculateSaleItems(items);
    expect(result.subtotal).toBe(110.0);
    expect(result.totalCommissions).toBe(26.0); // 20 + 6
    expect(result.calculatedItems).toHaveLength(2);
    expect(result.calculatedItems[0].totalPrice).toBe(50.0);
    expect(result.calculatedItems[1].totalPrice).toBe(60.0);
  });

  it("deve rejeitar venda vazia sem itens", () => {
    expect(() => calculateSaleItems([])).toThrow("A venda deve conter ao menos um item.");
  });
});

describe("Fase 4: Controle de Descontos com Trava de Permissão", () => {
  const subtotal = 100.0;

  it("PROPRIETARIO e ADMINISTRADOR devem ter permissão de conceder até 100% de desconto", () => {
    const checkAdmin = validateDiscountPermission(["ADMINISTRADOR"], subtotal, 40.0);
    expect(checkAdmin.allowed).toBe(true);

    const checkOwner = validateDiscountPermission(["PROPRIETARIO"], subtotal, 100.0);
    expect(checkOwner.allowed).toBe(true);
  });

  it("GERENTE deve ter limite de até 25% de desconto", () => {
    const checkAllowed = validateDiscountPermission(["GERENTE"], subtotal, 25.0);
    expect(checkAllowed.allowed).toBe(true);

    const checkBlocked = validateDiscountPermission(["GERENTE"], subtotal, 26.0);
    expect(checkBlocked.allowed).toBe(false);
    expect(checkBlocked.reason).toContain("excede o limite permitido para seu perfil (25%");
  });

  it("CAIXA e BARBEIRO devem ter limite de até 10% de desconto", () => {
    const checkCashier = validateDiscountPermission(["CAIXA"], subtotal, 10.0);
    expect(checkCashier.allowed).toBe(true);

    const checkBlocked = validateDiscountPermission(["BARBEIRO"], subtotal, 15.0);
    expect(checkBlocked.allowed).toBe(false);
    expect(checkBlocked.reason).toContain("10%");
  });

  it("desconto nunca pode ser maior que o subtotal da venda", () => {
    const check = validateDiscountPermission(["PROPRIETARIO"], 100.0, 150.0);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Desconto não pode exceder o subtotal");
  });
});

describe("Fase 4: Pagamentos Divididos & Troco", () => {
  it("exemplo do prompt: deve permitir pagamento dividido (Pix: R$ 50 + Dinheiro: R$ 25 = R$ 75)", () => {
    const saleTotal = 75.0;
    const payments = [
      { method: "PIX" as const, amount: 50.0 },
      { method: "CASH" as const, amount: 25.0 },
    ];

    const result = validateAndCalculatePayments(saleTotal, payments);
    expect(result.totalPaid).toBe(75.0);
    expect(result.totalChange).toBe(0);
    expect(result.calculatedPayments).toHaveLength(2);
  });

  it("deve calcular o troco corretamente em dinheiro quando valor entregue for maior", () => {
    const saleTotal = 80.0;
    const payments = [
      {
        method: "CASH" as const,
        amount: 80.0,
        amountPaid: 100.0, // Cliente entregou cédula de 100
      },
    ];

    const result = validateAndCalculatePayments(saleTotal, payments);
    expect(result.totalPaid).toBe(80.0);
    expect(result.totalChange).toBe(20.0); // 100 - 80 = 20 de troco
  });

  it("deve rejeitar se a soma dos pagamentos divergir do total da venda", () => {
    const saleTotal = 100.0;
    const payments = [
      { method: "CREDIT_CARD" as const, amount: 60.0 },
      { method: "PIX" as const, amount: 30.0 }, // Total = 90 (Falta 10)
    ];

    expect(() => validateAndCalculatePayments(saleTotal, payments)).toThrow(
      "Soma dos pagamentos (R$ 90.00) não confere com o total da venda (R$ 100.00)."
    );
  });
});

describe("Fase 4: Construção de Payload de Venda (buildSalePayload)", () => {
  it("deve gerar código único e calcular total com desconto aplicado", () => {
    const payload = buildSalePayload({
      tenantId: "tenant_barber_1",
      cashRegisterId: "cash_reg_1",
      createdById: "user_cashier_1",
      userRoles: ["GERENTE"],
      discount: 10.0,
      items: [
        {
          itemType: "SERVICE",
          itemId: "srv-corte",
          name: "Corte",
          unitPrice: 60.0,
          quantity: 1,
        },
      ],
      payments: [{ method: "PIX", amount: 50.0 }], // Subtotal 60 - Desconto 10 = Total 50
    });

    expect(payload.sale.code).toMatch(/^VD-\d{6}$/);
    expect(payload.sale.subtotal).toBe(60.0);
    expect(payload.sale.discount).toBe(10.0);
    expect(payload.sale.total).toBe(50.0);
    expect(payload.payments[0].amount).toBe(50.0);
  });
});

describe("Fase 4: Caixa Diário - Totais & Saldo Esperado", () => {
  it("deve calcular o saldo físico da gaveta e o faturamento bruto separadamente", () => {
    const initialBalance = 100.0; // Fundo de troco inicial

    const movements: CashMovementSummary[] = [
      { type: "SALE", amount: 50.0, paymentMethod: "CASH" },        // +50 em dinheiro vivo
      { type: "SALE", amount: 80.0, paymentMethod: "PIX" },         // +80 no Pix (não entra na gaveta)
      { type: "SALE", amount: 120.0, paymentMethod: "CREDIT_CARD" },// +120 no Cartão (não entra na gaveta)
      { type: "SUPPLY", amount: 30.0, paymentMethod: "CASH" },      // +30 reforço de troco
      { type: "WITHDRAWAL", amount: 40.0, paymentMethod: "CASH" },  // -40 sangria para cofre
    ];

    const report = calculateCashRegisterTotals(initialBalance, movements);

    // Saldo em dinheiro esperado na gaveta: 100 + 50 + 30 - 40 = R$ 140.00
    expect(report.expectedCashInDrawer).toBe(140.0);
    // Faturamento bruto total da barbearia: 50 + 80 + 120 = R$ 250.00
    expect(report.totalGrossRevenue).toBe(250.0);
    expect(report.totalCashSales).toBe(50.0);
    expect(report.totalPixSales).toBe(80.0);
    expect(report.totalCardSales).toBe(120.0);
    expect(report.totalSupplies).toBe(30.0);
    expect(report.totalWithdrawals).toBe(40.0);
  });

  it("validateWithdrawal deve impedir sangria maior que o saldo em dinheiro disponível", () => {
    const checkValid = validateWithdrawal({
      currentCashInDrawer: 200.0,
      withdrawalAmount: 150.0,
      reason: "Depósito bancário",
    });
    expect(checkValid.valid).toBe(true);

    const checkExceeded = validateWithdrawal({
      currentCashInDrawer: 50.0,
      withdrawalAmount: 100.0,
      reason: "Retirada",
    });
    expect(checkExceeded.valid).toBe(false);
    expect(checkExceeded.reason).toContain("Saldo insuficiente na gaveta");
  });

  it("validateWithdrawal e validateSupply devem exigir motivo obrigatório", () => {
    const checkEmpty = validateWithdrawal({
      currentCashInDrawer: 200.0,
      withdrawalAmount: 50.0,
      reason: " ",
    });
    expect(checkEmpty.valid).toBe(false);

    const checkSupplyEmpty = validateSupply({
      supplyAmount: 50.0,
      reason: "",
    });
    expect(checkSupplyEmpty.valid).toBe(false);
  });

  it("calculateClosingDifference deve identificar conferência exata, falta e sobra", () => {
    // 1. Conferência exata
    const exact = calculateClosingDifference(140.0, 140.0);
    expect(exact.status).toBe("EXACT");
    expect(exact.difference).toBe(0);

    // 2. Falta de caixa (Quebra)
    const shortage = calculateClosingDifference(130.0, 140.0);
    expect(shortage.status).toBe("SHORTAGE");
    expect(shortage.difference).toBe(-10.0);

    // 3. Sobra de caixa
    const surplus = calculateClosingDifference(155.0, 140.0);
    expect(surplus.status).toBe("SURPLUS");
    expect(surplus.difference).toBe(15.0);
  });
});
