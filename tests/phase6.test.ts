import { describe, it, expect } from "vitest";
import {
  calculateGrossMargin,
  isLowStock,
  calculateStockMovement,
  productInputSchema,
} from "../src/server/stock/stock.service";
import {
  generatePurchaseOrderCode,
  calculatePurchaseOrderItems,
  buildPurchaseReceiptPlan,
} from "../src/server/purchases/purchase.service";

describe("Fase 6: Catálogo de Produtos & Margem de Lucro", () => {
  it("deve calcular a margem de lucro bruta em Reais e em porcentagem", () => {
    const margin = calculateGrossMargin(20.0, 50.0);
    expect(margin.marginAmount).toBe(30.0);
    expect(margin.marginPercent).toBe(60.0); // (30 / 50) * 100
  });

  it("deve disparar alerta de estoque baixo quando o saldo for menor ou igual ao mínimo", () => {
    expect(isLowStock(3, 5)).toBe(true);  // Abaixo do mínimo
    expect(isLowStock(5, 5)).toBe(true);  // No limite exato do mínimo
    expect(isLowStock(8, 5)).toBe(false); // Seguro
  });

  it("deve validar campos mínimos de cadastro do produto", () => {
    expect(() =>
      productInputSchema.parse({
        name: "Pomada Cera",
        costPrice: 15.0,
        salePrice: 35.0,
        currentStock: 10,
        minStock: 5,
      })
    ).not.toThrow();

    expect(() =>
      productInputSchema.parse({
        name: "", // Nome inválido
        costPrice: -10, // Custo negativo inválido
      })
    ).toThrow();
  });
});

describe("Fase 6: Movimentações de Estoque & Rastreabilidade", () => {
  it("deve processar entrada de estoque (INBOUND) e devolução (RETURN)", () => {
    const inbound = calculateStockMovement({
      currentStock: 10,
      movementType: "INBOUND",
      quantity: 15,
      unitCost: 20.0,
    });
    expect(inbound.newStock).toBe(25);
    expect(inbound.quantityApplied).toBe(15);

    const ret = calculateStockMovement({
      currentStock: 25,
      movementType: "RETURN",
      quantity: 2,
      unitCost: 20.0,
    });
    expect(ret.newStock).toBe(27);
  });

  it("deve processar saída por venda (SALE), consumo interno (CONSUMPTION) e perda (LOSS)", () => {
    const sale = calculateStockMovement({
      currentStock: 20,
      movementType: "SALE",
      quantity: 5,
      unitCost: 15.0,
    });
    expect(sale.newStock).toBe(15);

    const consumption = calculateStockMovement({
      currentStock: 15,
      movementType: "CONSUMPTION",
      quantity: 2,
      unitCost: 15.0,
      reason: "Uso na bancada pelo barbeiro",
    });
    expect(consumption.newStock).toBe(13);

    const loss = calculateStockMovement({
      currentStock: 13,
      movementType: "LOSS",
      quantity: 1,
      unitCost: 15.0,
      reason: "Frasco quebrado no chão",
    });
    expect(loss.newStock).toBe(12);
  });

  it("deve bloquear saídas quando a quantidade solicitada for maior que o saldo em estoque", () => {
    expect(() =>
      calculateStockMovement({
        currentStock: 3,
        movementType: "SALE",
        quantity: 5, // Superior ao saldo 3
        unitCost: 20.0,
      })
    ).toThrow("Saldo insuficiente em estoque");
  });

  it("deve processar ajuste de inventário (ADJUSTMENT) definindo o novo saldo físico apurado", () => {
    const adjustment = calculateStockMovement({
      currentStock: 10,
      movementType: "ADJUSTMENT",
      quantity: 14, // Contagem física revelou 14 unidades
      unitCost: 20.0,
      reason: "Balanço mensal",
    });
    expect(adjustment.previousStock).toBe(10);
    expect(adjustment.quantityApplied).toBe(4); // +4
    expect(adjustment.newStock).toBe(14);
  });
});

describe("Fase 6: Ordens de Compra & Integração com Estoque e Financeiro", () => {
  it("deve calcular o total da ordem de compra a partir dos itens", () => {
    const items = [
      { productId: "prod-pomada", quantity: 20, unitCost: 15.0 }, // 300.00
      { productId: "prod-shampoo", quantity: 10, unitCost: 25.0 }, // 250.00
    ];

    const result = calculatePurchaseOrderItems(items);
    expect(result.totalAmount).toBe(550.0);
    expect(result.calculatedItems).toHaveLength(2);
  });

  it("ao receber a compra, deve gerar entradas no estoque e fatura no Contas a Pagar", () => {
    const orderItems = [
      { productId: "prod-lamina", quantity: 100, unitCost: 1.5, totalCost: 150.0 },
    ];
    const dueDate = new Date("2026-10-30T00:00:00Z");

    const receiptPlan = buildPurchaseReceiptPlan({
      purchaseOrderId: "po-1",
      orderCode: "PC-849201",
      supplierName: "Distribuidora Barber Pro",
      totalAmount: 150.0,
      items: orderItems,
      paymentDueDate: dueDate,
    });

    expect(receiptPlan.status).toBe("RECEIVED");
    expect(receiptPlan.receivedAt).toBeDefined();

    // 1. Entradas no estoque geradas
    expect(receiptPlan.stockInbounds).toHaveLength(1);
    expect(receiptPlan.stockInbounds[0].productId).toBe("prod-lamina");
    expect(receiptPlan.stockInbounds[0].quantity).toBe(100);
    expect(receiptPlan.stockInbounds[0].movementType).toBe("INBOUND");

    // 2. Fatura no Contas a Pagar gerada
    expect(receiptPlan.accountPayablePayload.supplierName).toBe("Distribuidora Barber Pro");
    expect(receiptPlan.accountPayablePayload.amount).toBe(150.0);
    expect(receiptPlan.accountPayablePayload.dueDate).toEqual(dueDate);
    expect(receiptPlan.accountPayablePayload.status).toBe("PENDING");
  });

  it("generatePurchaseOrderCode deve gerar código no formato PC-XXXXXX", () => {
    const code = generatePurchaseOrderCode();
    expect(code).toMatch(/^PC-\d{6}$/);
  });
});
